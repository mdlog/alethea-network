// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

#![cfg_attr(target_arch="wasm32", no_main)]

mod state;

use linera_sdk::{
    linera_base_types::{Amount, WithContractAbi, StreamName, StreamUpdate, ChainId, Timestamp},
    views::{View, RootView},
    Contract, ContractRuntime,
};
use state::{OracleRegistryV2, ProtocolParameters};
use oracle_registry_v2::{OracleEvent, InstantiationArgument, ORACLE_STREAM_NAME};

pub struct OracleRegistryV2Contract {
    state: OracleRegistryV2,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(OracleRegistryV2Contract);

impl WithContractAbi for OracleRegistryV2Contract {
    type Abi = oracle_registry_v2::OracleRegistryV2Abi;
}

impl Contract for OracleRegistryV2Contract {
    type Message = oracle_registry_v2::Message;
    type InstantiationArgument = InstantiationArgument;
    type Parameters = ();
    type EventValue = OracleEvent;  // ← Enable event streaming!

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = OracleRegistryV2::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        
        OracleRegistryV2Contract { state, runtime }
    }

    async fn instantiate(&mut self, argument: InstantiationArgument) {
        let admin_chain = self.runtime.chain_id();
        
        match argument {
            InstantiationArgument::Hub => {
                // Initialize as Hub (master registry)
                eprintln!("🏛️ Initializing Oracle Registry as HUB on chain {}", admin_chain);
                
                let params = ProtocolParameters::default();
                self.state.initialize(params, admin_chain).await;
                
                // Initialize test voters for development/testing
                OracleRegistryV2Contract::initialize_test_voters_internal(&mut self.state).await;
                
                // Subscribe to own events for cross-chain propagation
                let chain_id = self.runtime.chain_id();
                let app_id = self.runtime.application_id().forget_abi();
                self.runtime.subscribe_to_events(
                    chain_id,
                    app_id,
                    StreamName::from(ORACLE_STREAM_NAME),
                );
                
                eprintln!("✅ Hub initialized successfully");
            }
            
            InstantiationArgument::Instance { hub_chain_id } => {
                // Initialize as Instance (local proxy)
                eprintln!(
                    "🔗 Initializing Oracle Registry as INSTANCE on chain {}, Hub: {}",
                    admin_chain, hub_chain_id
                );
                
                self.state.initialize_as_instance(hub_chain_id, admin_chain).await;
                
                // Subscribe to Hub's events for receiving resolutions
                let app_id = self.runtime.application_id().forget_abi();
                self.runtime.subscribe_to_events(
                    hub_chain_id,
                    app_id,
                    StreamName::from(ORACLE_STREAM_NAME),
                );
                
                eprintln!("✅ Instance initialized, connected to Hub: {}", hub_chain_id);
            }
        }
        
        // Save state after initialization
        self.state.save().await.expect("Failed to save initial state");
    }
    
    async fn store(mut self) {
        // CRITICAL: Must explicitly save state!
        // Without this, all state changes are lost after operation completes
        self.state.save().await.expect("Failed to save state");
    }
    
    /// Process incoming event streams from subscribed chains
    /// This enables real-time cross-chain event handling
    async fn process_streams(&mut self, updates: Vec<StreamUpdate>) {
        for update in updates {
            let stream_name_str = String::from_utf8_lossy(&update.stream_id.stream_name.0);
            
            // Only process oracle events
            if stream_name_str == ORACLE_STREAM_NAME {
                for index in update.previous_index..update.next_index {
                    let event: OracleEvent = self.runtime.read_event(
                        update.chain_id,
                        update.stream_id.stream_name.clone(),
                        index,
                    );
                    
                    // Log event for debugging
                    eprintln!(
                        "📨 Received OracleEvent from chain {}: {:?}",
                        update.chain_id, event
                    );
                    
                    // Process event based on type
                    self.handle_oracle_event(event, update.chain_id).await;
                }
            }
        }
    }

    async fn execute_operation(&mut self, operation: Self::Operation) -> Self::Response {
        use oracle_registry_v2::{Operation, OperationResponse};
        
        // Check if paused (except for admin operations)
        if self.state.is_paused().await {
            match operation {
                Operation::UnpauseProtocol => {},
                _ => return OperationResponse::error("Protocol is paused"),
            }
        }
        
        match operation {
            Operation::RegisterVoter { stake, name, metadata_url } => {
                self.register_voter_chainid(stake, name, metadata_url).await
            }
            
            Operation::RegisterVoterFor { voter_address, stake, name, metadata_url } => {
                self.register_voter_for(voter_address, stake, name, metadata_url).await
            }
            
            Operation::UpdateStake { additional_stake } => {
                self.update_stake(additional_stake).await
            }
            
            Operation::WithdrawStake { amount } => {
                self.withdraw_stake(amount).await
            }
            
            Operation::DeregisterVoter => {
                self.deregister_voter().await
            }
            
            Operation::CreateQuery { description, outcomes, strategy, min_votes, reward_amount, deadline, duration_secs } => {
                // Convert from lib DecisionStrategy to state DecisionStrategy
                let state_strategy = match strategy {
                    oracle_registry_v2::state::DecisionStrategy::Majority => state::DecisionStrategy::Majority,
                    oracle_registry_v2::state::DecisionStrategy::Median => state::DecisionStrategy::Median,
                    oracle_registry_v2::state::DecisionStrategy::WeightedByStake => state::DecisionStrategy::WeightedByStake,
                    oracle_registry_v2::state::DecisionStrategy::WeightedByReputation => state::DecisionStrategy::WeightedByReputation,
                };
                self.create_query(description, outcomes, state_strategy, min_votes, reward_amount, deadline, duration_secs).await
            }
            
            Operation::SubmitVote { query_id, value, confidence } => {
                self.submit_vote(query_id, value, confidence).await
            }
            
            Operation::CommitVote { query_id, commit_hash } => {
                self.commit_vote(query_id, commit_hash).await
            }
            
            Operation::RevealVote { query_id, value, salt, confidence } => {
                self.reveal_vote(query_id, value, salt, confidence).await
            }
            
            Operation::ResolveQuery { query_id } => {
                self.resolve_query(query_id).await
            }
            
            Operation::ClaimRewards => {
                self.claim_rewards().await
            }
            
            Operation::ClaimRewardsFor { voter_address } => {
                self.claim_rewards_for(voter_address).await
            }
            
            Operation::WithdrawStakeFor { voter_address, amount } => {
                self.withdraw_stake_for(voter_address, amount).await
            }
            
            Operation::UpdateStakeFor { voter_address, additional_stake } => {
                self.update_stake_for(voter_address, additional_stake).await
            }
            
            Operation::ClaimWithdrawableTokens { voter_address } => {
                self.claim_withdrawable_tokens(voter_address).await
            }
            
            Operation::UpdateParameters { params } => {
                // Convert params to state::ProtocolParameters
                // They are the same struct, just different namespace
                let state_params = state::ProtocolParameters {
                    min_stake: params.min_stake,
                    min_votes_default: params.min_votes_default,
                    default_query_duration: params.default_query_duration,
                    reward_percentage: params.reward_percentage,
                    slash_percentage: params.slash_percentage,
                    protocol_fee: params.protocol_fee,
                    token_app_id: None, // Token app ID is set separately
                    token_chain_id: None, // Token chain ID is set separately
                    max_voters_per_query: state::default_max_voters_per_query(),
                    // Hybrid model parameters (use defaults)
                    min_bond: state::default_min_bond(),
                    inflation_rate_bps: state::default_inflation_rate(),
                    inflation_reward_per_query: state::default_inflation_reward_per_query(),
                    dispute_window_secs: state::default_dispute_window(),
                    dispute_bond_percentage: state::default_dispute_bond_percentage(),
                    inflation_reward_share: state::default_inflation_reward_share(),
                    // Inflation control & service fee (use defaults)
                    protocol_launch_timestamp: params.protocol_launch_timestamp,
                    total_supply: params.total_supply,
                    expected_queries_per_year: params.expected_queries_per_year,
                    queries_this_year: params.queries_this_year,
                    last_reset_year: params.last_reset_year,
                    min_service_fee: params.min_service_fee,
                };
                self.update_parameters(state_params).await
            }
            
            Operation::PauseProtocol => {
                self.pause_protocol().await
            }
            
            Operation::UnpauseProtocol => {
                self.unpause_protocol().await
            }
            
            Operation::CheckExpiredQueries => {
                self.check_expired_queries_operation().await
            }
            
            Operation::ExpireQuery { query_id } => {
                self.expire_query_operation(query_id).await
            }
            
            Operation::AutoResolveQueries => {
                self.auto_resolve_queries_operation().await
            }
            
            Operation::SendRegisterVoterMessage { target_chain, stake, name, metadata_url } => {
                self.send_register_voter_message(target_chain, stake, name, metadata_url).await
            }
            
            Operation::SendSubmitVoteMessage { target_chain, query_id, value, confidence } => {
                self.send_submit_vote_message(target_chain, query_id, value, confidence).await
            }
            
            Operation::SendCommitVoteMessage { target_chain, query_id, commit_hash } => {
                eprintln!("🔥 [CONTRACT] execute_operation: SendCommitVoteMessage");
                eprintln!("   Current chain: {}", self.runtime.chain_id());
                eprintln!("   Target chain: {}", target_chain);
                eprintln!("   Query ID: {}", query_id);
                eprintln!("   Commit hash: {}", commit_hash);
                let result = self.send_commit_vote_message(target_chain, query_id, commit_hash).await;
                eprintln!("🔥 [CONTRACT] SendCommitVoteMessage result: {:?}", result);
                result
            }
            
            Operation::SendRevealVoteMessage { target_chain, query_id, value, salt, confidence } => {
                self.send_reveal_vote_message(target_chain, query_id, value, salt, confidence).await
            }
            
            Operation::SendCreateQueryMessage { target_chain, description, outcomes, strategy, min_votes, reward_amount, duration_secs } => {
                self.send_create_query_message(target_chain, description, outcomes, strategy, min_votes, reward_amount, duration_secs).await
            }
            
            Operation::SendUpdateStakeMessage { target_chain, additional_stake } => {
                self.send_update_stake_message(target_chain, additional_stake).await
            }
            
            Operation::CreateQueryWithCallback {
                description,
                outcomes,
                strategy,
                min_votes,
                reward_amount,
                deadline,
                callback_chain,
                callback_app,
                callback_data,
            } => {
                // Check if we're in Instance mode - forward to Hub
                if self.state.is_instance() {
                    return self.forward_query_to_hub(
                        description,
                        outcomes,
                        strategy,
                        min_votes,
                        reward_amount,
                        deadline,
                        callback_chain,
                        callback_app,
                        callback_data,
                    ).await;
                }
                
                // Hub mode: process locally
                // Convert from lib DecisionStrategy to state DecisionStrategy
                let state_strategy = match strategy {
                    oracle_registry_v2::state::DecisionStrategy::Majority => state::DecisionStrategy::Majority,
                    oracle_registry_v2::state::DecisionStrategy::Median => state::DecisionStrategy::Median,
                    oracle_registry_v2::state::DecisionStrategy::WeightedByStake => state::DecisionStrategy::WeightedByStake,
                    oracle_registry_v2::state::DecisionStrategy::WeightedByReputation => state::DecisionStrategy::WeightedByReputation,
                };
                self.create_query_with_callback(
                    description,
                    outcomes,
                    state_strategy,
                    min_votes,
                    reward_amount,
                    deadline,
                    callback_chain,
                    callback_app,
                    callback_data,
                ).await
            }
            
            // ==================== CONSUMER APP OPERATIONS ====================
            
            Operation::RegisterConsumerApp { name, category, stake, metadata_url, logo_url } => {
                // Convert from lib AppCategory to state AppCategory
                let state_category = match category {
                    oracle_registry_v2::AppCategory::PredictionMarket => state::AppCategory::PredictionMarket,
                    oracle_registry_v2::AppCategory::Insurance => state::AppCategory::Insurance,
                    oracle_registry_v2::AppCategory::Gaming => state::AppCategory::Gaming,
                    oracle_registry_v2::AppCategory::DeFi => state::AppCategory::DeFi,
                    oracle_registry_v2::AppCategory::DataFeed => state::AppCategory::DataFeed,
                    oracle_registry_v2::AppCategory::Custom(s) => state::AppCategory::Custom(s),
                };
                self.register_consumer_app(name, state_category, stake, metadata_url, logo_url).await
            }
            
            Operation::UpdateConsumerApp { name, category, metadata_url } => {
                // Convert from lib AppCategory to state AppCategory
                let state_category = category.map(|c| match c {
                    oracle_registry_v2::AppCategory::PredictionMarket => state::AppCategory::PredictionMarket,
                    oracle_registry_v2::AppCategory::Insurance => state::AppCategory::Insurance,
                    oracle_registry_v2::AppCategory::Gaming => state::AppCategory::Gaming,
                    oracle_registry_v2::AppCategory::DeFi => state::AppCategory::DeFi,
                    oracle_registry_v2::AppCategory::DataFeed => state::AppCategory::DataFeed,
                    oracle_registry_v2::AppCategory::Custom(s) => state::AppCategory::Custom(s),
                });
                self.update_consumer_app(name, state_category, metadata_url).await
            }
            
            Operation::UpgradeConsumerAppTier { additional_stake } => {
                self.upgrade_consumer_app_tier(additional_stake).await
            }
            
            Operation::DeregisterConsumerApp => {
                self.deregister_consumer_app().await
            }
            
            Operation::SuspendConsumerApp { app_id, chain_id, reason } => {
                self.suspend_consumer_app(app_id, chain_id, reason).await
            }
            
            Operation::ReactivateConsumerApp { app_id, chain_id } => {
                self.reactivate_consumer_app(app_id, chain_id).await
            }
            
            Operation::SetTokenConfig { token_app_id, token_chain_id } => {
                self.set_token_config(token_app_id, token_chain_id).await
            }
            
            // ==================== HYBRID MODEL OPERATIONS ====================
            
            Operation::CreateQueryWithBond {
                description,
                outcomes,
                strategy,
                min_votes,
                bond_amount,
                service_fee,
                priority_fee,
                duration_secs,
                callback_chain,
                callback_app,
                callback_data,
                title,
                category,
                context,
                resolution_criteria,
                source_urls,
                tags,
                metadata_url,
                external_id,
            } => {
                let metadata = state::QueryMetadata {
                    title,
                    category,
                    context,
                    resolution_criteria,
                    source_urls,
                    tags,
                    metadata_url,
                    external_id,
                };
                // Convert strategy from lib to state
                let state_strategy = match strategy {
                    oracle_registry_v2::DecisionStrategy::Majority => state::DecisionStrategy::Majority,
                    oracle_registry_v2::DecisionStrategy::Median => state::DecisionStrategy::Median,
                    oracle_registry_v2::DecisionStrategy::WeightedByStake => state::DecisionStrategy::WeightedByStake,
                    oracle_registry_v2::DecisionStrategy::WeightedByReputation => state::DecisionStrategy::WeightedByReputation,
                };
                self.create_query_with_bond(
                    description,
                    outcomes,
                    state_strategy,
                    min_votes,
                    bond_amount,
                    service_fee,
                    priority_fee.unwrap_or(Amount::ZERO),
                    duration_secs,
                    callback_chain,
                    callback_app,
                    callback_data,
                    metadata,
                ).await
            }
            
            Operation::ClaimBondRefund { query_id } => {
                self.claim_bond_refund(query_id).await
            }
            
            Operation::RaiseDispute {
                query_id,
                disputed_outcome,
                dispute_bond,
                reason,
            } => {
                self.raise_dispute(query_id, disputed_outcome, dispute_bond, reason).await
            }
            
            Operation::ResolveDispute {
                query_id,
                final_outcome,
                winner,
            } => {
                self.resolve_dispute(query_id, final_outcome, winner).await
            }
            
            Operation::MintInflation { amount } => {
                self.mint_inflation(amount).await
            }
            
            Operation::UpdateHybridParameters {
                min_bond,
                inflation_rate_bps,
                inflation_reward_per_query,
                dispute_window_secs,
                dispute_bond_percentage,
            } => {
                self.update_hybrid_parameters(
                    min_bond,
                    inflation_rate_bps,
                    inflation_reward_per_query,
                    dispute_window_secs,
                    dispute_bond_percentage,
                ).await
            }
            
            Operation::SetProtocolLaunchTimestamp { timestamp } => {
                self.set_protocol_launch_timestamp(timestamp).await
            }
            
            Operation::UpdateInflationControl {
                total_supply,
                expected_queries_per_year,
            } => {
                self.update_inflation_control(Some(total_supply), Some(expected_queries_per_year)).await
            }
            
            Operation::ResetYearlyCounters => {
                self.reset_yearly_counters().await
            }
        }
    }

    async fn execute_message(&mut self, message: Self::Message) {
        use oracle_registry_v2::Message;
        
        // Handle cross-chain messages for account-based voting
        // Authentication is automatic - Linera verifies the message sender
        let response = match message {
            Message::RegisterVoter { sender_chain, stake, name, metadata_url } => {
                // sender_chain is already a ChainId, use directly
                self.register_voter_from_message(sender_chain, stake, name, metadata_url).await
            }
            
            Message::UpdateStake { sender_chain, additional_stake } => {
                self.update_stake_from_message(sender_chain, additional_stake).await
            }
            
            Message::WithdrawStake { amount } => {
                self.withdraw_stake(amount).await
            }
            
            Message::DeregisterVoter => {
                self.deregister_voter().await
            }
            
            Message::SubmitVote { sender_chain, query_id, value, confidence } => {
                self.submit_vote_from_message(sender_chain, query_id, value, confidence).await
            }
            
            Message::CommitVote { sender_chain, query_id, commit_hash } => {
                eprintln!("🔥 [CONTRACT] execute_message: CommitVote");
                eprintln!("   Current chain (receiver): {}", self.runtime.chain_id());
                eprintln!("   Sender chain: {}", sender_chain);
                eprintln!("   Query ID: {}", query_id);
                eprintln!("   Commit hash: {}", commit_hash);
                let result = self.commit_vote_from_message(sender_chain, query_id, commit_hash).await;
                eprintln!("🔥 [CONTRACT] CommitVote result: {:?}", result);
                result
            }
            
            Message::RevealVote { sender_chain, query_id, value, salt, confidence } => {
                self.reveal_vote_from_message(sender_chain, query_id, value, salt, confidence).await
            }
            
            Message::ClaimRewards => {
                self.claim_rewards().await
            }
            
            // Handle cross-chain query creation
            Message::CreateQuery { sender_chain, description, outcomes, strategy, min_votes, reward_amount, duration_secs } => {
                self.create_query_from_message(sender_chain, description, outcomes, strategy, min_votes, reward_amount, duration_secs).await
            }
            
            // NEW: Handle automatic query creation from expired markets
            Message::CreateQueryFromMarket {
                market_id,
                question,
                outcomes,
                deadline,
                callback_chain,
                callback_data,
            } => {
                self.handle_create_query_from_market(
                    market_id,
                    question,
                    outcomes,
                    deadline,
                    callback_chain,
                    callback_data,
                ).await
            }
            
            // Handle query resolution callback (not used in Registry, but required for Message enum)
            Message::QueryResolutionCallback { .. } => {
                // This message is sent FROM Registry TO Market, not received by Registry
                // If we receive it, just ignore it
                oracle_registry_v2::OperationResponse::error("Registry does not handle QueryResolutionCallback")
            }
            
            // Handle token integration messages
            Message::ReceiveTokensForStake { sender_chain, sender: _, amount } => {
                // Tokens received from alethea-token contract for staking
                // Add to voter's stake
                self.handle_receive_tokens_for_stake(sender_chain, amount).await
            }
            
            Message::WithdrawTokens { amount, target_chain } => {
                // Request to withdraw tokens back to user
                self.handle_withdraw_tokens(amount, target_chain).await
            }
            
            // ==================== SHARED MESSAGE TYPES (Production) ====================
            
            Message::OracleRequest(request) => {
                self.handle_oracle_request(request).await
            }
            
            Message::OracleCallback(_) => {
                // This is an outgoing message type, should not be received by Registry
                oracle_registry_v2::OperationResponse::error("Registry does not receive OracleCallback")
            }
            
            // ==================== HUB-INSTANCE MESSAGES ====================
            
            Message::ForwardQueryToHub {
                local_query_id,
                description,
                outcomes,
                strategy,
                min_votes,
                reward_amount,
                deadline,
                source_chain,
                callback_app,
                callback_data,
            } => {
                self.handle_forward_query_to_hub(
                    local_query_id,
                    description,
                    outcomes,
                    strategy,
                    min_votes,
                    reward_amount,
                    deadline,
                    source_chain,
                    callback_app,
                    callback_data,
                ).await
            }
            
            Message::QueryCreatedOnHub { local_query_id, hub_query_id } => {
                self.handle_query_created_on_hub(local_query_id, hub_query_id).await
            }
            
            Message::QueryResolvedFromHub {
                hub_query_id,
                result,
                resolved_at,
                vote_count,
                confidence,
            } => {
                self.handle_query_resolved_from_hub(
                    hub_query_id,
                    result,
                    resolved_at,
                    vote_count,
                    confidence,
                ).await
            }
            
            Message::QueryExpiredFromHub {
                hub_query_id,
                votes_received,
                votes_required,
            } => {
                self.handle_query_expired_from_hub(
                    hub_query_id,
                    votes_received,
                    votes_required,
                ).await
            }
            
            // ==================== CONSUMER APP MESSAGES ====================
            
            Message::RegisterConsumerAppOnHub {
                app_id,
                source_chain,
                name,
                category,
                stake,
                metadata_url,
                logo_url,
            } => {
                self.handle_register_consumer_app_on_hub(
                    app_id,
                    source_chain,
                    name,
                    category,
                    stake,
                    metadata_url,
                    logo_url,
                ).await
            }
            
            Message::ConsumerAppRegistered { app_id, chain_id, tier, rate_limit } => {
                // This is a confirmation message from Hub to Instance
                // Instance can cache this info if needed
                eprintln!(
                    "✅ Consumer app registered: {:?} on chain {}, tier: {}, rate_limit: {}",
                    app_id, chain_id, tier, rate_limit
                );
                oracle_registry_v2::OperationResponse::success("Consumer app registration confirmed")
            }
            
            Message::ConsumerAppRegistrationRejected { app_id, chain_id, reason } => {
                eprintln!(
                    "❌ Consumer app registration rejected: {:?} on chain {}, reason: {}",
                    app_id, chain_id, reason
                );
                oracle_registry_v2::OperationResponse::error(reason)
            }
            
            Message::DeregisterConsumerAppOnHub { app_id, source_chain } => {
                self.handle_deregister_consumer_app_on_hub(app_id, source_chain).await
            }
            
            Message::ConsumerAppDeregistered { app_id, chain_id, stake_returned } => {
                eprintln!(
                    "✅ Consumer app deregistered: {:?} on chain {}, stake returned: {}",
                    app_id, chain_id, stake_returned
                );
                oracle_registry_v2::OperationResponse::success("Consumer app deregistration confirmed")
            }
        };
        
        // Response is handled internally by the contract
        // No need to return or log explicitly
        let _ = response;
    }
}


// ==================== VOTER MANAGEMENT ====================

impl OracleRegistryV2Contract {
    // ==================== VALIDATION HELPERS ====================
    
    /// Validate voter registration parameters
    fn validate_registration_params(
        &self,
        stake: Amount,
        name: &Option<String>,
        metadata_url: &Option<String>,
    ) -> Result<(), String> {
        // Validate stake is positive
        if stake == Amount::ZERO {
            return Err("Stake must be greater than zero".to_string());
        }
        
        // Validate name if provided
        if let Some(ref n) = name {
            if n.is_empty() {
                return Err("Name cannot be empty".to_string());
            }
            if n.len() > 100 {
                return Err("Name too long (max 100 characters)".to_string());
            }
            // Check for valid characters (alphanumeric, spaces, hyphens, underscores)
            if !n.chars().all(|c| c.is_alphanumeric() || c.is_whitespace() || c == '-' || c == '_') {
                return Err("Name contains invalid characters".to_string());
            }
        }
        
        // Validate metadata URL if provided
        if let Some(ref url) = metadata_url {
            if url.is_empty() {
                return Err("Metadata URL cannot be empty".to_string());
            }
            if url.len() > 500 {
                return Err("Metadata URL too long (max 500 characters)".to_string());
            }
            // Basic URL validation
            if !url.starts_with("http://") && !url.starts_with("https://") && !url.starts_with("ipfs://") {
                return Err("Metadata URL must start with http://, https://, or ipfs://".to_string());
            }
        }
        
        Ok(())
    }
    
    /// Validate voter is registered and active
    async fn validate_voter_registered(&self, voter_chain: &linera_sdk::linera_base_types::ChainId) -> Result<state::VoterInfo, String> {
        match self.state.get_voter(voter_chain).await {
            Some(info) => {
                if !info.is_active {
                    return Err("Voter is not active".to_string());
                }
                Ok(info)
            }
            None => Err("Voter not registered".to_string()),
        }
    }
    
    /// Validate voter is not already registered
    async fn validate_voter_not_registered(&self, voter_chain: &linera_sdk::linera_base_types::ChainId) -> Result<(), String> {
        if self.state.get_voter(voter_chain).await.is_some() {
            return Err("Already registered as voter".to_string());
        }
        Ok(())
    }
    
    /// Calculate expected registry token balance based on all voter stakes
    /// This helps verify that token transfers match registry state
    async fn calculate_expected_registry_balance(&self) -> Amount {
        // Sum all voter stakes to get expected token balance
        let total_stake = *self.state.total_stake.get();
        eprintln!("📊 Expected registry balance calculation:");
        eprintln!("   Total stake in registry: {}", total_stake);
        total_stake
    }
    
    /// Validate stake amount meets minimum requirement
    fn validate_minimum_stake(&self, stake: Amount, min_stake: Amount) -> Result<(), String> {
        if stake < min_stake {
            return Err(format!(
                "Insufficient stake: required {}, provided {}",
                min_stake, stake
            ));
        }
        Ok(())
    }
    
    /// Validate voter has sufficient stake for withdrawal
    fn validate_sufficient_stake(
        &self,
        current_stake: Amount,
        locked_stake: Amount,
        withdrawal_amount: Amount,
        min_stake: Amount,
    ) -> Result<(), String> {
        // Calculate available stake using Amount operations directly
        let available_stake = current_stake.saturating_sub(locked_stake);
        
        if withdrawal_amount > available_stake {
            return Err(format!(
                "Insufficient available stake: have {} (total: {}, locked: {}), requested {}",
                available_stake, current_stake, locked_stake, withdrawal_amount
            ));
        }
        
        // Check remaining stake meets minimum (unless withdrawing all available)
        let remaining = current_stake.saturating_sub(withdrawal_amount);
        if remaining > locked_stake && remaining < min_stake {
            return Err(format!(
                "Remaining stake {} would be below minimum {}",
                remaining, min_stake
            ));
        }
        
        Ok(())
    }
    
    /// Validate voter has no active votes (for withdrawal/deregistration)
    async fn validate_no_active_votes(&self, voter_chain: &linera_sdk::linera_base_types::ChainId) -> Result<(), String> {
        // Check if voter has any votes on active queries
        let active_queries = self.state.get_active_queries().await;
        
        for query_id in active_queries {
            if let Some(query) = self.state.get_query(query_id).await {
                if query.votes.contains_key(voter_chain) {
                    return Err(format!(
                        "Cannot proceed: voter has active vote on query {}",
                        query_id
                    ));
                }
            }
        }
        
        Ok(())
    }
    
    /// Validate voter has no pending rewards (for deregistration)
    async fn validate_no_pending_rewards(&self, voter_chain: &linera_sdk::linera_base_types::ChainId) -> Result<(), String> {
        let pending = self.state.get_pending_rewards(voter_chain).await;
        if pending > Amount::ZERO {
            return Err(format!(
                "Cannot deregister: {} pending rewards must be claimed first",
                pending
            ));
        }
        Ok(())
    }
    
    /// Validate voter reputation is above minimum threshold
    fn validate_reputation_threshold(&self, reputation: u8, min_reputation: u8) -> Result<(), String> {
        if reputation < min_reputation {
            return Err(format!(
                "Reputation {} below minimum threshold {}",
                reputation, min_reputation
            ));
        }
        Ok(())
    }
    
    /// Validate protocol parameters
    fn validate_protocol_parameters(&self, params: &state::ProtocolParameters) -> Result<(), String> {
        // Validate min_stake is positive
        if params.min_stake == Amount::ZERO {
            return Err("Minimum stake must be greater than zero".to_string());
        }
        
        // Validate min_votes_default is at least 1
        if params.min_votes_default == 0 {
            return Err("Minimum votes default must be at least 1".to_string());
        }
        
        // Validate min_votes_default is reasonable (not too high)
        if params.min_votes_default > 1000 {
            return Err("Minimum votes default too high (max 1000)".to_string());
        }
        
        // Validate default_query_duration is reasonable
        if params.default_query_duration == 0 {
            return Err("Default query duration must be greater than zero".to_string());
        }
        
        // Validate duration is not too short (at least 1 minute)
        if params.default_query_duration < 60 {
            return Err("Default query duration too short (min 60 seconds)".to_string());
        }
        
        // Validate duration is not too long (max 1 year)
        if params.default_query_duration > 31536000 {
            return Err("Default query duration too long (max 1 year)".to_string());
        }
        
        // Validate reward_percentage is reasonable (0-100%)
        if params.reward_percentage > 10000 {
            return Err("Reward percentage too high (max 10000 basis points = 100%)".to_string());
        }
        
        // Validate slash_percentage is reasonable (0-50%)
        if params.slash_percentage > 5000 {
            return Err("Slash percentage too high (max 5000 basis points = 50%)".to_string());
        }
        
        // Validate protocol_fee is reasonable (0-10%)
        if params.protocol_fee > 1000 {
            return Err("Protocol fee too high (max 1000 basis points = 10%)".to_string());
        }
        
        // Validate that reward + slash + fee doesn't exceed 100%
        let total_percentage = params.reward_percentage + params.slash_percentage + params.protocol_fee;
        if total_percentage > 10000 {
            return Err(format!(
                "Total of reward, slash, and fee percentages exceeds 100% ({} basis points)",
                total_percentage
            ));
        }
        
        Ok(())
    }
    
    // ==================== VOTER OPERATIONS ====================

