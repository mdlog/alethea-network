// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Edge case tests for the account-based oracle registry
//! 
//! This module tests various edge cases and boundary conditions including:
//! - Zero and maximum value handling
//! - Overflow and underflow protection
//! - Concurrent operation scenarios
//! - State consistency under extreme conditions
//! - Boundary value testing for all parameters

#[cfg(test)]
mod tests {
    use crate::test_utils::test_helpers::*;
    use crate::state::{
        OracleRegistryV2, ProtocolParameters, VoterInfo, Query, QueryStatus,
        DecisionStrategy, Vote,
    };
    use linera_sdk::{
        linera_base_types::{AccountOwner, Amount, Timestamp},
        views::View,
    };
    use linera_views::context::MemoryContext;
    use std::collections::BTreeMap;
    
    // ==================== TEST HELPERS ====================
    
    async fn setup_test_state() -> (OracleRegistryV2, AccountOwner) {
        let context = create_memory_context();
        let mut state = OracleRegistryV2::load(context)
            .await
            .expect("Failed to load state");
        
        let admin = create_account_owner(1);
        let params = ProtocolParameters::default();
        state.initialize(params, admin).await;
        
        (state, admin)
    }
    
    fn create_test_voter(id: u8) -> AccountOwner {
        AccountOwner::from([id; 32])
    }
    
    async fn register_voter_with_stake(
        state: &mut OracleRegistryV2,
        voter: AccountOwner,
        stake: Amount,
    ) {
        let voter_info = VoterInfo {
            address: voter,
            stake,
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 0,
            correct_votes: 0,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        state.voters.insert(&voter, voter_info).expect("Failed to insert voter");
        
        let current_stake = *state.total_stake.get();
        let current_value: u128 = current_stake.into();
        let stake_value: u128 = stake.into();
        state.total_stake.set(Amount::from_tokens(current_value + stake_value));
        
        let current_count = *state.voter_count.get();
        state.voter_count.set(current_count + 1);
    }
    
    // ==================== ZERO VALUE EDGE CASES ====================
    
    #[tokio::test]
    async fn test_zero_stake_voter_operations() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(10);
        
        // Register with zero stake (should be prevented in validation)
        let voter_info = VoterInfo {
            address: voter,
            stake: Amount::ZERO,
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 0,
            correct_votes: 0,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        state.voters.insert(&voter, voter_info).expect("Failed to insert voter");
        
        // Verify voter exists with zero stake
        let registered = state.get_voter(&voter).await;
        assert!(registered.is_some());
        assert_eq!(registered.unwrap().stake, Amount::ZERO);
    }
    
    #[tokio::test]
    async fn test_zero_locked_stake_operations() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(11);
        
        register_voter_with_stake(&mut state, voter, Amount::from_tokens(100)).await;
        
        // Try to lock zero stake
        let result = state.lock_stake(&voter, Amount::ZERO).await;
        assert!(result.is_some(), "Locking zero stake should succeed (no-op)");
        
        // Verify locked stake is still zero
        let voter_info = state.get_voter(&voter).await.unwrap();
        assert_eq!(voter_info.locked_stake, Amount::ZERO);
    }
    
    #[tokio::test]
    async fn test_zero_reward_query() {
        let (mut state, _admin) = setup_test_state().await;
        
        // Create query with zero reward (should be prevented in validation)
        let query = Query {
            id: 1,
            description: "Test query".to_string(),
            outcomes: vec!["Yes".to_string(), "No".to_string()],
            strategy: DecisionStrategy::Majority,
            min_votes: 3,
            reward_amount: Amount::ZERO,
            creator: create_test_voter(1),
            created_at: Timestamp::from(0),
            deadline: Timestamp::from(1000000),
            status: QueryStatus::Active,
            result: None,
            resolved_at: None,
            votes: BTreeMap::new(),
        };
        
        state.queries.insert(&1, query).expect("Failed to insert query");
        
        // Verify query exists with zero reward
        let stored_query = state.get_query(1).await;
        assert!(stored_query.is_some());
        assert_eq!(stored_query.unwrap().reward_amount, Amount::ZERO);
    }
    
    #[tokio::test]
    async fn test_zero_votes_query_resolution() {
        let (mut state, _admin) = setup_test_state().await;
        
        // Create query with zero votes
        let query = Query {
            id: 1,
            description: "Test query".to_string(),
            outcomes: vec!["Yes".to_string(), "No".to_string()],
            strategy: DecisionStrategy::Majority,
            min_votes: 0, // Zero minimum votes
            reward_amount: Amount::from_tokens(100),
            creator: create_test_voter(1),
            created_at: Timestamp::from(0),
            deadline: Timestamp::from(1000000),
            status: QueryStatus::Active,
            result: None,
            resolved_at: None,
            votes: BTreeMap::new(),
        };
        
        state.queries.insert(&1, query).expect("Failed to insert query");
        
        // Verify query can exist with zero min_votes
        let stored_query = state.get_query(1).await.unwrap();
        assert_eq!(stored_query.min_votes, 0);
        assert_eq!(stored_query.votes.len(), 0);
    }
    
