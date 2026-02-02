// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Simple Prediction Market Contract - Production Version
//!
//! Uses shared message types (alethea-oracle-messages) for cross-chain
//! communication with Oracle Registry. This allows markets to be deployed
//! on any chain while receiving oracle resolutions.

#![cfg_attr(target_arch = "wasm32", no_main)]

use alethea_oracle_messages::{decode_request_id, encode_request_id, OracleCallback, OracleRequest};
use linera_sdk::{
    linera_base_types::{Amount, Timestamp, WithContractAbi},
    views::{RootView, View},
    Contract, ContractRuntime,
};
use simple_market::{
    state::MarketState, Bet, ClaimStatus, InstantiationArgument, Market, MarketStatus, Message,
    Operation, SimpleMarketAbi,
};

pub struct SimpleMarketContract {
    state: MarketState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(SimpleMarketContract);

impl WithContractAbi for SimpleMarketContract {
    type Abi = SimpleMarketAbi;
}

impl Contract for SimpleMarketContract {
    type Message = Message;
    type InstantiationArgument = InstantiationArgument;
    type Parameters = ();
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = MarketState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");

        SimpleMarketContract { state, runtime }
    }

    async fn instantiate(&mut self, args: InstantiationArgument) {
        // Initialize state
        self.state.next_market_id.set(1);
        self.state.total_markets_created.set(0);
        self.state.total_bets_placed.set(0);
        self.state.total_volume.set(0);

        // Store Registry v2 Application ID
        self.state
            .registry_app_id
            .set(Some(args.registry_app_id.forget_abi()));

        // Store Registry chain ID for cross-chain messaging
        self.state
            .registry_chain_id
            .set(Some(args.registry_chain_id));
        
        // Store whether to use local instance (call_application)
        self.state.use_local_instance.set(args.use_local_instance);

        let mode = if args.use_local_instance {
            "Hub-and-Spoke (call_application)"
        } else {
            "Cross-chain messaging (legacy)"
        };
        
        eprintln!(
            "Simple Market v11 initialized. Registry: {:?} on chain {}, Mode: {}",
            args.registry_app_id, args.registry_chain_id, mode
        );
        
        // NOTE: Consumer app registration disabled due to BCS deserialization mismatch
        // with deployed Oracle Registry. Can be re-enabled when Registry is redeployed.
        // if args.use_local_instance {
        //     self.register_as_consumer_app(args.registry_app_id).await;
        // }
    }

    async fn execute_operation(&mut self, operation: Operation) {
        match operation {
            Operation::CreateMarket { question, end_time } => {
                self.create_market(question, end_time).await;
            }

            Operation::PlaceBet {
                market_id,
                outcome,
                stake,
            } => {
                self.place_bet(market_id, outcome, stake).await;
            }

            Operation::ClaimPayout { market_id } => {
                self.claim_payout(market_id).await;
            }

            Operation::RequestResolution { market_id } => {
                self.request_resolution(market_id).await;
            }

            Operation::LinkQueryToMarket { market_id, query_id } => {
                self.link_query_to_market(market_id, query_id).await;
            }
        }
    }