    /// Register a voter on behalf of an address (admin operation)
    ///
    /// ## STAKING FLOW (Dashboard Integration):
    ///
    /// 1. Dashboard calls `stakeTransfer` on Token Contract to move tokens to registry's balance
    /// 2. Dashboard calls this mutation with the stake amount
    /// 3. Registry trusts admin and creates voter with the specified stake
    ///
    /// The stake parameter is used directly since admin has verified the token transfer.
    /// Tokens are held in the registry's balance in the Token Contract (via stakeTransfer).
    async fn register_voter_for(
        &mut self,
        voter_address: String,
        stake: Amount, // Used directly - admin has verified token transfer via stakeTransfer
        name: Option<String>,
        metadata_url: Option<String>,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{OperationResponse, ResponseData};
        use state::VoterInfo;
        use linera_sdk::linera_base_types::ChainId;

        // Verify caller is admin
        let caller_chain = self.runtime.chain_id();
        if !self.state.is_admin(&caller_chain).await {
            return OperationResponse::error("Unauthorized: only admin can register voters on behalf of others");
        }

        // Strip "0x" prefix if present before parsing
        let address_hex = if voter_address.starts_with("0x") || voter_address.starts_with("0X") {
            &voter_address[2..]
        } else {
            &voter_address
        };

        // Parse voter chain ID from hex string
        let voter_chain = match address_hex.parse::<ChainId>() {
            Ok(chain) => chain,
            Err(_) => return OperationResponse::error("Invalid chain ID format: failed to parse hex string"),
        };

        // Validate name/metadata
        if let Some(ref n) = name {
            if n.len() > 100 {
                return OperationResponse::error("Name too long (max 100 chars)");
            }
        }

        // Check if already registered
        if let Err(e) = self.validate_voter_not_registered(&voter_chain).await {
            return OperationResponse::error(e);
        }

        let params = self.state.get_parameters().await;

        // Use the stake parameter directly (admin has verified stakeTransfer was called)
        // Also check token_holdings for any pre-deposited tokens (for backward compatibility)
        let pre_deposited = self.state.token_holdings.get(&voter_chain).await.ok().flatten().unwrap_or(Amount::ZERO);
        let total_stake = stake.saturating_add(pre_deposited);

        // Determine active status based on total stake
        let is_active = total_stake >= params.min_stake;

        eprintln!("📝 ADMIN REGISTER: Voter {} with stake {} (pre-deposited: {}, total: {})",
            voter_chain, stake, pre_deposited, total_stake);
        eprintln!("   Status: {} (min_stake: {})",
            if is_active { "ACTIVE" } else { "INACTIVE" }, params.min_stake);

        // Track the stake in token_holdings for consistency
        if stake > Amount::ZERO {
            self.state.token_holdings.insert(&voter_chain, total_stake).expect("Failed to update token holdings");
            let total_held = *self.state.total_tokens_held.get();
            self.state.total_tokens_held.set(total_held.saturating_add(stake));
        }

        // Create voter info
        let voter_info = VoterInfo {
            chain_id: voter_chain,
            stake: total_stake,
            locked_stake: Amount::ZERO,
            withdrawable_balance: Amount::ZERO,
            reputation: 50,
            total_votes: 0,
            correct_votes: 0,
            registered_at: self.runtime.system_time(),
            is_active,
            name: name.clone(),
            metadata_url: metadata_url.clone(),
        };

        // Store voter
        self.state.voters.insert(&voter_chain, voter_info).expect("Failed to insert voter");

        // Update voter count
        let current_count = *self.state.voter_count.get();
        self.state.voter_count.set(current_count + 1);

        // Update total_stake
        if total_stake > Amount::ZERO {
            let current_stake = *self.state.total_stake.get();
            let new_total = current_stake.saturating_add(total_stake);
            self.state.total_stake.set(new_total);
        }

        // Emit event if active
        if is_active {
            self.emit_oracle_event(OracleEvent::VoterRegistered {
                voter_chain,
                stake: total_stake,
                name: name.clone(),
            });
        }

        // Build response message
        let message = if is_active {
            format!(
                "Voter {} registered and ACTIVATED with {} stake (tokens held in registry balance)",
                voter_chain, total_stake
            )
        } else {
            format!(
                "Voter {} registered (INACTIVE). Stake: {}, needs at least {} ALTH to activate.",
                voter_chain, total_stake, params.min_stake
            )
        };

        OperationResponse::success_with_data(
            &message,
            ResponseData {
                voter_address: Some(voter_chain.to_string()),
                query_id: None,
                vote_count: None,
                rewards_claimed: None,
            }
        )
    }
    
    /// Register a new voter using chain ID (DEPOSIT-FIRST Pattern)
    /// 
    /// ## PROPER STAKING FLOW:
    /// 
    /// 1. User calls `registerVoter()` → Creates entry with stake=0, is_active=false
    /// 2. User transfers ALTH tokens to Oracle Registry's ApplicationId in Token Contract
    /// 3. Token Contract sends `ReceiveTokensForStake` message to Oracle Registry
    /// 4. Oracle Registry receives tokens and updates voter's stake
    /// 5. Voter becomes active when stake >= min_stake
    /// 
    /// ## How to Transfer Tokens:
    /// 
    /// Call Token Contract with:
    /// ```graphql
    /// mutation {
    ///   transfer(
    ///     owner: "YOUR_CHAIN_ID",
    ///     amount: "100.",
    ///     targetAccount: {
    ///       chainId: "ORACLE_REGISTRY_CHAIN_ID",
    ///       owner: "ORACLE_REGISTRY_APP_ID"  # as Address32
    ///     }
    ///   )
    /// }
    /// ```
    async fn register_voter_chainid(
        &mut self,
        _stake: Amount, // Ignored - stake comes from actual token transfer
        name: Option<String>,
        metadata_url: Option<String>,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{OperationResponse, ResponseData};
        use state::VoterInfo;
        
        // Get voter's chain ID - this ALWAYS works! (Microcard pattern)
        let voter_chain = self.runtime.chain_id();
        let params = self.state.get_parameters().await;
        
        // Validate name/metadata
        if let Some(ref n) = name {
            if n.len() > 100 {
                return OperationResponse::error("Name too long (max 100 chars)");
            }
        }
        
        // Check if already registered
        if let Ok(Some(_)) = self.state.voters.get(&voter_chain).await {
            return OperationResponse::error("Chain already registered as voter");
        }
        
        // DEPOSIT-FIRST: Check if tokens are already deposited (user transferred before registering)
        let pre_deposited_tokens = self.state.token_holdings.get(&voter_chain).await.ok().flatten().unwrap_or(Amount::ZERO);
        
        // Determine initial stake and active status based on pre-deposited tokens
        let (initial_stake, is_active) = if pre_deposited_tokens >= params.min_stake {
            // User has pre-deposited enough tokens - activate immediately!
            eprintln!("✅ DEPOSIT-FIRST: Voter {} has {} pre-deposited tokens (min required: {})", 
                voter_chain, pre_deposited_tokens, params.min_stake);
            (pre_deposited_tokens, true)
        } else if pre_deposited_tokens > Amount::ZERO {
            // Some tokens deposited but not enough
            eprintln!("⚠️ DEPOSIT-FIRST: Voter {} has {} tokens but needs {} minimum. Will be INACTIVE.", 
                voter_chain, pre_deposited_tokens, params.min_stake);
            (pre_deposited_tokens, false)
        } else {
            // No tokens deposited yet - create inactive voter
            eprintln!("📝 DEPOSIT-FIRST: Voter {} registered with stake=0. INACTIVE until tokens transferred.", voter_chain);
            eprintln!("   Transfer at least {} ALTH tokens to Oracle Registry to activate.", params.min_stake);
            (Amount::ZERO, false)
        };
        
        // Create voter info
        let voter_info = VoterInfo {
            chain_id: voter_chain,
            stake: initial_stake,
            locked_stake: Amount::ZERO,
            withdrawable_balance: Amount::ZERO,
            reputation: 50, // Default reputation for new voters
            total_votes: 0,
            correct_votes: 0,
            registered_at: self.runtime.system_time(),
            is_active,
            name: name.clone(),
            metadata_url,
        };
        
        // Store voter by chain ID
        self.state.voters.insert(&voter_chain, voter_info).expect("Failed to insert voter");
        
        // Update voter count
        let current_count = *self.state.voter_count.get();
        self.state.voter_count.set(current_count + 1);
        
        // Only update total_stake if we have pre-deposited tokens
        if initial_stake > Amount::ZERO {
            let current_stake = *self.state.total_stake.get();
            let new_total = current_stake.saturating_add(initial_stake);
            self.state.total_stake.set(new_total);
        }
        
        // Emit appropriate event
        if is_active {
            self.emit_oracle_event(OracleEvent::VoterRegistered {
                voter_chain,
                stake: initial_stake,
                name: name.clone(),
            });
        }
        
        // Build response message with instructions
        let message = if is_active {
            format!(
                "Voter registered and ACTIVATED with {} stake from pre-deposited tokens",
                initial_stake
            )
        } else {
            format!(
                "Voter registered (INACTIVE). Transfer at least {} ALTH tokens to activate. \
                Call token contract: transfer(owner: \"{}\", amount: \"{}\", targetAccount: {{ chainId: \"{}\", owner: \"{}\" }})",
                params.min_stake,
                voter_chain,
                params.min_stake,
                self.runtime.chain_id(),
                self.runtime.application_id().forget_abi()
            )
        };
        
        OperationResponse::success_with_data(
            &message,
            ResponseData {
                voter_address: Some(voter_chain.to_string()),
                query_id: None,
                vote_count: None,
                rewards_claimed: None,
            },
        )
    }
    
    /// Register a new voter with explicit address (DEPRECATED - for backward compatibility)
    async fn register_voter_with_address(
        &mut self,
        voter_address: String,
        stake: Amount,
        name: Option<String>,
        metadata_url: Option<String>,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{OperationResponse, ResponseData};
        use state::VoterInfo;
        
        // Parse voter chain ID from string
        let voter_chain = match voter_address.parse::<linera_sdk::linera_base_types::ChainId>() {
            Ok(chain) => chain,
            Err(_) => return OperationResponse::error("Invalid chain ID format"),
        };
        
        // Validate registration parameters
        if let Err(e) = self.validate_registration_params(stake, &name, &metadata_url) {
            return OperationResponse::error(e);
        }
        
        // Check if already registered
        if let Err(e) = self.validate_voter_not_registered(&voter_chain).await {
            return OperationResponse::error(e);
        }
        
        // Check minimum stake
        let params = self.state.get_parameters().await;
        if let Err(e) = self.validate_minimum_stake(stake, params.min_stake) {
            return OperationResponse::error(e);
        }
        
        // Create voter info with default reputation
        let voter_info = VoterInfo {
            chain_id: voter_chain,
            stake,
            locked_stake: Amount::ZERO,
            withdrawable_balance: Amount::ZERO,
            reputation: 50, // Default reputation for new voters
            total_votes: 0,
            correct_votes: 0,
            registered_at: self.runtime.system_time(),
            is_active: true,
            name,
            metadata_url,
        };
        
        // Store voter
        self.state.voters.insert(&voter_chain, voter_info).expect("Failed to insert voter");
        
        // Update totals - use saturating_add to avoid overflow
        let current_stake = *self.state.total_stake.get();
        let new_total = current_stake.saturating_add(stake);
        self.state.total_stake.set(new_total);
        
        let current_count = *self.state.voter_count.get();
        self.state.voter_count.set(current_count + 1);
        
        // Track token holdings for real token backing
        let current_holdings = self.state.token_holdings.get(&voter_chain).await.ok().flatten().unwrap_or(Amount::ZERO);
        if let Err(e) = self.state.token_holdings.insert(&voter_chain, current_holdings.saturating_add(stake)) {
            eprintln!("⚠️  Failed to update token holdings: {}", e);
        }
        
        let total_held = *self.state.total_tokens_held.get();
        self.state.total_tokens_held.set(total_held.saturating_add(stake));
        
        OperationResponse::success_with_data(
            "Voter registered successfully",
            ResponseData {
                voter_address: Some(voter_chain.to_string()),
                query_id: None,
                vote_count: None,
                rewards_claimed: None,
            },
        )
    }
    
    /// Register a new voter (Deposit-First pattern)
    /// 
    /// This creates a voter entry with stake=0. User must then transfer tokens
    /// via the token contract to add stake. Voter becomes active when stake >= min_stake.
    /// 
    /// Flow:
    /// 1. Call registerVoter() - creates entry with stake=0, is_active=false
    /// 2. Transfer tokens to Oracle Registry via token contract
    /// 3. Oracle receives ReceiveTokensForStake message and adds to stake
    /// 4. Voter becomes active when stake >= min_stake
    async fn register_voter(
        &mut self,
        stake: Amount,
        name: Option<String>,
        metadata_url: Option<String>,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{OperationResponse, ResponseData};
        use state::VoterInfo;
        
        // Use chain_id as voter identifier (Microcard pattern)
        let voter_chain = self.runtime.chain_id();
        let params = self.state.get_parameters().await;
        
        // Validate name/metadata
        if let Some(ref n) = name {
            if n.len() > 100 {
                return OperationResponse::error("Name too long (max 100 chars)");
            }
        }
        
        // Check if already registered
        if let Err(e) = self.validate_voter_not_registered(&voter_chain).await {
            return OperationResponse::error(e);
        }
        
        // DEPOSIT-FIRST: Check if tokens are configured and verify actual token balance
        let actual_token_balance = self.verify_token_deposit_for_voter(&voter_chain, stake).await;
        
        // Determine initial stake and active status based on actual tokens
        let (initial_stake, is_active) = if actual_token_balance >= stake && stake >= params.min_stake {
            // User has pre-deposited enough tokens
            eprintln!("✅ Voter has pre-deposited {} tokens (required: {})", actual_token_balance, stake);
            (stake, true)
        } else if actual_token_balance > Amount::ZERO && actual_token_balance >= params.min_stake {
            // User has some tokens deposited, use that
            eprintln!("⚠️ Voter has {} tokens deposited (requested: {}), using deposited amount", actual_token_balance, stake);
            (actual_token_balance, true)
        } else {
            // No tokens deposited yet - create inactive voter
            eprintln!("⚠️ DEPOSIT-FIRST: Voter registered with stake=0. Transfer tokens to activate.");
            eprintln!("   Required minimum stake: {}", params.min_stake);
            eprintln!("   Transfer tokens to Oracle Registry app, then stake will be updated.");
            (Amount::ZERO, false)
        };
        
        // Create voter info
        let voter_info = VoterInfo {
            chain_id: voter_chain,
            stake: initial_stake,
            locked_stake: Amount::ZERO,
            withdrawable_balance: Amount::ZERO,
            reputation: 50, // Default reputation for new voters (neutral starting point)
            total_votes: 0,
            correct_votes: 0,
            registered_at: self.runtime.system_time(),
            is_active,
            name: name.clone(),
            metadata_url,
        };
        
        // Store voter
        self.state.voters.insert(&voter_chain, voter_info).expect("Failed to insert voter");
        
        // Update totals only if stake > 0
        if initial_stake > Amount::ZERO {
            let current_stake = *self.state.total_stake.get();
            let new_total = current_stake.saturating_add(initial_stake);
            self.state.total_stake.set(new_total);
            
            // Track token holdings
            if let Err(e) = self.state.token_holdings.insert(&voter_chain, initial_stake) {
                eprintln!("⚠️ Failed to update token holdings: {}", e);
            }
            
            let total_held = *self.state.total_tokens_held.get();
            self.state.total_tokens_held.set(total_held.saturating_add(initial_stake));
        }
        
        let current_count = *self.state.voter_count.get();
        self.state.voter_count.set(current_count + 1);
        
        let message = if is_active {
            format!("Voter registered and activated with {} stake", initial_stake)
        } else {
            format!(
                "Voter registered (INACTIVE). Transfer at least {} tokens to Oracle Registry to activate.",
                params.min_stake
            )
        };
        
        OperationResponse::success_with_data(
            &message,
            ResponseData {
                voter_address: Some(voter_chain.to_string()),
                query_id: None,
                vote_count: None,
                rewards_claimed: None,
            }
        )
    }
    
    /// Verify if voter has pre-deposited tokens to the Oracle Registry
    async fn verify_token_deposit_for_voter(
        &self,
        voter_chain: &linera_sdk::linera_base_types::ChainId,
        _requested_stake: Amount,
    ) -> Amount {
        // Check if we have token holdings recorded for this voter
        // This is populated when tokens are received via ReceiveTokensForStake message
        match self.state.token_holdings.get(voter_chain).await {
            Ok(Some(balance)) => {
                eprintln!("📊 Voter {} has {} tokens in holdings", voter_chain, balance);
                balance
            }
            _ => {
                eprintln!("📊 Voter {} has no tokens in holdings yet", voter_chain);
                Amount::ZERO
            }
        }
    }
    
    /// Register a voter from cross-chain message (DEPOSIT-FIRST pattern)
    /// 
    /// Uses sender_chain as voter ID. Voter will be:
    /// - ACTIVE if they have pre-deposited tokens >= min_stake
    /// - INACTIVE if they have insufficient or no tokens
    async fn register_voter_from_message(
        &mut self,
        sender_chain: linera_sdk::linera_base_types::ChainId,
        _stake: Amount, // Ignored - stake comes from actual token transfer
        name: Option<String>,
        metadata_url: Option<String>,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{OperationResponse, ResponseData};
        use state::VoterInfo;
        
        eprintln!("📥 Received RegisterVoter message from chain: {}", sender_chain);
        
        let voter_chain = sender_chain;
        
        // Validate name/metadata
        if let Some(ref n) = name {
            if n.len() > 100 {
                return OperationResponse::error("Name too long (max 100 chars)");
            }
        }
        
        // Check if already registered
        if let Err(e) = self.validate_voter_not_registered(&voter_chain).await {
            return OperationResponse::error(e);
        }
        
        let params = self.state.get_parameters().await;
        
        // DEPOSIT-FIRST: Check if tokens are already deposited
        let pre_deposited_tokens = self.state.token_holdings.get(&voter_chain).await.ok().flatten().unwrap_or(Amount::ZERO);
        
        // Determine initial stake and active status
        let (initial_stake, is_active) = if pre_deposited_tokens >= params.min_stake {
            eprintln!("✅ CROSS-CHAIN: Voter {} has {} pre-deposited tokens. ACTIVE.", 
                voter_chain, pre_deposited_tokens);
            (pre_deposited_tokens, true)
        } else if pre_deposited_tokens > Amount::ZERO {
            eprintln!("⚠️ CROSS-CHAIN: Voter {} has {} tokens (need {}). INACTIVE.", 
                voter_chain, pre_deposited_tokens, params.min_stake);
            (pre_deposited_tokens, false)
        } else {
            eprintln!("📝 CROSS-CHAIN: Voter {} has no tokens. INACTIVE until transferred.", voter_chain);
            (Amount::ZERO, false)
        };
        
        // Create voter info
        let voter_info = VoterInfo {
            chain_id: voter_chain,
            stake: initial_stake,
            locked_stake: Amount::ZERO,
            withdrawable_balance: Amount::ZERO,
            reputation: 50,
            total_votes: 0,
            correct_votes: 0,
            registered_at: self.runtime.system_time(),
            is_active,
            name: name.clone(),
            metadata_url,
        };
        
        // Store voter
        self.state.voters.insert(&voter_chain, voter_info).expect("Failed to insert voter");
        
        // Update voter count
        let current_count = *self.state.voter_count.get();
        self.state.voter_count.set(current_count + 1);
        
        // Only update total_stake if we have pre-deposited tokens
        if initial_stake > Amount::ZERO {
            let current_stake = *self.state.total_stake.get();
            let new_total = current_stake.saturating_add(initial_stake);
            self.state.total_stake.set(new_total);
            eprintln!("   Total stake now: {}", new_total);
        }
        
        let message = if is_active {
            format!("Voter {} registered and ACTIVATED via cross-chain message", voter_chain)
        } else {
            format!(
                "Voter {} registered (INACTIVE). Transfer {} ALTH tokens to activate.",
                voter_chain, params.min_stake
            )
        };
        
        OperationResponse::success_with_data(
            &message,
            ResponseData {
                voter_address: Some(voter_chain.to_string()),
                query_id: None,
                vote_count: None,
                rewards_claimed: None,
            }
        )
    }
    
    /// Update voter stake
    async fn update_stake(&mut self, additional_stake: Amount) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        let voter_chain = self.runtime.chain_id();
        
        // Validate additional stake is positive
        if additional_stake == Amount::ZERO {
            return OperationResponse::error("Additional stake must be greater than zero");
        }
        
        // Validate voter is registered and active
        let mut voter_info = match self.validate_voter_registered(&voter_chain).await {
            Ok(info) => info,
            Err(e) => return OperationResponse::error(e),
        };
        
        // Transfer additional stake
        // Note: Implement proper token transfer
        
        // Update stake - use saturating_add to avoid overflow
        voter_info.stake = voter_info.stake.saturating_add(additional_stake);
        self.state.voters.insert(&voter_chain, voter_info).expect("Failed to update voter");
        
        // Update total - use saturating_add to avoid overflow
        let current_stake = *self.state.total_stake.get();
        let new_total = current_stake.saturating_add(additional_stake);
        self.state.total_stake.set(new_total);
        
        // Update token holdings for additional stake
        let current_holdings = self.state.token_holdings.get(&voter_chain).await.ok().flatten().unwrap_or(Amount::ZERO);
        if let Err(e) = self.state.token_holdings.insert(&voter_chain, current_holdings.saturating_add(additional_stake)) {
            eprintln!("⚠️  Failed to update token holdings: {}", e);
        }
        
        let total_held = *self.state.total_tokens_held.get();
        self.state.total_tokens_held.set(total_held.saturating_add(additional_stake));
        
        OperationResponse::success("Stake updated successfully")
    }
    
    /// Withdraw stake
    async fn withdraw_stake(&mut self, amount: Amount) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        let voter_chain = self.runtime.chain_id();
        
        // Validate withdrawal amount is positive
        if amount == Amount::ZERO {
            return OperationResponse::error("Withdrawal amount must be greater than zero");
        }
        
        // Validate voter is registered and active
        let mut voter_info = match self.validate_voter_registered(&voter_chain).await {
            Ok(info) => info,
            Err(e) => return OperationResponse::error(e),
        };
        
        // Validate sufficient stake for withdrawal
        let params = self.state.get_parameters().await;
        if let Err(e) = self.validate_sufficient_stake(
            voter_info.stake,
            voter_info.locked_stake,
            amount,
            params.min_stake
        ) {
            return OperationResponse::error(e);
        }
        
        // Validate no active votes
        if let Err(e) = self.validate_no_active_votes(&voter_chain).await {
            return OperationResponse::error(e);
        }
        
        // Update stake - use saturating_sub to avoid underflow
        voter_info.stake = voter_info.stake.saturating_sub(amount);
        self.state.voters.insert(&voter_chain, voter_info.clone()).expect("Failed to update voter");
        
        // Update total - use saturating_sub to avoid underflow
        let current_stake = *self.state.total_stake.get();
        let new_total = current_stake.saturating_sub(amount);
        self.state.total_stake.set(new_total);
        
        // Update token holdings to reflect withdrawal
        let current_holdings = self.state.token_holdings.get(&voter_chain).await.ok().flatten().unwrap_or(Amount::ZERO);
        if let Err(e) = self.state.token_holdings.insert(&voter_chain, current_holdings.saturating_sub(amount)) {
            eprintln!("⚠️  Failed to update token holdings: {}", e);
        }
        
        let total_held = *self.state.total_tokens_held.get();
        self.state.total_tokens_held.set(total_held.saturating_sub(amount));
        
        // Emit StakeUpdated event
        self.emit_oracle_event(OracleEvent::StakeUpdated {
            voter_chain,
            new_stake: voter_info.stake,
            change: amount,
            is_increase: false,
        });
        
        // Note: Token transfer to user wallet requires integration with alethea-token contract
        // For now, stake is reduced in registry. User can use this reduced stake value
        // to claim tokens from token contract separately if needed.
        eprintln!(
            "📤 Stake withdrawn: {} tokens from voter {}. New stake: {}",
            amount, voter_chain, voter_info.stake
        );
        
        OperationResponse::success(format!("Stake withdrawn successfully: {} tokens. New stake: {}", amount, voter_info.stake))
    }
    
    /// Deregister voter
    async fn deregister_voter(&mut self) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        let voter_chain = self.runtime.chain_id();
        
        // Validate voter is registered and active
        let voter_info = match self.validate_voter_registered(&voter_chain).await {
            Ok(info) => info,
            Err(e) => return OperationResponse::error(e),
        };
        
        // Validate no pending rewards
        if let Err(e) = self.validate_no_pending_rewards(&voter_chain).await {
            return OperationResponse::error(e);
        }
        
        // Validate no active votes
        if let Err(e) = self.validate_no_active_votes(&voter_chain).await {
            return OperationResponse::error(e);
        }
        
        // Return stake
        let stake = voter_info.stake;
        
        // Remove voter
        self.state.voters.remove(&voter_chain).expect("Failed to remove voter");
        
        // Update totals - use saturating_sub to avoid underflow
        let current_stake = *self.state.total_stake.get();
        let new_total = current_stake.saturating_sub(stake);
        self.state.total_stake.set(new_total);
        
        let current_count = *self.state.voter_count.get();
        self.state.voter_count.set(current_count - 1);
        
        // Update token holdings - remove voter's holdings
        if let Err(e) = self.state.token_holdings.remove(&voter_chain) {
            eprintln!("⚠️  Failed to remove token holdings: {}", e);
        }
        
        let total_held = *self.state.total_tokens_held.get();
        self.state.total_tokens_held.set(total_held.saturating_sub(stake));
        
        // Emit VoterDeregistered event for cross-chain subscribers
        self.emit_oracle_event(OracleEvent::VoterDeregistered {
            voter_chain,
            stake_returned: stake,
        });
        
        // Transfer stake back
        // Note: Implement proper token transfer
        
        OperationResponse::success("Voter deregistered successfully")
    }
}

// ==================== CROSS-CHAIN MESSAGE OPERATIONS ====================

impl OracleRegistryV2Contract {
    /// Send RegisterVoter message to target chain (cross-chain registration)
    /// This allows a user to register as voter on the main registry chain
    async fn send_register_voter_message(
        &mut self,
        target_chain: linera_sdk::linera_base_types::ChainId,
        stake: Amount,
        name: Option<String>,
        metadata_url: Option<String>,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{Message, OperationResponse};
        
        let sender_chain = self.runtime.chain_id();
        eprintln!("📤 Sending RegisterVoter message from {} to {}", sender_chain, target_chain);
        eprintln!("   Stake: {}, Name: {:?}", stake, name);
        
        // Create the message with sender's chain ID
        let message = Message::RegisterVoter {
            sender_chain,
            stake,
            name: name.clone(),
            metadata_url,
        };
        
        // Send message to target chain with authentication
        self.runtime.prepare_message(message)
            .with_authentication()
            .with_tracking()
            .send_to(target_chain);
        
        eprintln!("✅ RegisterVoter message sent to {}", target_chain);
        
        OperationResponse::success(format!(
            "RegisterVoter message sent to chain {}. Voter will be registered with chain ID {}",
            target_chain, sender_chain
        ))
    }
    
    /// Send SubmitVote message to target chain (cross-chain voting)
    async fn send_submit_vote_message(
        &mut self,
        target_chain: linera_sdk::linera_base_types::ChainId,
        query_id: u64,
        value: String,
        confidence: Option<u8>,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{Message, OperationResponse};
        
        let sender_chain = self.runtime.chain_id();
        eprintln!("📤 Sending SubmitVote message from {} to {}", sender_chain, target_chain);
        eprintln!("   Query: {}, Value: {}, Confidence: {:?}", query_id, value, confidence);
        
        // Create the message with sender_chain for voter identification
        let message = Message::SubmitVote {
            sender_chain,
            query_id,
            value: value.clone(),
            confidence,
        };
        
        // Send message to target chain with authentication
        self.runtime.prepare_message(message)
            .with_authentication()
            .with_tracking()
            .send_to(target_chain);
        
        eprintln!("✅ SubmitVote message sent to {}", target_chain);
        
        OperationResponse::success(format!(
            "SubmitVote message sent to chain {} for query {} from voter {}",
            target_chain, query_id, sender_chain
        ))
    }
    
    /// Send CommitVote message to target chain (cross-chain commit phase)
    async fn send_commit_vote_message(
        &mut self,
        target_chain: linera_sdk::linera_base_types::ChainId,
        query_id: u64,
        commit_hash: String,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{Message, OperationResponse};
        
        let sender_chain = self.runtime.chain_id();
        eprintln!("📤 Sending CommitVote message from {} to {}", sender_chain, target_chain);
        eprintln!("   Query: {}, Hash: {}", query_id, commit_hash);
        
        let message = Message::CommitVote {
            sender_chain,
            query_id,
            commit_hash: commit_hash.clone(),
        };
        
        self.runtime.prepare_message(message)
            .with_authentication()
            .with_tracking()
            .send_to(target_chain);
        
        eprintln!("✅ CommitVote message sent to {}", target_chain);
        
        OperationResponse::success(format!(
            "CommitVote message sent to chain {} for query {} from voter {}",
            target_chain, query_id, sender_chain
        ))
    }
    
    /// Send RevealVote message to target chain (cross-chain reveal phase)
    async fn send_reveal_vote_message(
        &mut self,
        target_chain: linera_sdk::linera_base_types::ChainId,
        query_id: u64,
        value: String,
        salt: String,
        confidence: Option<u8>,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{Message, OperationResponse};
        
        let sender_chain = self.runtime.chain_id();
        eprintln!("📤 Sending RevealVote message from {} to {}", sender_chain, target_chain);
        eprintln!("   Query: {}, Value: {}, Salt: {}", query_id, value, salt);
        
        let message = Message::RevealVote {
            sender_chain,
            query_id,
            value: value.clone(),
            salt: salt.clone(),
            confidence,
        };
        
        self.runtime.prepare_message(message)
            .with_authentication()
            .with_tracking()
            .send_to(target_chain);
        
        eprintln!("✅ RevealVote message sent to {}", target_chain);
        
        OperationResponse::success(format!(
            "RevealVote message sent to chain {} for query {} from voter {}",
            target_chain, query_id, sender_chain
        ))
    }
    
    /// Send CreateQuery message to target chain (cross-chain query creation)
    async fn send_create_query_message(
        &mut self,
        target_chain: linera_sdk::linera_base_types::ChainId,
        description: String,
        outcomes: Vec<String>,
        strategy: oracle_registry_v2::state::DecisionStrategy,
        min_votes: Option<usize>,
        reward_amount: linera_sdk::linera_base_types::Amount,
        duration_secs: Option<u64>,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{Message, OperationResponse};
        
        let sender_chain = self.runtime.chain_id();
        eprintln!("📤 Sending CreateQuery message from {} to {}", sender_chain, target_chain);
        eprintln!("   Description: {}", description);
        
        // Convert strategy to string
        let strategy_str = match strategy {
            oracle_registry_v2::state::DecisionStrategy::Majority => "Majority",
            oracle_registry_v2::state::DecisionStrategy::Median => "Median",
            oracle_registry_v2::state::DecisionStrategy::WeightedByStake => "WeightedByStake",
            oracle_registry_v2::state::DecisionStrategy::WeightedByReputation => "WeightedByReputation",
        }.to_string();
        
        // Create the message
        let message = Message::CreateQuery {
            sender_chain,
            description: description.clone(),
            outcomes,
            strategy: strategy_str,
            min_votes,
            reward_amount,
            duration_secs,
        };
        
        // Send message to target chain with authentication
        self.runtime.prepare_message(message)
            .with_authentication()
            .with_tracking()
            .send_to(target_chain);
        
        eprintln!("✅ CreateQuery message sent to {}", target_chain);
        
        OperationResponse::success(format!(
            "CreateQuery message sent to chain {}. Query will be created by {}",
            target_chain, sender_chain
        ))
    }
    
