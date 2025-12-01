// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

#![cfg_attr(target_arch="wasm32", no_main)]

mod state;

use linera_sdk::{
    linera_base_types::{Amount, WithContractAbi},
    views::{View, RootView},
    Contract, ContractRuntime,
};
use state::{OracleRegistryV2, ProtocolParameters};

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
    type InstantiationArgument = ();
    type Parameters = ();
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = OracleRegistryV2::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        
        OracleRegistryV2Contract { state, runtime }
    }

    async fn instantiate(&mut self, _argument: ()) {
        // The chain that instantiates the contract becomes the admin
        let admin_chain = self.runtime.chain_id();
        
        // Use default parameters
        let params = ProtocolParameters::default();
        self.state.initialize(params, admin_chain).await;
        
        // Initialize test voters for development/testing
        OracleRegistryV2Contract::initialize_test_voters_internal(&mut self.state).await;
        
        // Save state after initialization
        self.state.save().await.expect("Failed to save initial state");
    }
    
    async fn store(mut self) {
        // CRITICAL: Must explicitly save state!
        // Without this, all state changes are lost after operation completes
        self.state.save().await.expect("Failed to save state");
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
        }
    }

    async fn execute_message(&mut self, message: Self::Message) {
        use oracle_registry_v2::Message;
        
        // Handle cross-chain messages for account-based voting
        // Authentication is automatic - Linera verifies the message sender
        let response = match message {
            Message::RegisterVoter { stake, name, metadata_url } => {
                self.register_voter(stake, name, metadata_url).await
            }
            
            Message::UpdateStake { additional_stake } => {
                self.update_stake(additional_stake).await
            }
            
            Message::WithdrawStake { amount } => {
                self.withdraw_stake(amount).await
            }
            
            Message::DeregisterVoter => {
                self.deregister_voter().await
            }
            
            Message::SubmitVote { query_id, value, confidence } => {
                self.submit_vote(query_id, value, confidence).await
            }
            
            Message::CommitVote { query_id, commit_hash } => {
                self.commit_vote(query_id, commit_hash).await
            }
            
            Message::RevealVote { query_id, value, salt, confidence } => {
                self.reveal_vote(query_id, value, salt, confidence).await
            }
            
            Message::ClaimRewards => {
                self.claim_rewards().await
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
        let current_value: u128 = current_stake.into();
        let locked_value: u128 = locked_stake.into();
        let available_value = current_value.saturating_sub(locked_value);
        let available_stake = Amount::from_tokens(available_value);
        
        if withdrawal_amount > available_stake {
            return Err(format!(
                "Insufficient available stake: have {} (total: {}, locked: {}), requested {}",
                available_stake, current_stake, locked_stake, withdrawal_amount
            ));
        }
        
        // Check remaining stake meets minimum (unless withdrawing all available)
        let withdrawal_value: u128 = withdrawal_amount.into();
        let remaining_value = current_value.saturating_sub(withdrawal_value);
        let remaining = Amount::from_tokens(remaining_value);
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
    async fn register_voter_for(
        &mut self,
        voter_address: String,
        stake: Amount,
        name: Option<String>,
        metadata_url: Option<String>,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{OperationResponse, ResponseData};
        use state::VoterInfo;
        use linera_sdk::linera_base_types::ChainId;
        
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
            reputation: 50,
            total_votes: 0,
            correct_votes: 0,
            registered_at: self.runtime.system_time(),
            is_active: true,
            name: name.clone(),
            metadata_url: metadata_url.clone(),
        };
        
        // Store voter
        self.state.voters.insert(&voter_chain, voter_info).expect("Failed to insert voter");
        
        // Update totals
        let current_stake = *self.state.total_stake.get();
        let current_value: u128 = current_stake.into();
        let stake_value: u128 = stake.into();
        self.state.total_stake.set(Amount::from_tokens(current_value + stake_value));
        
        let current_count = *self.state.voter_count.get();
        self.state.voter_count.set(current_count + 1);
        
        OperationResponse::success_with_data(
            "Voter registered successfully (admin operation)",
            ResponseData {
                voter_address: Some(voter_chain.to_string()),
                query_id: None,
                vote_count: None,
                rewards_claimed: None,
            }
        )
    }
    
    /// Register a new voter using chain ID (CORRECT SOLUTION - Microcard Pattern!)
    /// Uses runtime.chain_id() to identify the voter - no address parsing needed!
    async fn register_voter_chainid(
        &mut self,
        stake: Amount,
        name: Option<String>,
        metadata_url: Option<String>,
    ) -> oracle_registry_v2::OperationResponse {
        use oracle_registry_v2::{OperationResponse, ResponseData};
        use state::VoterInfo;
        
        // Get voter's chain ID - this ALWAYS works! (Microcard pattern)
        let voter_chain = self.runtime.chain_id();
        
        // Validate registration parameters
        if let Err(e) = self.validate_registration_params(stake, &name, &metadata_url) {
            return OperationResponse::error(e);
        }
        
        // Check if already registered
        if let Ok(Some(_)) = self.state.voters.get(&voter_chain).await {
            return OperationResponse::error("Chain already registered as voter");
        }
        
        // Check minimum stake
        let params = self.state.get_parameters().await;
        if let Err(e) = self.validate_minimum_stake(stake, params.min_stake) {
            return OperationResponse::error(e);
        }
        
        // Create voter info with chain ID
        let voter_info = VoterInfo {
            chain_id: voter_chain,  // ← Use chain ID as identifier!
            stake,
            locked_stake: Amount::ZERO,
            reputation: 50, // Default reputation for new voters
            total_votes: 0,
            correct_votes: 0,
            registered_at: self.runtime.system_time(),
            is_active: true,
            name,
            metadata_url,
        };
        
        // Store voter by chain ID
        self.state.voters.insert(&voter_chain, voter_info).expect("Failed to insert voter");
        
        // Update totals
        let current_stake = *self.state.total_stake.get();
        let current_value: u128 = current_stake.into();
        let stake_value: u128 = stake.into();
        self.state.total_stake.set(Amount::from_tokens(current_value + stake_value));
        
        let current_count = *self.state.voter_count.get();
        self.state.voter_count.set(current_count + 1);
        
        OperationResponse::success_with_data(
            "Voter registered successfully using chain ID",
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
        
        // Update totals
        let current_stake = *self.state.total_stake.get();
        let current_value: u128 = current_stake.into();
        let stake_value: u128 = stake.into();
        self.state.total_stake.set(Amount::from_tokens(current_value + stake_value));
        
        let current_count = *self.state.voter_count.get();
        self.state.voter_count.set(current_count + 1);
        
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
    
    /// Register a new voter (for cross-chain messages with authentication)
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
        
        // Transfer stake to contract
        // Note: In production, implement proper token transfer
        
        // Create voter info with default reputation
        let voter_info = VoterInfo {
            chain_id: voter_chain,
            stake,
            locked_stake: Amount::ZERO,
            reputation: 50, // Default reputation for new voters (neutral starting point)
            total_votes: 0,
            correct_votes: 0,
            registered_at: self.runtime.system_time(),
            is_active: true,
            name,
            metadata_url,
        };
        
        // Calculate initial reputation (should be 50 for new voters)
        let initial_reputation = self.state.calculate_reputation(&voter_info);
        
        // Store voter
        self.state.voters.insert(&voter_chain, voter_info).expect("Failed to insert voter");
        
        // Update totals
        let current_stake = *self.state.total_stake.get();
        let current_value: u128 = current_stake.into();
        let stake_value: u128 = stake.into();
        self.state.total_stake.set(Amount::from_tokens(current_value + stake_value));
        
        let current_count = *self.state.voter_count.get();
        self.state.voter_count.set(current_count + 1);
        
        OperationResponse::success_with_data(
            "Voter registered successfully",
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
        
        // Update stake
        let stake_value: u128 = voter_info.stake.into();
        let additional_value: u128 = additional_stake.into();
        voter_info.stake = Amount::from_tokens(stake_value + additional_value);
        self.state.voters.insert(&voter_chain, voter_info).expect("Failed to update voter");
        
        // Update total
        let current_stake = *self.state.total_stake.get();
        let current_value: u128 = current_stake.into();
        self.state.total_stake.set(Amount::from_tokens(current_value + additional_value));
        
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
        
        // Update stake
        let stake_value: u128 = voter_info.stake.into();
        let amount_value: u128 = amount.into();
        voter_info.stake = Amount::from_tokens(stake_value.saturating_sub(amount_value));
        self.state.voters.insert(&voter_chain, voter_info).expect("Failed to update voter");
        
        // Update total
        let current_stake = *self.state.total_stake.get();
        let current_value: u128 = current_stake.into();
        self.state.total_stake.set(Amount::from_tokens(current_value.saturating_sub(amount_value)));
        
        // Transfer stake back
        // Note: Implement proper token transfer
        
        OperationResponse::success("Stake withdrawn successfully")
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
        
        // Update totals
        let current_stake = *self.state.total_stake.get();
        let current_value: u128 = current_stake.into();
        let stake_value: u128 = stake.into();
        self.state.total_stake.set(Amount::from_tokens(current_value.saturating_sub(stake_value)));
        
        let current_count = *self.state.voter_count.get();
        self.state.voter_count.set(current_count - 1);
        
        // Transfer stake back
        // Note: Implement proper token transfer
        
        OperationResponse::success("Voter deregistered successfully")
    }
}

// ==================== HELPER FUNCTIONS ====================

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
        
        // Calculate commit/reveal phases (1 hour each for cross-app queries)
        let current_time = self.runtime.system_time();
        let commit_duration = linera_sdk::linera_base_types::TimeDelta::from_micros(1 * 60 * 60 * 1_000_000u64);
        let reveal_duration = linera_sdk::linera_base_types::TimeDelta::from_micros(1 * 60 * 60 * 1_000_000u64);
        
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
        
        // Create query with callback information
        let query = Query {
            id: query_id,
            description,
            outcomes,
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
        if !query.selected_voters.contains(&voter_chain) {
            return OperationResponse::error(format!(
                "You are not selected to vote on this query. \
                Only {} selected voters (by stake × reputation power) can participate. \
                Increase your stake or reputation to improve selection chances.",
                query.selected_voters.len()
            ));
        }
        
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
        
        // Create vote
        let vote = Vote {
            voter: voter_chain,
            value: value.clone(),
            timestamp: self.runtime.system_time(),
            salt: None, // Direct voting (no commit/reveal)
            confidence,
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
        
        OperationResponse::success(format!("Vote submitted successfully, {} stake locked", stake_to_lock))
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
        if !query.selected_voters.contains(&voter_chain) {
            return OperationResponse::error(format!(
                "You are not selected to vote on this query"
            ));
        }
        
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
        
        // Create commit
        let commit = VoteCommit {
            voter: voter_chain,
            commit_hash: commit_hash.clone(),
            committed_at: current_time,
            revealed: false,
        };
        
        // Store commit and get commit_phase_end before moving query
        let commit_phase_end = query.commit_phase_end;
        query.commits.insert(voter_chain, commit);
        self.state.queries.insert(&query_id, query).expect("Failed to update query");
        
        // Update voter stats - increment total_votes on commit
        let mut updated_voter_info = self.state.get_voter(&voter_chain).await.expect("Voter should exist");
        updated_voter_info.total_votes += 1;
        self.state.voters.insert(&voter_chain, updated_voter_info).expect("Failed to update voter");
        
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
        let _voter_info = match self.validate_voter_registered(&voter_chain).await {
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
        
        // Create vote
        let vote = Vote {
            voter: voter_chain,
            value: value.clone(),
            timestamp: current_time,
            salt: Some(salt),
            confidence,
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
        query: &state::Query,
        params: &state::ProtocolParameters,
    ) -> Amount {
        // Lock a percentage of the voter's stake based on the query reward
        // This ensures voters have skin in the game proportional to potential rewards
        
        // For now, lock minimum stake amount or 10% of voter's available stake, whichever is less
        let stake_value: u128 = voter_info.stake.into();
        let locked_value: u128 = voter_info.locked_stake.into();
        let available_value = stake_value.saturating_sub(locked_value);
        let available_stake = Amount::from_tokens(available_value);
        let ten_percent = Amount::from_tokens(available_value / 10);
        
        if ten_percent < params.min_stake {
            params.min_stake.min(available_stake)
        } else {
            ten_percent
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
        
        // Unlock stake for all voters who participated
        for (voter, _vote) in &query.votes {
            if let Some(voter_info) = self.state.get_voter(voter).await {
                let params = self.state.get_parameters().await;
                let locked_amount = self.calculate_stake_to_lock(&voter_info, &query, &params);
                
                // Unlock the stake
                if let Err(e) = self.state.unlock_stake(voter, locked_amount).await {
                    eprintln!("Warning: Failed to unlock stake for voter {} on expired query {}: {}", 
                             voter, query_id, e);
                }
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
        let min_votes_required = params.min_votes_default;
        
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
        
        // Create query with callback information
        let query = state::Query {
            id: query_id,
            description: format!("Market #{}: {}", market_id, question),
            outcomes: outcomes.clone(),
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
        
        // Unlock stake for all voters who participated
        for (voter, _vote) in &query.votes {
            // Calculate how much was locked for this vote
            if let Some(voter_info) = self.state.get_voter(voter).await {
                let params = self.state.get_parameters().await;
                let locked_amount = self.calculate_stake_to_lock(&voter_info, &query, &params);
                
                if let Err(e) = self.state.unlock_stake(voter, locked_amount).await {
                    // Log error but continue - don't fail the entire resolution
                    eprintln!("Warning: Failed to unlock stake for voter {}: {}", voter, e);
                }
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
            let mut total_distributed = 0u128;
            for (voter, reward) in &reward_distribution {
                let reward_value: u128 = (*reward).into();
                total_distributed += reward_value;
                
                // Add to pending rewards
                let current_pending = self.state.get_pending_rewards(voter).await;
                let current_value: u128 = current_pending.into();
                let new_pending = Amount::from_tokens(current_value + reward_value);
                
                if let Err(e) = self.state.pending_rewards.insert(voter, new_pending) {
                    eprintln!("Warning: Failed to add pending rewards for voter {}: {}", voter, e);
                }
            }
            
            // Calculate protocol fee from total reward
            let protocol_fee = self.state.calculate_protocol_fee(reward_amount, &params);
            let fee_value: u128 = protocol_fee.into();
            
            // Update protocol treasury with collected fees
            let current_treasury = *self.state.protocol_treasury.get();
            let treasury_value: u128 = current_treasury.into();
            self.state.protocol_treasury.set(Amount::from_tokens(treasury_value + fee_value));
            
            // Update reward pool (add query reward, subtract distributed rewards)
            let current_pool = *self.state.reward_pool.get();
            let pool_value: u128 = current_pool.into();
            let reward_value: u128 = reward_amount.into();
            let new_pool = Amount::from_tokens(pool_value + reward_value - total_distributed);
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
                        let stake_value: u128 = updated_info.stake.into();
                        
                        // Ensure we don't slash more than available stake
                        let actual_slash = slash_value.min(stake_value);
                        let new_stake = stake_value.saturating_sub(actual_slash);
                        updated_info.stake = Amount::from_tokens(new_stake);
                        
                        // Check if voter should be deactivated due to insufficient stake
                        let should_deactivate = self.state.should_deactivate_after_slash(
                            &voter_info,
                            Amount::from_tokens(actual_slash),
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
                        total_slashed += actual_slash;
                        
                        // Add slashed amount to protocol treasury
                        let current_treasury = *self.state.protocol_treasury.get();
                        let treasury_value: u128 = current_treasury.into();
                        self.state.protocol_treasury.set(Amount::from_tokens(treasury_value + actual_slash));
                        
                        // Update total stake in the system
                        let current_total = *self.state.total_stake.get();
                        let total_value: u128 = current_total.into();
                        self.state.total_stake.set(Amount::from_tokens(total_value.saturating_sub(actual_slash)));
                        
                        // Log slashing event for transparency
                        eprintln!(
                            "Slashed voter {} for incorrect vote on query {}: {} tokens ({}% of stake)",
                            voter,
                            query_id,
                            Amount::from_tokens(actual_slash),
                            params.slash_percentage as f64 / 100.0
                        );
                    }
                }
            }
        }
        
        // Send callback to requesting chain if callback info exists
        if let (Some(callback_chain), Some(callback_data)) = 
            (query.callback_chain, query.callback_data.clone()) 
        {
            eprintln!(
                "📤 Sending QueryResolutionCallback to chain {}: query_id={}, result={}",
                callback_chain, query_id, result
            );
            
            // Create callback message with resolution result
            let callback_message = oracle_registry_v2::Message::QueryResolutionCallback {
                query_id,
                resolved_outcome: result.clone(),
                resolved_at: current_time,
                callback_data,
            };
            
            // Send callback to Market Chain with authentication
            self.runtime.prepare_message(callback_message)
                .with_authentication()
                .send_to(callback_chain);
            
            eprintln!("✅ Callback sent successfully to {}", callback_chain);
            // Note: send_to() doesn't return Result, it panics on error
            // The query is still resolved, callback delivery is guaranteed by Linera
        } else {
            eprintln!("ℹ️ No callback configured for query {}", query_id);
        }
        
        // Build detailed response message
        let mut response_msg = format!(
            "Query resolved with result: {} ({} correct, {} incorrect)",
            result, correct_voters, incorrect_voters
        );
        
        if total_slashed > 0 {
            response_msg.push_str(&format!(
                ". Slashed {} tokens from incorrect voters",
                Amount::from_tokens(total_slashed)
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
        
        let voter_chain = self.runtime.chain_id();
        
        // Validate voter is registered
        if let Err(e) = self.validate_voter_registered(&voter_chain).await {
            return OperationResponse::error(e);
        }
        
        // Get pending rewards
        let pending_rewards = self.state.get_pending_rewards(&voter_chain).await;
        
        // Check if there are any rewards to claim
        if pending_rewards == Amount::ZERO {
            return OperationResponse::error("No pending rewards to claim");
        }
        
        // Transfer rewards to voter
        // Note: In production, implement proper token transfer
        // For now, we'll just clear the pending rewards
        
        // Clear pending rewards
        if let Err(e) = self.state.pending_rewards.remove(&voter_chain) {
            return OperationResponse::error(format!("Failed to clear pending rewards: {}", e));
        }
        
        // Update total rewards distributed
        let total_distributed = *self.state.total_rewards_distributed.get();
        let total_value: u128 = total_distributed.into();
        let rewards_value: u128 = pending_rewards.into();
        let new_total = Amount::from_tokens(total_value + rewards_value);
        self.state.total_rewards_distributed.set(new_total);
        
        OperationResponse::success_with_data(
            format!("Successfully claimed {} rewards", pending_rewards),
            ResponseData {
                voter_address: Some(voter_chain.to_string()),
                query_id: None,
                vote_count: None,
                rewards_claimed: Some(pending_rewards.to_string()),
            }
        )
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
            let share_numerator = voter_power.saturating_mul(reward_pool_value);
            let reward_value = share_numerator / total_power;
            let reward = linera_sdk::linera_base_types::Amount::from_tokens(reward_value);
            
            // Add to pending rewards
            let current_pending = self.state.get_pending_rewards(&voter_chain).await;
            let current_value: u128 = current_pending.into();
            let new_pending = linera_sdk::linera_base_types::Amount::from_tokens(
                current_value + reward_value
            );
            
            self.state.pending_rewards
                .insert(&voter_chain, new_pending)
                .expect("Failed to update pending rewards");
        }
        
        // Update total rewards distributed
        let total_distributed = *self.state.total_rewards_distributed.get();
        let total_value: u128 = total_distributed.into();
        self.state.total_rewards_distributed.set(
            linera_sdk::linera_base_types::Amount::from_tokens(total_value + reward_pool_value)
        );
        
        Ok(())
    }
}