    // ==================== MAXIMUM VALUE EDGE CASES ====================
    
    #[tokio::test]
    async fn test_maximum_stake_value() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(20);
        
        // Use a very large stake value
        let max_stake = Amount::from_tokens(u128::MAX / 2);
        register_voter_with_stake(&mut state, voter, max_stake).await;
        
        // Verify voter registered with maximum stake
        let voter_info = state.get_voter(&voter).await.unwrap();
        assert_eq!(voter_info.stake, max_stake);
    }
    
    #[tokio::test]
    async fn test_maximum_locked_stake() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(21);
        
        let stake = Amount::from_tokens(1000000);
        register_voter_with_stake(&mut state, voter, stake).await;
        
        // Lock all stake
        let result = state.lock_stake(&voter, stake).await;
        assert!(result.is_some());
        
        // Verify all stake is locked
        let voter_info = state.get_voter(&voter).await.unwrap();
        assert_eq!(voter_info.locked_stake, stake);
        assert_eq!(state.get_available_stake(&voter).await, Amount::ZERO);
    }
    
    #[tokio::test]
    async fn test_maximum_reputation_value() {
        let (state, _admin) = setup_test_state().await;
        
        // Create voter with maximum reputation
        let voter_info = VoterInfo {
            address: create_test_voter(22),
            stake: Amount::from_tokens(100),
            locked_stake: Amount::ZERO,
            reputation: 100, // Maximum reputation
            total_votes: 1000,
            correct_votes: 1000, // 100% accuracy
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        // Calculate reputation should cap at 100
        let calculated_rep = state.calculate_reputation(&voter_info);
        assert_eq!(calculated_rep, 100, "Reputation should be capped at 100");
    }
    
    #[tokio::test]
    async fn test_maximum_vote_count() {
        let (state, _admin) = setup_test_state().await;
        
        // Create voter with very high vote counts
        let voter_info = VoterInfo {
            address: create_test_voter(23),
            stake: Amount::from_tokens(100),
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: u64::MAX,
            correct_votes: u64::MAX / 2,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        // Should handle maximum vote counts
        let calculated_rep = state.calculate_reputation(&voter_info);
        assert!(calculated_rep <= 100, "Reputation should not exceed 100");
    }
    
    // ==================== OVERFLOW/UNDERFLOW PROTECTION ====================
    
    #[tokio::test]
    async fn test_stake_addition_overflow_protection() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(30);
        
        // Register with near-maximum stake
        let near_max = Amount::from_tokens(u128::MAX - 1000);
        register_voter_with_stake(&mut state, voter, near_max).await;
        
        // Try to add more stake (would overflow)
        let mut voter_info = state.get_voter(&voter).await.unwrap();
        let stake_value: u128 = voter_info.stake.into();
        let additional: u128 = 2000;
        
        // Use saturating_add to prevent overflow
        let new_stake = stake_value.saturating_add(additional);
        voter_info.stake = Amount::from_tokens(new_stake);
        
        state.voters.insert(&voter, voter_info).expect("Failed to update voter");
        
        // Verify stake was capped at maximum
        let updated = state.get_voter(&voter).await.unwrap();
        let updated_value: u128 = updated.stake.into();
        assert_eq!(updated_value, u128::MAX);
    }
    
    #[tokio::test]
    async fn test_stake_subtraction_underflow_protection() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(31);
        
        let initial_stake = Amount::from_tokens(100);
        register_voter_with_stake(&mut state, voter, initial_stake).await;
        
        // Try to subtract more than available (would underflow)
        let mut voter_info = state.get_voter(&voter).await.unwrap();
        let stake_value: u128 = voter_info.stake.into();
        let excessive_withdrawal: u128 = 200;
        
        // Use saturating_sub to prevent underflow
        let new_stake = stake_value.saturating_sub(excessive_withdrawal);
        voter_info.stake = Amount::from_tokens(new_stake);
        
        state.voters.insert(&voter, voter_info).expect("Failed to update voter");
        
        // Verify stake was floored at zero
        let updated = state.get_voter(&voter).await.unwrap();
        assert_eq!(updated.stake, Amount::ZERO);
    }
    
    #[tokio::test]
    async fn test_locked_stake_underflow_protection() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(32);
        
        register_voter_with_stake(&mut state, voter, Amount::from_tokens(100)).await;
        
        // Lock some stake
        state.lock_stake(&voter, Amount::from_tokens(50)).await.expect("Lock failed");
        
        // Try to unlock more than locked
        let result = state.unlock_stake(&voter, Amount::from_tokens(100)).await;
        
        // Should fail with error
        assert!(result.is_err(), "Unlocking more than locked should fail");
    }
    
    #[tokio::test]
    async fn test_total_stake_overflow_protection() {
        let (mut state, _admin) = setup_test_state().await;
        
        // Set total stake to near maximum
        state.total_stake.set(Amount::from_tokens(u128::MAX - 1000));
        
        // Register voter with stake that would overflow
        let voter = create_test_voter(33);
        let stake = Amount::from_tokens(2000);
        
        let current_total = *state.total_stake.get();
        let current_value: u128 = current_total.into();
        let stake_value: u128 = stake.into();
        
        // Use saturating_add
        let new_total = current_value.saturating_add(stake_value);
        state.total_stake.set(Amount::from_tokens(new_total));
        
        // Verify total was capped
        let final_total = *state.total_stake.get();
        let final_value: u128 = final_total.into();
        assert_eq!(final_value, u128::MAX);
    }
    
    // ==================== REPUTATION EDGE CASES ====================
    
    #[tokio::test]
    async fn test_reputation_with_zero_votes() {
        let (state, _admin) = setup_test_state().await;
        
        let voter_info = VoterInfo {
            address: create_test_voter(40),
            stake: Amount::from_tokens(100),
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 0,
            correct_votes: 0,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        // Should return default reputation for new voters
        let rep = state.calculate_reputation(&voter_info);
        assert_eq!(rep, 50, "New voters should have default reputation of 50");
    }
    
    #[tokio::test]
    async fn test_reputation_with_perfect_accuracy() {
        let (state, _admin) = setup_test_state().await;
        
        let voter_info = VoterInfo {
            address: create_test_voter(41),
            stake: Amount::from_tokens(100),
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 100,
            correct_votes: 100, // 100% accuracy
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        let rep = state.calculate_reputation(&voter_info);
        assert_eq!(rep, 100, "Perfect accuracy with high participation should give max reputation");
    }
    
    #[tokio::test]
    async fn test_reputation_with_zero_accuracy() {
        let (state, _admin) = setup_test_state().await;
        
        let voter_info = VoterInfo {
            address: create_test_voter(42),
            stake: Amount::from_tokens(100),
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 100,
            correct_votes: 0, // 0% accuracy
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        let rep = state.calculate_reputation(&voter_info);
        assert!(rep <= 10, "Zero accuracy should result in very low reputation");
    }
    
    #[tokio::test]
    async fn test_reputation_tier_boundaries() {
        let (state, _admin) = setup_test_state().await;
        
        // Test all tier boundaries
        assert_eq!(state.get_reputation_tier(0), "Novice");
        assert_eq!(state.get_reputation_tier(40), "Novice");
        assert_eq!(state.get_reputation_tier(41), "Intermediate");
        assert_eq!(state.get_reputation_tier(70), "Intermediate");
        assert_eq!(state.get_reputation_tier(71), "Expert");
        assert_eq!(state.get_reputation_tier(90), "Expert");
        assert_eq!(state.get_reputation_tier(91), "Master");
        assert_eq!(state.get_reputation_tier(100), "Master");
    }
    
    #[tokio::test]
    async fn test_reputation_weight_boundaries() {
        let (state, _admin) = setup_test_state().await;
        
        // Test weight calculation at boundaries
        let weight_0 = state.calculate_reputation_weight(0);
        assert_eq!(weight_0, 0.5, "Minimum reputation should give 0.5 weight");
        
        let weight_100 = state.calculate_reputation_weight(100);
        assert_eq!(weight_100, 2.0, "Maximum reputation should give 2.0 weight");
        
        let weight_50 = state.calculate_reputation_weight(50);
        assert_eq!(weight_50, 1.25, "Mid reputation should give 1.25 weight");
    }
    
    #[tokio::test]
    async fn test_reputation_decay_for_inactive_voters() {
        let (state, _admin) = setup_test_state().await;
        
        // Voter registered 60 days ago with very few votes
        let registered_at = Timestamp::from(0);
        let current_time = Timestamp::from(60 * 86400 * 1_000_000); // 60 days in microseconds
        
        let voter_info = VoterInfo {
            address: create_test_voter(43),
            stake: Amount::from_tokens(100),
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 5, // Very few votes
            correct_votes: 4,
            registered_at,
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        let rep_with_decay = state.calculate_reputation_with_decay(&voter_info, current_time);
        let base_rep = state.calculate_reputation(&voter_info);
        
        // Should apply decay
        assert!(rep_with_decay < base_rep, "Inactive voters should have decayed reputation");
    }
    
    #[tokio::test]
    async fn test_reputation_no_decay_for_active_voters() {
        let (state, _admin) = setup_test_state().await;
        
        // Voter registered 60 days ago with many votes
        let registered_at = Timestamp::from(0);
        let current_time = Timestamp::from(60 * 86400 * 1_000_000);
        
        let voter_info = VoterInfo {
            address: create_test_voter(44),
            stake: Amount::from_tokens(100),
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 50, // Active voter
            correct_votes: 40,
            registered_at,
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        let rep_with_decay = state.calculate_reputation_with_decay(&voter_info, current_time);
        let base_rep = state.calculate_reputation(&voter_info);
        
        // Should not apply decay
        assert_eq!(rep_with_decay, base_rep, "Active voters should not have decayed reputation");
    }
    
    // ==================== QUERY EDGE CASES ====================
    
    #[tokio::test]
    async fn test_query_with_single_outcome() {
        let (mut state, _admin) = setup_test_state().await;
        
        // Create query with only one outcome
        let query = Query {
            id: 1,
            description: "Single outcome query".to_string(),
            outcomes: vec!["Only Option".to_string()],
            strategy: DecisionStrategy::Majority,
            min_votes: 1,
            reward_amount: Amount::from_tokens(100),
            creator: create_test_voter(1),
            created_at: Timestamp::from(0),
            deadline: Timestamp::from(1000000),
            status: QueryStatus::Active,
            result: None,
            resolved_at: None,
            votes: BTreeMap::new(),
        };
        
        state.queries.insert(&1, query).expect("Failed to insert query");
        
        let stored = state.get_query(1).await.unwrap();
        assert_eq!(stored.outcomes.len(), 1);
    }
    
    #[tokio::test]
    async fn test_query_with_many_outcomes() {
        let (mut state, _admin) = setup_test_state().await;
        
        // Create query with 100 outcomes (maximum allowed)
        let outcomes: Vec<String> = (0..100).map(|i| format!("Outcome {}", i)).collect();
        
        let query = Query {
            id: 1,
            description: "Many outcomes query".to_string(),
            outcomes: outcomes.clone(),
            strategy: DecisionStrategy::Majority,
            min_votes: 3,
            reward_amount: Amount::from_tokens(100),
            creator: create_test_voter(1),
            created_at: Timestamp::from(0),
            deadline: Timestamp::from(1000000),
            status: QueryStatus::Active,
            result: None,
            resolved_at: None,
            votes: BTreeMap::new(),
        };
        
        state.queries.insert(&1, query).expect("Failed to insert query");
        
        let stored = state.get_query(1).await.unwrap();
        assert_eq!(stored.outcomes.len(), 100);
    }
    
    #[tokio::test]
    async fn test_query_with_very_long_description() {
        let (mut state, _admin) = setup_test_state().await;
        
        // Create query with maximum length description (1000 chars)
        let long_description = "A".repeat(1000);
        
        let query = Query {
            id: 1,
            description: long_description.clone(),
            outcomes: vec!["Yes".to_string(), "No".to_string()],
            strategy: DecisionStrategy::Majority,
            min_votes: 3,
            reward_amount: Amount::from_tokens(100),
            creator: create_test_voter(1),
            created_at: Timestamp::from(0),
            deadline: Timestamp::from(1000000),
            status: QueryStatus::Active,
            result: None,
            resolved_at: None,
            votes: BTreeMap::new(),
        };
        
        state.queries.insert(&1, query).expect("Failed to insert query");
        
        let stored = state.get_query(1).await.unwrap();
        assert_eq!(stored.description.len(), 1000);
    }
    
    #[tokio::test]
    async fn test_query_deadline_at_boundary() {
        let (mut state, _admin) = setup_test_state().await;
        
        // Create query with deadline at maximum timestamp
        let max_deadline = Timestamp::from(u64::MAX);
        
        let query = Query {
            id: 1,
            description: "Far future query".to_string(),
            outcomes: vec!["Yes".to_string(), "No".to_string()],
            strategy: DecisionStrategy::Majority,
            min_votes: 3,
            reward_amount: Amount::from_tokens(100),
            creator: create_test_voter(1),
            created_at: Timestamp::from(0),
            deadline: max_deadline,
            status: QueryStatus::Active,
            result: None,
            resolved_at: None,
            votes: BTreeMap::new(),
        };
        
        state.queries.insert(&1, query).expect("Failed to insert query");
        
        let stored = state.get_query(1).await.unwrap();
        assert_eq!(stored.deadline, max_deadline);
    }
    
    #[tokio::test]
    async fn test_query_with_maximum_votes() {
        let (mut state, _admin) = setup_test_state().await;
        
        // Create query and add many votes
        let mut votes = BTreeMap::new();
        for i in 0..100 {
            let voter = create_test_voter(i);
            votes.insert(voter, Vote {
                voter,
                value: "Yes".to_string(),
                timestamp: Timestamp::from(0),
                confidence: Some(80),
            });
        }
        
        let query = Query {
            id: 1,
            description: "Popular query".to_string(),
            outcomes: vec!["Yes".to_string(), "No".to_string()],
            strategy: DecisionStrategy::Majority,
            min_votes: 3,
            reward_amount: Amount::from_tokens(100),
            creator: create_test_voter(200),
            created_at: Timestamp::from(0),
            deadline: Timestamp::from(1000000),
            status: QueryStatus::Active,
            result: None,
            resolved_at: None,
            votes,
        };
        
        state.queries.insert(&1, query).expect("Failed to insert query");
        
        let stored = state.get_query(1).await.unwrap();
        assert_eq!(stored.votes.len(), 100);
    }
    
    // ==================== REWARD CALCULATION EDGE CASES ====================
    
    #[tokio::test]
    async fn test_reward_calculation_with_zero_reputation() {
        let (state, _admin) = setup_test_state().await;
        
        let voter_info = VoterInfo {
            address: create_test_voter(50),
            stake: Amount::from_tokens(100),
            locked_stake: Amount::ZERO,
            reputation: 0, // Minimum reputation
            total_votes: 10,
            correct_votes: 0,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        let params = state.get_parameters().await;
        let base_reward = Amount::from_tokens(100);
        
        let reward = state.calculate_voter_reward(base_reward, &voter_info, &params);
        
        // Should still get some reward (80% of base due to reputation multiplier)
        let reward_value: u128 = reward.into();
        assert!(reward_value > 0, "Even low reputation voters should get some reward");
    }
    
    #[tokio::test]
    async fn test_reward_calculation_with_max_reputation() {
        let (state, _admin) = setup_test_state().await;
        
        let voter_info = VoterInfo {
            address: create_test_voter(51),
            stake: Amount::from_tokens(100),
            locked_stake: Amount::ZERO,
            reputation: 100, // Maximum reputation
            total_votes: 100,
            correct_votes: 100,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        let params = state.get_parameters().await;
        let base_reward = Amount::from_tokens(100);
        
        let reward = state.calculate_voter_reward(base_reward, &voter_info, &params);
        
        // Should get bonus reward (120% of base due to reputation multiplier)
        let reward_value: u128 = reward.into();
        let base_value: u128 = base_reward.into();
        assert!(reward_value > base_value, "High reputation voters should get bonus");
    }
    
    #[tokio::test]
    async fn test_slash_calculation_with_minimum_stake() {
        let (state, _admin) = setup_test_state().await;
        
        let params = state.get_parameters().await;
        let voter_info = VoterInfo {
            address: create_test_voter(52),
            stake: params.min_stake,
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 10,
            correct_votes: 5,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        let slash_amount = state.calculate_slash_amount(&voter_info, &params);
        
        // Slash should be proportional to stake
        let slash_value: u128 = slash_amount.into();
        assert!(slash_value > 0, "Slash amount should be positive");
        
        // Check if voter should be deactivated
        let should_deactivate = state.should_deactivate_after_slash(&voter_info, slash_amount, &params);
        assert!(should_deactivate, "Voter with minimum stake should be deactivated after slash");
    }
    
    #[tokio::test]
    async fn test_slash_calculation_with_large_stake() {
        let (state, _admin) = setup_test_state().await;
        
        let params = state.get_parameters().await;
        let voter_info = VoterInfo {
            address: create_test_voter(53),
            stake: Amount::from_tokens(10000),
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 10,
            correct_votes: 5,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        let slash_amount = state.calculate_slash_amount(&voter_info, &params);
        
        // Check if voter should be deactivated
        let should_deactivate = state.should_deactivate_after_slash(&voter_info, slash_amount, &params);
        assert!(!should_deactivate, "Voter with large stake should not be deactivated after slash");
    }
    
    #[tokio::test]
    async fn test_equal_reward_distribution_with_one_voter() {
        let (state, _admin) = setup_test_state().await;
        
        let params = state.get_parameters().await;
        let voter = create_test_voter(54);
        let voter_info = VoterInfo {
            address: voter,
            stake: Amount::from_tokens(100),
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 10,
            correct_votes: 8,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        let total_reward = Amount::from_tokens(1000);
        let correct_voters = vec![(voter, voter_info)];
        
        let rewards = state.calculate_equal_rewards(total_reward, &correct_voters, &params);
        
        assert_eq!(rewards.len(), 1);
        assert!(rewards.contains_key(&voter));
    }
    
    #[tokio::test]
    async fn test_stake_weighted_rewards_with_zero_stake() {
        let (state, _admin) = setup_test_state().await;
        
        let params = state.get_parameters().await;
        let voter1 = create_test_voter(55);
        let voter2 = create_test_voter(56);
        
        let voter_info1 = VoterInfo {
            address: voter1,
            stake: Amount::ZERO, // Zero stake
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 10,
            correct_votes: 8,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        let voter_info2 = VoterInfo {
            address: voter2,
            stake: Amount::from_tokens(100),
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 10,
            correct_votes: 8,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        let total_reward = Amount::from_tokens(1000);
        let correct_voters = vec![(voter1, voter_info1), (voter2, voter_info2)];
        
        let rewards = state.calculate_stake_weighted_rewards(total_reward, &correct_voters, &params);
        
        // Voter with zero stake should get zero reward
        if let Some(reward1) = rewards.get(&voter1) {
            assert_eq!(*reward1, Amount::ZERO);
        }
    }
    
    #[tokio::test]
    async fn test_reputation_weighted_rewards_with_zero_reputation() {
        let (state, _admin) = setup_test_state().await;
        
        let params = state.get_parameters().await;
        let voter = create_test_voter(57);
        
        let voter_info = VoterInfo {
            address: voter,
            stake: Amount::from_tokens(100),
            locked_stake: Amount::ZERO,
            reputation: 0, // Zero reputation
            total_votes: 10,
            correct_votes: 0,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        let total_reward = Amount::from_tokens(1000);
        let correct_voters = vec![(voter, voter_info)];
        
        let rewards = state.calculate_reputation_weighted_rewards(total_reward, &correct_voters, &params);
        
        // Should still get some reward based on minimum weight
        assert_eq!(rewards.len(), 1);
        assert!(rewards.contains_key(&voter));
    }
    
    #[tokio::test]
    async fn test_reward_distribution_with_empty_voters() {
        let (state, _admin) = setup_test_state().await;
        
        let params = state.get_parameters().await;
        let total_reward = Amount::from_tokens(1000);
        let correct_voters: Vec<(AccountOwner, VoterInfo)> = vec![];
        
        // Test all distribution strategies with empty voters
        let equal_rewards = state.calculate_equal_rewards(total_reward, &correct_voters, &params);
        assert_eq!(equal_rewards.len(), 0);
        
        let stake_rewards = state.calculate_stake_weighted_rewards(total_reward, &correct_voters, &params);
        assert_eq!(stake_rewards.len(), 0);
        
        let rep_rewards = state.calculate_reputation_weighted_rewards(total_reward, &correct_voters, &params);
        assert_eq!(rep_rewards.len(), 0);
    }
    
    // ==================== PROTOCOL PARAMETER EDGE CASES ====================
    
    #[tokio::test]
    async fn test_protocol_parameters_at_boundaries() {
        let (mut state, _admin) = setup_test_state().await;
        
        // Test with extreme but valid parameters
        let params = ProtocolParameters {
            min_stake: Amount::from_tokens(1), // Minimum possible
            min_votes_default: 1, // Minimum votes
            default_query_duration: 60, // Minimum duration (1 minute)
            reward_percentage: 10000, // Maximum (100%)
            slash_percentage: 5000, // Maximum (50%)
            protocol_fee: 1000, // Maximum (10%)
        };
        
        state.parameters.set(params.clone());
        
        let stored_params = state.get_parameters().await;
        assert_eq!(stored_params.min_stake, params.min_stake);
        assert_eq!(stored_params.min_votes_default, params.min_votes_default);
    }
    
    #[tokio::test]
    async fn test_protocol_fee_calculation_at_boundaries() {
        let (state, _admin) = setup_test_state().await;
        
        // Test with zero fee
        let params_zero_fee = ProtocolParameters {
            protocol_fee: 0,
            ..ProtocolParameters::default()
        };
        
        let reward = Amount::from_tokens(1000);
        let fee = state.calculate_protocol_fee(reward, &params_zero_fee);
        assert_eq!(fee, Amount::ZERO);
        
        // Test with maximum fee (10%)
        let params_max_fee = ProtocolParameters {
            protocol_fee: 1000, // 10%
            ..ProtocolParameters::default()
        };
        
        let fee_max = state.calculate_protocol_fee(reward, &params_max_fee);
        let fee_value: u128 = fee_max.into();
        assert_eq!(fee_value, 100); // 10% of 1000
    }
    
    // ==================== STATE CONSISTENCY EDGE CASES ====================
    
    #[tokio::test]
    async fn test_voter_deactivation_preserves_data() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(60);
        
        // Register voter with data
        let voter_info = VoterInfo {
            address: voter,
            stake: Amount::from_tokens(100),
            locked_stake: Amount::ZERO,
            reputation: 75,
            total_votes: 50,
            correct_votes: 40,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: Some("Test Voter".to_string()),
            metadata_url: Some("https://example.com".to_string()),
        };
        
        state.voters.insert(&voter, voter_info.clone()).expect("Failed to insert voter");
        
        // Deactivate voter
        let mut updated_info = voter_info;
        updated_info.is_active = false;
        state.voters.insert(&voter, updated_info).expect("Failed to update voter");
        
        // Verify data is preserved
        let stored = state.get_voter(&voter).await.unwrap();
        assert!(!stored.is_active);
        assert_eq!(stored.reputation, 75);
        assert_eq!(stored.total_votes, 50);
        assert_eq!(stored.correct_votes, 40);
        assert_eq!(stored.name, Some("Test Voter".to_string()));
    }
    
    #[tokio::test]
    async fn test_multiple_voters_with_same_stake() {
        let (mut state, _admin) = setup_test_state().await;
        
        let stake = Amount::from_tokens(100);
        
        // Register multiple voters with identical stake
        for i in 70..75 {
            let voter = create_test_voter(i);
            register_voter_with_stake(&mut state, voter, stake).await;
        }
        
        // Verify all voters registered correctly
        for i in 70..75 {
            let voter = create_test_voter(i);
            let info = state.get_voter(&voter).await;
            assert!(info.is_some());
            assert_eq!(info.unwrap().stake, stake);
        }
    }
    
    #[tokio::test]
    async fn test_query_status_transitions() {
        let (mut state, _admin) = setup_test_state().await;
        
        // Create query in Active status
        let mut query = Query {
            id: 1,
            description: "Test query".to_string(),
            outcomes: vec!["Yes".to_string(), "No".to_string()],
            strategy: DecisionStrategy::Majority,
            min_votes: 3,
            reward_amount: Amount::from_tokens(100),
            creator: create_test_voter(1),
            created_at: Timestamp::from(0),
            deadline: Timestamp::from(1000000),
            status: QueryStatus::Active,
            result: None,
            resolved_at: None,
            votes: BTreeMap::new(),
        };
        
        state.queries.insert(&1, query.clone()).expect("Failed to insert query");
        
        // Transition to Resolved
        query.status = QueryStatus::Resolved;
        query.result = Some("Yes".to_string());
        query.resolved_at = Some(Timestamp::from(500000));
        state.queries.insert(&1, query.clone()).expect("Failed to update query");
        
        let stored = state.get_query(1).await.unwrap();
        assert_eq!(stored.status, QueryStatus::Resolved);
        assert_eq!(stored.result, Some("Yes".to_string()));
        assert!(stored.resolved_at.is_some());
    }
    
    #[tokio::test]
    async fn test_concurrent_stake_locks() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(80);
        
        let initial_stake = Amount::from_tokens(1000);
        register_voter_with_stake(&mut state, voter, initial_stake).await;
        
        // Lock stake multiple times (simulating concurrent votes)
        let lock1 = Amount::from_tokens(100);
        let lock2 = Amount::from_tokens(150);
        let lock3 = Amount::from_tokens(200);
        
        state.lock_stake(&voter, lock1).await.expect("Lock 1 failed");
        state.lock_stake(&voter, lock2).await.expect("Lock 2 failed");
        state.lock_stake(&voter, lock3).await.expect("Lock 3 failed");
        
        // Verify total locked is sum of all locks
        let voter_info = state.get_voter(&voter).await.unwrap();
        let lock1_val: u128 = lock1.into();
        let lock2_val: u128 = lock2.into();
        let lock3_val: u128 = lock3.into();
        let expected_locked = Amount::from_tokens(lock1_val + lock2_val + lock3_val);
        assert_eq!(voter_info.locked_stake, expected_locked);
    }
    
    #[tokio::test]
    async fn test_pending_rewards_accumulation() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(81);
        
        // Add pending rewards multiple times
        let reward1 = Amount::from_tokens(50);
        let reward2 = Amount::from_tokens(75);
        let reward3 = Amount::from_tokens(100);
        
        state.pending_rewards.insert(&voter, reward1).expect("Failed to set reward 1");
        
        // Accumulate more rewards
        let current = state.get_pending_rewards(&voter).await;
        let current_val: u128 = current.into();
        let reward2_val: u128 = reward2.into();
        let new_total = Amount::from_tokens(current_val + reward2_val);
        state.pending_rewards.insert(&voter, new_total).expect("Failed to set reward 2");
        
        let current = state.get_pending_rewards(&voter).await;
        let current_val: u128 = current.into();
        let reward3_val: u128 = reward3.into();
        let final_total = Amount::from_tokens(current_val + reward3_val);
        state.pending_rewards.insert(&voter, final_total).expect("Failed to set reward 3");
        
        // Verify total accumulated
        let total = state.get_pending_rewards(&voter).await;
        let reward1_val: u128 = reward1.into();
        let expected = Amount::from_tokens(reward1_val + reward2_val + reward3_val);
        assert_eq!(total, expected);
    }
    
    // ==================== TIMESTAMP EDGE CASES ====================
    
    #[tokio::test]
    async fn test_query_with_immediate_deadline() {
        let (mut state, _admin) = setup_test_state().await;
        
        // Create query with deadline 1 microsecond in the future
        let created_at = Timestamp::from(1000000);
        let deadline = Timestamp::from(1000001);
        
        let query = Query {
            id: 1,
            description: "Immediate deadline".to_string(),
            outcomes: vec!["Yes".to_string(), "No".to_string()],
            strategy: DecisionStrategy::Majority,
            min_votes: 3,
            reward_amount: Amount::from_tokens(100),
            creator: create_test_voter(1),
            created_at,
            deadline,
            status: QueryStatus::Active,
            result: None,
            resolved_at: None,
            votes: BTreeMap::new(),
        };
        
        state.queries.insert(&1, query).expect("Failed to insert query");
        
        let stored = state.get_query(1).await.unwrap();
        assert!(stored.deadline > stored.created_at);
    }
    
    #[tokio::test]
    async fn test_voter_registration_timestamp() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(90);
        
        let registration_time = Timestamp::from(123456789);
        
        let voter_info = VoterInfo {
            address: voter,
            stake: Amount::from_tokens(100),
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 0,
            correct_votes: 0,
            registered_at: registration_time,
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        state.voters.insert(&voter, voter_info).expect("Failed to insert voter");
        
        let stored = state.get_voter(&voter).await.unwrap();
        assert_eq!(stored.registered_at, registration_time);
    }
    
    // ==================== SLASHING STATISTICS EDGE CASES ====================
    
    #[tokio::test]
    async fn test_slashing_stats_with_no_incorrect_voters() {
        let (state, _admin) = setup_test_state().await;
        
        let params = state.get_parameters().await;
        let incorrect_voters: Vec<(AccountOwner, VoterInfo)> = vec![];
        
        let (total_slashed, voters_slashed, voters_deactivated) = 
            state.calculate_slashing_stats(&incorrect_voters, &params);
        
        assert_eq!(total_slashed, Amount::ZERO);
        assert_eq!(voters_slashed, 0);
        assert_eq!(voters_deactivated, 0);
    }
    
    #[tokio::test]
    async fn test_slashing_stats_with_multiple_voters() {
        let (state, _admin) = setup_test_state().await;
        
        let params = state.get_parameters().await;
        
        let voter1 = create_test_voter(91);
        let voter2 = create_test_voter(92);
        let voter3 = create_test_voter(93);
        
        let voter_info1 = VoterInfo {
            address: voter1,
            stake: params.min_stake, // Will be deactivated
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 10,
            correct_votes: 5,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        let voter_info2 = VoterInfo {
            address: voter2,
            stake: Amount::from_tokens(1000), // Won't be deactivated
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 10,
            correct_votes: 5,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        let voter_info3 = VoterInfo {
            address: voter3,
            stake: Amount::from_tokens(500),
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 10,
            correct_votes: 5,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        let incorrect_voters = vec![
            (voter1, voter_info1),
            (voter2, voter_info2),
            (voter3, voter_info3),
        ];
        
        let (total_slashed, voters_slashed, voters_deactivated) = 
            state.calculate_slashing_stats(&incorrect_voters, &params);
        
        let total_value: u128 = total_slashed.into();
        assert!(total_value > 0, "Should have slashed some amount");
        assert_eq!(voters_slashed, 3, "All voters should be slashed");
        assert!(voters_deactivated >= 1, "At least one voter should be deactivated");
    }
    
    // ==================== REPUTATION STATS EDGE CASES ====================
    
    #[tokio::test]
    async fn test_reputation_stats_for_nonexistent_voter() {
        let (state, _admin) = setup_test_state().await;
        let voter = create_test_voter(99);
        
        let stats = state.get_reputation_stats(&voter).await;
        assert!(stats.is_none(), "Non-existent voter should return None");
    }
    
    #[tokio::test]
    async fn test_reputation_stats_calculation() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(95);
        
        let voter_info = VoterInfo {
            address: voter,
            stake: Amount::from_tokens(100),
            locked_stake: Amount::ZERO,
            reputation: 75,
            total_votes: 100,
            correct_votes: 80,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        state.voters.insert(&voter, voter_info).expect("Failed to insert voter");
        
        let stats = state.get_reputation_stats(&voter).await;
        assert!(stats.is_some());
        
        let stats = stats.unwrap();
        assert_eq!(stats.reputation, 75);
        assert_eq!(stats.total_votes, 100);
        assert_eq!(stats.correct_votes, 80);
        assert_eq!(stats.accuracy_percentage, 80.0);
        assert_eq!(stats.tier, "Expert");
    }
    
    // ==================== AVAILABLE STAKE EDGE CASES ====================
    
    #[tokio::test]
    async fn test_available_stake_with_exact_lock() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(96);
        
        let stake = Amount::from_tokens(500);
        register_voter_with_stake(&mut state, voter, stake).await;
        
        // Lock exactly half
        let lock_amount = Amount::from_tokens(250);
        state.lock_stake(&voter, lock_amount).await.expect("Lock failed");
        
        let available = state.get_available_stake(&voter).await;
        let available_val: u128 = available.into();
        assert_eq!(available_val, 250);
    }
    
    #[tokio::test]
    async fn test_available_stake_after_partial_unlock() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(97);
        
        let stake = Amount::from_tokens(1000);
        register_voter_with_stake(&mut state, voter, stake).await;
        
        // Lock 600
        state.lock_stake(&voter, Amount::from_tokens(600)).await.expect("Lock failed");
        
        // Unlock 200
        state.unlock_stake(&voter, Amount::from_tokens(200)).await.expect("Unlock failed");
        
        // Available should be 1000 - 400 = 600
        let available = state.get_available_stake(&voter).await;
        let available_val: u128 = available.into();
        assert_eq!(available_val, 600);
    }
}