    /// Send UpdateStake message to target chain (cross-chain stake update)
    async fn send_update_stake_message(
        &mut self,
        target_chain: linera_sdk::linera_base_types::ChainId,
        additional_stake: linera_sdk::linera_base_types::Amount,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{Message, OperationResponse};
        
        let sender_chain = self.runtime.chain_id();
        eprintln!("📤 Sending UpdateStake message from {} to {}", sender_chain, target_chain);
        eprintln!("   Additional stake: {}", additional_stake);
        
        // Create the message with sender's chain ID
        let message = Message::UpdateStake {
            sender_chain,
            additional_stake,
        };
        
        // Send message to target chain with authentication
        self.runtime.prepare_message(message)
            .with_authentication()
            .with_tracking()
            .send_to(target_chain);
        
        eprintln!("✅ UpdateStake message sent to {}", target_chain);
        
        OperationResponse::success(format!(
            "UpdateStake message sent to chain {}. Stake will be updated for voter {}",
            target_chain, sender_chain
        ))
    }
    
    /// Update stake from cross-chain message
    async fn update_stake_from_message(
        &mut self,
        sender_chain: linera_sdk::linera_base_types::ChainId,
        additional_stake: linera_sdk::linera_base_types::Amount,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        eprintln!("📥 Received UpdateStake message from chain: {}", sender_chain);
        eprintln!("   Additional stake: {}", additional_stake);
        
        // Validate voter is registered
        if let Err(e) = self.validate_voter_registered(&sender_chain).await {
            return OperationResponse::error(format!("Voter not registered: {}", e));
        }
        
        // SECURITY: Verify token transfer before updating stake
        // Check if registry actually received the tokens
        let params = self.state.get_parameters().await;
        if let (Some(token_app_id), Some(token_chain_id)) = (params.token_app_id, params.token_chain_id) {
            eprintln!("🔍 Verifying token transfer for stake update...");
            
            // Query token contract to verify registry received tokens
            // This is a simplified check - in production, implement proper verification
            let registry_app_str = format!("{:?}", self.runtime.application_id());
            let expected_registry_balance = self.calculate_expected_registry_balance().await;
            
            eprintln!("   Expected registry balance: {}", expected_registry_balance);
            eprintln!("   Registry app ID: {}", registry_app_str);
            
            // For now, log the verification attempt
            // TODO: Implement actual token balance verification via cross-chain query
        }
        
        // Get current voter info
        let voter_info = match self.state.get_voter(&sender_chain).await {
            Some(info) => info,
            None => return OperationResponse::error("Voter not found"),
        };
        
        // Calculate new stake using saturating_add (no double multiplication!)
        let new_stake = voter_info.stake.saturating_add(additional_stake);
        
        // Update voter stake
        let mut updated_info = voter_info.clone();
        updated_info.stake = new_stake;
        
        if let Err(e) = self.state.voters.insert(&sender_chain, updated_info) {
            return OperationResponse::error(format!("Failed to update stake: {}", e));
        }
        
        // Update total stake using saturating_add
        let total_stake = *self.state.total_stake.get();
        self.state.total_stake.set(total_stake.saturating_add(additional_stake));
        
        // Track token holdings (for future verification)
        let current_holdings = self.state.token_holdings.get(&sender_chain).await.ok().flatten().unwrap_or(linera_sdk::linera_base_types::Amount::ZERO);
        let new_holdings = current_holdings.saturating_add(additional_stake);
        if let Err(e) = self.state.token_holdings.insert(&sender_chain, new_holdings) {
            eprintln!("⚠️  Failed to update token holdings: {}", e);
        }
        
        let total_held = *self.state.total_tokens_held.get();
        self.state.total_tokens_held.set(total_held.saturating_add(additional_stake));
        
        // Emit StakeUpdated event
        self.emit_oracle_event(OracleEvent::StakeUpdated {
            voter_chain: sender_chain,
            new_stake,
            change: additional_stake,
            is_increase: true,
        });
        
        eprintln!("✅ Stake updated for voter {}: {} -> {}", sender_chain, voter_info.stake, new_stake);
        eprintln!("   Token holdings updated: {} -> {}", current_holdings, new_holdings);
        
        OperationResponse::success(format!(
            "Stake updated successfully. New stake: {}",
            new_stake
        ))
    }
    
    /// Create a query from cross-chain message
    async fn create_query_from_message(
        &mut self,
        sender_chain: linera_sdk::linera_base_types::ChainId,
        description: String,
        outcomes: Vec<String>,
        strategy: String,
        min_votes: Option<usize>,
        reward_amount: linera_sdk::linera_base_types::Amount,
        duration_secs: Option<u64>,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{OperationResponse, ResponseData};
        use state::{Query, QueryStatus, DecisionStrategy};
        
        eprintln!("📥 Received CreateQuery message from chain: {}", sender_chain);
        eprintln!("   Description: {}", description);
        
        // Parse strategy string
        let state_strategy = match strategy.as_str() {
            "Majority" => DecisionStrategy::Majority,
            "Median" => DecisionStrategy::Median,
            "WeightedByStake" => DecisionStrategy::WeightedByStake,
            "WeightedByReputation" => DecisionStrategy::WeightedByReputation,
            _ => return OperationResponse::error(format!("Invalid strategy: {}", strategy)),
        };
        
        // Validate query parameters
        if let Err(e) = self.validate_query_params(&description, &outcomes, &reward_amount, &None) {
            return OperationResponse::error(e);
        }
        
        // Get protocol parameters
        let params = self.state.get_parameters().await;
        
        // Determine min_votes (use provided or default)
        let min_votes_required = min_votes.unwrap_or(params.min_votes_default);
        
        // Calculate commit/reveal phases
        let current_time = self.runtime.system_time();
        let total_duration_secs = duration_secs.unwrap_or(params.default_query_duration);
        let total_duration_micros = total_duration_secs * 1_000_000;
        let commit_duration_micros = total_duration_micros / 2;
        let reveal_duration_micros = total_duration_micros / 2;
        
        let commit_phase_end = current_time.saturating_add(
            linera_sdk::linera_base_types::TimeDelta::from_micros(commit_duration_micros)
        );
        let reveal_phase_end = commit_phase_end.saturating_add(
            linera_sdk::linera_base_types::TimeDelta::from_micros(reveal_duration_micros)
        );
        
        let query_deadline = reveal_phase_end;
        
        // Get next query ID
        let query_id = *self.state.next_query_id.get();
        self.state.next_query_id.set(query_id + 1);
        
        // Determine max_voters
        let max_voters = min_votes_required * 2;
        
        // Select voters by power
        let selected_voters = match self.state
            .select_voters_for_query(min_votes_required, max_voters)
            .await
        {
            Ok(voters) => voters,
            Err(e) => return OperationResponse::error(format!("Failed to select voters: {}", e)),
        };
        
        // Create query
        let query = Query {
            id: query_id,
            description: description.clone(),
            outcomes: outcomes.clone(),
            // Metadata fields (none for legacy queries)
            title: None,
            category: None,
            context: None,
            resolution_criteria: None,
            source_urls: None,
            tags: None,
            metadata_url: None,
            external_id: None,
            // Source DApp tracking (cross-chain message - external source)
            source_app_id: None,
            source_app_name: None,
            source_app_logo: None,
            source_app_category: None,
            query_source: state::QuerySource::ExternalOther,
            // Core fields
            strategy: state_strategy,
            min_votes: min_votes_required,
            reward_amount,
            creator: sender_chain,
            created_at: current_time,
            deadline: query_deadline,
            commit_phase_end,
            reveal_phase_end,
            phase: state::VotingPhase::Commit,
            status: QueryStatus::Active,
            result: None,
            resolved_at: None,
            commits: std::collections::BTreeMap::new(),
            votes: std::collections::BTreeMap::new(),
            selected_voters,
            max_voters,
            callback_chain: None,
            callback_data: None,
            // Hybrid model fields (legacy query - no bond)
            bond_amount: Amount::ZERO,
            priority_fee: Amount::ZERO,
            bond_refunded: false,
            dispute: None,
            dispute_window_end: None,
        };
        
        // Store query
        self.state.queries.insert(&query_id, query).expect("Failed to insert query");
        
        // Add to active queries
        let mut active = self.state.get_active_queries().await;
        active.push(query_id);
        self.state.active_queries.set(active);
        
        // Initialize vote count
        self.state.vote_counts.insert(&query_id, 0).expect("Failed to initialize vote count");
        
        // Update statistics
        let total_created = *self.state.total_queries_created.get();
        self.state.total_queries_created.set(total_created + 1);
        
        eprintln!("✅ Query {} created successfully from chain {}", query_id, sender_chain);
        
        OperationResponse::success_with_data(
            format!("Query {} created successfully via cross-chain message", query_id),
            ResponseData {
                voter_address: None,
                query_id: Some(query_id),
                vote_count: None,
                rewards_claimed: None,
            }
        )
    }
}

// ==================== HELPER FUNCTIONS ====================

// ==================== TOKEN INTEGRATION HANDLERS ====================

impl OracleRegistryV2Contract {
    /// Handle tokens received from alethea-token contract for staking
    /// 
    /// This is called when the token contract sends tokens to the oracle registry.
    /// If voter is registered but inactive (stake < min_stake), this will activate them.
    async fn handle_receive_tokens_for_stake(
        &mut self,
        sender_chain: linera_sdk::linera_base_types::ChainId,
        amount: Amount,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        eprintln!("💰 Received {} tokens from chain {} for staking", amount, sender_chain);
        
        let params = self.state.get_parameters().await;
        
        // First, update token holdings (even if voter not registered yet)
        let current_holdings = self.state.token_holdings.get(&sender_chain).await.ok().flatten().unwrap_or(Amount::ZERO);
        let new_holdings = current_holdings.saturating_add(amount);
        self.state.token_holdings.insert(&sender_chain, new_holdings).expect("Failed to update holdings");
        
        let total_held = *self.state.total_tokens_held.get();
        self.state.total_tokens_held.set(total_held.saturating_add(amount));
        
        eprintln!("📊 Token holdings for {}: {} -> {}", sender_chain, current_holdings, new_holdings);
        
        // Check if voter is registered
        match self.state.get_voter(&sender_chain).await {
            Some(voter) => {
                // Voter exists - update their stake
                let old_stake = voter.stake;
                let new_stake = voter.stake.saturating_add(amount);
                let was_active = voter.is_active;
                let now_active = new_stake >= params.min_stake;
                
                let mut updated_voter = voter.clone();
                updated_voter.stake = new_stake;
                updated_voter.is_active = now_active;
                
                self.state.voters.insert(&sender_chain, updated_voter).expect("Failed to update voter");
                
                // Update total stake
                let total = *self.state.total_stake.get();
                self.state.total_stake.set(total.saturating_add(amount));
                
                // Emit activation event if voter just became active
                if !was_active && now_active {
                    eprintln!("🎉 Voter {} activated! Stake: {} (min required: {})", 
                        sender_chain, new_stake, params.min_stake);
                    
                    self.emit_oracle_event(OracleEvent::VoterRegistered {
                        voter_chain: sender_chain,
                        stake: new_stake,
                        name: voter.name.clone(),
                    });
                } else {
                    self.emit_oracle_event(OracleEvent::StakeUpdated {
                        voter_chain: sender_chain,
                        new_stake,
                        change: amount,
                        is_increase: true,
                    });
                }
                
                let status = if now_active { "ACTIVE" } else { "INACTIVE (need more stake)" };
                OperationResponse::success(format!(
                    "Received {} tokens. Stake: {} -> {}. Status: {}", 
                    amount, old_stake, new_stake, status
                ))
            }
            None => {
                // Voter not registered yet - tokens held for when they register
                eprintln!("📦 Tokens held for unregistered voter {}. They can register later.", sender_chain);
                OperationResponse::success(format!(
                    "Received {} tokens. Voter not registered yet. Tokens held in escrow. Total holdings: {}",
                    amount, new_holdings
                ))
            }
        }
    }
    
    /// Handle request to withdraw tokens back to user
    async fn handle_withdraw_tokens(
        &mut self,
        amount: Amount,
        target_chain: linera_sdk::linera_base_types::ChainId,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        eprintln!("💸 Withdraw request: {} tokens to chain {}", amount, target_chain);
        
        // Check if voter has enough available stake
        let voter = match self.state.get_voter(&target_chain).await {
            Some(v) => v,
            None => {
                return OperationResponse::error("Voter not found");
            }
        };
        
        let available = voter.stake.saturating_sub(voter.locked_stake);
        if amount > available {
            return OperationResponse::error(format!(
                "Insufficient available stake. Available: {}, Requested: {}",
                available, amount
            ));
        }
        
        // Deduct from voter's stake
        let new_stake = voter.stake.saturating_sub(amount);
        let mut updated_voter = voter.clone();
        updated_voter.stake = new_stake;
        
        self.state.voters.insert(&target_chain, updated_voter).expect("Failed to update voter");
        
        // Update total stake
        let total = *self.state.total_stake.get();
        self.state.total_stake.set(total.saturating_sub(amount));
        
        // Update token holdings
        let current_holdings = self.state.token_holdings.get(&target_chain).await.ok().flatten().unwrap_or(Amount::ZERO);
        self.state.token_holdings.insert(&target_chain, current_holdings.saturating_sub(amount)).expect("Failed to update holdings");
        
        let total_held = *self.state.total_tokens_held.get();
        self.state.total_tokens_held.set(total_held.saturating_sub(amount));
        
        // TODO: Send WithdrawToAccount message to token contract to return tokens
        // This requires knowing the token contract's application ID
        
        OperationResponse::success(format!("Withdrawn {} tokens. Remaining stake: {}", amount, new_stake))
    }
}

impl OracleRegistryV2Contract {
    /// Initialize test voters for development and testing
    /// This adds three pre-configured voters (Alice, Bob, Charlie) to the registry
    /// 
    /// NOTE: This is for testing only. In production, remove this function.
    async fn initialize_test_voters_internal(_state: &mut OracleRegistryV2) {
        // Disabled: ChainId parsing doesn't work reliably in WASM initialization context
        // Test voters should be registered through normal registration flow after deployment
        // 
        // To register a test voter after deployment, use:
        // curl -X POST http://localhost:8080/chains/{CHAIN}/applications/{APP} \
        //   -H "Content-Type: application/json" \
        //   -d '{"query": "mutation { registerVoter(stake: \"1000\", name: \"TestVoter\") }"}'
        //
        // Or use the admin RegisterVoterFor operation from the contract owner chain
    }
}

// ==================== EVENT STREAMING HELPERS ====================

impl OracleRegistryV2Contract {
    /// Emit an oracle event to the event stream
    /// 
    /// This broadcasts the event to all chains that have subscribed to
    /// this contract's oracle events using `subscribe_to_events()`.
    /// 
    /// ## Example
    /// ```rust
    /// self.emit_oracle_event(OracleEvent::QueryCreated {
    ///     query_id: 1,
    ///     description: "Will BTC reach $100k?".to_string(),
    ///     outcomes: vec!["Yes".to_string(), "No".to_string()],
    ///     deadline: timestamp,
    ///     creator: chain_id,
    ///     min_votes: 3,
    /// });
    /// ```
    fn emit_oracle_event(&mut self, event: OracleEvent) {
        eprintln!("📤 Emitting OracleEvent: {:?}", event);
        self.runtime.emit(
            StreamName::from(ORACLE_STREAM_NAME),
            &event,
        );
    }
    
    /// Handle incoming oracle events from other chains
    /// 
    /// This is called by `process_streams()` when events are received
    /// from subscribed chains. Override this to add custom event handling.
    async fn handle_oracle_event(
        &mut self,
        event: OracleEvent,
        source_chain: linera_sdk::linera_base_types::ChainId,
    ) {
        // Log the event for monitoring
        match &event {
            OracleEvent::QueryCreated { query_id, description, .. } => {
                eprintln!(
                    "📥 [{}] Query {} created: {}",
                    source_chain, query_id, description
                );
            }
            OracleEvent::QueryResolved { query_id, result, .. } => {
                eprintln!(
                    "📥 [{}] Query {} resolved: {}",
                    source_chain, query_id, result
                );
            }
            OracleEvent::VoterRegistered { voter_chain, stake, name } => {
                eprintln!(
                    "📥 [{}] Voter {} registered with stake {} (name: {:?})",
                    source_chain, voter_chain, stake, name
                );
            }
            OracleEvent::VoteSubmitted { query_id, voter_chain, value } => {
                eprintln!(
                    "📥 [{}] Vote on query {} by {}: {}",
                    source_chain, query_id, voter_chain, value
                );
            }
            OracleEvent::RewardsClaimed { voter_chain, amount } => {
                eprintln!(
                    "📥 [{}] Rewards claimed by {}: {}",
                    source_chain, voter_chain, amount
                );
            }
            _ => {
                eprintln!("📥 [{}] Event: {:?}", source_chain, event);
            }
        }
        
        // Additional event handling can be added here
        // For example, updating local caches or triggering actions
    }
}

// ==================== CONSUMER APP REGISTRATION ====================

impl OracleRegistryV2Contract {
    /// Register a consumer app
    async fn register_consumer_app(
        &mut self,
        name: String,
        category: state::AppCategory,
        stake: Amount,
        metadata_url: Option<String>,
        logo_url: Option<String>,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        // Get caller info
        let caller_app = self.runtime.application_id().forget_abi();
        let caller_chain = self.runtime.chain_id();
        
        eprintln!(
            "📝 RegisterConsumerApp: app={:?}, chain={}, name={}, stake={}, logo={:?}",
            caller_app, caller_chain, name, stake, logo_url
        );
        
        // If Instance mode, forward to Hub
        if self.state.is_instance() {
            return self.forward_consumer_app_registration_to_hub(
                caller_app,
                caller_chain,
                name,
                category,
                stake,
                metadata_url,
                logo_url,
            ).await;
        }
        
        // Hub mode: process locally
        let registered_at = self.runtime.system_time();
        
        match self.state.register_consumer_app(
            caller_app,
            caller_chain,
            name.clone(),
            category.clone(),
            stake,
            metadata_url,
            logo_url,
            registered_at,
        ).await {
            Ok(app_info) => {
                // Emit event
                let category_str = format!("{:?}", category);
                let tier_str = format!("{:?}", app_info.tier);
                
                self.emit_oracle_event(OracleEvent::ConsumerAppRegistered {
                    app_id: caller_app,
                    chain_id: caller_chain,
                    name: name.clone(),
                    category: category_str,
                    tier: tier_str.clone(),
                    stake,
                });
                
                OperationResponse::success(format!(
                    "Consumer app '{}' registered successfully. Tier: {}, Rate limit: {}/hour",
                    name, tier_str, app_info.rate_limit
                ))
            }
            Err(e) => OperationResponse::error(e),
        }
    }
    
    /// Forward consumer app registration to Hub (Instance mode)
    async fn forward_consumer_app_registration_to_hub(
        &mut self,
        app_id: linera_sdk::linera_base_types::ApplicationId,
        source_chain: linera_sdk::linera_base_types::ChainId,
        name: String,
        category: state::AppCategory,
        stake: Amount,
        metadata_url: Option<String>,
        logo_url: Option<String>,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{Message, OperationResponse};
        
        let hub_chain_id = match self.state.get_hub_chain_id() {
            Some(id) => id,
            None => return OperationResponse::error("Not in Instance mode"),
        };
        
        let category_str = format!("{:?}", category);
        
        let message = Message::RegisterConsumerAppOnHub {
            app_id,
            source_chain,
            name: name.clone(),
            category: category_str,
            stake,
            metadata_url,
            logo_url,
        };
        
        self.runtime
            .prepare_message(message)
            .with_authentication()
            .send_to(hub_chain_id);
        
        OperationResponse::success(format!(
            "Consumer app registration forwarded to Hub for '{}'",
            name
        ))
    }
    
    /// Handle consumer app registration on Hub (from Instance)
    async fn handle_register_consumer_app_on_hub(
        &mut self,
        app_id: linera_sdk::linera_base_types::ApplicationId,
        source_chain: linera_sdk::linera_base_types::ChainId,
        name: String,
        category: String,
        stake: Amount,
        metadata_url: Option<String>,
        logo_url: Option<String>,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{Message, OperationResponse};
        
        eprintln!(
            "📝 Hub: RegisterConsumerAppOnHub: app={:?}, chain={}, name={}, logo={:?}",
            app_id, source_chain, name, logo_url
        );
        
        // Parse category
        let app_category = match category.as_str() {
            "PredictionMarket" => state::AppCategory::PredictionMarket,
            "Insurance" => state::AppCategory::Insurance,
            "Gaming" => state::AppCategory::Gaming,
            "DeFi" => state::AppCategory::DeFi,
            "DataFeed" => state::AppCategory::DataFeed,
            _ => state::AppCategory::Custom(category.clone()),
        };
        
        let registered_at = self.runtime.system_time();
        
        match self.state.register_consumer_app(
            app_id,
            source_chain,
            name.clone(),
            app_category.clone(),
            stake,
            metadata_url,
            logo_url,
            registered_at,
        ).await {
            Ok(app_info) => {
                let tier_str = format!("{:?}", app_info.tier);
                
                // Emit event
                self.emit_oracle_event(OracleEvent::ConsumerAppRegistered {
                    app_id,
                    chain_id: source_chain,
                    name: name.clone(),
                    category: category.clone(),
                    tier: tier_str.clone(),
                    stake,
                });
                
                // Send confirmation back to Instance
                let confirm_message = Message::ConsumerAppRegistered {
                    app_id,
                    chain_id: source_chain,
                    tier: tier_str.clone(),
                    rate_limit: app_info.rate_limit,
                };
                
                self.runtime
                    .prepare_message(confirm_message)
                    .send_to(source_chain);
                
                OperationResponse::success(format!(
                    "Consumer app '{}' registered on Hub. Tier: {}",
                    name, tier_str
                ))
            }
            Err(e) => {
                // Send rejection back to Instance
                let reject_message = Message::ConsumerAppRegistrationRejected {
                    app_id,
                    chain_id: source_chain,
                    reason: e.clone(),
                };
                
                self.runtime
                    .prepare_message(reject_message)
                    .send_to(source_chain);
                
                OperationResponse::error(e)
            }
        }
    }
    
    /// Update consumer app information
    async fn update_consumer_app(
        &mut self,
        name: Option<String>,
        category: Option<state::AppCategory>,
        metadata_url: Option<Option<String>>,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        let caller_app = self.runtime.application_id().forget_abi();
        let caller_chain = self.runtime.chain_id();
        
        match self.state.update_consumer_app(
            &caller_app,
            &caller_chain,
            name,
            category,
            metadata_url,
        ).await {
            Ok(app_info) => {
                OperationResponse::success(format!(
                    "Consumer app '{}' updated successfully",
                    app_info.name
                ))
            }
            Err(e) => OperationResponse::error(e),
        }
    }
    
    /// Upgrade consumer app tier by adding stake
    async fn upgrade_consumer_app_tier(
        &mut self,
        additional_stake: Amount,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        let caller_app = self.runtime.application_id().forget_abi();
        let caller_chain = self.runtime.chain_id();
        
        // Get current tier for comparison
        let old_tier = match self.state.get_consumer_app(&caller_app, &caller_chain).await {
            Some(info) => format!("{:?}", info.tier),
            None => return OperationResponse::error("Consumer app not registered"),
        };
        
        match self.state.upgrade_consumer_app_tier(
            &caller_app,
            &caller_chain,
            additional_stake,
        ).await {
            Ok(app_info) => {
                let new_tier = format!("{:?}", app_info.tier);
                
                // Emit event if tier changed
                if old_tier != new_tier {
                    self.emit_oracle_event(OracleEvent::ConsumerAppTierUpgraded {
                        app_id: caller_app,
                        chain_id: caller_chain,
                        old_tier,
                        new_tier: new_tier.clone(),
                        new_stake: app_info.stake,
                    });
                }
                
                OperationResponse::success(format!(
                    "Consumer app tier upgraded to {}. New rate limit: {}/hour",
                    new_tier, app_info.rate_limit
                ))
            }
            Err(e) => OperationResponse::error(e),
        }
    }
    
    /// Deregister consumer app
    async fn deregister_consumer_app(&mut self) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        let caller_app = self.runtime.application_id().forget_abi();
        let caller_chain = self.runtime.chain_id();
        
        // Get app info for event
        let app_info = match self.state.get_consumer_app(&caller_app, &caller_chain).await {
            Some(info) => info,
            None => return OperationResponse::error("Consumer app not registered"),
        };
        
        // If Instance mode, forward to Hub
        if self.state.is_instance() {
            return self.forward_consumer_app_deregistration_to_hub(caller_app, caller_chain).await;
        }
        
        match self.state.deregister_consumer_app(&caller_app, &caller_chain).await {
            Ok(stake_returned) => {
                // Emit event
                self.emit_oracle_event(OracleEvent::ConsumerAppDeregistered {
                    app_id: caller_app,
                    chain_id: caller_chain,
                    stake_returned,
                    total_queries: app_info.total_queries,
                });
                
                OperationResponse::success(format!(
                    "Consumer app deregistered. Stake returned: {}",
                    stake_returned
                ))
            }
            Err(e) => OperationResponse::error(e),
        }
    }
    
    /// Forward consumer app deregistration to Hub (Instance mode)
    async fn forward_consumer_app_deregistration_to_hub(
        &mut self,
        app_id: linera_sdk::linera_base_types::ApplicationId,
        source_chain: linera_sdk::linera_base_types::ChainId,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{Message, OperationResponse};
        
        let hub_chain_id = match self.state.get_hub_chain_id() {
            Some(id) => id,
            None => return OperationResponse::error("Not in Instance mode"),
        };
        
        let message = Message::DeregisterConsumerAppOnHub {
            app_id,
            source_chain,
        };
        
        self.runtime
            .prepare_message(message)
            .with_authentication()
            .send_to(hub_chain_id);
        
        OperationResponse::success("Consumer app deregistration forwarded to Hub")
    }
    
    /// Handle consumer app deregistration on Hub (from Instance)
    async fn handle_deregister_consumer_app_on_hub(
        &mut self,
        app_id: linera_sdk::linera_base_types::ApplicationId,
        source_chain: linera_sdk::linera_base_types::ChainId,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{Message, OperationResponse};
        
        // Get app info for event
        let app_info = match self.state.get_consumer_app(&app_id, &source_chain).await {
            Some(info) => info,
            None => return OperationResponse::error("Consumer app not registered"),
        };
        
        match self.state.deregister_consumer_app(&app_id, &source_chain).await {
            Ok(stake_returned) => {
                // Emit event
                self.emit_oracle_event(OracleEvent::ConsumerAppDeregistered {
                    app_id,
                    chain_id: source_chain,
                    stake_returned,
                    total_queries: app_info.total_queries,
                });
                
                // Send confirmation back to Instance
                let confirm_message = Message::ConsumerAppDeregistered {
                    app_id,
                    chain_id: source_chain,
                    stake_returned,
                };
                
                self.runtime
                    .prepare_message(confirm_message)
                    .send_to(source_chain);
                
                OperationResponse::success(format!(
                    "Consumer app deregistered on Hub. Stake returned: {}",
                    stake_returned
                ))
            }
            Err(e) => OperationResponse::error(e),
        }
    }
    
    /// Suspend a consumer app (admin only)
    async fn suspend_consumer_app(
        &mut self,
        app_id: linera_sdk::linera_base_types::ApplicationId,
        chain_id: linera_sdk::linera_base_types::ChainId,
        reason: String,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        // Check admin
        let caller_chain = self.runtime.chain_id();
        if !self.state.is_admin(&caller_chain).await {
            return OperationResponse::error("Only admin can suspend consumer apps");
        }
        
        match self.state.suspend_consumer_app(&app_id, &chain_id).await {
            Ok(()) => {
                // Emit event
                self.emit_oracle_event(OracleEvent::ConsumerAppSuspended {
                    app_id,
                    chain_id,
                    reason: reason.clone(),
                    suspended_by: caller_chain,
                });
                
                OperationResponse::success(format!(
                    "Consumer app suspended. Reason: {}",
                    reason
                ))
            }
            Err(e) => OperationResponse::error(e),
        }
    }
    
    /// Reactivate a suspended consumer app (admin only)
    async fn reactivate_consumer_app(
        &mut self,
        app_id: linera_sdk::linera_base_types::ApplicationId,
        chain_id: linera_sdk::linera_base_types::ChainId,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        // Check admin
        let caller_chain = self.runtime.chain_id();
        if !self.state.is_admin(&caller_chain).await {
            return OperationResponse::error("Only admin can reactivate consumer apps");
        }
        
        match self.state.reactivate_consumer_app(&app_id, &chain_id).await {
            Ok(()) => {
                // Emit event
                self.emit_oracle_event(OracleEvent::ConsumerAppReactivated {
                    app_id,
                    chain_id,
                    reactivated_by: caller_chain,
                });
                
                OperationResponse::success("Consumer app reactivated")
            }
            Err(e) => OperationResponse::error(e),
        }
    }
    
    /// Validate consumer app access for creating queries
    /// Returns Ok(app_info) if app is registered and within rate limits
    async fn validate_consumer_app_access(
        &mut self,
        app_id: &linera_sdk::linera_base_types::ApplicationId,
        chain_id: &linera_sdk::linera_base_types::ChainId,
    ) -> Result<state::ConsumerAppInfo, String> {
        // Check if app is registered
        let app_info = self.state.get_consumer_app(app_id, chain_id).await
            .ok_or_else(|| "Consumer app not registered. Please register first using RegisterConsumerApp.".to_string())?;
        
        // Check if app is active
        if !app_info.is_active {
            return Err("Consumer app is suspended. Contact admin for reactivation.".to_string());
        }
        
        // Check rate limit
        let current_time = self.runtime.system_time();
        if let Err(e) = self.state.check_and_update_rate_limit(app_id, chain_id, current_time).await {
            // Emit rate limit exceeded event
            self.emit_oracle_event(OracleEvent::RateLimitExceeded {
                app_id: *app_id,
                chain_id: *chain_id,
                queries_attempted: app_info.queries_this_hour + 1,
                limit: app_info.rate_limit,
            });
            return Err(e);
        }
        
        Ok(app_info)
    }
}

// ==================== QUERY & VOTING OPERATIONS ====================