    async fn execute_message(&mut self, message: Message) {
        match message {
            Message::OracleRequest(_) => {
                // This is an outgoing message type, should not be received
                eprintln!("⚠️ Market received OracleRequest - this should not happen");
            }

            Message::OracleCallback(callback) => {
                self.handle_oracle_callback(callback).await;
            }
        }
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

impl SimpleMarketContract {
    /// Handle callbacks from Oracle Registry
    /// 
    /// Supports new industry-standard callback format with:
    /// - Dispute window tracking (is_final, dispute_window_end)
    /// - QueryFinalized for safe settlement
    /// - QueryDisputed and DisputeResolved for challenge handling
    async fn handle_oracle_callback(&mut self, callback: OracleCallback) {
        match callback {
            OracleCallback::QueryCreated {
                query_id,
                request_id,
                callback_data,
                estimated_resolution,
                dispute_window_end,
            } => {
                eprintln!(
                    "📥 QueryCreated callback: query_id={}, request_id={}, est_resolution={:?}, dispute_end={:?}",
                    query_id, request_id, estimated_resolution, dispute_window_end
                );

                // Link market to query
                let market_id = decode_request_id(&callback_data).unwrap_or(request_id);
                self.link_query_to_market(market_id, query_id).await;
            }

            OracleCallback::QueryResolved {
                query_id,
                result,
                result_index,
                resolved_at,
                callback_data,
                vote_count,
                confidence,
                dispute_window_end,
                is_final,
                total_voting_weight,
            } => {
                let market_id = decode_request_id(&callback_data).unwrap_or(0);
                eprintln!(
                    "📥 QueryResolved callback: query_id={}, market_id={}, result={}, votes={}, confidence={}, is_final={}",
                    query_id, market_id, result, vote_count, confidence, is_final
                );

                // BEST PRACTICE: Only settle if is_final is true
                // If not final, wait for QueryFinalized or dispute handling
                if is_final {
                    self.handle_resolution(market_id, query_id, result, resolved_at)
                        .await;
                } else {
                    eprintln!(
                        "⏳ Query {} resolved but not final - waiting for dispute window to pass (ends {:?})",
                        query_id, dispute_window_end
                    );
                    // Mark market as pending finalization
                    self.mark_pending_finalization(market_id, result, resolved_at).await;
                }
            }
            
            // NEW: Handle QueryFinalized - Safe to settle!
            OracleCallback::QueryFinalized {
                query_id,
                result,
                result_index,
                finalized_at,
                callback_data,
                bond_refunded,
            } => {
                let market_id = decode_request_id(&callback_data).unwrap_or(0);
                eprintln!(
                    "📥 QueryFinalized callback: query_id={}, market_id={}, result={}, bond_refunded={:?}",
                    query_id, market_id, result, bond_refunded
                );

                // Safe to settle - dispute window has passed
                self.handle_resolution(market_id, query_id, result, finalized_at)
                    .await;
            }
            
            // NEW: Handle QueryDisputed - Result is being challenged
            OracleCallback::QueryDisputed {
                query_id,
                original_result,
                disputed_by,
                disputed_outcome,
                dispute_reason,
                callback_data,
                new_deadline,
            } => {
                let market_id = decode_request_id(&callback_data).unwrap_or(0);
                eprintln!(
                    "📥 QueryDisputed callback: query_id={}, market_id={}, original={}, disputed_to={}, reason={}",
                    query_id, market_id, original_result, disputed_outcome, dispute_reason
                );

                // Mark market as disputed - do not settle yet
                self.handle_query_disputed(market_id, query_id, original_result, disputed_outcome).await;
            }
            
            // NEW: Handle DisputeResolved - Final result after dispute
            OracleCallback::DisputeResolved {
                query_id,
                final_result,
                disputer_won,
                winner_payout,
                callback_data,
            } => {
                let market_id = decode_request_id(&callback_data).unwrap_or(0);
                eprintln!(
                    "📥 DisputeResolved callback: query_id={}, market_id={}, final_result={}, disputer_won={}",
                    query_id, market_id, final_result, disputer_won
                );

                // Now we have the definitive final result - settle the market
                let resolved_at = self.runtime.system_time();
                self.handle_resolution(market_id, query_id, final_result, resolved_at)
                    .await;
            }

            OracleCallback::QueryExpired {
                query_id,
                callback_data,
                votes_received,
                votes_required,
                bond_refunded,
            } => {
                let market_id = decode_request_id(&callback_data).unwrap_or(0);
                eprintln!(
                    "📥 QueryExpired callback: query_id={}, market_id={}, votes={}/{}, bond_refunded={:?}",
                    query_id, market_id, votes_received, votes_required, bond_refunded
                );

                // Could implement retry logic or refund here
                self.handle_query_expired(market_id, query_id).await;
            }

            OracleCallback::QueryCancelled {
                query_id,
                callback_data,
                reason,
                bond_refunded,
            } => {
                let market_id = decode_request_id(&callback_data).unwrap_or(0);
                eprintln!(
                    "📥 QueryCancelled callback: query_id={}, market_id={}, reason={}, bond_refunded={:?}",
                    query_id, market_id, reason, bond_refunded
                );

                self.handle_query_cancelled(market_id, query_id, reason)
                    .await;
            }
        }
    }

    /// Create a new prediction market
    async fn create_market(&mut self, question: String, end_time: Timestamp) {
        if question.trim().is_empty() {
            panic!("Question cannot be empty");
        }

        if question.len() > 200 {
            panic!("Question too long (max 200 characters)");
        }

        let now = self.runtime.system_time();
        if end_time <= now {
            panic!("End time must be in the future");
        }

        let market_id = *self.state.next_market_id.get();
        self.state.next_market_id.set(market_id + 1);

        let creator = self.runtime.chain_id();
        let created_at = self.runtime.system_time();

        let market = Market {
            id: market_id,
            question: question.clone(),
            creator,
            created_at,
            end_time,
            status: MarketStatus::Open,
            yes_pool: Amount::ZERO,
            no_pool: Amount::ZERO,
            total_pool: Amount::ZERO,
            query_id: None,
            registry_chain: None,
            winning_outcome: None,
            resolved_at: None,
        };

        self.state
            .markets
            .insert(&market_id, market.clone())
            .expect("Failed to insert market");

        let total = *self.state.total_markets_created.get();
        self.state.total_markets_created.set(total + 1);

        eprintln!("✅ Market {} created: {}", market_id, question);
    }

    /// Place a bet on a market outcome
    async fn place_bet(&mut self, market_id: u64, outcome: String, stake: Amount) {
        if outcome != "Yes" && outcome != "No" {
            panic!("Outcome must be 'Yes' or 'No'");
        }

        if stake == Amount::ZERO {
            panic!("Stake must be greater than zero");
        }

        let mut market = match self.state.markets.get(&market_id).await {
            Ok(Some(m)) => m,
            Ok(None) => panic!("Market not found"),
            Err(e) => panic!("Failed to get market: {}", e),
        };

        let now = self.runtime.system_time();
        if now >= market.end_time && market.status == MarketStatus::Open {
            market.status = MarketStatus::Voting;
            self.state
                .markets
                .insert(&market_id, market.clone())
                .expect("Failed to update market status");
        }

        if market.status != MarketStatus::Open {
            panic!("Market is not open for betting (status: {:?})", market.status);
        }

        let bettor = self.runtime.chain_id();
        let placed_at = self.runtime.system_time();

        let bet = Bet {
            bettor,
            market_id,
            outcome: outcome.clone(),
            stake,
            placed_at,
            claim_status: ClaimStatus::Pending,
            payout_amount: None,
        };

        self.state
            .bets
            .insert(&(market_id, bettor), bet)
            .expect("Failed to insert bet");

        let stake_value: u128 = stake.into();
        if outcome == "Yes" {
            let yes_value: u128 = market.yes_pool.into();
            market.yes_pool = Amount::from_tokens(yes_value + stake_value);
        } else {
            let no_value: u128 = market.no_pool.into();
            market.no_pool = Amount::from_tokens(no_value + stake_value);
        }

        let total_value: u128 = market.total_pool.into();
        market.total_pool = Amount::from_tokens(total_value + stake_value);

        self.state
            .markets
            .insert(&market_id, market)
            .expect("Failed to update market");

        let total_bets = *self.state.total_bets_placed.get();
        self.state.total_bets_placed.set(total_bets + 1);

        let total_vol = *self.state.total_volume.get();
        self.state.total_volume.set(total_vol + (stake_value as u64));

        eprintln!(
            "✅ Bet placed on market {}: {} with stake {}",
            market_id, outcome, stake
        );
    }

    /// Claim payout for a winning bet
    async fn claim_payout(&mut self, market_id: u64) {
        let bettor = self.runtime.chain_id();

        let market = match self.state.markets.get(&market_id).await {
            Ok(Some(m)) => m,
            Ok(None) => panic!("Market not found"),
            Err(e) => panic!("Failed to get market: {}", e),
        };

        if market.status != MarketStatus::Resolved {
            panic!("Market is not resolved yet");
        }

        let mut bet = match self.state.bets.get(&(market_id, bettor)).await {
            Ok(Some(b)) => b,
            Ok(None) => panic!("No bet found for this market"),
            Err(e) => panic!("Failed to get bet: {}", e),
        };

        if bet.claim_status == ClaimStatus::Claimed {
            panic!("Payout already claimed");
        }

        let winning_outcome = match market.winning_outcome.as_ref() {
            Some(o) => o,
            None => panic!("No winning outcome set"),
        };

        if &bet.outcome != winning_outcome {
            panic!("Bet was on losing outcome ({})", bet.outcome);
        }

        let payout = match bet.payout_amount {
            Some(p) => p,
            None => {
                let (winning_pool, _) = if winning_outcome == "Yes" {
                    (market.yes_pool, market.no_pool)
                } else {
                    (market.no_pool, market.yes_pool)
                };

                let total_value: u128 = market.total_pool.into();
                let winning_value: u128 = winning_pool.into();
                let stake_value: u128 = bet.stake.into();

                if winning_value == 0 {
                    panic!("No winning pool");
                }

                let payout_value =
                    (stake_value as f64 * total_value as f64 / winning_value as f64) as u128;
                let payout = Amount::from_tokens(payout_value);
                bet.payout_amount = Some(payout);
                payout
            }
        };

        bet.claim_status = ClaimStatus::Claimed;
        self.state
            .bets
            .insert(&(market_id, bettor), bet)
            .expect("Failed to update bet");

        eprintln!("✅ Payout claimed for market {}: {}", market_id, payout);
    }

    /// Request resolution for an expired market
    /// Supports two modes:
    /// 1. Hub-and-Spoke: Uses call_application() to local Registry Instance
    /// 2. Cross-chain: Sends OracleRequest to Registry chain (legacy)
    async fn request_resolution(&mut self, market_id: u64) {
        eprintln!("🔔 Requesting resolution for market {}", market_id);

        let mut market = match self.state.markets.get(&market_id).await {
            Ok(Some(m)) => m,
            Ok(None) => panic!("Market not found"),
            Err(e) => panic!("Failed to get market: {}", e),
        };

        if market.status != MarketStatus::Open {
            panic!("Market already processed (status: {:?})", market.status);
        }

        let registry_app_id = match *self.state.registry_app_id.get() {
            Some(id) => id,
            None => panic!("Registry app ID not configured"),
        };

        let registry_chain_id = match *self.state.registry_chain_id.get() {
            Some(id) => id,
            None => panic!("Registry chain ID not configured"),
        };
        
        let use_local_instance = *self.state.use_local_instance.get();

        // Prepare callback data
        let callback_data = encode_request_id(market_id);
        let callback_chain = self.runtime.chain_id();
        let callback_app = self.runtime.application_id().forget_abi();

        // Set deadline to 5 minutes from now for Oracle voting (for faster testing)
        let now = self.runtime.system_time();
        let five_minutes_micros = 300 * 1_000_000u64; // 5 minutes in microseconds
        let oracle_deadline = Timestamp::from(now.micros().saturating_add(five_minutes_micros));

        // NOTE: call_application() with authenticated operations causes WASM RuntimeError: unreachable
        // This is a known limitation when calling from one contract to another.
        // We'll use cross-chain messaging instead, which is more reliable.
        // Even if use_local_instance=true, we'll use cross-chain messaging for now.
        
        // Update market status
        market.status = MarketStatus::Voting;
        market.registry_chain = Some(registry_chain_id);
        self.state
            .markets
            .insert(&market_id, market.clone())
            .expect("Failed to update market status");

        // Use cross-chain messaging (more reliable than call_application for authenticated operations)
        let oracle_request = OracleRequest::CreateQuery {
            request_id: market_id,
            description: market.question.clone(),
            outcomes: vec!["Yes".to_string(), "No".to_string()],
            deadline: oracle_deadline,
            callback_chain,
            callback_app,
            callback_data,
        };

        let message = Message::OracleRequest(oracle_request);

        eprintln!(
            "📤 Sending OracleRequest to Registry chain {}: market_id={}, callback_chain={}",
            registry_chain_id, market_id, callback_chain
        );

        // Send cross-chain message
        self.runtime
            .prepare_message(message)
            .with_authentication()
            .with_tracking()
            .send_to(registry_chain_id);

        eprintln!(
            "✅ OracleRequest sent to Registry for market {}",
            market_id
        );
    }

    /// Link a market with its query ID
    async fn link_query_to_market(&mut self, market_id: u64, query_id: u64) {
        eprintln!("🔗 Linking market {} to query {}", market_id, query_id);

        let mut market = match self.state.markets.get(&market_id).await {
            Ok(Some(m)) => m,
            Ok(None) => {
                eprintln!("⚠️ Market {} not found for linking", market_id);
                return;
            }
            Err(e) => {
                eprintln!("❌ Failed to get market {}: {}", market_id, e);
                return;
            }
        };

        market.query_id = Some(query_id);
        self.state
            .markets
            .insert(&market_id, market)
            .expect("Failed to update market");

        eprintln!("✅ Market {} linked to query {}", market_id, query_id);
    }

    /// Handle query resolution
    async fn handle_resolution(
        &mut self,
        market_id: u64,
        query_id: u64,
        result: String,
        resolved_at: Timestamp,
    ) {
        eprintln!(
            "📥 Processing resolution: market_id={}, query_id={}, result={}",
            market_id, query_id, result
        );

        let mut market = match self.state.markets.get(&market_id).await {
            Ok(Some(m)) => m,
            Ok(None) => {
                eprintln!("❌ Market {} not found", market_id);
                return;
            }
            Err(e) => {
                eprintln!("❌ Failed to get market {}: {}", market_id, e);
                return;
            }
        };

        if market.status == MarketStatus::Resolved {
            eprintln!("⚠️ Market {} already resolved", market_id);
            return;
        }

        market.status = MarketStatus::Resolved;
        market.query_id = Some(query_id);
        market.winning_outcome = Some(result.clone());
        market.resolved_at = Some(resolved_at);

        self.state
            .markets
            .insert(&market_id, market)
            .expect("Failed to update market");

        eprintln!("✅ Market {} resolved with outcome: {}", market_id, result);
    }

    /// Handle query expiration
    async fn handle_query_expired(&mut self, market_id: u64, _query_id: u64) {
        // Could implement retry logic or refund bets
        eprintln!(
            "⚠️ Query for market {} expired without resolution",
            market_id
        );

        // For now, just log - in production could:
        // 1. Retry with higher reward
        // 2. Refund all bets
        // 3. Allow market creator to decide
    }

    /// Handle query cancellation
    async fn handle_query_cancelled(&mut self, market_id: u64, _query_id: u64, reason: String) {
        eprintln!(
            "⚠️ Query for market {} cancelled: {}",
            market_id, reason
        );

        // Could implement refund logic here
    }
    
    /// Mark market as pending finalization (waiting for dispute window to pass)
    async fn mark_pending_finalization(
        &mut self,
        market_id: u64,
        pending_result: String,
        resolved_at: linera_sdk::linera_base_types::Timestamp,
    ) {
        eprintln!(
            "⏳ Market {} marked as pending finalization: result={}, resolved_at={}",
            market_id, pending_result, resolved_at.micros()
        );

        // Update market status to indicate it's pending finalization
        // In a more complete implementation, you'd track the pending result
        // For now, we'll let the QueryFinalized callback handle the actual settlement
        if let Ok(Some(mut market)) = self.state.markets.get(&market_id).await {
            // Don't change status yet - wait for finalization
            // Just log that we're waiting
            eprintln!(
                "📝 Market {} is waiting for dispute window to pass before settling to '{}'",
                market_id, pending_result
            );
        }
    }
    
    /// Handle dispute raised against query result
    async fn handle_query_disputed(
        &mut self,
        market_id: u64,
        query_id: u64,
        original_result: String,
        disputed_outcome: String,
    ) {
        eprintln!(
            "⚠️ Market {} (query {}) is being disputed: original={}, disputed_to={}",
            market_id, query_id, original_result, disputed_outcome
        );

        // Update market to show it's disputed
        if let Ok(Some(mut market)) = self.state.markets.get(&market_id).await {
            // Don't settle yet - wait for DisputeResolved callback
            market.status = MarketStatus::Voting; // Keep in voting until dispute resolved
            self.state
                .markets
                .insert(&market_id, market)
                .expect("Failed to update market");
            
            eprintln!(
                "📝 Market {} status set to Voting while dispute is resolved",
                market_id
            );
        }
    }
    
    /// Register this market app as a consumer app with Oracle Registry
    /// This enables access control and rate limiting
    async fn register_as_consumer_app(
        &mut self,
        registry_app_id: linera_sdk::linera_base_types::ApplicationId<oracle_registry_v2::OracleRegistryV2Abi>,
    ) {
        eprintln!("📝 Registering Simple Market as consumer app with Oracle Registry...");
        
        // Create registration operation
        let operation = oracle_registry_v2::Operation::RegisterConsumerApp {
            name: "Simple Prediction Market".to_string(),
            category: oracle_registry_v2::AppCategory::PredictionMarket,
            stake: Amount::ZERO, // Free tier for now
            metadata_url: None,
            logo_url: None,
        };
        
        // Call Registry to register (registry_app_id is already typed)
        let response: oracle_registry_v2::OperationResponse = self.runtime.call_application(
            true,  // authenticated
            registry_app_id,
            &operation,
        );
        
        if response.success {
            eprintln!("✅ Consumer app registered: {}", response.message);
        } else {
            // Don't panic - registration failure shouldn't block market deployment
            // The market can still work, just without rate limiting benefits
            eprintln!("⚠️ Consumer app registration failed (non-fatal): {}", response.message);
        }
    }
}