impl OracleRegistryV2Contract {
    /// Create a new query
    async fn create_query(
        &mut self,
        description: String,
        outcomes: Vec<String>,
        strategy: state::DecisionStrategy,
        min_votes: Option<usize>,
        reward_amount: Amount,
        deadline: Option<linera_sdk::linera_base_types::Timestamp>,
        duration_secs: Option<u64>,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{OperationResponse, ResponseData};
        use state::{Query, QueryStatus};
        
        let creator = self.runtime.chain_id();
        
        // Validate query parameters
        if let Err(e) = self.validate_query_params(&description, &outcomes, &reward_amount, &deadline) {
            return OperationResponse::error(e);
        }
        
        // Get protocol parameters
        let params = self.state.get_parameters().await;
        
        // Determine min_votes (use provided or default)
        let min_votes_required = min_votes.unwrap_or(params.min_votes_default);
        
        // Validate min_votes is reasonable
        let voter_count = *self.state.voter_count.get();
        if let Err(e) = self.validate_min_votes_param(min_votes_required, voter_count) {
            return OperationResponse::error(e);
        }
        
        // Validate strategy is compatible with outcomes
        if let Err(e) = self.validate_strategy_compatibility(&strategy, &outcomes) {
            return OperationResponse::error(e);
        }
        
        // Calculate commit/reveal phases
        // Use custom duration if provided, otherwise use default
        // Duration is split 50/50 between commit and reveal phases
        let current_time = self.runtime.system_time();
        let total_duration_secs = duration_secs.unwrap_or(params.default_query_duration);
        let total_duration_micros = total_duration_secs * 1_000_000;
        let commit_duration_micros = total_duration_micros / 2;
        let reveal_duration_micros = total_duration_micros / 2;
        
        let commit_phase_end = current_time.saturating_add(
            linera_sdk::linera_base_types::TimeDelta::from_micros(commit_duration_micros)
        );
        let reveal_phase_end = commit_phase_end.saturating_add(
            linera_sdk::linera_base_types::TimeDelta::from_micros(reveal_duration_micros)
        );
        
        // Determine final deadline (use provided or calculated reveal_phase_end)
        let query_deadline = deadline.unwrap_or(reveal_phase_end);
        
        // Validate deadline is in the future
        if query_deadline <= current_time {
            return OperationResponse::error("Deadline must be in the future");
        }
        
        // Get next query ID
        let query_id = *self.state.next_query_id.get();
        self.state.next_query_id.set(query_id + 1);
        
        // Determine max_voters (2x min_votes to allow for non-participation)
        let max_voters = min_votes_required * 2;
        
        // SELECT VOTERS BY POWER
        let selected_voters = match self.state
            .select_voters_for_query(min_votes_required, max_voters)
            .await
        {
            Ok(voters) => voters,
            Err(e) => return OperationResponse::error(format!(
                "Failed to select voters: {}", e
            )),
        };
        
        // Create query with selected voters and commit/reveal phases
        // Manual queries don't have callback info (only market-created queries do)
        let query = Query {
            id: query_id,
            description,
            outcomes,
            // Metadata fields (none for manual queries)
            title: None,
            category: None,
            context: None,
            resolution_criteria: None,
            source_urls: None,
            tags: None,
            metadata_url: None,
            external_id: None,
            // Source DApp tracking (internal - from dashboard)
            source_app_id: None,
            source_app_name: None,
            source_app_logo: None,
            source_app_category: None,
            query_source: state::QuerySource::Internal,
            // Core fields
            strategy,
            min_votes: min_votes_required,
            reward_amount,
            creator,
            created_at: current_time,
            deadline: query_deadline,
            commit_phase_end,
            reveal_phase_end,
            phase: state::VotingPhase::Commit,
            status: QueryStatus::Active,
            result: None,
            resolved_at: None,
            commits: std::collections::BTreeMap::new(),
            votes: std::collections::BTreeMap::new(),
            selected_voters,
            max_voters,
            callback_chain: None,  // No callback for manual queries
            callback_data: None,   // No callback for manual queries
            // Hybrid model fields (legacy query - no bond)
            bond_amount: Amount::ZERO,
            priority_fee: Amount::ZERO,
            bond_refunded: false,
            dispute: None,
            dispute_window_end: None,
        };
        
        // Clone data for event before moving into state
        let description_for_event = query.description.clone();
        let outcomes_for_event = query.outcomes.clone();
        
        // Store query
        self.state.queries.insert(&query_id, query).expect("Failed to insert query");
        
        // Add to active queries
        let mut active = self.state.get_active_queries().await;
        active.push(query_id);
        self.state.active_queries.set(active);
        
        // Initialize vote count
        self.state.vote_counts.insert(&query_id, 0).expect("Failed to initialize vote count");
        
        // Update statistics
        let total_created = *self.state.total_queries_created.get();
        self.state.total_queries_created.set(total_created + 1);
        
        // Emit QueryCreated event for cross-chain subscribers
        self.emit_oracle_event(OracleEvent::QueryCreated {
            query_id,
            description: description_for_event,
            outcomes: outcomes_for_event,
            deadline: query_deadline,
            creator,
            min_votes: min_votes_required,
        });
        
        // Transfer reward amount to contract
        // Note: In production, implement proper token transfer from creator
        
        OperationResponse::success_with_data(
            format!("Query {} created successfully", query_id),
            ResponseData {
                voter_address: None,
                query_id: Some(query_id),
                vote_count: None,
                rewards_claimed: None,
            }
        )
    }
    
    /// Create a new query with callback information (for cross-application calls)
    /// This allows other applications (like Simple Market) to create queries
    /// and receive callbacks when the query is resolved
    async fn create_query_with_callback(
        &mut self,
        description: String,
        outcomes: Vec<String>,
        strategy: state::DecisionStrategy,
        min_votes: Option<usize>,
        reward_amount: Amount,
        deadline: Option<linera_sdk::linera_base_types::Timestamp>,
        callback_chain: linera_sdk::linera_base_types::ChainId,
        callback_app: linera_sdk::linera_base_types::ApplicationId,
        callback_data: Vec<u8>,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{OperationResponse, ResponseData};
        use state::{Query, QueryStatus};
        
        eprintln!(
            "📥 CreateQueryWithCallback: description={}, callback_chain={}, callback_app={}",
            description, callback_chain, callback_app
        );
        
        let creator = self.runtime.chain_id();
        
        // ==================== CONSUMER APP ACCESS CONTROL ====================
        // Validate that the calling app is registered and within rate limits
        let app_info = match self.validate_consumer_app_access(&callback_app, &callback_chain).await {
            Ok(info) => {
                eprintln!(
                    "✅ Consumer app validated: {} (tier: {:?}, queries: {}/{})",
                    info.name, info.tier, info.queries_this_hour, info.rate_limit
                );
                Some(info)
            }
            Err(e) => {
                // For backward compatibility, allow unregistered apps with a warning
                // In production, you might want to return an error instead
                eprintln!(
                    "⚠️ Consumer app not registered or rate limited: {}. Allowing for backward compatibility.",
                    e
                );
                None
            }
        };
        
        // Validate query parameters
        if let Err(e) = self.validate_query_params(&description, &outcomes, &reward_amount, &deadline) {
            return OperationResponse::error(e);
        }
        
        // Get protocol parameters
        let params = self.state.get_parameters().await;
        
        // Determine min_votes (use provided or default)
        let min_votes_required = min_votes.unwrap_or(params.min_votes_default);
        
        // Validate min_votes is reasonable
        let voter_count = *self.state.voter_count.get();
        if let Err(e) = self.validate_min_votes_param(min_votes_required, voter_count) {
            return OperationResponse::error(e);
        }
        
        // Validate strategy is compatible with outcomes
        if let Err(e) = self.validate_strategy_compatibility(&strategy, &outcomes) {
            return OperationResponse::error(e);
        }
        
        // Calculate commit/reveal phases using default_query_duration from parameters
        // Total duration is split 50/50 between commit and reveal phases
        let current_time = self.runtime.system_time();
        let total_duration_secs = params.default_query_duration;
        let half_duration_micros = (total_duration_secs * 1_000_000) / 2;
        let commit_duration = linera_sdk::linera_base_types::TimeDelta::from_micros(half_duration_micros);
        let reveal_duration = linera_sdk::linera_base_types::TimeDelta::from_micros(half_duration_micros);
        
        let commit_phase_end = current_time.saturating_add(commit_duration);
        let reveal_phase_end = commit_phase_end.saturating_add(reveal_duration);
        
        // Determine final deadline (use provided or calculated reveal_phase_end)
        let query_deadline = deadline.unwrap_or(reveal_phase_end);
        
        // Get next query ID
        let query_id = *self.state.next_query_id.get();
        self.state.next_query_id.set(query_id + 1);
        
        // Determine max_voters (2x min_votes to allow for non-participation)
        let max_voters = min_votes_required * 2;
        
        // SELECT VOTERS BY POWER
        let selected_voters = match self.state
            .select_voters_for_query(min_votes_required, max_voters)
            .await
        {
            Ok(voters) => voters,
            Err(e) => return OperationResponse::error(format!(
                "Failed to select voters: {}", e
            )),
        };
        
        // Try to get source DApp info for this callback query
        let (source_app_id, source_app_name, source_app_logo, source_app_category, query_source) = 
            if let Some(ref info) = app_info {
                let category_str = format!("{:?}", info.category);
                let source = state::QuerySource::from_app_category(&info.category);
                (
                    Some(info.app_id),
                    Some(info.name.clone()),
                    info.logo_url.clone(),
                    Some(category_str),
                    source,
                )
            } else {
                (None, None, None, None, state::QuerySource::ExternalOther)
            };
        
        // Create query with callback information
        let query = Query {
            id: query_id,
            description,
            outcomes,
            // Metadata fields (none for callback queries without metadata)
            title: None,
            category: None,
            context: None,
            resolution_criteria: None,
            source_urls: None,
            tags: None,
            metadata_url: None,
            external_id: None,
            // Source DApp tracking
            source_app_id,
            source_app_name,
            source_app_logo,
            source_app_category,
            query_source,
            // Core fields
            strategy,
            min_votes: min_votes_required,
            reward_amount,
            creator,
            created_at: current_time,
            deadline: query_deadline,
            commit_phase_end,
            reveal_phase_end,
            phase: state::VotingPhase::Commit,
            status: QueryStatus::Active,
            result: None,
            resolved_at: None,
            commits: std::collections::BTreeMap::new(),
            votes: std::collections::BTreeMap::new(),
            selected_voters,
            max_voters,
            callback_chain: Some(callback_chain),
            callback_data: Some(callback_data),
            // Hybrid model fields (legacy query - no bond)
            bond_amount: Amount::ZERO,
            priority_fee: Amount::ZERO,
            bond_refunded: false,
            dispute: None,
            dispute_window_end: None,
        };
        
        // Store query
        self.state.queries.insert(&query_id, query).expect("Failed to insert query");
        
        // Add to active queries
        let mut active = self.state.get_active_queries().await;
        active.push(query_id);
        self.state.active_queries.set(active);
        
        // Initialize vote count
        self.state.vote_counts.insert(&query_id, 0).expect("Failed to initialize vote count");
        
        // Update statistics
        let total_created = *self.state.total_queries_created.get();
        self.state.total_queries_created.set(total_created + 1);
        
        // Update consumer app query count (if registered)
        if app_info.is_some() {
            let _ = self.state.increment_app_query_count(&callback_app, &callback_chain).await;
        }
        
        eprintln!("✅ Query {} created with callback to chain {} app {}", query_id, callback_chain, callback_app);
        
        OperationResponse::success_with_data(
            format!("Query {} created with callback", query_id),
            ResponseData {
                voter_address: None,
                query_id: Some(query_id),
                vote_count: None,
                rewards_claimed: None,
            }
        )
    }
    
    /// Validate query creation parameters
    fn validate_query_params(
        &mut self,
        description: &str,
        outcomes: &[String],
        reward_amount: &Amount,
        deadline: &Option<linera_sdk::linera_base_types::Timestamp>,
    ) -> Result<(), String> {
        // Validate description
        if description.is_empty() {
            return Err("Description cannot be empty".to_string());
        }
        if description.len() > 1000 {
            return Err("Description too long (max 1000 characters)".to_string());
        }
        
        // Validate outcomes
        if outcomes.is_empty() {
            return Err("At least one outcome must be provided".to_string());
        }
        if outcomes.len() > 100 {
            return Err("Too many outcomes (max 100)".to_string());
        }
        
        // Check for empty outcomes
        for outcome in outcomes {
            if outcome.is_empty() {
                return Err("Outcome cannot be empty".to_string());
            }
            if outcome.len() > 200 {
                return Err("Outcome too long (max 200 characters)".to_string());
            }
        }
        
        // Check for duplicate outcomes
        let mut unique_outcomes = std::collections::HashSet::new();
        for outcome in outcomes {
            if !unique_outcomes.insert(outcome) {
                return Err(format!("Duplicate outcome: {}", outcome));
            }
        }
        
        // Validate reward amount
        if *reward_amount == Amount::ZERO {
            return Err("Reward amount must be greater than zero".to_string());
        }
        
        // Validate deadline if provided
        if let Some(dl) = deadline {
            let current_time = self.runtime.system_time();
            if *dl <= current_time {
                return Err("Deadline must be in the future".to_string());
            }
            
            // Check deadline is not too far in the future (e.g., max 1 year)
            let max_duration_micros = 365 * 24 * 60 * 60 * 1_000_000u64; // 1 year in microseconds
            let max_deadline = current_time.saturating_add(linera_sdk::linera_base_types::TimeDelta::from_micros(max_duration_micros));
            if *dl > max_deadline {
                return Err("Deadline too far in the future (max 1 year)".to_string());
            }
        }
        
        Ok(())
    }
    
    /// Validate query exists and return it
    async fn validate_query_exists(&self, query_id: u64) -> Result<state::Query, String> {
        self.state.get_query(query_id).await
            .ok_or_else(|| format!("Query {} not found", query_id))
    }
    
    /// Validate query is in active state
    fn validate_query_active(&self, query: &state::Query) -> Result<(), String> {
        if query.status != state::QueryStatus::Active {
            return Err(format!(
                "Query {} is not active (status: {:?})",
                query.id, query.status
            ));
        }
        Ok(())
    }
    
    /// Validate query deadline has not passed
    fn validate_query_deadline_not_passed(&mut self, query: &state::Query) -> Result<(), String> {
        let current_time = self.runtime.system_time();
        if current_time >= query.deadline {
            return Err(format!(
                "Query {} deadline has passed (deadline: {:?}, current: {:?})",
                query.id, query.deadline, current_time
            ));
        }
        Ok(())
    }
    
    /// Validate query deadline has passed (for resolution)
    fn validate_query_deadline_passed(&mut self, query: &state::Query) -> Result<(), String> {
        let current_time = self.runtime.system_time();
        if current_time < query.deadline {
            return Err(format!(
                "Query {} deadline has not passed yet (deadline: {:?}, current: {:?})",
                query.id, query.deadline, current_time
            ));
        }
        Ok(())
    }
    
    /// Validate voter has not already voted on query
    fn validate_voter_not_voted(&self, query: &state::Query, voter_chain: &linera_sdk::linera_base_types::ChainId) -> Result<(), String> {
        if query.votes.contains_key(voter_chain) {
            return Err(format!(
                "Voter {} has already voted on query {}",
                voter_chain, query.id
            ));
        }
        Ok(())
    }
    
    /// Validate vote value is a valid outcome
    fn validate_vote_value(&self, query: &state::Query, value: &str) -> Result<(), String> {
        if !query.outcomes.contains(&value.to_string()) {
            return Err(format!(
                "Invalid vote value '{}' for query {}. Valid outcomes: {}",
                value, query.id, query.outcomes.join(", ")
            ));
        }
        Ok(())
    }
    
    /// Validate confidence score is within valid range
    fn validate_confidence(&self, confidence: Option<u8>) -> Result<(), String> {
        if let Some(conf) = confidence {
            if conf > 100 {
                return Err("Confidence must be between 0 and 100".to_string());
            }
        }
        Ok(())
    }
    
    /// Validate query has minimum votes for resolution
    fn validate_minimum_votes_met(&self, query: &state::Query) -> Result<(), String> {
        let vote_count = query.votes.len();
        if vote_count < query.min_votes {
            return Err(format!(
                "Query {} does not have minimum votes: {}/{} votes",
                query.id, vote_count, query.min_votes
            ));
        }
        Ok(())
    }
    
    /// Validate query can be resolved
    async fn validate_query_resolvable(&mut self, query: &state::Query) -> Result<(), String> {
        // Check query is active
        self.validate_query_active(query)?;
        
        // Check deadline has passed
        self.validate_query_deadline_passed(query)?;
        
        // Check minimum votes met
        self.validate_minimum_votes_met(query)?;
        
        Ok(())
    }
    
    /// Validate min_votes parameter is reasonable
    fn validate_min_votes_param(&self, min_votes: usize, voter_count: u64) -> Result<(), String> {
        if min_votes == 0 {
            return Err("Minimum votes must be at least 1".to_string());
        }
        
        // Warn if min_votes is more than total registered voters
        if min_votes as u64 > voter_count {
            return Err(format!(
                "Minimum votes ({}) exceeds total registered voters ({})",
                min_votes, voter_count
            ));
        }
        
        // Warn if min_votes is unreasonably high (more than 50% of voters)
        if min_votes as u64 > voter_count / 2 && voter_count > 10 {
            return Err(format!(
                "Minimum votes ({}) is more than 50% of registered voters ({})",
                min_votes, voter_count
            ));
        }
        
        Ok(())
    }
    
    /// Validate decision strategy is compatible with outcomes
    fn validate_strategy_compatibility(&self, strategy: &state::DecisionStrategy, outcomes: &[String]) -> Result<(), String> {
        match strategy {
            state::DecisionStrategy::Median => {
                // Median strategy requires numeric outcomes
                for outcome in outcomes {
                    if outcome.parse::<f64>().is_err() {
                        return Err(format!(
                            "Median strategy requires numeric outcomes, but '{}' is not numeric",
                            outcome
                        ));
                    }
                }
            },
            _ => {
                // Other strategies work with any outcomes
            }
        }
        Ok(())
    }
    
    /// Submit a vote for a query
    async fn submit_vote(
        &mut self,
        query_id: u64,
        value: String,
        confidence: Option<u8>,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        use state::Vote;
        
        let voter_chain = self.runtime.chain_id();
        
        // Validate voter is registered and active
        let voter_info = match self.validate_voter_registered(&voter_chain).await {
            Ok(info) => info,
            Err(e) => return OperationResponse::error(e),
        };
        
        // Validate query exists
        let mut query = match self.validate_query_exists(query_id).await {
            Ok(q) => q,
            Err(e) => return OperationResponse::error(e),
        };
        
        // Validate query is active
        if let Err(e) = self.validate_query_active(&query) {
            return OperationResponse::error(e);
        }
        
        // CHECK IF VOTER IS SELECTED FOR THIS QUERY
        // TEMPORARY: Disabled - all registered voters can vote
        // if !query.selected_voters.contains(&voter_chain) {
        //     return OperationResponse::error(format!(
        //         "You are not selected to vote on this query. \
        //         Only {} selected voters (by stake × reputation power) can participate. \
        //         Increase your stake or reputation to improve selection chances.",
        //         query.selected_voters.len()
        //     ));
        // }
        
        // Check if query has expired (deadline passed)
        if self.is_query_expired(&query) {
            // Automatically mark as expired
            if let Err(e) = self.mark_query_expired(query_id).await {
                eprintln!("Warning: Failed to auto-expire query {}: {}", query_id, e);
            }
            return OperationResponse::error(format!(
                "Query {} has expired (deadline passed: {:?})",
                query_id, query.deadline
            ));
        }
        
        // Validate deadline hasn't passed
        if let Err(e) = self.validate_query_deadline_not_passed(&query) {
            return OperationResponse::error(e);
        }
        
        // Validate voter hasn't already voted
        if let Err(e) = self.validate_voter_not_voted(&query, &voter_chain) {
            return OperationResponse::error(e);
        }
        
        // Validate vote value is valid
        if let Err(e) = self.validate_vote_value(&query, &value) {
            return OperationResponse::error(e);
        }
        
        // Validate confidence score
        if let Err(e) = self.validate_confidence(confidence) {
            return OperationResponse::error(e);
        }
        
        // Calculate stake to lock based on query parameters
        let params = self.state.get_parameters().await;
        let stake_to_lock = self.calculate_stake_to_lock(&voter_info, &query, &params);
        
        // Lock stake for this vote
        if let Err(e) = self.state.lock_stake(&voter_chain, stake_to_lock).await {
            return OperationResponse::error(format!("Failed to lock stake: {}", e));
        }
        
        // Create vote with voting power
        let vote = Vote {
            voter: voter_chain,
            value: value.clone(),
            timestamp: self.runtime.system_time(),
            salt: None, // Direct voting (no commit/reveal)
            confidence,
            voting_power: voter_info.stake,
        };
        
        // Store vote
        query.votes.insert(voter_chain, vote.clone());
        self.state.queries.insert(&query_id, query).expect("Failed to update query");
        self.state.votes.insert(&(query_id, voter_chain), vote).expect("Failed to store vote");
        
        // Update vote count
        let current_count = self.state.vote_counts.get(&query_id).await.ok().flatten().unwrap_or(0);
        self.state.vote_counts.insert(&query_id, current_count + 1).expect("Failed to update vote count");
        
        // Update voter stats
        let mut updated_voter_info = self.state.get_voter(&voter_chain).await.expect("Voter should exist");
        updated_voter_info.total_votes += 1;
        self.state.voters.insert(&voter_chain, updated_voter_info).expect("Failed to update voter");
        
        // Update total votes submitted
        let total_votes = *self.state.total_votes_submitted.get();
        self.state.total_votes_submitted.set(total_votes + 1);
        
        // Emit VoteSubmitted event for cross-chain subscribers
        self.emit_oracle_event(OracleEvent::VoteSubmitted {
            query_id,
            voter_chain,
            value,
        });
        
        OperationResponse::success(format!("Vote submitted successfully, {} stake locked", stake_to_lock))
    }
    
    /// Submit a vote from cross-chain message (uses sender_chain as voter ID)
    async fn submit_vote_from_message(
        &mut self,
        sender_chain: linera_sdk::linera_base_types::ChainId,
        query_id: u64,
        value: String,
        confidence: Option<u8>,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        use state::Vote;
        
        eprintln!("📥 Received SubmitVote message from chain: {}", sender_chain);
        eprintln!("   Query: {}, Value: {}, Confidence: {:?}", query_id, value, confidence);
        
        // Use sender_chain as voter identifier (from cross-chain message)
        let voter_chain = sender_chain;
        
        // Validate voter is registered and active
        let voter_info = match self.validate_voter_registered(&voter_chain).await {
            Ok(info) => info,
            Err(e) => return OperationResponse::error(e),
        };
        
        // Validate query exists
        let mut query = match self.validate_query_exists(query_id).await {
            Ok(q) => q,
            Err(e) => return OperationResponse::error(e),
        };
        
        // Validate query is active
        if let Err(e) = self.validate_query_active(&query) {
            return OperationResponse::error(e);
        }
        
        // CHECK IF VOTER IS SELECTED FOR THIS QUERY
        // TEMPORARY: Disabled - all registered voters can vote
        // if !query.selected_voters.contains(&voter_chain) {
        //     return OperationResponse::error(format!(
        //         "Voter {} is not selected to vote on this query. \
        //         Only {} selected voters (by stake × reputation power) can participate.",
        //         voter_chain, query.selected_voters.len()
        //     ));
        // }
        
        // Check if query has expired (deadline passed)
        if self.is_query_expired(&query) {
            return OperationResponse::error(format!(
                "Query {} has expired (deadline passed: {:?})",
                query_id, query.deadline
            ));
        }
        
        // Validate deadline hasn't passed
        if let Err(e) = self.validate_query_deadline_not_passed(&query) {
            return OperationResponse::error(e);
        }
        
        // Validate voter hasn't already voted
        if let Err(e) = self.validate_voter_not_voted(&query, &voter_chain) {
            return OperationResponse::error(e);
        }
        
        // Validate vote value is valid
        if let Err(e) = self.validate_vote_value(&query, &value) {
            return OperationResponse::error(e);
        }
        
        // Validate confidence score
        if let Err(e) = self.validate_confidence(confidence) {
            return OperationResponse::error(e);
        }
        
        // Calculate stake to lock based on query parameters
        let params = self.state.get_parameters().await;
        let stake_to_lock = self.calculate_stake_to_lock(&voter_info, &query, &params);
        
        // Lock stake for this vote
        if let Err(e) = self.state.lock_stake(&voter_chain, stake_to_lock).await {
            return OperationResponse::error(format!("Failed to lock stake: {}", e));
        }
        
        // Create vote with voting power
        let vote = Vote {
            voter: voter_chain,
            value: value.clone(),
            timestamp: self.runtime.system_time(),
            salt: None, // Direct voting (no commit/reveal)
            confidence,
            voting_power: voter_info.stake,
        };
        
        // Store vote
        query.votes.insert(voter_chain, vote.clone());
        self.state.queries.insert(&query_id, query).expect("Failed to update query");
        self.state.votes.insert(&(query_id, voter_chain), vote).expect("Failed to store vote");
        
        // Update vote count
        let current_count = self.state.vote_counts.get(&query_id).await.ok().flatten().unwrap_or(0);
        self.state.vote_counts.insert(&query_id, current_count + 1).expect("Failed to update vote count");
        
        // Update voter stats
        let mut updated_voter_info = self.state.get_voter(&voter_chain).await.expect("Voter should exist");
        updated_voter_info.total_votes += 1;
        self.state.voters.insert(&voter_chain, updated_voter_info).expect("Failed to update voter");
        
        // Update total votes submitted
        let total_votes = *self.state.total_votes_submitted.get();
        self.state.total_votes_submitted.set(total_votes + 1);
        
        // Emit VoteSubmitted event for cross-chain subscribers
        self.emit_oracle_event(OracleEvent::VoteSubmitted {
            query_id,
            voter_chain,
            value: value.clone(),
        });
        
        eprintln!("✅ Vote from {} on query {} recorded successfully", voter_chain, query_id);
        
        OperationResponse::success(format!(
            "Vote submitted successfully via cross-chain message, {} stake locked",
            stake_to_lock
        ))
    }
    
    /// Commit a vote from cross-chain message (uses sender_chain as voter ID)
    async fn commit_vote_from_message(
        &mut self,
        sender_chain: linera_sdk::linera_base_types::ChainId,
        query_id: u64,
        commit_hash: String,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        use state::VoteCommit;
        
        eprintln!("📥 Received CommitVote message from chain: {}", sender_chain);
        eprintln!("   Query: {}, Hash: {}", query_id, commit_hash);
        
        let voter_chain = sender_chain;
        
        // Validate voter is registered and active
        let voter_info = match self.validate_voter_registered(&voter_chain).await {
            Ok(info) => info,
            Err(e) => return OperationResponse::error(e),
        };
        
        // Validate query exists
        let mut query = match self.validate_query_exists(query_id).await {
            Ok(q) => q,
            Err(e) => return OperationResponse::error(e),
        };
        
        // Validate query is active
        if let Err(e) = self.validate_query_active(&query) {
            return OperationResponse::error(e);
        }
        
        // Check if voter is selected for this query
        // TEMPORARY: Disabled - all registered voters can vote
        // if !query.selected_voters.contains(&voter_chain) {
        //     return OperationResponse::error(format!(
        //         "Voter {} is not selected to vote on this query",
        //         voter_chain
        //     ));
        // }
        
        // Validate query is in commit phase
        let current_time = self.runtime.system_time();
        if query.phase != state::VotingPhase::Commit {
            return OperationResponse::error(format!(
                "Query is not in commit phase (current phase: {:?})",
                query.phase
            ));
        }
        
        // Check if commit phase has ended
        if current_time > query.commit_phase_end {
            query.phase = state::VotingPhase::Reveal;
            self.state.queries.insert(&query_id, query.clone()).expect("Failed to update query");
            return OperationResponse::error("Commit phase has ended, now in reveal phase");
        }
        
        // Validate voter hasn't already committed
        if query.commits.contains_key(&voter_chain) {
            return OperationResponse::error("Voter has already committed a vote");
        }
        
        // Validate commit hash format
        if commit_hash.is_empty() || commit_hash.len() > 128 {
            return OperationResponse::error("Invalid commit hash format");
        }
        
        // Calculate stake to lock
        let params = self.state.get_parameters().await;
        let stake_to_lock = self.calculate_stake_to_lock(&voter_info, &query, &params);
        
        // Lock stake for this vote
        if let Err(e) = self.state.lock_stake(&voter_chain, stake_to_lock).await {
            return OperationResponse::error(format!("Failed to lock stake: {}", e));
        }
        
        // Create commit with stake_locked stored for exact unlock later
        let commit = VoteCommit {
            voter: voter_chain,
            commit_hash: commit_hash.clone(),
            committed_at: current_time,
            revealed: false,
            stake_locked: stake_to_lock,  // Store exact amount locked
        };
        
        let commit_phase_end = query.commit_phase_end;
        query.commits.insert(voter_chain, commit);
        self.state.queries.insert(&query_id, query).expect("Failed to update query");
        
        // Update voter stats
        let mut updated_voter_info = self.state.get_voter(&voter_chain).await.expect("Voter should exist");
        updated_voter_info.total_votes += 1;
        self.state.voters.insert(&voter_chain, updated_voter_info).expect("Failed to update voter");
        
        // Emit VoteCommitted event
        self.emit_oracle_event(OracleEvent::VoteCommitted {
            query_id,
            voter_chain,
            commit_hash,
        });
        
        eprintln!("✅ Vote committed from {} on query {}", voter_chain, query_id);
        
        OperationResponse::success(format!(
            "Vote committed successfully via cross-chain message. Reveal after {}",
            commit_phase_end
        ))
    }
    
    /// Reveal a vote from cross-chain message (uses sender_chain as voter ID)
    async fn reveal_vote_from_message(
        &mut self,
        sender_chain: linera_sdk::linera_base_types::ChainId,
        query_id: u64,
        value: String,
        salt: String,
        confidence: Option<u8>,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        use state::Vote;
        
        eprintln!("📥 Received RevealVote message from chain: {}", sender_chain);
        eprintln!("   Query: {}, Value: {}, Salt: {}", query_id, value, salt);
        
        let voter_chain = sender_chain;
        
        // Validate voter is registered and active
        let voter_info = match self.validate_voter_registered(&voter_chain).await {
            Ok(info) => info,
            Err(e) => return OperationResponse::error(e),
        };
        
        // Validate query exists
        let mut query = match self.validate_query_exists(query_id).await {
            Ok(q) => q,
            Err(e) => return OperationResponse::error(e),
        };
        
        // Validate query is active
        if let Err(e) = self.validate_query_active(&query) {
            return OperationResponse::error(e);
        }
        
        // Validate query is in reveal phase
        let current_time = self.runtime.system_time();
        if query.phase != state::VotingPhase::Reveal {
            if query.phase == state::VotingPhase::Commit && current_time > query.commit_phase_end {
                query.phase = state::VotingPhase::Reveal;
                self.state.queries.insert(&query_id, query.clone()).expect("Failed to update query");
            } else {
                return OperationResponse::error(format!(
                    "Query is not in reveal phase (current phase: {:?})",
                    query.phase
                ));
            }
        }
        
        // Check if reveal phase has ended
        if current_time > query.reveal_phase_end {
            query.phase = state::VotingPhase::Completed;
            self.state.queries.insert(&query_id, query.clone()).expect("Failed to update query");
            return OperationResponse::error("Reveal phase has ended");
        }
        
        // Validate voter has committed
        let mut commit = match query.commits.get(&voter_chain) {
            Some(c) => c.clone(),
            None => return OperationResponse::error("Voter must commit a vote before revealing"),
        };
        
        // Validate voter hasn't already revealed
        if commit.revealed {
            return OperationResponse::error("Voter has already revealed their vote");
        }
        
        // Validate vote value is valid
        if let Err(e) = self.validate_vote_value(&query, &value) {
            return OperationResponse::error(e);
        }
        
        // Validate confidence score
        if let Err(e) = self.validate_confidence(confidence) {
            return OperationResponse::error(e);
        }
        
        // Verify commit hash matches
        let computed_hash = self.compute_commit_hash(&value, &salt);
        if computed_hash != commit.commit_hash {
            return OperationResponse::error(
                "Commit hash verification failed. The value and salt do not match the commit."
            );
        }
        
        // Create vote with voting power
        let vote = Vote {
            voter: voter_chain,
            value: value.clone(),
            timestamp: current_time,
            salt: Some(salt),
            confidence,
            voting_power: voter_info.stake,
        };
        
        // Store vote
        query.votes.insert(voter_chain, vote.clone());
        
        // Mark commit as revealed
        commit.revealed = true;
        query.commits.insert(voter_chain, commit);
        
        // Update query
        self.state.queries.insert(&query_id, query).expect("Failed to update query");
        self.state.votes.insert(&(query_id, voter_chain), vote).expect("Failed to store vote");
        
        // Update vote count
        let current_count = self.state.vote_counts.get(&query_id).await.ok().flatten().unwrap_or(0);
        self.state.vote_counts.insert(&query_id, current_count + 1).expect("Failed to update vote count");
        
        // Update total votes submitted
        let total_votes = *self.state.total_votes_submitted.get();
        self.state.total_votes_submitted.set(total_votes + 1);
        
        // Emit VoteRevealed event
        self.emit_oracle_event(OracleEvent::VoteRevealed {
            query_id,
            voter_chain,
            value: value.clone(),
        });
        
        eprintln!("✅ Vote revealed from {} on query {}: {}", voter_chain, query_id, value);
        
        OperationResponse::success("Vote revealed successfully via cross-chain message")
    }
    
    /// Commit a vote (phase 1 of commit/reveal)
    async fn commit_vote(
        &mut self,
        query_id: u64,
        commit_hash: String,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        use state::VoteCommit;
        
        let voter_chain = self.runtime.chain_id();
        
        // Validate voter is registered and active
        let voter_info = match self.validate_voter_registered(&voter_chain).await {
            Ok(info) => info,
            Err(e) => return OperationResponse::error(e),
        };
        
        // Validate query exists
        let mut query = match self.validate_query_exists(query_id).await {
            Ok(q) => q,
            Err(e) => return OperationResponse::error(e),
        };
        
        // Validate query is active
        if let Err(e) = self.validate_query_active(&query) {
            return OperationResponse::error(e);
        }
        
        // Check if voter is selected for this query
        // TEMPORARY: Disabled - all registered voters can vote
        // if !query.selected_voters.contains(&voter_chain) {
        //     return OperationResponse::error(format!(
        //         "You are not selected to vote on this query"
        //     ));
        // }
        
        // Validate query is in commit phase
        let current_time = self.runtime.system_time();
        if query.phase != state::VotingPhase::Commit {
            return OperationResponse::error(format!(
                "Query is not in commit phase (current phase: {:?})",
                query.phase
            ));
        }
        
        // Check if commit phase has ended
        if current_time > query.commit_phase_end {
            // Auto-transition to reveal phase
            query.phase = state::VotingPhase::Reveal;
            self.state.queries.insert(&query_id, query.clone()).expect("Failed to update query");
            return OperationResponse::error("Commit phase has ended, now in reveal phase");
        }
        
        // Validate voter hasn't already committed
        if query.commits.contains_key(&voter_chain) {
            return OperationResponse::error("You have already committed a vote");
        }
        
        // Validate commit hash format (should be hex string)
        if commit_hash.is_empty() || commit_hash.len() > 128 {
            return OperationResponse::error("Invalid commit hash format");
        }
        
        // Calculate stake to lock
        let params = self.state.get_parameters().await;
        let stake_to_lock = self.calculate_stake_to_lock(&voter_info, &query, &params);
        
        // Lock stake for this vote
        if let Err(e) = self.state.lock_stake(&voter_chain, stake_to_lock).await {
            return OperationResponse::error(format!("Failed to lock stake: {}", e));
        }
        
        // Create commit with stake_locked stored for exact unlock later
        let commit = VoteCommit {
            voter: voter_chain,
            commit_hash: commit_hash.clone(),
            committed_at: current_time,
            revealed: false,
            stake_locked: stake_to_lock,  // Store exact amount locked
        };
        
        // Store commit and get commit_phase_end before moving query
        let commit_phase_end = query.commit_phase_end;
        query.commits.insert(voter_chain, commit);
        self.state.queries.insert(&query_id, query).expect("Failed to update query");
        
        // Update voter stats - increment total_votes on commit
        let mut updated_voter_info = self.state.get_voter(&voter_chain).await.expect("Voter should exist");
        updated_voter_info.total_votes += 1;
        self.state.voters.insert(&voter_chain, updated_voter_info).expect("Failed to update voter");
        
        // Emit VoteCommitted event for cross-chain subscribers
        self.emit_oracle_event(OracleEvent::VoteCommitted {
            query_id,
            voter_chain,
            commit_hash,
        });
        
        OperationResponse::success(format!(
            "Vote committed successfully. Reveal your vote after {} to complete voting.",
            commit_phase_end
        ))
    }
    
    /// Reveal a vote (phase 2 of commit/reveal)
    async fn reveal_vote(
        &mut self,
        query_id: u64,
        value: String,
        salt: String,
        confidence: Option<u8>,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        use state::Vote;
        
        let voter_chain = self.runtime.chain_id();
        
        // Validate voter is registered and active
        let voter_info = match self.validate_voter_registered(&voter_chain).await {
            Ok(info) => info,
            Err(e) => return OperationResponse::error(e),
        };
        
        // Validate query exists
        let mut query = match self.validate_query_exists(query_id).await {
            Ok(q) => q,
            Err(e) => return OperationResponse::error(e),
        };
        
        // Validate query is active
        if let Err(e) = self.validate_query_active(&query) {
            return OperationResponse::error(e);
        }
        
        // Validate query is in reveal phase
        let current_time = self.runtime.system_time();
        if query.phase != state::VotingPhase::Reveal {
            // Check if we should transition to reveal phase
            if query.phase == state::VotingPhase::Commit && current_time > query.commit_phase_end {
                query.phase = state::VotingPhase::Reveal;
                self.state.queries.insert(&query_id, query.clone()).expect("Failed to update query");
            } else {
                return OperationResponse::error(format!(
                    "Query is not in reveal phase (current phase: {:?})",
                    query.phase
                ));
            }
        }
        
        // Check if reveal phase has ended
        if current_time > query.reveal_phase_end {
            // Auto-transition to completed
            query.phase = state::VotingPhase::Completed;
            self.state.queries.insert(&query_id, query.clone()).expect("Failed to update query");
            return OperationResponse::error("Reveal phase has ended");
        }
        
        // Validate voter has committed
        let mut commit = match query.commits.get(&voter_chain) {
            Some(c) => c.clone(),
            None => return OperationResponse::error("You must commit a vote before revealing"),
        };
        
        // Validate voter hasn't already revealed
        if commit.revealed {
            return OperationResponse::error("You have already revealed your vote");
        }
        
        // Validate vote value is valid
        if let Err(e) = self.validate_vote_value(&query, &value) {
            return OperationResponse::error(e);
        }
        
        // Validate confidence score
        if let Err(e) = self.validate_confidence(confidence) {
            return OperationResponse::error(e);
        }
        
        // Verify commit hash matches
        let computed_hash = self.compute_commit_hash(&value, &salt);
        if computed_hash != commit.commit_hash {
            return OperationResponse::error(
                "Commit hash verification failed. The value and salt do not match your commit."
            );
        }
        
        // Create vote with voting power
        let vote = Vote {
            voter: voter_chain,
            value: value.clone(),
            timestamp: current_time,
            salt: Some(salt),
            confidence,
            voting_power: voter_info.stake,
        };
        
        // Store vote
        query.votes.insert(voter_chain, vote.clone());
        
        // Mark commit as revealed
        commit.revealed = true;
        query.commits.insert(voter_chain, commit);
        
        // Update query
        self.state.queries.insert(&query_id, query).expect("Failed to update query");
        self.state.votes.insert(&(query_id, voter_chain), vote).expect("Failed to store vote");
        
        // Update vote count
        let current_count = self.state.vote_counts.get(&query_id).await.ok().flatten().unwrap_or(0);
        self.state.vote_counts.insert(&query_id, current_count + 1).expect("Failed to update vote count");
        
        // Note: total_votes is already incremented in commit_vote, no need to increment again here
        
        // Update total votes submitted
        let total_votes = *self.state.total_votes_submitted.get();
        self.state.total_votes_submitted.set(total_votes + 1);
        
        // Emit VoteRevealed event for cross-chain subscribers
        self.emit_oracle_event(OracleEvent::VoteRevealed {
            query_id,
            voter_chain,
            value,
        });
        
        OperationResponse::success("Vote revealed successfully")
    }
    
    /// Compute commit hash from value and salt
    fn compute_commit_hash(&self, value: &str, salt: &str) -> String {
        use sha2::{Sha256, Digest};
        
        let mut hasher = Sha256::new();
        hasher.update(value.as_bytes());
        hasher.update(salt.as_bytes());
        let result = hasher.finalize();
        
        // Convert to hex string
        format!("{:x}", result)
    }
    
    /// Calculate how much stake to lock for a vote
    fn calculate_stake_to_lock(
        &self,
        voter_info: &state::VoterInfo,
        _query: &state::Query,
        _params: &state::ProtocolParameters,
    ) -> Amount {
        // Lock 10% of voter's available stake for each vote
        // This allows voters to participate in multiple queries simultaneously
        // while still having skin in the game
        
        // Use Amount arithmetic directly - no conversion needed!
        // saturating_sub and saturating_div work on Amount directly
        let available_stake = voter_info.stake.saturating_sub(voter_info.locked_stake);
        
        // Lock 10% of available stake
        // If 10% is zero (stake < 10), lock 1 token minimum
        let ten_percent = available_stake.saturating_div(10);
        
        if ten_percent == Amount::ZERO {
            Amount::from_tokens(1)  // Minimum 1 token
        } else {
            ten_percent  // Already an Amount, no conversion needed
        }
    }
    
    /// Get voter reputation information
    async fn get_voter_reputation_info(&self, voter_chain: &linera_sdk::linera_base_types::ChainId) -> Option<(u32, &'static str, f64)> {
        let voter_info = self.state.get_voter(voter_chain).await?;
        let reputation = voter_info.reputation;
        let tier = self.state.get_reputation_tier(reputation);
        let weight = self.state.calculate_reputation_weight(reputation);
        
        Some((reputation, tier, weight))
    }
    
    /// Calculate potential slash amount for a voter (for preview/estimation)
    async fn calculate_potential_slash(&self, voter_chain: &linera_sdk::linera_base_types::ChainId) -> Option<Amount> {
        let voter_info = self.state.get_voter(voter_chain).await?;
        let params = self.state.get_parameters().await;
        Some(self.state.calculate_slash_amount(&voter_info, &params))
    }
    
    /// Check if voter would be deactivated after slashing
    async fn would_be_deactivated_after_slash(&self, voter_chain: &linera_sdk::linera_base_types::ChainId) -> Option<bool> {
        let voter_info = self.state.get_voter(voter_chain).await?;
        let params = self.state.get_parameters().await;
        let slash_amount = self.state.calculate_slash_amount(&voter_info, &params);
        Some(self.state.should_deactivate_after_slash(&voter_info, slash_amount, &params))
    }
    
    // ==================== DEADLINE CHECKING ====================
    
    /// Check if a query has expired (deadline passed but not resolved)
    fn is_query_expired(&mut self, query: &state::Query) -> bool {
        let current_time = self.runtime.system_time();
        query.status == state::QueryStatus::Active && current_time >= query.deadline
    }
    
    /// Check if a query deadline has passed
    fn has_deadline_passed(&mut self, query: &state::Query) -> bool {
        let current_time = self.runtime.system_time();
        current_time >= query.deadline
    }
    
    /// Mark a query as expired and unlock stakes
    async fn mark_query_expired(&mut self, query_id: u64) -> Result<(), String> {
        let mut query = self.state.get_query(query_id).await
            .ok_or_else(|| format!("Query {} not found", query_id))?;
        
        // Only mark as expired if it's currently active
        if query.status != state::QueryStatus::Active {
            return Err(format!("Query {} is not active (status: {:?})", query_id, query.status));
        }
        
        // Check if deadline has actually passed
        if !self.has_deadline_passed(&query) {
            return Err(format!("Query {} deadline has not passed yet", query_id));
        }
        
        // Update query status
        query.status = state::QueryStatus::Expired;
        query.resolved_at = Some(self.runtime.system_time());
        self.state.queries.insert(&query_id, query.clone())
            .map_err(|e| format!("Failed to update query: {}", e))?;
        
        // Unlock stake for all voters who committed (using stored stake_locked amount)
        // This ensures we unlock exactly what was locked, regardless of current stake
        for (voter, commit) in &query.commits {
            let locked_amount = commit.stake_locked;
            
            if let Err(e) = self.state.unlock_stake(voter, locked_amount).await {
                eprintln!("Warning: Failed to unlock stake {} for voter {} on expired query {}: {}", 
                         locked_amount, voter, query_id, e);
            } else {
                eprintln!("Info: Unlocked {} stake for voter {} on expired query {}", 
                         locked_amount, voter, query_id);
            }
        }
        
        // Remove from active queries
        let mut active = self.state.get_active_queries().await;
        active.retain(|&id| id != query_id);
        self.state.active_queries.set(active);
        
        Ok(())
    }
    
    /// Check and expire all queries that have passed their deadline
    async fn check_and_expire_queries(&mut self) -> Vec<u64> {
        let mut expired_query_ids = Vec::new();
        let active_queries = self.state.get_active_queries().await;
        
        for query_id in active_queries {
            if let Some(query) = self.state.get_query(query_id).await {
                if self.is_query_expired(&query) {
                    // Check if it has minimum votes - if yes, it should be resolved, not expired
                    if query.votes.len() >= query.min_votes {
                        // This query should be resolved, not expired
                        continue;
                    }
                    
                    // Mark as expired
                    if let Err(e) = self.mark_query_expired(query_id).await {
                        eprintln!("Warning: Failed to mark query {} as expired: {}", query_id, e);
                    } else {
                        expired_query_ids.push(query_id);
                    }
                }
            }
        }
        
        expired_query_ids
    }
    
    /// Get all expired queries (for monitoring/cleanup)
    async fn get_expired_queries(&mut self) -> Vec<u64> {
        let mut expired_ids = Vec::new();
        let active_queries = self.state.get_active_queries().await;
        
        for query_id in active_queries {
            if let Some(query) = self.state.get_query(query_id).await {
                if self.is_query_expired(&query) {
                    expired_ids.push(query_id);
                }
            }
        }
        
        expired_ids
    }
    
    /// Check if a specific query should be expired
    async fn should_expire_query(&mut self, query_id: u64) -> Result<bool, String> {
        let query = self.state.get_query(query_id).await
            .ok_or_else(|| format!("Query {} not found", query_id))?;
        
        // Query should be expired if:
        // 1. It's currently active
        // 2. Deadline has passed
        // 3. It doesn't have enough votes to be resolved
        Ok(query.status == state::QueryStatus::Active 
           && self.has_deadline_passed(&query)
           && query.votes.len() < query.min_votes)
    }
    
    /// Get time remaining until query deadline
    fn get_time_until_deadline(&mut self, query: &state::Query) -> Option<i64> {
        let current_time = self.runtime.system_time();
        if current_time >= query.deadline {
            None // Deadline has passed
        } else {
            let delta = query.deadline.delta_since(current_time);
            Some(delta.as_micros() as i64)
        }
    }
    
    /// Handle OracleRequest from consumer apps (Production cross-chain pattern)
    /// 
    /// Supports industry-standard request formats:
    /// - CreateQuery: Legacy simple query creation
    /// - CreateQueryWithBond: Recommended format with bond, priority fee, dispute window
    /// - RaiseDispute: Challenge a resolved query
    /// - CancelQuery: Cancel a pending query
    async fn handle_oracle_request(
        &mut self,
        request: alethea_oracle_messages::OracleRequest,
    ) -> oracle_registry_v2::OperationResponse {
        use alethea_oracle_messages::{OracleCallback, OracleRequest};
        use oracle_registry_v2::{Message, OperationResponse};
        
        match request {
            // ==================== LEGACY CREATE QUERY ====================
            OracleRequest::CreateQuery {
                request_id,
                description,
                outcomes,
                deadline,
                callback_chain,
                callback_app,
                callback_data,
            } => {
                eprintln!(
                    "📥 OracleRequest::CreateQuery (legacy): request_id={}, description={}, callback_chain={}",
                    request_id, description, callback_chain
                );
                
                // Create query using existing logic
                let result = self.handle_create_query_from_market(
                    request_id,
                    description,
                    outcomes,
                    deadline,
                    callback_chain,
                    callback_data.clone(),
                ).await;
                
                // Send QueryCreated callback with new format if successful
                if result.success {
                    if let Some(ref data) = result.data {
                        if let Some(query_id) = data.query_id {
                            // Get query to extract additional info
                            let (estimated_resolution, dispute_window_end) = 
                                if let Some(query) = self.state.get_query(query_id).await {
                                    (Some(query.deadline), query.dispute_window_end)
                                } else {
                                    (None, None)
                                };
                            
                            let callback = OracleCallback::QueryCreated {
                                query_id,
                                request_id,
                                callback_data: callback_data.clone(),
                                estimated_resolution,
                                dispute_window_end,
                            };
                            
                            let callback_message = Message::OracleCallback(callback);
                            self.runtime
                                .prepare_message(callback_message)
                                .with_authentication()
                                .with_tracking()
                                .send_to(callback_chain);
                            
                            eprintln!("✅ QueryCreated callback sent to {}", callback_chain);
                        }
                    }
                }
                
                result
            }
            
            // ==================== NEW: CREATE QUERY WITH BOND (Industry Standard) ====================
            OracleRequest::CreateQueryWithBond {
                request_id,
                description,
                outcomes,
                deadline,
                callback_chain,
                callback_app,
                callback_data,
                bond_amount,
                service_fee,
                priority_fee,
                dispute_window_secs,
                strategy,
                min_votes,
                question_type,
                resolution_criteria,
                source_urls,
                category,
                metadata_url,
            } => {
                eprintln!(
                    "📥 OracleRequest::CreateQueryWithBond: request_id={}, description={}, bond={}, callback_chain={}",
                    request_id, description, bond_amount, callback_chain
                );
                
                // Validate bond amount (minimum 100 tokens as per industry standard)
                let min_bond = linera_sdk::linera_base_types::Amount::from_tokens(100);
                if bond_amount < min_bond {
                    return OperationResponse::error(format!(
                        "Bond amount {} is below minimum {}",
                        bond_amount, min_bond
                    ));
                }
                
                // Create query with bond using enhanced logic
                let result = self.handle_create_query_with_bond(
                    request_id,
                    description.clone(),
                    outcomes,
                    deadline,
                    callback_chain,
                    callback_data.clone(),
                    bond_amount,
                    service_fee,
                    priority_fee,
                    dispute_window_secs,
                    strategy,
                    min_votes,
                    resolution_criteria,
                    source_urls,
                    category,
                    metadata_url,
                ).await;
                
                // Send QueryCreated callback with new format if successful
                if result.success {
                    if let Some(ref data) = result.data {
                        if let Some(query_id) = data.query_id {
                            // Get query to extract additional info
                            let (estimated_resolution, dispute_window_end) = 
                                if let Some(query) = self.state.get_query(query_id).await {
                                    (Some(query.deadline), query.dispute_window_end)
                                } else {
                                    (None, None)
                                };
                            
                            let callback = OracleCallback::QueryCreated {
                                query_id,
                                request_id,
                                callback_data: callback_data.clone(),
                                estimated_resolution,
                                dispute_window_end,
                            };
                            
                            let callback_message = Message::OracleCallback(callback);
                            self.runtime
                                .prepare_message(callback_message)
                                .with_authentication()
                                .with_tracking()
                                .send_to(callback_chain);
                            
                            eprintln!("✅ QueryCreated callback (with bond) sent to {}", callback_chain);
                        }
                    }
                }
                
                result
            }
            
            // ==================== NEW: RAISE DISPUTE (Industry Standard) ====================
            OracleRequest::RaiseDispute {
                query_id,
                disputed_outcome,
                dispute_bond,
                reason,
                evidence_urls,
                callback_chain,
                callback_app,
            } => {
                eprintln!(
                    "📥 OracleRequest::RaiseDispute: query_id={}, disputed_outcome={}, bond={}, callback_chain={}",
                    query_id, disputed_outcome, dispute_bond, callback_chain
                );
                
                // Handle dispute
                let result = self.handle_raise_dispute(
                    query_id,
                    disputed_outcome.clone(),
                    dispute_bond,
                    reason.clone(),
                    evidence_urls,
                    callback_chain,
                ).await;
                
                // Send QueryDisputed callback if successful
                if result.success {
                    // Get query to extract callback data
                    if let Some(query) = self.state.get_query(query_id).await {
                        let callback_data = query.callback_data.clone().unwrap_or_default();
                        let original_result = query.result.clone().unwrap_or_default();
                        
                        let callback = OracleCallback::QueryDisputed {
                            query_id,
                            original_result,
                            disputed_by: callback_chain,
                            disputed_outcome: disputed_outcome.clone(),
                            dispute_reason: reason,
                            callback_data,
                            new_deadline: query.dispute.as_ref().map(|_| {
                                // Calculate new deadline for dispute resolution
                                let current_time = self.runtime.system_time();
                                linera_sdk::linera_base_types::Timestamp::from(
                                    current_time.micros().saturating_add(24 * 60 * 60 * 1_000_000)
                                )
                            }),
                        };
                        
                        // Send to original requester
                        if let Some(original_callback_chain) = query.callback_chain {
                            let callback_message = Message::OracleCallback(callback);
                            self.runtime
                                .prepare_message(callback_message)
                                .with_authentication()
                                .with_tracking()
                                .send_to(original_callback_chain);
                            
                            eprintln!("✅ QueryDisputed callback sent to {}", original_callback_chain);
                        }
                    }
                }
                
                result
            }
            
            // ==================== CANCEL QUERY ====================
            OracleRequest::CancelQuery {
                query_id,
                callback_chain,
                callback_app: _,
            } => {
                eprintln!(
                    "📥 OracleRequest::CancelQuery: query_id={}, callback_chain={}",
                    query_id, callback_chain
                );
                
                // Handle cancellation
                let result = self.handle_cancel_query(query_id, callback_chain).await;
                
                // Send QueryCancelled callback if successful
                if result.success {
                    if let Some(query) = self.state.get_query(query_id).await {
                        let callback_data = query.callback_data.clone().unwrap_or_default();
                        
                        let callback = OracleCallback::QueryCancelled {
                            query_id,
                            callback_data,
                            reason: "Cancelled by requester".to_string(),
                            bond_refunded: if query.bond_amount > linera_sdk::linera_base_types::Amount::ZERO {
                                Some(query.bond_amount)
                            } else {
                                None
                            },
                        };
                        
                        let callback_message = Message::OracleCallback(callback);
                        self.runtime
                            .prepare_message(callback_message)
                            .with_authentication()
                            .with_tracking()
                            .send_to(callback_chain);
                        
                        eprintln!("✅ QueryCancelled callback sent to {}", callback_chain);
                    }
                }
                
                result
            }
        }
    }
    
    /// Handle CreateQueryWithBond - Industry standard format with bond, fees, and metadata
    async fn handle_create_query_with_bond(
        &mut self,
        request_id: u64,
        description: String,
        outcomes: Vec<String>,
        deadline: linera_sdk::linera_base_types::Timestamp,
        callback_chain: linera_sdk::linera_base_types::ChainId,
        callback_data: Vec<u8>,
        bond_amount: linera_sdk::linera_base_types::Amount,
        service_fee: linera_sdk::linera_base_types::Amount,
        priority_fee: Option<linera_sdk::linera_base_types::Amount>,
        dispute_window_secs: Option<u64>,
        strategy: Option<alethea_oracle_messages::DecisionStrategy>,
        min_votes: Option<u32>,
        resolution_criteria: Option<String>,
        source_urls: Option<String>,
        category: Option<String>,
        metadata_url: Option<String>,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{OperationResponse, ResponseData};
        use linera_sdk::linera_base_types::TimeDelta;
        
        eprintln!(
            "📥 CreateQueryWithBond: request_id={}, bond={}, priority_fee={:?}",
            request_id, bond_amount, priority_fee
        );
        
        // Validate parameters
        if let Err(e) = self.validate_query_params(&description, &outcomes, &bond_amount, &Some(deadline)) {
            return OperationResponse::error(format!("Invalid query parameters: {}", e));
        }
        
        // Validate service fee
        let params = self.state.get_parameters().await;
        if service_fee < params.min_service_fee {
            return OperationResponse::error(format!(
                "Service fee {} is below minimum {}",
                service_fee, params.min_service_fee
            ));
        }
        
        // Collect service fee to protocol treasury
        let current_treasury = *self.state.protocol_treasury.get();
        self.state.protocol_treasury.set(current_treasury.saturating_add(service_fee));
        
        // Track total service fees collected
        let current_service_fees = *self.state.total_service_fees_collected.get();
        self.state.total_service_fees_collected.set(current_service_fees.saturating_add(service_fee));
        
        eprintln!(
            "💰 Service fee collected: {} ALTH (Total treasury: {}, Total service fees: {})",
            service_fee,
            current_treasury.saturating_add(service_fee),
            current_service_fees.saturating_add(service_fee)
        );
        let current_time = self.runtime.system_time();
        let min_votes_required = min_votes.map(|v| v as usize).unwrap_or(params.min_votes_default);
        
        // Calculate commit/reveal phases
        let commit_duration = TimeDelta::from_micros(1 * 60 * 60 * 1_000_000u64);
        let reveal_duration = TimeDelta::from_micros(1 * 60 * 60 * 1_000_000u64);
        
        let commit_phase_end = current_time.saturating_add(commit_duration);
        let reveal_phase_end = commit_phase_end.saturating_add(reveal_duration);
        
        // Calculate dispute window (default 1 hour)
        let dispute_window = dispute_window_secs.unwrap_or(3600);
        let dispute_window_end = linera_sdk::linera_base_types::Timestamp::from(
            deadline.micros().saturating_add(dispute_window * 1_000_000)
        );
        
        // Get next query ID
        let query_id = *self.state.next_query_id.get();
        self.state.next_query_id.set(query_id + 1);
        
        // Convert strategy
        let decision_strategy = match strategy {
            Some(alethea_oracle_messages::DecisionStrategy::Majority) => 
                state::DecisionStrategy::Majority,
            Some(alethea_oracle_messages::DecisionStrategy::Median) => 
                state::DecisionStrategy::Median,
            Some(alethea_oracle_messages::DecisionStrategy::WeightedByReputation) => 
                state::DecisionStrategy::WeightedByReputation,
            _ => state::DecisionStrategy::WeightedByStake,
        };
        
        // Select voters for this query
        let selected_voters = match self.state.select_voters_for_query(min_votes_required, params.max_voters_per_query).await {
            Ok(voters) => voters,
            Err(e) => return OperationResponse::error(format!("Failed to select voters: {}", e)),
        };
        
        if selected_voters.is_empty() {
            return OperationResponse::error("No eligible voters available for this query");
        }
        
        // Reward from priority fee (if any) + protocol inflation
        let reward_amount = priority_fee.unwrap_or(linera_sdk::linera_base_types::Amount::ZERO);
        
        // Create query with all fields
        let query = state::Query {
            id: query_id,
            description: description.clone(),
            outcomes,
            title: None,
            category,
            context: None,
            resolution_criteria,
            source_urls,
            tags: None,
            metadata_url,
            external_id: Some(format!("{}", request_id)),
            source_app_id: None,
            source_app_name: None,
            source_app_logo: None,
            source_app_category: None,
            query_source: state::QuerySource::ExternalOther,
            strategy: decision_strategy,
            min_votes: min_votes_required,
            reward_amount,
            creator: callback_chain,
            created_at: current_time,
            deadline,
            commit_phase_end,
            reveal_phase_end,
            phase: state::VotingPhase::Commit,
            status: state::QueryStatus::Active,
            result: None,
            resolved_at: None,
            commits: std::collections::BTreeMap::new(),
            votes: std::collections::BTreeMap::new(),
            selected_voters,
            max_voters: params.max_voters_per_query,
            callback_chain: Some(callback_chain),
            callback_data: Some(callback_data),
            // Hybrid model fields
            bond_amount,
            priority_fee: priority_fee.unwrap_or(linera_sdk::linera_base_types::Amount::ZERO),
            bond_refunded: false,
            dispute: None,
            dispute_window_end: Some(dispute_window_end),
        };
        
        // Store query
        if let Err(e) = self.state.queries.insert(&query_id, query) {
            return OperationResponse::error(format!("Failed to store query: {}", e));
        }
        
        // Update query counter
        let total = *self.state.total_queries_created.get();
        self.state.total_queries_created.set(total + 1);
        
        eprintln!(
            "✅ Query {} created with bond {}, dispute window ends at {:?}",
            query_id, bond_amount, dispute_window_end
        );
        
        OperationResponse::success_with_data(
            format!("Query {} created with bond", query_id),
            ResponseData {
                query_id: Some(query_id),
                voter_address: None,
                vote_count: None,
                rewards_claimed: None,
            },
        )
    }
    
    /// Handle RaiseDispute - Challenge a resolved query
    async fn handle_raise_dispute(
        &mut self,
        query_id: u64,
        disputed_outcome: String,
        dispute_bond: linera_sdk::linera_base_types::Amount,
        reason: String,
        _evidence_urls: Option<String>,
        disputer_chain: linera_sdk::linera_base_types::ChainId,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        // Get query
        let mut query = match self.state.get_query(query_id).await {
            Some(q) => q,
            None => return OperationResponse::error(format!("Query {} not found", query_id)),
        };
        
        // Check query is resolved
        if query.status != state::QueryStatus::Resolved {
            return OperationResponse::error(format!(
                "Query {} is not resolved (status: {:?})",
                query_id, query.status
            ));
        }
        
        // Check within dispute window
        let current_time = self.runtime.system_time();
        if let Some(dispute_window_end) = query.dispute_window_end {
            if current_time > dispute_window_end {
                return OperationResponse::error(format!(
                    "Dispute window for query {} has passed",
                    query_id
                ));
            }
        } else {
            return OperationResponse::error(format!(
                "Query {} does not have a dispute window",
                query_id
            ));
        }
        
        // Check no existing dispute
        if query.dispute.is_some() {
            return OperationResponse::error(format!(
                "Query {} already has a pending dispute",
                query_id
            ));
        }
        
        // Check dispute bond >= original bond
        if dispute_bond < query.bond_amount {
            return OperationResponse::error(format!(
                "Dispute bond {} must be at least equal to original bond {}",
                dispute_bond, query.bond_amount
            ));
        }
        
        // Check disputed outcome is different from result
        if let Some(ref result) = query.result {
            if result == &disputed_outcome {
                return OperationResponse::error(format!(
                    "Disputed outcome '{}' is the same as current result",
                    disputed_outcome
                ));
            }
        }
        
        // Create dispute
        let dispute = state::Dispute {
            disputer: disputer_chain,
            dispute_bond,
            disputed_outcome: disputed_outcome.clone(),
            reason,
            disputed_at: current_time,
            status: state::DisputeStatus::Pending,
            resolution: None,
        };
        
        query.dispute = Some(dispute);
        query.status = state::QueryStatus::Disputed;
        
        // Store updated query
        if let Err(e) = self.state.queries.insert(&query_id, query) {
            return OperationResponse::error(format!("Failed to update query: {}", e));
        }
        
        eprintln!(
            "✅ Dispute raised for query {}: disputed_outcome={}, bond={}",
            query_id, disputed_outcome, dispute_bond
        );
        
        OperationResponse::success(format!("Dispute raised for query {}", query_id))
    }
    
    /// Handle CancelQuery - Cancel a pending query
    async fn handle_cancel_query(
        &mut self,
        query_id: u64,
        requester_chain: linera_sdk::linera_base_types::ChainId,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        // Get query
        let mut query = match self.state.get_query(query_id).await {
            Some(q) => q,
            None => return OperationResponse::error(format!("Query {} not found", query_id)),
        };
        
        // Check query is still active
        if query.status != state::QueryStatus::Active {
            return OperationResponse::error(format!(
                "Query {} is not active (status: {:?})",
                query_id, query.status
            ));
        }
        
        // Check requester is the creator
        if query.creator != requester_chain {
            return OperationResponse::error(format!(
                "Only the query creator can cancel"
            ));
        }
        
        // Check no votes have been cast yet
        if !query.votes.is_empty() || !query.commits.is_empty() {
            return OperationResponse::error(format!(
                "Cannot cancel query {} - voting has already started",
                query_id
            ));
        }
        
        // Cancel query
        query.status = state::QueryStatus::Cancelled;
        
        // Refund bond if applicable
        if query.bond_amount > linera_sdk::linera_base_types::Amount::ZERO {
            query.bond_refunded = true;
            // TODO: Actually transfer bond back to creator via token contract
        }
        
        // Store updated query
        if let Err(e) = self.state.queries.insert(&query_id, query) {
            return OperationResponse::error(format!("Failed to update query: {}", e));
        }
        
        eprintln!("✅ Query {} cancelled", query_id);
        
        OperationResponse::success(format!("Query {} cancelled", query_id))
    }
    
    /// Handle cross-chain message from Market Chain to create query
    async fn handle_create_query_from_market(
        &mut self,
        market_id: u64,
        question: String,
        outcomes: Vec<String>,
        deadline: linera_sdk::linera_base_types::Timestamp,
        callback_chain: linera_sdk::linera_base_types::ChainId,
        callback_data: Vec<u8>,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{OperationResponse, ResponseData};
        use linera_sdk::linera_base_types::TimeDelta;
        
        eprintln!(
            "📥 Received CreateQueryFromMarket: market_id={}, question={}, callback_chain={}",
            market_id, question, callback_chain
        );
        
        // Validate parameters
        if let Err(e) = self.validate_query_params(&question, &outcomes, &Amount::ZERO, &Some(deadline)) {
            return OperationResponse::error(format!("Invalid query parameters: {}", e));
        }
        
        // Get parameters
        let params = self.state.get_parameters().await;
        let current_time = self.runtime.system_time();
        
        // Adjust min_votes based on available voters
        let voter_count = *self.state.voter_count.get();
        let min_votes_required = if voter_count == 0 {
            return OperationResponse::error("No voters registered in Registry".to_string());
        } else if params.min_votes_default as u64 > voter_count {
            // Use available voters count if default is too high
            eprintln!(
                "⚠️ min_votes_default ({}) exceeds available voters ({}), using {}",
                params.min_votes_default, voter_count, voter_count
            );
            voter_count as usize
        } else {
            params.min_votes_default
        };
        
        // Validate min_votes is reasonable
        if let Err(e) = self.validate_min_votes_param(min_votes_required, voter_count) {
            return OperationResponse::error(e);
        }
        
        // Calculate commit/reveal phases (1 hour each for testing)
        let commit_duration = TimeDelta::from_micros(1 * 60 * 60 * 1_000_000u64);
        let reveal_duration = TimeDelta::from_micros(1 * 60 * 60 * 1_000_000u64);
        
        let commit_phase_end = current_time.saturating_add(commit_duration);
        let reveal_phase_end = commit_phase_end.saturating_add(reveal_duration);
        
        // Get next query ID
        let query_id = *self.state.next_query_id.get();
        self.state.next_query_id.set(query_id + 1);
        
        // Select voters for this query
        let max_voters = min_votes_required * 2;
        let selected_voters = match self.state
            .select_voters_for_query(min_votes_required, max_voters)
            .await
        {
            Ok(voters) => voters,
            Err(e) => return OperationResponse::error(format!(
                "Failed to select voters: {}", e
            )),
        };
        
        // Try to get source DApp info from callback_chain
        // The source app would have registered via RegisterConsumerApp
        let (source_app_id, source_app_name, source_app_logo, source_app_category, query_source) = {
            // Try to find consumer app by chain_id
            let mut found_app: Option<state::ConsumerAppInfo> = None;
            
            // Search through consumer apps for matching chain_id
            if let Ok(indices) = self.state.consumer_apps.indices().await {
                for (app_id, chain_id) in indices {
                    if chain_id == callback_chain {
                        if let Ok(Some(app_info)) = self.state.consumer_apps.get(&(app_id, chain_id)).await {
                            found_app = Some(app_info);
                            break;
                        }
                    }
                }
            }
            
            if let Some(app) = found_app {
                let category_str = format!("{:?}", app.category);
                let source = state::QuerySource::from_app_category(&app.category);
                (
                    Some(app.app_id),
                    Some(app.name),
                    app.logo_url, // Use logo_url for display
                    Some(category_str),
                    source,
                )
            } else {
                // External source but not registered as consumer app
                (None, None, None, Some("Unknown".to_string()), state::QuerySource::ExternalOther)
            }
        };
        
        eprintln!(
            "📥 Query from DApp: name={:?}, logo={:?}, source={:?}",
            source_app_name, source_app_logo, query_source
        );
        
        // Create query with callback information
        let query = state::Query {
            id: query_id,
            description: format!("Market #{}: {}", market_id, question),
            outcomes: outcomes.clone(),
            // Metadata fields (basic for market queries)
            title: Some(format!("Market #{}", market_id)),
            category: Some("PredictionMarket".to_string()),
            context: None,
            resolution_criteria: None,
            source_urls: None,
            tags: None,
            metadata_url: None,
            external_id: Some(format!("{}", market_id)),
            // Source DApp tracking
            source_app_id,
            source_app_name,
            source_app_logo,
            source_app_category,
            query_source,
            // Core fields
            commit_phase_end,
            reveal_phase_end,
            deadline: reveal_phase_end,
            phase: state::VotingPhase::Commit,
            status: state::QueryStatus::Active,
            strategy: state::DecisionStrategy::Majority,
            min_votes: min_votes_required,
            max_voters,
            reward_amount: Amount::ZERO,
            creator: callback_chain,
            created_at: current_time,
            commits: std::collections::BTreeMap::new(),
            votes: std::collections::BTreeMap::new(),
            selected_voters,
            result: None,
            resolved_at: None,
            callback_chain: Some(callback_chain),
            callback_data: Some(callback_data),
            // Hybrid model fields (legacy query - no bond)
            bond_amount: Amount::ZERO,
            priority_fee: Amount::ZERO,
            bond_refunded: false,
            dispute: None,
            dispute_window_end: None,
        };
        
        // Store query
        if let Err(e) = self.state.queries.insert(&query_id, query) {
            return OperationResponse::error(format!("Failed to store query: {}", e));
        }
        
        // Add to active queries
        let mut active = self.state.get_active_queries().await;
        active.push(query_id);
        self.state.active_queries.set(active);
        
        // Initialize vote count
        let _ = self.state.vote_counts.insert(&query_id, 0);
        
        // Update statistics
        let total = *self.state.total_queries_created.get();
        self.state.total_queries_created.set(total + 1);
        
        eprintln!("✅ Query {} created from market {}", query_id, market_id);
        
        OperationResponse::success_with_data(
            format!("Query {} created for market {}. Voters can now commit and reveal votes.", query_id, market_id),
            ResponseData {
                voter_address: None,
                query_id: Some(query_id),
                vote_count: None,
                rewards_claimed: None,
            }
        )
    }
    
    /// Resolve a query
    async fn resolve_query(
        &mut self,
        query_id: u64,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        // Validate query exists
        let mut query = match self.validate_query_exists(query_id).await {
            Ok(q) => q,
            Err(e) => return OperationResponse::error(e),
        };
        
        // Check if query should be expired instead of resolved
        if let Ok(should_expire) = self.should_expire_query(query_id).await {
            if should_expire {
                // Mark as expired instead of resolving
                if let Err(e) = self.mark_query_expired(query_id).await {
                    return OperationResponse::error(format!(
                        "Query {} has expired but failed to mark: {}",
                        query_id, e
                    ));
                }
                return OperationResponse::error(format!(
                    "Query {} has expired (not enough votes: {}/{})",
                    query_id, query.votes.len(), query.min_votes
                ));
            }
        }
        
        // Validate query can be resolved (active, deadline passed, min votes met)
        if let Err(e) = self.validate_query_resolvable(&query).await {
            return OperationResponse::error(e);
        }
        
        // Get current time for resolution timestamp
        let current_time = self.runtime.system_time();
        
        // Check if enough votes (redundant but explicit)
        let vote_count = query.votes.len();
        if vote_count < query.min_votes {
            return OperationResponse::error(format!(
                "Not enough votes: {}/{}",
                vote_count, query.min_votes
            ));
        }
        
        // TODO: Implement proper resolution logic based on strategy
        // For now, just use simple majority
        let result = self.calculate_result(&query).await;
        
        // Update query status
        query.status = state::QueryStatus::Resolved;
        query.result = Some(result.clone());
        query.resolved_at = Some(self.runtime.system_time());
        self.state.queries.insert(&query_id, query.clone()).expect("Failed to update query");
        
        // Unlock stake for all voters who committed (using stored stake_locked amount)
        // This ensures we unlock exactly what was locked, regardless of current stake
        for (voter, commit) in &query.commits {
            let locked_amount = commit.stake_locked;
            
            if let Err(e) = self.state.unlock_stake(voter, locked_amount).await {
                eprintln!("Warning: Failed to unlock stake {} for voter {}: {}", locked_amount, voter, e);
            } else {
                eprintln!("Info: Unlocked {} stake for voter {} on query {}", locked_amount, voter, query_id);
            }
        }
        
        // Remove from active queries
        let mut active = self.state.get_active_queries().await;
        active.retain(|&id| id != query_id);
        self.state.active_queries.set(active);
        
        // Update statistics
        let total_resolved = *self.state.total_queries_resolved.get();
        self.state.total_queries_resolved.set(total_resolved + 1);
        
        // Update voter reputations based on correctness
        let mut correct_voters = 0;
        let mut incorrect_voters = 0;
        
        for (voter, vote) in &query.votes {
            let was_correct = vote.value == result;
            
            if let Err(e) = self.state.update_voter_reputation(voter, was_correct).await {
                eprintln!("Warning: Failed to update reputation for voter {}: {}", voter, e);
            } else {
                if was_correct {
                    correct_voters += 1;
                } else {
                    incorrect_voters += 1;
                }
            }
        }
        
        // Calculate and distribute rewards to correct voters
        if correct_voters > 0 {
            let params = self.state.get_parameters().await;
            let reward_amount = query.reward_amount;
            
            // Collect correct voters with their info
            let mut correct_voter_infos = Vec::new();
            for (voter, vote) in &query.votes {
                if vote.value == result {
                    if let Some(voter_info) = self.state.get_voter(voter).await {
                        correct_voter_infos.push((*voter, voter_info));
                    }
                }
            }
            
            // Calculate rewards based on query strategy
            let reward_distribution = match query.strategy {
                state::DecisionStrategy::WeightedByStake => {
                    self.state.calculate_stake_weighted_rewards(
                        reward_amount,
                        &correct_voter_infos,
                        &params,
                    )
                },
                state::DecisionStrategy::WeightedByReputation => {
                    self.state.calculate_reputation_weighted_rewards(
                        reward_amount,
                        &correct_voter_infos,
                        &params,
                    )
                },
                _ => {
                    // For Majority and Median strategies, use equal distribution
                    self.state.calculate_equal_rewards(
                        reward_amount,
                        &correct_voter_infos,
                        &params,
                    )
                }
            };
            
            // Distribute rewards to correct voters
            // FIX: Mint tokens immediately when query resolves, not when user claims
            let params = self.state.get_parameters().await;
            let mut total_distributed = 0u128;
            
            for (voter, reward) in &reward_distribution {
                let reward_value: u128 = (*reward).into();
                total_distributed += reward_value;
                
                // MINT TOKENS IMMEDIATELY: Call token contract to mint reward tokens
                if let Some(token_app_id) = params.token_app_id {
                    // Get voter's chain ID and derive AccountOwner
                    let voter_chain_bytes: [u8; 32] = voter.0.into();
                    let voter_owner = linera_sdk::linera_base_types::AccountOwner::Address32(voter_chain_bytes.into());
                    
                    // Determine token chain (where token contract lives)
                    let token_chain = params.token_chain_id.unwrap_or(self.runtime.chain_id());
                    
                    // Mint tokens directly to voter's escrow account (registry escrow)
                    // The escrow account is derived from registry app ID
                    let registry_hash = self.runtime.application_id().forget_abi().application_description_hash;
                    let registry_owner = linera_sdk::linera_base_types::AccountOwner::Address32(registry_hash.into());
                    
                    eprintln!(
                        "💰 Minting {} reward tokens for voter {} (query {})",
                        reward, voter, query_id
                    );
                    
                    // Call token contract to mint reward tokens to registry escrow
                    let mint_op = alethea_token::Operation::Mint {
                        to: registry_owner,
                        amount: *reward,
                    };
                    
                    match self.runtime.call_application(
                        true,
                        token_app_id.with_abi::<alethea_token::AletheaTokenAbi>(),
                        &mint_op
                    ) {
                        response => {
                            eprintln!("✅ Reward minted: {:?}", response);
                        }
                    }
                    
                    // Update token holdings to reflect minted rewards
                    let current_holdings = self.state.token_holdings.get(voter).await.ok().flatten().unwrap_or(Amount::ZERO);
                    if let Err(e) = self.state.token_holdings.insert(voter, current_holdings.saturating_add(*reward)) {
                        eprintln!("⚠️  Failed to update token holdings: {}", e);
                    }
                    
                    let total_held = *self.state.total_tokens_held.get();
                    self.state.total_tokens_held.set(total_held.saturating_add(*reward));
                }
                
                // Add to pending rewards (for tracking/claiming)
                let current_pending = self.state.get_pending_rewards(voter).await;
                let current_value: u128 = current_pending.into();
                // Both current_value and reward_value are in attos
                let new_pending = Amount::from_attos(current_value + reward_value);
                
                if let Err(e) = self.state.pending_rewards.insert(voter, new_pending) {
                    eprintln!("Warning: Failed to add pending rewards for voter {}: {}", voter, e);
                }
            }
            
            // Calculate protocol fee from total reward
            let protocol_fee = self.state.calculate_protocol_fee(reward_amount, &params);
            let fee_value: u128 = protocol_fee.into();
            
            // Update protocol treasury with collected fees
            let current_treasury = *self.state.protocol_treasury.get();
            self.state.protocol_treasury.set(current_treasury.saturating_add(protocol_fee));
            
            // Update reward pool (add query reward, subtract distributed rewards)
            let current_pool = *self.state.reward_pool.get();
            let distributed_amount = Amount::from_attos(total_distributed);
            let new_pool = current_pool.saturating_add(reward_amount).saturating_sub(distributed_amount);
            self.state.reward_pool.set(new_pool);
        }
        
        // Apply slashing to incorrect voters
        let mut total_slashed = 0u128;
        let mut voters_deactivated = 0;
        if incorrect_voters > 0 {
            let params = self.state.get_parameters().await;
            
            for (voter, vote) in &query.votes {
                if vote.value != result {
                    if let Some(voter_info) = self.state.get_voter(voter).await {
                        // Calculate slash amount based on protocol parameters
                        let slash_amount = self.state.calculate_slash_amount(&voter_info, &params);
                        let slash_value: u128 = slash_amount.into();
                        
                        // Skip if slash amount is zero
                        if slash_value == 0 {
                            continue;
                        }
                        
                        // Reduce voter's stake by slash amount
                        let mut updated_info = voter_info.clone();
                        
                        // Ensure we don't slash more than available stake
                        let actual_slash_amount = slash_amount.min(updated_info.stake);
                        updated_info.stake = updated_info.stake.saturating_sub(actual_slash_amount);
                        
                        // Check if voter should be deactivated due to insufficient stake
                        let should_deactivate = self.state.should_deactivate_after_slash(
                            &voter_info,
                            actual_slash_amount,
                            &params
                        );
                        
                        if should_deactivate {
                            updated_info.is_active = false;
                            voters_deactivated += 1;
                            eprintln!(
                                "Voter {} deactivated after slashing: stake {} below minimum {}",
                                voter,
                                updated_info.stake,
                                params.min_stake
                            );
                        }
                        
                        // Update voter info with reduced stake (and possibly deactivated status)
                        if let Err(e) = self.state.voters.insert(voter, updated_info) {
                            eprintln!("Warning: Failed to apply slash for voter {}: {}", voter, e);
                            continue;
                        }
                        
                        // Track total slashed amount
                        let actual_slash_value: u128 = actual_slash_amount.into();
                        total_slashed += actual_slash_value;
                        
                        // Add slashed amount to protocol treasury - use saturating_add
                        let current_treasury = *self.state.protocol_treasury.get();
                        let new_treasury = current_treasury.saturating_add(actual_slash_amount);
                        self.state.protocol_treasury.set(new_treasury);
                        
                        // Update total stake in the system - use saturating_sub
                        let current_total = *self.state.total_stake.get();
                        let new_total = current_total.saturating_sub(actual_slash_amount);
                        self.state.total_stake.set(new_total);
                        
                        // Update token holdings for slashed voter
                        let current_holdings = self.state.token_holdings.get(voter).await.ok().flatten().unwrap_or(Amount::ZERO);
                        if let Err(e) = self.state.token_holdings.insert(voter, current_holdings.saturating_sub(actual_slash_amount)) {
                            eprintln!("⚠️  Failed to update token holdings after slash: {}", e);
                        }
                        
                        let total_held = *self.state.total_tokens_held.get();
                        self.state.total_tokens_held.set(total_held.saturating_sub(actual_slash_amount));
                        
                        // Log slashing event for transparency
                        eprintln!(
                            "Slashed voter {} for incorrect vote on query {}: {} tokens ({}% of stake)",
                            voter,
                            query_id,
                            actual_slash_amount,
                            params.slash_percentage as f64 / 100.0
                        );
                    }
                }
            }
        }
        
        // ==================== HYBRID MODEL: Inflation Rewards ====================
        // Distribute inflation-based rewards to correct voters
        if correct_voters > 0 {
            let current_timestamp = self.runtime.system_time();
            
            // Calculate inflation reward based on current year's rate
            let inflation_reward = match self.state.calculate_inflation_reward_per_query(current_timestamp).await {
                Ok(reward) => {
                    eprintln!(
                        "💰 Using rate-based inflation reward: {} ALTH",
                        reward
                    );
                    reward
                }
                Err(e) => {
                    eprintln!("⚠️  Cannot calculate rate-based reward: {}. Using fallback.", e);
                    // Fallback to parameter value if rate-based calculation fails
                    let params = self.state.get_parameters().await;
                    params.inflation_reward_per_query
                }
            };
            
            let inflation_value: u128 = inflation_reward.into();
            
            if inflation_value > 0 {
                // Collect correct voters with their info
                let mut correct_voter_infos: Vec<(ChainId, state::VoterInfo)> = Vec::new();
                for (voter, vote) in &query.votes {
                    if vote.value == result {
                        if let Some(voter_info) = self.state.get_voter(voter).await {
                            correct_voter_infos.push((*voter, voter_info));
                        }
                    }
                }
                
                // Also add priority fee to reward pool if exists
                let priority_fee_value: u128 = query.priority_fee.into();
                let total_reward = inflation_value + priority_fee_value + (total_slashed / 2); // Half of slashed goes to voters
                let total_reward_amount = Amount::from_attos(total_reward);
                
                // Update parameters with calculated reward for distribution
                let mut params = self.state.get_parameters().await;
                params.inflation_reward_per_query = inflation_reward;
                self.state.parameters.set(params.clone());
                
                // Distribute inflation reward
                match self.state.distribute_inflation_reward(&correct_voter_infos).await {
                    Ok(distributed) => {
                        eprintln!(
                            "💰 Inflation reward distributed for query {}: {} ALTH to {} voters",
                            query_id, distributed, correct_voters
                        );
                        
                        // Update total inflation distributed
                        let current_distributed = *self.state.total_inflation_distributed.get();
                        self.state.total_inflation_distributed.set(current_distributed.saturating_add(inflation_reward));
                        
                        // Emit event
                        self.emit_oracle_event(OracleEvent::InflationRewardDistributed {
                            query_id,
                            total_reward: total_reward_amount,
                            voters_rewarded: correct_voters,
                        });
                    }
                    Err(e) => {
                        eprintln!("⚠️  Failed to distribute inflation reward: {}", e);
                    }
                }
            }
        }
        
        // ==================== HYBRID MODEL: Mark Bond Ready for Refund ====================
        // After resolution, mark bond as ready for refund (if not disputed)
        if query.bond_amount > Amount::ZERO {
            if let Err(e) = self.state.mark_bond_ready_for_refund(query_id).await {
                eprintln!("⚠️  Note: Could not mark bond ready for refund: {}", e);
            } else {
                eprintln!(
                    "🔓 Bond {} marked ready for refund (after dispute window) for query {}",
                    query.bond_amount, query_id
                );
            }
        }
        
        // Send callback to requesting chain if callback info exists
        if let (Some(callback_chain), Some(callback_data)) = 
            (query.callback_chain, query.callback_data.clone()) 
        {
            eprintln!(
                "📤 Sending OracleCallback::QueryResolved to chain {}: query_id={}, result={}",
                callback_chain, query_id, result
            );
            
            // Calculate result_index (position in outcomes array)
            let result_index = query.outcomes.iter()
                .position(|o| o == &result)
                .map(|i| i as u32);
            
            // Determine if result is final (no dispute window or dispute window passed)
            let is_final = match query.dispute_window_end {
                Some(dispute_end) => current_time >= dispute_end && query.dispute.is_none(),
                None => true, // Legacy queries without dispute window are immediately final
            };
            
            // Calculate total voting weight
            let total_voting_weight: u128 = query.votes.values()
                .map(|v| {
                    let weight: u128 = v.voting_power.into();
                    weight
                })
                .sum();
            
            // Create OracleCallback using shared message type (Industry Standard format)
            let oracle_callback = alethea_oracle_messages::OracleCallback::QueryResolved {
                query_id,
                result: result.clone(),
                result_index,
                resolved_at: current_time,
                callback_data: callback_data.clone(),
                vote_count: (correct_voters + incorrect_voters) as u32,
                confidence: if correct_voters + incorrect_voters > 0 {
                    ((correct_voters as f64 / (correct_voters + incorrect_voters) as f64) * 100.0) as u8
                } else {
                    0
                },
                dispute_window_end: query.dispute_window_end,
                is_final,
                total_voting_weight: Some(total_voting_weight),
            };
            
            let callback_message = oracle_registry_v2::Message::OracleCallback(oracle_callback);
            
            // Send callback to Market Chain with authentication
            self.runtime.prepare_message(callback_message)
                .with_authentication()
                .with_tracking()
                .send_to(callback_chain);
            
            eprintln!("✅ OracleCallback::QueryResolved sent to {} (is_final={})", callback_chain, is_final);
            
            // If result is final (no dispute window), also send QueryFinalized callback
            if is_final {
                let finalized_callback = alethea_oracle_messages::OracleCallback::QueryFinalized {
                    query_id,
                    result: result.clone(),
                    result_index,
                    finalized_at: current_time,
                    callback_data: callback_data.clone(),
                    bond_refunded: if query.bond_amount > linera_sdk::linera_base_types::Amount::ZERO && !query.bond_refunded {
                        Some(query.bond_amount)
                    } else {
                        None
                    },
                };
                
                let finalized_message = oracle_registry_v2::Message::OracleCallback(finalized_callback);
                self.runtime.prepare_message(finalized_message)
                    .with_authentication()
                    .with_tracking()
                    .send_to(callback_chain);
                
                eprintln!("✅ OracleCallback::QueryFinalized sent to {}", callback_chain);
            }
            
            // Also send legacy QueryResolutionCallback for backward compatibility
            let legacy_callback = oracle_registry_v2::Message::QueryResolutionCallback {
                query_id,
                resolved_outcome: result.clone(),
                resolved_at: current_time,
                callback_data: callback_data.clone(),
            };
            self.runtime.prepare_message(legacy_callback)
                .with_authentication()
                .with_tracking()
                .send_to(callback_chain);
            
            // Emit MarketQueryResolved event for cross-chain subscribers
            self.emit_oracle_event(OracleEvent::MarketQueryResolved {
                query_id,
                result: result.clone(),
                resolved_at: current_time,
                callback_chain,
                callback_data,
            });
        } else {
            eprintln!("ℹ️ No callback configured for query {}", query_id);
        }
        
        // Emit QueryResolved event for cross-chain subscribers
        self.emit_oracle_event(OracleEvent::QueryResolved {
            query_id,
            result: result.clone(),
            resolved_at: current_time,
            total_votes: correct_voters + incorrect_voters,
            correct_voters,
        });
        
        // Build detailed response message
        let mut response_msg = format!(
            "Query resolved with result: {} ({} correct, {} incorrect)",
            result, correct_voters, incorrect_voters
        );
        
        if total_slashed > 0 {
            response_msg.push_str(&format!(
                ". Slashed {} tokens from incorrect voters",
                Amount::from_attos(total_slashed)
            ));
            
            if voters_deactivated > 0 {
                response_msg.push_str(&format!(
                    " ({} voter{} deactivated due to insufficient stake)",
                    voters_deactivated,
                    if voters_deactivated == 1 { "" } else { "s" }
                ));
            }
        }
        
        OperationResponse::success(response_msg)
    }
    
    /// Calculate result based on votes and decision strategy
    async fn calculate_result(&self, query: &state::Query) -> String {
        match query.strategy {
            state::DecisionStrategy::Majority => self.calculate_majority_result(query),
            state::DecisionStrategy::WeightedByReputation => self.calculate_reputation_weighted_result(query).await,
            state::DecisionStrategy::WeightedByStake => self.calculate_stake_weighted_result(query).await,
            state::DecisionStrategy::Median => self.calculate_median_result(query),
        }
    }
    
    /// Calculate result using simple majority
    fn calculate_majority_result(&self, query: &state::Query) -> String {
        let mut vote_counts: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
        
        for vote in query.votes.values() {
            *vote_counts.entry(vote.value.clone()).or_insert(0) += 1;
        }
        
        // Find the value with most votes
        vote_counts
            .into_iter()
            .max_by_key(|(_, count)| *count)
            .map(|(value, _)| value)
            .unwrap_or_else(|| "No consensus".to_string())
    }
    
    /// Calculate result weighted by voter reputation
    async fn calculate_reputation_weighted_result(&self, query: &state::Query) -> String {
        let mut weighted_votes: std::collections::HashMap<String, f64> = std::collections::HashMap::new();
        
        for vote in query.votes.values() {
            // Get voter reputation (default to 50 if not found)
            let reputation = if let Some(voter_info) = self.state.get_voter(&vote.voter).await {
                voter_info.reputation
            } else {
                50
            };
            
            let weight = self.state.calculate_reputation_weight(reputation);
            *weighted_votes.entry(vote.value.clone()).or_insert(0.0) += weight;
        }
        
        // Find the value with highest weighted votes
        weighted_votes
            .into_iter()
            .max_by(|(_, weight_a), (_, weight_b)| {
                weight_a.partial_cmp(weight_b).unwrap_or(std::cmp::Ordering::Equal)
            })
            .map(|(value, _)| value)
            .unwrap_or_else(|| "No consensus".to_string())
    }
    
    /// Calculate result weighted by voter stake
    async fn calculate_stake_weighted_result(&self, query: &state::Query) -> String {
        let mut weighted_votes: std::collections::HashMap<String, u128> = std::collections::HashMap::new();
        
        for vote in query.votes.values() {
            // Get voter stake (default to 0 if not found)
            let stake = if let Some(voter_info) = self.state.get_voter(&vote.voter).await {
                u128::from(voter_info.stake)
            } else {
                0
            };
            
            *weighted_votes.entry(vote.value.clone()).or_insert(0) += stake;
        }
        
        // Find the value with highest weighted votes
        weighted_votes
            .into_iter()
            .max_by_key(|(_, weight)| *weight)
            .map(|(value, _)| value)
            .unwrap_or_else(|| "No consensus".to_string())
    }
    
    /// Calculate median result (for numeric values)
    fn calculate_median_result(&self, query: &state::Query) -> String {
        // Try to parse votes as numbers
        let mut numeric_votes: Vec<f64> = query.votes.values()
            .filter_map(|vote| vote.value.parse::<f64>().ok())
            .collect();
        
        if numeric_votes.is_empty() {
            return "No valid numeric votes".to_string();
        }
        
        numeric_votes.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        
        let median = if numeric_votes.len() % 2 == 0 {
            let mid = numeric_votes.len() / 2;
            (numeric_votes[mid - 1] + numeric_votes[mid]) / 2.0
        } else {
            numeric_votes[numeric_votes.len() / 2]
        };
        
        median.to_string()
    }
    
    /// Claim pending rewards
    async fn claim_rewards(&mut self) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{OperationResponse, ResponseData};
        use linera_sdk::linera_base_types::AccountOwner;
        
        let voter_chain = self.runtime.chain_id();
        
        // Validate voter is registered
        let mut voter_info = match self.validate_voter_registered(&voter_chain).await {
            Ok(info) => info,
            Err(e) => return OperationResponse::error(e),
        };
        
        // Get pending rewards
        let pending_rewards = self.state.get_pending_rewards(&voter_chain).await;
        
        // Check if there are any rewards to claim
        if pending_rewards == Amount::ZERO {
            return OperationResponse::error("No pending rewards to claim");
        }
        
        // AUTO-MINT: Call token contract to mint reward tokens to registry
        // This ensures rewards are backed by real tokens
        let params = self.state.get_parameters().await;
        if let Some(token_app_id) = params.token_app_id {
            // Create AccountOwner for registry (using app ID hash as Address32)
            let registry_hash = self.runtime.application_id().forget_abi().application_description_hash;
            let registry_owner = AccountOwner::Address32(registry_hash.into());
            
            // Create mint operation for token contract
            let mint_op = alethea_token::Operation::Mint {
                to: registry_owner,
                amount: pending_rewards,
            };
            
            eprintln!(
                "📤 Calling token contract to mint {} reward tokens for voter {}",
                pending_rewards, voter_chain
            );
            
            // Call token contract to mint rewards
            match self.runtime.call_application(
                true,
                token_app_id.with_abi::<alethea_token::AletheaTokenAbi>(),
                &mint_op
            ) {
                response => {
                    eprintln!("✅ Token mint response: {:?}", response);
                }
            }
        }
        
        // Add rewards to voter's stake
        voter_info.stake = voter_info.stake.saturating_add(pending_rewards);
        
        // Update voter info with new stake
        if let Err(e) = self.state.voters.insert(&voter_chain, voter_info) {
            return OperationResponse::error(format!("Failed to update voter stake: {}", e));
        }
        
        // Update total stake in the system
        let current_total_stake = *self.state.total_stake.get();
        self.state.total_stake.set(current_total_stake.saturating_add(pending_rewards));
        
        // Update token holdings to reflect minted rewards
        let current_holdings = self.state.token_holdings.get(&voter_chain).await.ok().flatten().unwrap_or(Amount::ZERO);
        if let Err(e) = self.state.token_holdings.insert(&voter_chain, current_holdings.saturating_add(pending_rewards)) {
            eprintln!("⚠️  Failed to update token holdings: {}", e);
        }
        
        let total_held = *self.state.total_tokens_held.get();
        self.state.total_tokens_held.set(total_held.saturating_add(pending_rewards));
        
        // Clear pending rewards
        if let Err(e) = self.state.pending_rewards.remove(&voter_chain) {
            return OperationResponse::error(format!("Failed to clear pending rewards: {}", e));
        }
        
        // Update total rewards distributed
        let total_distributed = *self.state.total_rewards_distributed.get();
        let total_value: u128 = total_distributed.into();
        let rewards_value: u128 = pending_rewards.into();
        // Both values are in attos
        let new_total = Amount::from_attos(total_value + rewards_value);
        self.state.total_rewards_distributed.set(new_total);
        
        // Emit RewardsClaimed event for cross-chain subscribers
        self.emit_oracle_event(OracleEvent::RewardsClaimed {
            voter_chain,
            amount: pending_rewards,
        });
        
        OperationResponse::success_with_data(
            format!("Successfully claimed {} rewards - minted and added to stake", pending_rewards),
            ResponseData {
                voter_address: Some(voter_chain.to_string()),
                query_id: None,
                vote_count: None,
                rewards_claimed: Some(pending_rewards.to_string()),
            }
        )
    }
    
    /// Claim pending rewards for a specific voter (by address)
    /// This allows claiming rewards when the caller chain is different from voter chain
    async fn claim_rewards_for(&mut self, voter_address: String) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{OperationResponse, ResponseData};
        use linera_sdk::linera_base_types::AccountOwner;
        
        // Parse voter address to ChainId
        let voter_chain: ChainId = match voter_address.parse() {
            Ok(chain) => chain,
            Err(_) => return OperationResponse::error(format!("Invalid voter address: {}", voter_address)),
        };
        
        // Validate voter is registered
        let mut voter_info = match self.state.get_voter(&voter_chain).await {
            Some(info) => {
                if !info.is_active {
                    return OperationResponse::error("Voter is not active");
                }
                info
            }
            None => return OperationResponse::error("Voter not registered"),
        };
        
        // Get pending rewards
        let pending_rewards = self.state.get_pending_rewards(&voter_chain).await;
        
        // Check if there are any rewards to claim
        if pending_rewards == Amount::ZERO {
            return OperationResponse::error("No pending rewards to claim");
        }
        
        // AUTO-MINT: Call token contract to mint reward tokens to registry
        let params = self.state.get_parameters().await;
        if let Some(token_app_id) = params.token_app_id {
            let registry_hash = self.runtime.application_id().forget_abi().application_description_hash;
            let registry_owner = AccountOwner::Address32(registry_hash.into());
            
            let mint_op = alethea_token::Operation::Mint {
                to: registry_owner,
                amount: pending_rewards,
            };
            
            eprintln!(
                "📤 Calling token contract to mint {} reward tokens for voter {}",
                pending_rewards, voter_address
            );
            
            match self.runtime.call_application(
                true,
                token_app_id.with_abi::<alethea_token::AletheaTokenAbi>(),
                &mint_op
            ) {
                response => {
                    eprintln!("✅ Token mint response: {:?}", response);
                }
            }
        }
        
        // Add rewards to voter's stake
        voter_info.stake = voter_info.stake.saturating_add(pending_rewards);
        
        // Update voter info with new stake
        if let Err(e) = self.state.voters.insert(&voter_chain, voter_info) {
            return OperationResponse::error(format!("Failed to update voter stake: {}", e));
        }
        
        // Update total stake in the system
        let current_total_stake = *self.state.total_stake.get();
        self.state.total_stake.set(current_total_stake.saturating_add(pending_rewards));
        
        // Update token holdings to reflect minted rewards
        let current_holdings = self.state.token_holdings.get(&voter_chain).await.ok().flatten().unwrap_or(Amount::ZERO);
        if let Err(e) = self.state.token_holdings.insert(&voter_chain, current_holdings.saturating_add(pending_rewards)) {
            eprintln!("⚠️  Failed to update token holdings: {}", e);
        }
        
        let total_held = *self.state.total_tokens_held.get();
        self.state.total_tokens_held.set(total_held.saturating_add(pending_rewards));
        
        // Clear pending rewards
        if let Err(e) = self.state.pending_rewards.remove(&voter_chain) {
            return OperationResponse::error(format!("Failed to clear pending rewards: {}", e));
        }
        
        // Update total rewards distributed
        let total_distributed = *self.state.total_rewards_distributed.get();
        let total_value: u128 = total_distributed.into();
        let rewards_value: u128 = pending_rewards.into();
        let new_total = Amount::from_attos(total_value + rewards_value);
        self.state.total_rewards_distributed.set(new_total);
        
        // Emit RewardsClaimed event
        self.emit_oracle_event(OracleEvent::RewardsClaimed {
            voter_chain,
            amount: pending_rewards,
        });
        
        OperationResponse::success_with_data(
            format!("Successfully claimed {} rewards for {} - minted and added to stake", pending_rewards, voter_address),
            ResponseData {
                voter_address: Some(voter_chain.to_string()),
                query_id: None,
                vote_count: None,
                rewards_claimed: Some(pending_rewards.to_string()),
            }
        )
    }
    
    /// Withdraw stake for a specific voter (by address)
    /// This allows withdrawing stake when the caller chain is different from voter chain
    async fn withdraw_stake_for(&mut self, voter_address: String, amount: Amount) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{OperationResponse, ResponseData};
        
        // Parse voter address to ChainId
        let voter_chain: ChainId = match voter_address.parse() {
            Ok(chain) => chain,
            Err(_) => return OperationResponse::error(format!("Invalid voter address: {}", voter_address)),
        };
        
        // Validate withdrawal amount is positive
        if amount == Amount::ZERO {
            return OperationResponse::error("Withdrawal amount must be greater than zero");
        }
        
        // Validate voter is registered
        let mut voter_info = match self.state.get_voter(&voter_chain).await {
            Some(info) => {
                if !info.is_active {
                    return OperationResponse::error("Voter is not active");
                }
                info
            }
            None => return OperationResponse::error("Voter not registered"),
        };
        
        // Validate sufficient stake for withdrawal
        let params = self.state.get_parameters().await;
        let available_stake = voter_info.stake.saturating_sub(voter_info.locked_stake);
        
        if amount > available_stake {
            return OperationResponse::error(format!(
                "Insufficient available stake. Available: {}, Requested: {}",
                available_stake, amount
            ));
        }
        
        // Check minimum stake requirement after withdrawal
        let remaining_stake = voter_info.stake.saturating_sub(amount);
        if remaining_stake > Amount::ZERO && remaining_stake < params.min_stake {
            return OperationResponse::error(format!(
                "Remaining stake {} would be below minimum {}. Withdraw all or leave at least minimum.",
                remaining_stake, params.min_stake
            ));
        }
        
        // Update stake and add to withdrawable balance
        voter_info.stake = remaining_stake;
        voter_info.withdrawable_balance = voter_info.withdrawable_balance.saturating_add(amount);
        
        if let Err(e) = self.state.voters.insert(&voter_chain, voter_info.clone()) {
            return OperationResponse::error(format!("Failed to update voter: {}", e));
        }
        
        // Update total stake
        let current_stake = *self.state.total_stake.get();
        let new_total = current_stake.saturating_sub(amount);
        self.state.total_stake.set(new_total);
        
        // Note: token_holdings NOT updated here because tokens move to withdrawable_balance
        // They are still held by registry, just marked as withdrawable
        // token_holdings will be updated when claim_withdrawable_tokens is called
        
        eprintln!(
            "📤 Stake withdrawn for {}: {} tokens. New stake: {}, Withdrawable: {}",
            voter_address, amount, voter_info.stake, voter_info.withdrawable_balance
        );
        
        // Emit StakeUpdated event
        self.emit_oracle_event(OracleEvent::StakeUpdated {
            voter_chain,
            new_stake: voter_info.stake,
            change: amount,
            is_increase: false,
        });
        
        OperationResponse::success_with_data(
            format!("Stake withdrawn: {} tokens. New stake: {}. Withdrawable balance: {} (claim from token contract)", 
                amount, voter_info.stake, voter_info.withdrawable_balance),
            ResponseData {
                voter_address: Some(voter_chain.to_string()),
                query_id: None,
                vote_count: None,
                rewards_claimed: None,
            }
        )
    }
    
    /// Add more stake for a specific voter (admin operation)
    ///
    /// ## STAKING FLOW (Dashboard Integration):
    ///
    /// 1. Dashboard calls `stakeTransfer` on Token Contract to move tokens to registry's balance
    /// 2. Dashboard calls this mutation with the additional stake amount
    /// 3. Registry trusts admin and updates voter's stake
    ///
    /// This allows adding stake when the caller chain is different from voter chain.
    async fn update_stake_for(&mut self, voter_address: String, additional_stake: Amount) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{OperationResponse, ResponseData};

        // Parse voter address to ChainId
        let voter_chain: ChainId = match voter_address.parse() {
            Ok(chain) => chain,
            Err(_) => return OperationResponse::error(format!("Invalid voter address: {}", voter_address)),
        };

        // Validate stake amount is positive
        if additional_stake == Amount::ZERO {
            return OperationResponse::error("Additional stake must be greater than zero");
        }

        // Validate voter is registered
        let mut voter_info = match self.state.get_voter(&voter_chain).await {
            Some(info) => info,
            None => return OperationResponse::error("Voter not registered"),
        };

        let params = self.state.get_parameters().await;
        let was_active = voter_info.is_active;

        // Add stake
        let old_stake = voter_info.stake;
        voter_info.stake = voter_info.stake.saturating_add(additional_stake);

        // Check if voter should become active
        if !was_active && voter_info.stake >= params.min_stake {
            voter_info.is_active = true;
            eprintln!("✅ Voter {} is now ACTIVE with stake {}", voter_chain, voter_info.stake);
        }

        if let Err(e) = self.state.voters.insert(&voter_chain, voter_info.clone()) {
            return OperationResponse::error(format!("Failed to update voter: {}", e));
        }

        // Update token_holdings to track the staked tokens
        let current_holdings = self.state.token_holdings.get(&voter_chain).await.ok().flatten().unwrap_or(Amount::ZERO);
        let new_holdings = current_holdings.saturating_add(additional_stake);
        self.state.token_holdings.insert(&voter_chain, new_holdings).expect("Failed to update token holdings");

        // Update total tokens held
        let total_held = *self.state.total_tokens_held.get();
        self.state.total_tokens_held.set(total_held.saturating_add(additional_stake));

        // Update total stake
        let current_stake = *self.state.total_stake.get();
        let new_total = current_stake.saturating_add(additional_stake);
        self.state.total_stake.set(new_total);

        eprintln!(
            "📥 Stake added for {}: {} tokens. Old stake: {}, New stake: {}, Active: {}",
            voter_address, additional_stake, old_stake, voter_info.stake, voter_info.is_active
        );

        // Emit StakeUpdated event
        self.emit_oracle_event(OracleEvent::StakeUpdated {
            voter_chain,
            new_stake: voter_info.stake,
            change: additional_stake,
            is_increase: true,
        });

        let status = if voter_info.is_active { "ACTIVE" } else { "INACTIVE" };
        OperationResponse::success_with_data(
            format!("Stake added: {} tokens. New total stake: {}. Status: {}",
                additional_stake, voter_info.stake, status),
            ResponseData {
                voter_address: Some(voter_chain.to_string()),
                query_id: None,
                vote_count: None,
                rewards_claimed: None,
            }
        )
    }
    
    /// Claim withdrawable tokens for a specific voter
    /// This clears the withdrawable_balance and sends tokens back to user via token contract
    async fn claim_withdrawable_tokens(&mut self, voter_address: String) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{OperationResponse, ResponseData};
        use linera_sdk::linera_base_types::{AccountOwner, Account};
        
        // Parse voter address to ChainId
        let voter_chain: ChainId = match voter_address.parse() {
            Ok(chain) => chain,
            Err(_) => return OperationResponse::error(format!("Invalid voter address: {}", voter_address)),
        };
        
        // Validate voter is registered
        let mut voter_info = match self.state.get_voter(&voter_chain).await {
            Some(info) => info,
            None => return OperationResponse::error("Voter not registered"),
        };
        
        // Check if there's anything to claim
        if voter_info.withdrawable_balance == Amount::ZERO {
            return OperationResponse::error("No withdrawable balance to claim");
        }
        
        let claimed_amount = voter_info.withdrawable_balance;
        
        // Clear withdrawable balance
        voter_info.withdrawable_balance = Amount::ZERO;
        
        if let Err(e) = self.state.voters.insert(&voter_chain, voter_info) {
            return OperationResponse::error(format!("Failed to update voter: {}", e));
        }
        
        // Update total tokens held
        let total_held = *self.state.total_tokens_held.get();
        self.state.total_tokens_held.set(total_held.saturating_sub(claimed_amount));
        
        eprintln!(
            "💰 Withdrawable tokens claimed for {}: {} tokens",
            voter_address, claimed_amount
        );
        
        // Get token config
        let params = self.state.get_parameters().await;
        
        // Send tokens back to user via token contract using call_application
        if let Some(token_app_id) = params.token_app_id {
            // Create target account for the voter's personal account
            // Use the voter's chain ID bytes as Address32
            let voter_chain_bytes: [u8; 32] = voter_chain.0.into();
            let voter_owner = AccountOwner::Address32(voter_chain_bytes.into());
            let target_account = Account {
                chain_id: params.token_chain_id.unwrap_or(self.runtime.chain_id()),
                owner: voter_owner,
            };
            
            // Registry's tokens are stored using deterministic address based on registry app ID
            // This matches how StakeTransfer stores tokens in the token contract
            let registry_owner = AccountOwner::Address32(self.runtime.application_id().forget_abi().application_description_hash.into());
            
            let transfer_op = alethea_token::Operation::Transfer {
                owner: registry_owner,
                amount: claimed_amount,
                target_account,
            };
            
            eprintln!(
                "📤 Calling token contract to transfer {} tokens from registry {:?} to user account {:?}",
                claimed_amount, registry_owner, voter_owner
            );
            
            // Call token contract to execute transfer
            match self.runtime.call_application(true, token_app_id.with_abi::<alethea_token::AletheaTokenAbi>(), &transfer_op) {
                response => {
                    eprintln!("✅ Token transfer response: {:?}", response);
                }
            }
            
            OperationResponse::success_with_data(
                format!("Successfully claimed {} tokens. Tokens sent to your account.", claimed_amount),
                ResponseData {
                    voter_address: Some(voter_chain.to_string()),
                    query_id: None,
                    vote_count: None,
                    rewards_claimed: Some(claimed_amount.to_string()),
                }
            )
        } else {
            // Token config not set - return success but note tokens need manual claim
            eprintln!("⚠️ Token config not set. User needs to claim tokens manually.");
            
            OperationResponse::success_with_data(
                format!("Claimed {} tokens. Token contract not configured - contact admin.", claimed_amount),
                ResponseData {
                    voter_address: Some(voter_chain.to_string()),
                    query_id: None,
                    vote_count: None,
                    rewards_claimed: Some(claimed_amount.to_string()),
                }
            )
        }
    }
    
    /// Set token configuration (admin only)
    /// This configures the ALTH token contract for real token integration
    async fn set_token_config(
        &mut self,
        token_app_id: linera_sdk::linera_base_types::ApplicationId,
        token_chain_id: ChainId,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        let caller_chain = self.runtime.chain_id();
        
        // Verify caller is admin
        if !self.state.is_admin(&caller_chain).await {
            return OperationResponse::error("Unauthorized: only admin can set token config");
        }
        
        // Update parameters with token config
        let mut params = self.state.get_parameters().await;
        params.token_app_id = Some(token_app_id);
        params.token_chain_id = Some(token_chain_id);
        self.state.parameters.set(params);
        
        eprintln!(
            "🔧 Token config set: app_id={}, chain_id={}",
            token_app_id, token_chain_id
        );
        
        OperationResponse::success(format!(
            "Token config set: app_id={}, chain_id={}",
            token_app_id, token_chain_id
        ))
    }
    
    /// Update protocol parameters (admin only)
    async fn update_parameters(
        &mut self,
        params: ProtocolParameters,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        let caller_chain = self.runtime.chain_id();
        
        // Verify caller is admin
        if !self.state.is_admin(&caller_chain).await {
            return OperationResponse::error("Unauthorized: only admin can update parameters");
        }
        
        // Validate parameters
        if let Err(e) = self.validate_protocol_parameters(&params) {
            return OperationResponse::error(format!("Invalid parameters: {}", e));
        }
        
        // Update parameters
        self.state.parameters.set(params.clone());
        
        // Emit ParametersUpdated event for cross-chain subscribers
        self.emit_oracle_event(OracleEvent::ParametersUpdated {
            min_stake: params.min_stake,
            min_votes_default: params.min_votes_default,
            updated_by: caller_chain,
        });
        
        OperationResponse::success("Protocol parameters updated successfully")
    }
    
    /// Pause protocol (admin only)
    async fn pause_protocol(&mut self) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        let caller_chain = self.runtime.chain_id();
        
        // Verify caller is admin
        if !self.state.is_admin(&caller_chain).await {
            return OperationResponse::error("Unauthorized: only admin can pause protocol");
        }
        
        // Check if already paused
        if self.state.is_paused().await {
            return OperationResponse::error("Protocol is already paused");
        }
        
        // Pause the protocol
        self.state.is_paused.set(true);
        
        // Emit ProtocolStatusChanged event for cross-chain subscribers
        self.emit_oracle_event(OracleEvent::ProtocolStatusChanged {
            is_paused: true,
            changed_by: caller_chain,
        });
        
        OperationResponse::success("Protocol paused successfully")
    }
    
    /// Unpause protocol (admin only)
    async fn unpause_protocol(&mut self) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        let caller_chain = self.runtime.chain_id();
        
        // Verify caller is admin
        if !self.state.is_admin(&caller_chain).await {
            return OperationResponse::error("Unauthorized: only admin can unpause protocol");
        }
        
        // Check if already unpaused
        if !self.state.is_paused().await {
            return OperationResponse::error("Protocol is not paused");
        }
        
        // Unpause the protocol
        self.state.is_paused.set(false);
        
        // Emit ProtocolStatusChanged event for cross-chain subscribers
        self.emit_oracle_event(OracleEvent::ProtocolStatusChanged {
            is_paused: false,
            changed_by: caller_chain,
        });
        
        OperationResponse::success("Protocol unpaused successfully")
    }
    
    /// Check and expire queries operation (maintenance)
    async fn check_expired_queries_operation(&mut self) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{OperationResponse, ResponseData};
        
        // Check and expire all queries that have passed their deadline
        let expired_ids = self.check_and_expire_queries().await;
        
        if expired_ids.is_empty() {
            OperationResponse::success("No expired queries found")
        } else {
            OperationResponse::success_with_data(
                format!("Expired {} queries", expired_ids.len()),
                ResponseData {
                    voter_address: None,
                    query_id: None,
                    vote_count: Some(expired_ids.len()),
                    rewards_claimed: None,
                }
            )
        }
    }
    
    /// Auto-resolve queries that have completed reveal phase
    async fn auto_resolve_queries(&mut self) -> Vec<u64> {
        let mut resolved_query_ids = Vec::new();
        let active_queries = self.state.get_active_queries().await;
        let current_time = self.runtime.system_time();
        
        for query_id in active_queries {
            if let Some(query) = self.state.get_query(query_id).await {
                // Check if reveal phase has ended
                if query.phase == state::VotingPhase::Reveal && current_time >= query.reveal_phase_end {
                    // Check if we have minimum votes
                    if query.votes.len() >= query.min_votes {
                        // Auto-resolve this query
                        let result = self.resolve_query(query_id).await;
                        if result.success {
                            resolved_query_ids.push(query_id);
                        } else {
                            eprintln!("Warning: Failed to auto-resolve query {}: {}", query_id, result.message);
                        }
                    } else {
                        // Not enough votes, mark as expired
                        if let Err(e) = self.mark_query_expired(query_id).await {
                            eprintln!("Warning: Failed to mark query {} as expired: {}", query_id, e);
                        }
                    }
                }
            }
        }
        
        resolved_query_ids
    }
    
    /// Check and auto-resolve queries operation (maintenance)
    async fn auto_resolve_queries_operation(&mut self) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{OperationResponse, ResponseData};
        
        // Auto-resolve all queries that have completed reveal phase
        let resolved_ids = self.auto_resolve_queries().await;
        
        if resolved_ids.is_empty() {
            OperationResponse::success("No queries ready for resolution")
        } else {
            OperationResponse::success_with_data(
                format!("Auto-resolved {} queries", resolved_ids.len()),
                ResponseData {
                    voter_address: None,
                    query_id: None,
                    vote_count: Some(resolved_ids.len()),
                    rewards_claimed: None,
                }
            )
        }
    }
    
    /// Manually expire a specific query (admin operation)
    async fn expire_query_operation(&mut self, query_id: u64) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        let caller_chain = self.runtime.chain_id();
        
        // Verify caller is admin
        if !self.state.is_admin(&caller_chain).await {
            return OperationResponse::error("Unauthorized: only admin can manually expire queries");
        }
        
        match self.mark_query_expired(query_id).await {
            Ok(()) => OperationResponse::success(format!("Query {} marked as expired", query_id)),
            Err(e) => OperationResponse::error(e),
        }
    }
    
    /// Distribute rewards proportionally by voter power (stake × reputation)
    /// This is an alternative to strategy-based distribution
    async fn distribute_rewards_by_power(
        &mut self,
        query_id: u64,
    ) -> Result<(), String> {
        let query = self.state.get_query(query_id).await
            .ok_or("Query not found")?;
        
        let final_result = query.result.clone()
            .ok_or("Query not resolved")?;
        
        // Get correct voters
        let correct_voters: Vec<linera_sdk::linera_base_types::ChainId> = query.votes
            .iter()
            .filter(|(_, vote)| vote.value == final_result)
            .map(|(chain_id, _)| *chain_id)
            .collect();
        
        if correct_voters.is_empty() {
            // No correct voters - rewards stay in pool
            return Ok(());
        }
        
        // Calculate total power of correct voters
        let mut total_power: u128 = 0;
        let mut voter_powers: Vec<(linera_sdk::linera_base_types::ChainId, u128)> = Vec::new();
        
        for voter_chain in &correct_voters {
            let voter = self.state.get_voter(voter_chain).await
                .ok_or("Voter not found")?;
            let power = self.state.calculate_voter_power(&voter);
            total_power = total_power.saturating_add(power);
            voter_powers.push((*voter_chain, power));
        }
        
        if total_power == 0 {
            return Err("Total power is zero".to_string());
        }
        
        // Distribute rewards proportionally by power
        let reward_pool_value: u128 = query.reward_amount.into();
        
        for (voter_chain, voter_power) in voter_powers {
            // Calculate share: (voter_power / total_power) × reward_pool
            // Note: reward_pool_value is in attos, so result is also in attos
            let share_numerator = voter_power.saturating_mul(reward_pool_value);
            let reward_value = share_numerator / total_power;
            let reward = linera_sdk::linera_base_types::Amount::from_attos(reward_value);
            
            // Add to pending rewards
            let current_pending = self.state.get_pending_rewards(&voter_chain).await;
            let new_pending = current_pending.saturating_add(reward);
            
            self.state.pending_rewards
                .insert(&voter_chain, new_pending)
                .expect("Failed to update pending rewards");
        }
        
        // Update total rewards distributed
        let total_distributed = *self.state.total_rewards_distributed.get();
        self.state.total_rewards_distributed.set(
            total_distributed.saturating_add(query.reward_amount)
        );
        
        Ok(())
    }
    
    /// Forward query from Instance to Hub (Instance mode operation)
    /// 
    /// When Instance receives CreateQueryWithCallback, it:
    /// 1. Creates a pending query locally
    /// 2. Sends ForwardQueryToHub message to Hub
    /// 3. Hub processes and sends back QueryCreatedOnHub
    async fn forward_query_to_hub(
        &mut self,
        description: String,
        outcomes: Vec<String>,
        strategy: oracle_registry_v2::state::DecisionStrategy,
        min_votes: Option<usize>,
        reward_amount: Amount,
        deadline: Option<linera_sdk::linera_base_types::Timestamp>,
        callback_chain: linera_sdk::linera_base_types::ChainId,
        callback_app: linera_sdk::linera_base_types::ApplicationId,
        callback_data: Vec<u8>,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{Message, OperationResponse, ResponseData};
        
        // Get Hub chain ID
        let hub_chain_id = match self.state.get_hub_chain_id() {
            Some(id) => id,
            None => return OperationResponse::error("Instance not connected to Hub"),
        };
        
        eprintln!(
            "📤 Instance forwarding query to Hub {}: {}",
            hub_chain_id, description
        );
        
        // Create pending query locally
        let local_query_id = self.state.create_pending_query(
            description.clone(),
            outcomes.clone(),
            Some(callback_app),
            callback_data.clone(),
            self.runtime.system_time(),
        ).await;
        
        // Convert strategy to string for message
        let strategy_str = match strategy {
            oracle_registry_v2::state::DecisionStrategy::Majority => "Majority",
            oracle_registry_v2::state::DecisionStrategy::Median => "Median",
            oracle_registry_v2::state::DecisionStrategy::WeightedByStake => "WeightedByStake",
            oracle_registry_v2::state::DecisionStrategy::WeightedByReputation => "WeightedByReputation",
        }.to_string();
        
        // Send ForwardQueryToHub message to Hub
        let message = Message::ForwardQueryToHub {
            local_query_id,
            description,
            outcomes,
            strategy: strategy_str,
            min_votes,
            reward_amount,
            deadline,
            source_chain: self.runtime.chain_id(),
            callback_app: Some(callback_app),
            callback_data,
        };
        
        self.runtime
            .prepare_message(message)
            .with_authentication()
            .send_to(hub_chain_id);
        
        eprintln!(
            "✅ Instance created pending query {} and forwarded to Hub",
            local_query_id
        );
        
        OperationResponse::success_with_data(
            format!("Query forwarded to Hub, local_id={}", local_query_id),
            ResponseData {
                voter_address: None,
                query_id: Some(local_query_id),
                vote_count: None,
                rewards_claimed: None,
            },
        )
    }
}

// ==================== HUB-INSTANCE HANDLERS ====================

impl OracleRegistryV2Contract {
    /// Handle ForwardQueryToHub message (Hub receives from Instance)
    async fn handle_forward_query_to_hub(
        &mut self,
        local_query_id: u64,
        description: String,
        outcomes: Vec<String>,
        strategy: String,
        min_votes: Option<usize>,
        reward_amount: linera_sdk::linera_base_types::Amount,
        deadline: Option<linera_sdk::linera_base_types::Timestamp>,
        source_chain: ChainId,
        callback_app: Option<linera_sdk::linera_base_types::ApplicationId>,
        callback_data: Vec<u8>,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        // Only Hub should receive this message
        if !self.state.is_hub() {
            return OperationResponse::error("Only Hub can receive ForwardQueryToHub");
        }
        
        eprintln!(
            "📥 Hub received ForwardQueryToHub: local_id={}, from chain {}",
            local_query_id, source_chain
        );
        
        // Convert strategy string to enum
        let state_strategy = match strategy.as_str() {
            "Majority" => state::DecisionStrategy::Majority,
            "Median" => state::DecisionStrategy::Median,
            "WeightedByStake" => state::DecisionStrategy::WeightedByStake,
            "WeightedByReputation" => state::DecisionStrategy::WeightedByReputation,
            _ => state::DecisionStrategy::Majority,
        };
        
        // Create query on Hub
        let result = self.create_query_internal(
            description,
            outcomes,
            state_strategy,
            min_votes,
            reward_amount,
            deadline,
            None, // duration_secs
        ).await;
        
        match result {
            Ok(hub_query_id) => {
                // Store callback info
                let callback = state::QueryCallback {
                    callback_chain: source_chain,
                    callback_app,
                    callback_data,
                };
                self.state.query_callbacks.insert(&hub_query_id, callback)
                    .expect("Failed to store callback");
                
                // Send confirmation back to Instance
                let message = oracle_registry_v2::Message::QueryCreatedOnHub {
                    local_query_id,
                    hub_query_id,
                };
                
                self.runtime
                    .prepare_message(message)
                    .with_authentication()
                    .send_to(source_chain);
                
                eprintln!(
                    "✅ Hub created query {} for Instance local_id={}, sent confirmation",
                    hub_query_id, local_query_id
                );
                
                OperationResponse::success(format!(
                    "Query created on Hub: hub_id={}, local_id={}",
                    hub_query_id, local_query_id
                ))
            }
            Err(e) => {
                eprintln!("❌ Hub failed to create query: {}", e);
                OperationResponse::error(e)
            }
        }
    }
    
    /// Handle QueryCreatedOnHub message (Instance receives from Hub)
    async fn handle_query_created_on_hub(
        &mut self,
        local_query_id: u64,
        hub_query_id: u64,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        // Only Instance should receive this message
        if !self.state.is_instance() {
            return OperationResponse::error("Only Instance can receive QueryCreatedOnHub");
        }
        
        eprintln!(
            "📥 Instance received QueryCreatedOnHub: local_id={}, hub_id={}",
            local_query_id, hub_query_id
        );
        
        // Link local query to Hub query
        match self.state.link_pending_to_hub(local_query_id, hub_query_id).await {
            Ok(()) => {
                eprintln!(
                    "✅ Instance linked local_id={} to hub_id={}",
                    local_query_id, hub_query_id
                );
                OperationResponse::success(format!(
                    "Query linked: local_id={}, hub_id={}",
                    local_query_id, hub_query_id
                ))
            }
            Err(e) => {
                eprintln!("❌ Instance failed to link query: {}", e);
                OperationResponse::error(e)
            }
        }
    }
    
    /// Handle QueryResolvedFromHub message (Instance receives from Hub)
    async fn handle_query_resolved_from_hub(
        &mut self,
        hub_query_id: u64,
        result: String,
        resolved_at: linera_sdk::linera_base_types::Timestamp,
        vote_count: u32,
        confidence: u32,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        // Only Instance should receive this message
        if !self.state.is_instance() {
            return OperationResponse::error("Only Instance can receive QueryResolvedFromHub");
        }
        
        eprintln!(
            "📥 Instance received QueryResolvedFromHub: hub_id={}, result={}, votes={}, confidence={}",
            hub_query_id, result, vote_count, confidence
        );
        
        // Resolve pending query
        match self.state.resolve_pending_query(hub_query_id, result.clone(), resolved_at).await {
            Ok(pending) => {
                eprintln!(
                    "✅ Instance resolved local_id={} with result={}",
                    pending.local_id, result
                );
                
                // If there's a callback app, send OracleCallback
                if let Some(_callback_app) = pending.callback_app {
                    // Get chain_id before borrowing self for emit
                    let callback_chain = self.runtime.chain_id();
                    let callback_data = pending.callback_data.clone();
                    
                    // Call the consumer app on the same chain
                    // Note: In production, this would use call_application()
                    // For now, we emit an event that the consumer can listen to
                    self.emit_oracle_event(OracleEvent::MarketQueryResolved {
                        query_id: hub_query_id,
                        result: result.clone(),
                        resolved_at,
                        callback_chain,
                        callback_data,
                    });
                    
                    eprintln!(
                        "📤 Instance emitted MarketQueryResolved event"
                    );
                }
                
                OperationResponse::success(format!(
                    "Query resolved: hub_id={}, local_id={}, result={}",
                    hub_query_id, pending.local_id, result
                ))
            }
            Err(e) => {
                eprintln!("❌ Instance failed to resolve query: {}", e);
                OperationResponse::error(e)
            }
        }
    }
    
    /// Handle QueryExpiredFromHub message (Instance receives from Hub)
    async fn handle_query_expired_from_hub(
        &mut self,
        hub_query_id: u64,
        votes_received: u32,
        votes_required: u32,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        // Only Instance should receive this message
        if !self.state.is_instance() {
            return OperationResponse::error("Only Instance can receive QueryExpiredFromHub");
        }
        
        eprintln!(
            "📥 Instance received QueryExpiredFromHub: hub_id={}, votes={}/{}",
            hub_query_id, votes_received, votes_required
        );
        
        // Get pending query and update status
        if let Some(pending) = self.state.get_pending_query_by_hub_id(hub_query_id).await {
            // Update status to expired
            let mut updated = pending.clone();
            updated.status = state::PendingQueryStatus::Expired;
            self.state.pending_queries.insert(&pending.local_id, updated)
                .expect("Failed to update pending query");
            
            // If there's a callback app, send expiration callback
            if let Some(_callback_app) = pending.callback_app {
                // Get timestamp before creating callback
                let expired_at = self.runtime.system_time();
                
                // Create callback with new format (including bond_refunded)
                let callback = alethea_oracle_messages::OracleCallback::QueryExpired {
                    query_id: hub_query_id,
                    callback_data: pending.callback_data.clone(),
                    votes_received,
                    votes_required,
                    bond_refunded: None, // Instance doesn't track bond, Hub handles this
                };
                
                // Send callback to consumer - for Instance mode, we need to handle this via call_application
                // For now, emit event which can be consumed by local apps
                let callback_message = oracle_registry_v2::Message::OracleCallback(callback);
                // Note: In Instance mode, we should send to the callback_app directly if it's on the same chain
                
                // Emit event for consumer
                self.emit_oracle_event(OracleEvent::QueryExpired {
                    query_id: hub_query_id,
                    expired_at,
                    votes_received: votes_received as usize,
                    min_votes_required: votes_required as usize,
                });
                
                eprintln!("📤 Instance emitted QueryExpired event");
            }
            
            OperationResponse::success(format!(
                "Query expired: hub_id={}, local_id={}, votes={}/{}",
                hub_query_id, pending.local_id, votes_received, votes_required
            ))
        } else {
            OperationResponse::error(format!(
                "No pending query found for hub_id={}",
                hub_query_id
            ))
        }
    }
    
    /// Internal helper to create query (used by Hub)
    async fn create_query_internal(
        &mut self,
        description: String,
        outcomes: Vec<String>,
        strategy: state::DecisionStrategy,
        min_votes: Option<usize>,
        reward_amount: linera_sdk::linera_base_types::Amount,
        deadline: Option<linera_sdk::linera_base_types::Timestamp>,
        duration_secs: Option<u64>,
    ) -> Result<u64, String> {
        // Validate inputs
        if description.is_empty() {
            return Err("Description cannot be empty".to_string());
        }
        if outcomes.len() < 2 {
            return Err("At least 2 outcomes required".to_string());
        }
        
        let params = self.state.get_parameters().await;
        let now = self.runtime.system_time();
        let now_micros: u64 = now.micros();
        
        // Calculate deadline
        let duration = duration_secs.unwrap_or(params.default_query_duration);
        let query_deadline = deadline.unwrap_or_else(|| {
            linera_sdk::linera_base_types::Timestamp::from(
                now_micros + duration * 1_000_000
            )
        });
        
        // Calculate phase deadlines (50/50 split)
        let half_duration = duration / 2;
        let commit_phase_end = linera_sdk::linera_base_types::Timestamp::from(
            now_micros + half_duration * 1_000_000
        );
        let reveal_phase_end = query_deadline;
        
        // Get next query ID
        let query_id = *self.state.next_query_id.get();
        self.state.next_query_id.set(query_id + 1);
        
        // Select voters
        let min_votes_actual = min_votes.unwrap_or(params.min_votes_default);
        let selected_voters = self.state.select_voters_for_query(min_votes_actual, 100).await
            .unwrap_or_default();
        
        // Create query (internal - from dashboard)
        let query = state::Query {
            id: query_id,
            description: description.clone(),
            outcomes,
            // Metadata fields (none for internal queries)
            title: None,
            category: None,
            context: None,
            resolution_criteria: None,
            source_urls: None,
            tags: None,
            metadata_url: None,
            external_id: None,
            // Source DApp tracking (internal query - no external source)
            source_app_id: None,
            source_app_name: None,
            source_app_logo: None,
            source_app_category: None,
            query_source: state::QuerySource::Internal,
            // Core fields
            strategy,
            min_votes: min_votes_actual,
            reward_amount,
            creator: self.runtime.chain_id(),
            created_at: now,
            deadline: query_deadline,
            commit_phase_end,
            reveal_phase_end,
            phase: state::VotingPhase::Commit,
            status: state::QueryStatus::Active,
            result: None,
            resolved_at: None,
            commits: std::collections::BTreeMap::new(),
            votes: std::collections::BTreeMap::new(),
            selected_voters,
            max_voters: 100,
            callback_chain: None,
            callback_data: None,
            // Hybrid model fields (legacy query - no bond)
            bond_amount: Amount::ZERO,
            priority_fee: Amount::ZERO,
            bond_refunded: false,
            dispute: None,
            dispute_window_end: None,
        };
        
        // Store query
        self.state.queries.insert(&query_id, query)
            .map_err(|e| format!("Failed to store query: {}", e))?;
        
        // Add to active queries
        let mut active = self.state.get_active_queries().await;
        active.push(query_id);
        self.state.active_queries.set(active);
        
        // Update stats
        let total = *self.state.total_queries_created.get();
        self.state.total_queries_created.set(total + 1);
        
        Ok(query_id)
    }
    
    /// Send resolution to all Instances when query is resolved on Hub
    /// Called after resolve_query completes
    async fn broadcast_resolution_to_instances(
        &mut self,
        query_id: u64,
        result: String,
        resolved_at: linera_sdk::linera_base_types::Timestamp,
        vote_count: u32,
        confidence: u32,
    ) {
        // Get callback info
        if let Ok(Some(callback)) = self.state.query_callbacks.get(&query_id).await {
            let message = oracle_registry_v2::Message::QueryResolvedFromHub {
                hub_query_id: query_id,
                result: result.clone(),
                resolved_at,
                vote_count,
                confidence,
            };
            
            eprintln!(
                "📤 Hub broadcasting resolution to Instance chain {}: query_id={}, result={}",
                callback.callback_chain, query_id, result
            );
            
            self.runtime
                .prepare_message(message)
                .with_authentication()
                .send_to(callback.callback_chain);
        }
    }
    
    // ==================== HYBRID MODEL METHODS ====================
    
    /// Create a query with bond (Hybrid Model)
    async fn create_query_with_bond(
        &mut self,
        description: String,
        outcomes: Vec<String>,
        strategy: state::DecisionStrategy,
        min_votes: Option<usize>,
        bond_amount: Amount,
        service_fee: Amount,
        priority_fee: Amount,
        duration_secs: Option<u64>,
        callback_chain: ChainId,
        callback_app: linera_sdk::linera_base_types::ApplicationId,
        callback_data: Vec<u8>,
        metadata: state::QueryMetadata,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        // Check if paused
        if self.state.is_paused().await {
            return OperationResponse::error("Protocol is paused");
        }
        
        // Validate metadata
        if let Some(ref context) = metadata.context {
            if context.len() > 5000 {
                return OperationResponse::error("Context too long (max 5000 characters)");
            }
        }
        if let Some(ref criteria) = metadata.resolution_criteria {
            if criteria.len() > 2000 {
                return OperationResponse::error("Resolution criteria too long (max 2000 characters)");
            }
        }
        
        // Validate bond amount
        let params = self.state.get_parameters().await;
        if bond_amount < params.min_bond {
            return OperationResponse::error(format!(
                "Bond amount {} is less than minimum {}",
                bond_amount, params.min_bond
            ));
        }
        
        // Validate description
        if description.trim().is_empty() {
            return OperationResponse::error("Description cannot be empty");
        }
        if description.len() > 1000 {
            return OperationResponse::error("Description too long (max 1000 characters)");
        }
        
        // Validate outcomes
        if outcomes.len() < 2 {
            return OperationResponse::error("At least 2 outcomes required");
        }
        if outcomes.len() > 10 {
            return OperationResponse::error("Maximum 10 outcomes allowed");
        }
        
        // Validate service fee
        if service_fee < params.min_service_fee {
            return OperationResponse::error(format!(
                "Service fee {} is below minimum {}",
                service_fee, params.min_service_fee
            ));
        }
        
        // Collect service fee to protocol treasury
        let current_treasury = *self.state.protocol_treasury.get();
        self.state.protocol_treasury.set(current_treasury.saturating_add(service_fee));
        
        // Track total service fees collected
        let current_service_fees = *self.state.total_service_fees_collected.get();
        self.state.total_service_fees_collected.set(current_service_fees.saturating_add(service_fee));
        
        eprintln!(
            "💰 Service fee collected: {} ALTH (Total treasury: {}, Total service fees: {})",
            service_fee,
            current_treasury.saturating_add(service_fee),
            current_service_fees.saturating_add(service_fee)
        );
        
        let caller_chain = self.runtime.chain_id();
        let current_time = self.runtime.system_time();
        
        // Calculate deadline
        let duration = duration_secs.unwrap_or(params.default_query_duration);
        let deadline = linera_sdk::linera_base_types::Timestamp::from(current_time.micros() + (duration * 1_000_000));
        let commit_phase_end = linera_sdk::linera_base_types::Timestamp::from(current_time.micros() + (duration * 500_000)); // 50%
        let reveal_phase_end = deadline;
        
        // Get next query ID
        let query_id = *self.state.next_query_id.get();
        self.state.next_query_id.set(query_id + 1);
        
        // Select voters
        let min_votes_actual = min_votes.unwrap_or(params.min_votes_default);
        let selected_voters = match self.state.select_voters_for_query(min_votes_actual, 100).await {
            Ok(voters) => voters,
            Err(e) => return OperationResponse::error(format!("Failed to select voters: {}", e)),
        };
        
        // Calculate dispute window end
        let dispute_window_end = self.state.calculate_dispute_window_end(deadline);
        
        // Try to get source DApp info from callback_chain/callback_app
        let (source_app_id, source_app_name, source_app_logo, source_app_category, query_source) = {
            // First try with callback_app
            if let Ok(Some(app_info)) = self.state.consumer_apps.get(&(callback_app, callback_chain)).await {
                let category_str = format!("{:?}", app_info.category);
                let source = state::QuerySource::from_app_category(&app_info.category);
                (
                    Some(app_info.app_id),
                    Some(app_info.name),
                    app_info.logo_url, // Use logo_url for display
                    Some(category_str),
                    source,
                )
            } else {
                // Try to find by chain_id only
                let mut found_app: Option<state::ConsumerAppInfo> = None;
                if let Ok(indices) = self.state.consumer_apps.indices().await {
                    for (app_id, chain_id) in indices {
                        if chain_id == callback_chain {
                            if let Ok(Some(app_info)) = self.state.consumer_apps.get(&(app_id, chain_id)).await {
                                found_app = Some(app_info);
                                break;
                            }
                        }
                    }
                }
                
                if let Some(app) = found_app {
                    let category_str = format!("{:?}", app.category);
                    let source = state::QuerySource::from_app_category(&app.category);
                    (
                        Some(app.app_id),
                        Some(app.name),
                        app.logo_url, // Use logo_url for display
                        Some(category_str),
                        source,
                    )
                } else {
                    // External source but not registered - mark as external other
                    (None, None, None, None, state::QuerySource::ExternalOther)
                }
            }
        };
        
        // Create query with bond fields, metadata, and source DApp tracking
        let query = state::Query {
            id: query_id,
            description: description.clone(),
            outcomes: outcomes.clone(),
            // Metadata fields
            title: metadata.title,
            category: metadata.category,
            context: metadata.context,
            resolution_criteria: metadata.resolution_criteria,
            source_urls: metadata.source_urls,
            tags: metadata.tags,
            metadata_url: metadata.metadata_url,
            external_id: metadata.external_id,
            // Source DApp tracking
            source_app_id,
            source_app_name,
            source_app_logo,
            source_app_category,
            query_source,
            // Core fields
            strategy,
            min_votes: min_votes_actual,
            reward_amount: Amount::ZERO, // Rewards come from inflation in hybrid model
            creator: caller_chain,
            created_at: current_time,
            deadline,
            commit_phase_end,
            reveal_phase_end,
            phase: state::VotingPhase::Commit,
            status: state::QueryStatus::Active,
            result: None,
            resolved_at: None,
            commits: std::collections::BTreeMap::new(),
            votes: std::collections::BTreeMap::new(),
            selected_voters,
            max_voters: 100,
            callback_chain: Some(callback_chain),
            callback_data: Some(callback_data.clone()),
            // Hybrid model fields
            bond_amount,
            priority_fee,
            bond_refunded: false,
            dispute: None,
            dispute_window_end: Some(dispute_window_end),
        };
        
        // Store query
        if let Err(e) = self.state.queries.insert(&query_id, query) {
            return OperationResponse::error(format!("Failed to store query: {}", e));
        }
        
        // Update query counter for inflation calculation
        let mut params = self.state.get_parameters().await;
        params.queries_this_year += 1;
        self.state.parameters.set(params.clone());
        
        // Lock bond
        if let Err(e) = self.state.lock_bond(
            query_id,
            caller_chain,
            bond_amount,
            priority_fee,
            current_time,
        ).await {
            return OperationResponse::error(format!("Failed to lock bond: {}", e));
        }
        
        // Store callback info
        let callback = state::QueryCallback {
            callback_chain,
            callback_app: Some(callback_app),
            callback_data,
        };
        if let Err(e) = self.state.query_callbacks.insert(&query_id, callback) {
            return OperationResponse::error(format!("Failed to store callback: {}", e));
        }
        
        // Add to active queries
        let mut active = self.state.get_active_queries().await;
        active.push(query_id);
        self.state.active_queries.set(active);
        
        // Update stats
        let total = *self.state.total_queries_created.get();
        self.state.total_queries_created.set(total + 1);
        
        // Emit event
        self.emit_oracle_event(OracleEvent::QueryWithBondCreated {
            query_id,
            creator: caller_chain,
            bond_amount,
            priority_fee,
            description: description.clone(),
        });
        
        eprintln!(
            "✅ Query {} created with bond {} and priority fee {}",
            query_id, bond_amount, priority_fee
        );
        
        OperationResponse::success(format!(
            "Query {} created with bond {}. Bond refundable after dispute window.",
            query_id, bond_amount
        ))
    }
    
    /// Claim bond refund after dispute window expires
    async fn claim_bond_refund(
        &mut self,
        query_id: u64,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        let caller_chain = self.runtime.chain_id();
        let current_time = self.runtime.system_time();
        
        // Get query
        let query = match self.state.get_query(query_id).await {
            Some(q) => q,
            None => return OperationResponse::error(format!("Query {} not found", query_id)),
        };
        
        // Check query is resolved
        if query.status != state::QueryStatus::Resolved {
            return OperationResponse::error("Query not yet resolved");
        }
        
        // Check caller is the creator
        if query.creator != caller_chain {
            return OperationResponse::error("Only query creator can claim bond refund");
        }
        
        // Check dispute window has passed
        if let Some(window_end) = query.dispute_window_end {
            if current_time < window_end {
                return OperationResponse::error(format!(
                    "Dispute window still open until {:?}",
                    window_end
                ));
            }
        }
        
        // Check no active dispute
        if query.dispute.is_some() {
            return OperationResponse::error("Query has an active dispute");
        }
        
        // Check bond not already refunded
        if query.bond_refunded {
            return OperationResponse::error("Bond already refunded");
        }
        
        // Refund bond
        let refund_amount = match self.state.refund_bond(query_id, current_time).await {
            Ok(amount) => amount,
            Err(e) => return OperationResponse::error(format!("Failed to refund bond: {}", e)),
        };
        
        // Update query
        let mut updated_query = query.clone();
        updated_query.bond_refunded = true;
        if let Err(e) = self.state.queries.insert(&query_id, updated_query) {
            return OperationResponse::error(format!("Failed to update query: {}", e));
        }
        
        // Emit event
        self.emit_oracle_event(OracleEvent::BondRefunded {
            query_id,
            depositor: caller_chain,
            amount: refund_amount,
        });
        
        eprintln!("💰 Bond {} refunded for query {}", refund_amount, query_id);
        
        OperationResponse::success(format!(
            "Bond {} refunded successfully",
            refund_amount
        ))
    }
    
    /// Raise a dispute against a query resolution
    async fn raise_dispute(
        &mut self,
        query_id: u64,
        disputed_outcome: String,
        dispute_bond: Amount,
        reason: String,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        let caller_chain = self.runtime.chain_id();
        let current_time = self.runtime.system_time();
        
        // Get query
        let query = match self.state.get_query(query_id).await {
            Some(q) => q,
            None => return OperationResponse::error(format!("Query {} not found", query_id)),
        };
        
        // Check query is resolved
        if query.status != state::QueryStatus::Resolved {
            return OperationResponse::error("Query not yet resolved");
        }
        
        // Check we're in dispute window
        if !self.state.is_in_dispute_window(&query, current_time) {
            return OperationResponse::error("Dispute window has expired");
        }
        
        // Check no existing dispute
        if query.dispute.is_some() {
            return OperationResponse::error("Query already has a dispute");
        }
        
        // Check dispute bond matches original bond
        if dispute_bond < query.bond_amount {
            return OperationResponse::error(format!(
                "Dispute bond {} must be at least equal to original bond {}",
                dispute_bond, query.bond_amount
            ));
        }
        
        // Validate disputed outcome
        if !query.outcomes.contains(&disputed_outcome) {
            return OperationResponse::error(format!(
                "Invalid disputed outcome. Must be one of: {:?}",
                query.outcomes
            ));
        }
        
        // Check disputed outcome is different from result
        if Some(disputed_outcome.clone()) == query.result {
            return OperationResponse::error("Disputed outcome is same as current result");
        }
        
        // Create dispute
        let dispute = state::Dispute {
            disputer: caller_chain,
            dispute_bond,
            disputed_outcome: disputed_outcome.clone(),
            reason: reason.clone(),
            disputed_at: current_time,
            status: state::DisputeStatus::Pending,
            resolution: None,
        };
        
        // Store dispute
        if let Err(e) = self.state.store_dispute(query_id, dispute.clone()).await {
            return OperationResponse::error(format!("Failed to store dispute: {}", e));
        }
        
        // Update query with dispute
        let mut updated_query = query.clone();
        updated_query.dispute = Some(dispute);
        if let Err(e) = self.state.queries.insert(&query_id, updated_query) {
            return OperationResponse::error(format!("Failed to update query: {}", e));
        }
        
        // Emit event
        self.emit_oracle_event(OracleEvent::DisputeRaised {
            query_id,
            disputer: caller_chain,
            dispute_bond,
            disputed_outcome: disputed_outcome.clone(),
            reason: reason.clone(),
        });
        
        eprintln!(
            "⚠️ Dispute raised for query {}: {} claims outcome should be {}",
            query_id, caller_chain, disputed_outcome
        );
        
        OperationResponse::success(format!(
            "Dispute raised for query {}. Second voting round will determine outcome.",
            query_id
        ))
    }
    
    /// Resolve a dispute (admin or second voting round)
    async fn resolve_dispute(
        &mut self,
        query_id: u64,
        final_outcome: String,
        winner: String,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        let caller_chain = self.runtime.chain_id();
        let current_time = self.runtime.system_time();
        
        // Verify caller is admin (for now, only admin can resolve disputes)
        if !self.state.is_admin(&caller_chain).await {
            return OperationResponse::error("Only admin can resolve disputes");
        }
        
        // Get query
        let mut query = match self.state.get_query(query_id).await {
            Some(q) => q,
            None => return OperationResponse::error(format!("Query {} not found", query_id)),
        };
        
        // Get dispute
        let dispute = match &query.dispute {
            Some(d) => d.clone(),
            None => return OperationResponse::error("No dispute found for this query"),
        };
        
        // Validate winner
        if winner != "original" && winner != "disputer" {
            return OperationResponse::error("Winner must be 'original' or 'disputer'");
        }
        
        // Calculate bond transfer
        let total_bond = query.bond_amount.saturating_add(dispute.dispute_bond);
        let bond_winner: ChainId;
        let bond_loser: ChainId;
        let new_status: state::DisputeStatus;
        
        if winner == "original" {
            // Original creator wins - disputer loses bond
            bond_winner = query.creator;
            bond_loser = dispute.disputer;
            new_status = state::DisputeStatus::RejectedOriginalWins;
            
            // Slash disputer's bond (it goes to original creator)
            // In reality, we'd transfer tokens here
            eprintln!("Dispute rejected: {} gets {} from disputer", bond_winner, dispute.dispute_bond);
        } else {
            // Disputer wins - original creator loses bond
            bond_winner = dispute.disputer;
            bond_loser = query.creator;
            new_status = state::DisputeStatus::AcceptedDisputerWins;
            
            // Slash original bond
            if let Err(e) = self.state.slash_bond(query_id).await {
                eprintln!("Warning: Failed to slash bond: {}", e);
            }
            
            // Update query result
            query.result = Some(final_outcome.clone());
            
            eprintln!("Dispute accepted: {} gets {} from original creator", bond_winner, query.bond_amount);
        }
        
        // Create dispute resolution
        let resolution = state::DisputeResolution {
            final_outcome: final_outcome.clone(),
            winner: winner.clone(),
            bond_transferred: if winner == "original" { dispute.dispute_bond } else { query.bond_amount },
            resolved_at: current_time,
        };
        
        // Update dispute in query
        let mut updated_dispute = dispute.clone();
        updated_dispute.status = new_status;
        updated_dispute.resolution = Some(resolution.clone());
        query.dispute = Some(updated_dispute);
        
        // Store updated query
        if let Err(e) = self.state.queries.insert(&query_id, query) {
            return OperationResponse::error(format!("Failed to update query: {}", e));
        }
        
        // Emit event
        self.emit_oracle_event(OracleEvent::DisputeResolved {
            query_id,
            winner: winner.clone(),
            final_outcome: final_outcome.clone(),
            bond_transferred: resolution.bond_transferred,
        });
        
        eprintln!(
            "✅ Dispute resolved for query {}: {} wins, final outcome = {}",
            query_id, winner, final_outcome
        );
        
        OperationResponse::success(format!(
            "Dispute resolved: {} wins. Final outcome: {}",
            winner, final_outcome
        ))
    }
    
    /// Mint inflation tokens to the inflation pool (admin only)
    async fn mint_inflation(
        &mut self,
        amount: Amount,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        let caller_chain = self.runtime.chain_id();
        
        // Verify caller is admin
        if !self.state.is_admin(&caller_chain).await {
            return OperationResponse::error("Only admin can mint inflation");
        }
        
        // Add to inflation pool
        self.state.add_to_inflation_pool(amount).await;
        
        let total_pool = *self.state.inflation_pool.get();
        
        // Emit event
        self.emit_oracle_event(OracleEvent::InflationMinted {
            amount,
            total_pool,
            minted_by: caller_chain,
        });
        
        eprintln!("💵 Inflation minted: {} (total pool: {})", amount, total_pool);
        
        OperationResponse::success(format!(
            "Minted {} to inflation pool. Total pool: {}",
            amount, total_pool
        ))
    }
    
    /// Update hybrid model parameters (admin only)
    async fn update_hybrid_parameters(
        &mut self,
        min_bond: Option<Amount>,
        inflation_rate_bps: Option<u32>,
        inflation_reward_per_query: Option<Amount>,
        dispute_window_secs: Option<u64>,
        dispute_bond_percentage: Option<u32>,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        let caller_chain = self.runtime.chain_id();
        
        // Verify caller is admin
        if !self.state.is_admin(&caller_chain).await {
            return OperationResponse::error("Only admin can update hybrid parameters");
        }
        
        let mut params = self.state.get_parameters().await;
        
        if let Some(bond) = min_bond {
            params.min_bond = bond;
        }
        if let Some(rate) = inflation_rate_bps {
            params.inflation_rate_bps = rate;
        }
        if let Some(reward) = inflation_reward_per_query {
            params.inflation_reward_per_query = reward;
        }
        if let Some(window) = dispute_window_secs {
            params.dispute_window_secs = window;
        }
        if let Some(percentage) = dispute_bond_percentage {
            params.dispute_bond_percentage = percentage;
        }
        
        self.state.parameters.set(params.clone());
        
        eprintln!(
            "🔧 Hybrid parameters updated: min_bond={}, inflation_rate={}bps, reward_per_query={}",
            params.min_bond, params.inflation_rate_bps, params.inflation_reward_per_query
        );
        
        OperationResponse::success("Hybrid model parameters updated successfully")
    }
    
    /// Set protocol launch timestamp (admin only)
    async fn set_protocol_launch_timestamp(
        &mut self,
        timestamp: Timestamp,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        let caller_chain = self.runtime.chain_id();
        
        // Verify caller is admin
        if !self.state.is_admin(&caller_chain).await {
            return OperationResponse::error("Only admin can set protocol launch timestamp");
        }
        
        let mut params = self.state.get_parameters().await;
        params.protocol_launch_timestamp = Some(timestamp);
        self.state.parameters.set(params.clone());
        
        eprintln!("🔧 Protocol launch timestamp set to: {:?}", timestamp);
        
        OperationResponse::success(format!(
            "Protocol launch timestamp set to {:?}",
            timestamp
        ))
    }
    
    /// Update inflation control parameters (admin only)
    async fn update_inflation_control(
        &mut self,
        total_supply: Option<Amount>,
        expected_queries_per_year: Option<u64>,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        let caller_chain = self.runtime.chain_id();
        
        // Verify caller is admin
        if !self.state.is_admin(&caller_chain).await {
            return OperationResponse::error("Only admin can update inflation control");
        }
        
        let mut params = self.state.get_parameters().await;
        
        if let Some(supply) = total_supply {
            params.total_supply = supply;
        }
        
        if let Some(queries) = expected_queries_per_year {
            params.expected_queries_per_year = queries;
        }
        
        self.state.parameters.set(params.clone());
        
        eprintln!(
            "🔧 Inflation control updated: total_supply={}, expected_queries_per_year={}",
            params.total_supply, params.expected_queries_per_year
        );
        
        OperationResponse::success("Inflation control parameters updated successfully")
    }
    
    /// Reset yearly counters (admin only)
    async fn reset_yearly_counters(&mut self) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::OperationResponse;
        
        let caller_chain = self.runtime.chain_id();
        
        // Verify caller is admin
        if !self.state.is_admin(&caller_chain).await {
            return OperationResponse::error("Only admin can reset yearly counters");
        }
        
        let current_timestamp = self.runtime.system_time();
        let mut params = self.state.get_parameters().await;
        
        // Calculate current year
        let current_year = self.state.calculate_current_year(current_timestamp);
        let last_reset_year = params.last_reset_year.unwrap_or(0);
        
        if current_year <= last_reset_year {
            return OperationResponse::error(format!(
                "Already reset for year {}. Current year: {}",
                last_reset_year, current_year
            ));
        }
        
        // Reset counters
        params.queries_this_year = 0;
        params.last_reset_year = Some(current_year);
        self.state.parameters.set(params.clone());
        
        // Reset distributed inflation (fresh start each year)
        self.state.total_inflation_distributed.set(Amount::ZERO);
        
        eprintln!(
            "🔄 Yearly counters reset for year {} (was year {})",
            current_year, last_reset_year
        );
        
        OperationResponse::success(format!(
            "Yearly counters reset for year {}",
            current_year
        ))
    }
}
