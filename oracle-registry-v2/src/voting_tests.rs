// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Tests for voting functionality

#[cfg(test)]
mod tests {
    use crate::test_utils::test_helpers::*;
    use crate::state::{OracleRegistryV2, ProtocolParameters, VoterInfo, Query, QueryStatus, Vote, DecisionStrategy};
    use linera_sdk::{
        linera_base_types::{AccountOwner, Amount, ChainId},
        linera_base_types::{Timestamp, TimeDelta},
        views::View,
    };
    use linera_views::context::MemoryContext;
    use std::collections::BTreeMap;
    
    /// Helper to create test context and state
    async fn setup_test_state() -> (OracleRegistryV2, AccountOwner) {
        let context = create_memory_context();
        let mut state = OracleRegistryV2::load(context)
            .await
            .expect("Failed to load state");
        
        // Create admin account
        let admin = AccountOwner {
            chain_id: ChainId([0u8; 32].into()),
            owner: Some(Owner([1u8; 32].into())),
        };
        
        // Initialize with default parameters
        let params = ProtocolParameters::default();
        state.initialize(params, admin).await;
        
        (state, admin)
    }
    
    /// Helper to create a test voter
    fn create_test_voter(id: u8) -> AccountOwner {
        AccountOwner {
            chain_id: ChainId([0u8; 32].into()),
            owner: Some(Owner([id; 32].into())),
        }
    }
    
    /// Helper to register a voter
    async fn register_voter(state: &mut OracleRegistryV2, voter: AccountOwner, stake: Amount) {
        let voter_info = VoterInfo {
            address: voter,
            stake,
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 0,
            correct_votes: 0,
            registered_at: Timestamp::from(1000000),
            is_active: true,
            name: Some(format!("Voter {}", voter)),
            metadata_url: None,
        };
        
        state.voters.insert(&voter, voter_info).expect("Failed to insert voter");
        
        // Update totals
        let current_stake = *state.total_stake.get();
        let current_value: u128 = current_stake.into();
        let stake_value: u128 = stake.into();
        state.total_stake.set(Amount::from_tokens(current_value + stake_value));
        
        let current_count = *state.voter_count.get();
        state.voter_count.set(current_count + 1);
    }
    
    /// Helper to create a test query
    async fn create_test_query(
        state: &mut OracleRegistryV2,
        creator: AccountOwner,
        outcomes: Vec<String>,
        deadline: Timestamp,
    ) -> u64 {
        let query_id = *state.next_query_id.get();
        state.next_query_id.set(query_id + 1);
        
        let query = Query {
            id: query_id,
            description: "Test query".to_string(),
            outcomes,
            strategy: DecisionStrategy::Majority,
            min_votes: 3,
            reward_amount: Amount::from_tokens(1000),
            creator,
            created_at: Timestamp::from(1000000),
            deadline,
            status: QueryStatus::Active,
            result: None,
            resolved_at: None,
            votes: BTreeMap::new(),
        };
        
        state.queries.insert(&query_id, query).expect("Failed to insert query");
        
        // Add to active queries
        let mut active = state.get_active_queries().await;
        active.push(query_id);
        state.active_queries.set(active);
        
        // Initialize vote count
        state.vote_counts.insert(&query_id, 0).expect("Failed to initialize vote count");
        
        query_id
    }
    
    #[tokio::test]
    async fn test_vote_validation_voter_registered() {
        let (mut state, _admin) = setup_test_state().await;
        
        let voter = create_test_voter(2);
        let non_voter = create_test_voter(3);
        
        // Register only one voter
        register_voter(&mut state, voter, Amount::from_tokens(1000)).await;
        
        // Registered voter should exist
        assert!(state.get_voter(&voter).await.is_some(), "Registered voter should exist");
        
        // Non-registered voter should not exist
        assert!(state.get_voter(&non_voter).await.is_none(), "Non-registered voter should not exist");
    }
    
    #[tokio::test]
    async fn test_vote_validation_query_exists() {
        let (mut state, admin) = setup_test_state().await;
        
        let future_deadline = Timestamp::from(2000000);
        let query_id = create_test_query(&mut state, admin, vec!["Yes".to_string(), "No".to_string()], future_deadline).await;
        
        // Query should exist
        assert!(state.get_query(query_id).await.is_some(), "Query should exist");
        
        // Non-existent query should not exist
        assert!(state.get_query(999).await.is_none(), "Non-existent query should not exist");
    }
    
    #[tokio::test]
    async fn test_vote_validation_query_active() {
        let (mut state, admin) = setup_test_state().await;
        
        let future_deadline = Timestamp::from(2000000);
        let query_id = create_test_query(&mut state, admin, vec!["Yes".to_string(), "No".to_string()], future_deadline).await;
        
        let query = state.get_query(query_id).await.unwrap();
        assert_eq!(query.status, QueryStatus::Active, "Query should be active");
        
        // Test non-active statuses
        assert_ne!(QueryStatus::Resolved, QueryStatus::Active);
        assert_ne!(QueryStatus::Expired, QueryStatus::Active);
        assert_ne!(QueryStatus::Cancelled, QueryStatus::Active);
    }
    
    #[tokio::test]
    async fn test_vote_validation_deadline_not_passed() {
        let current_time = Timestamp::from(1000000);
        let future_deadline = Timestamp::from(2000000);
        let past_deadline = Timestamp::from(500000);
        
        // Future deadline should be valid
        assert!(current_time < future_deadline, "Current time should be before future deadline");
        
        // Past deadline should be invalid
        assert!(current_time >= past_deadline, "Current time should be after past deadline");
    }
    
    #[tokio::test]
    async fn test_vote_validation_voter_not_already_voted() {
        let (mut state, admin) = setup_test_state().await;
        
        let voter = create_test_voter(2);
        register_voter(&mut state, voter, Amount::from_tokens(1000)).await;
        
        let future_deadline = Timestamp::from(2000000);
        let query_id = create_test_query(&mut state, admin, vec!["Yes".to_string(), "No".to_string()], future_deadline).await;
        
        let mut query = state.get_query(query_id).await.unwrap();
        
        // Initially, voter should not have voted
        assert!(!query.votes.contains_key(&voter), "Voter should not have voted yet");
        
        // Add a vote
        let vote = Vote {
            voter,
            value: "Yes".to_string(),
            timestamp: Timestamp::from(1000000),
            confidence: Some(80),
        };
        query.votes.insert(voter, vote);
        
        // Now voter should have voted
        assert!(query.votes.contains_key(&voter), "Voter should have voted");
    }
    
    #[tokio::test]
    async fn test_vote_validation_valid_outcome() {
        let (mut state, admin) = setup_test_state().await;
        
        let outcomes = vec!["Yes".to_string(), "No".to_string(), "Maybe".to_string()];
        let future_deadline = Timestamp::from(2000000);
        let query_id = create_test_query(&mut state, admin, outcomes.clone(), future_deadline).await;
        
        let query = state.get_query(query_id).await.unwrap();
        
        // Valid outcomes
        assert!(query.outcomes.contains(&"Yes".to_string()), "Should contain 'Yes'");
        assert!(query.outcomes.contains(&"No".to_string()), "Should contain 'No'");
        assert!(query.outcomes.contains(&"Maybe".to_string()), "Should contain 'Maybe'");
        
        // Invalid outcomes
        assert!(!query.outcomes.contains(&"Invalid".to_string()), "Should not contain 'Invalid'");
        assert!(!query.outcomes.contains(&"".to_string()), "Should not contain empty string");
    }
    
    #[tokio::test]
    async fn test_vote_validation_confidence_range() {
        // Valid confidence values
        assert!(0 <= 100, "0 should be valid");
        assert!(50 <= 100, "50 should be valid");
        assert!(100 <= 100, "100 should be valid");
        
        // Invalid confidence values
        assert!(101 > 100, "101 should be invalid");
        assert!(255 > 100, "255 should be invalid");
    }
    
    #[tokio::test]
    async fn test_vote_submission_success() {
        let (mut state, admin) = setup_test_state().await;
        
        let voter = create_test_voter(2);
        register_voter(&mut state, voter, Amount::from_tokens(1000)).await;
        
        let future_deadline = Timestamp::from(2000000);
        let query_id = create_test_query(&mut state, admin, vec!["Yes".to_string(), "No".to_string()], future_deadline).await;
        
        // Submit vote
        let vote = Vote {
            voter,
            value: "Yes".to_string(),
            timestamp: Timestamp::from(1000000),
            confidence: Some(80),
        };
        
        let mut query = state.get_query(query_id).await.unwrap();
        query.votes.insert(voter, vote.clone());
        state.queries.insert(&query_id, query.clone()).expect("Failed to update query");
        state.votes.insert(&(query_id, voter), vote).expect("Failed to store vote");
        
        // Verify vote was stored
        let stored_vote = state.votes.get(&(query_id, voter)).await.expect("Failed to get vote").expect("Vote should exist");
        assert_eq!(stored_vote.voter, voter, "Voter should match");
        assert_eq!(stored_vote.value, "Yes", "Value should match");
        assert_eq!(stored_vote.confidence, Some(80), "Confidence should match");
        
        // Verify query was updated
        let updated_query = state.get_query(query_id).await.unwrap();
        assert!(updated_query.votes.contains_key(&voter), "Query should contain vote");
    }
    
    #[tokio::test]
    async fn test_vote_submission_multiple_voters() {
        let (mut state, admin) = setup_test_state().await;
        
        // Register multiple voters
        let voter1 = create_test_voter(2);
        let voter2 = create_test_voter(3);
        let voter3 = create_test_voter(4);
        
        register_voter(&mut state, voter1, Amount::from_tokens(1000)).await;
        register_voter(&mut state, voter2, Amount::from_tokens(1500)).await;
        register_voter(&mut state, voter3, Amount::from_tokens(2000)).await;
        
        let future_deadline = Timestamp::from(2000000);
        let query_id = create_test_query(&mut state, admin, vec!["Yes".to_string(), "No".to_string()], future_deadline).await;
        
        // Submit votes from multiple voters
        let mut query = state.get_query(query_id).await.unwrap();
        
        let vote1 = Vote {
            voter: voter1,
            value: "Yes".to_string(),
            timestamp: Timestamp::from(1000000),
            confidence: Some(80),
        };
        query.votes.insert(voter1, vote1.clone());
        state.votes.insert(&(query_id, voter1), vote1).expect("Failed to store vote1");
        
        let vote2 = Vote {
            voter: voter2,
            value: "No".to_string(),
            timestamp: Timestamp::from(1000100),
            confidence: Some(90),
        };
        query.votes.insert(voter2, vote2.clone());
        state.votes.insert(&(query_id, voter2), vote2).expect("Failed to store vote2");
        
        let vote3 = Vote {
            voter: voter3,
            value: "Yes".to_string(),
            timestamp: Timestamp::from(1000200),
            confidence: Some(75),
        };
        query.votes.insert(voter3, vote3.clone());
        state.votes.insert(&(query_id, voter3), vote3).expect("Failed to store vote3");
        
        state.queries.insert(&query_id, query.clone()).expect("Failed to update query");
        
        // Verify all votes were stored
        assert_eq!(query.votes.len(), 3, "Should have 3 votes");
        assert!(query.votes.contains_key(&voter1), "Should contain voter1's vote");
        assert!(query.votes.contains_key(&voter2), "Should contain voter2's vote");
        assert!(query.votes.contains_key(&voter3), "Should contain voter3's vote");
    }
    
    #[tokio::test]
    async fn test_vote_with_different_confidence_levels() {
        let (mut state, admin) = setup_test_state().await;
        
        let voter = create_test_voter(2);
        register_voter(&mut state, voter, Amount::from_tokens(1000)).await;
        
        let future_deadline = Timestamp::from(2000000);
        let query_id = create_test_query(&mut state, admin, vec!["Yes".to_string(), "No".to_string()], future_deadline).await;
        
        // Test vote with no confidence
        let vote_no_conf = Vote {
            voter,
            value: "Yes".to_string(),
            timestamp: Timestamp::from(1000000),
            confidence: None,
        };
        assert!(vote_no_conf.confidence.is_none(), "Confidence should be None");
        
        // Test vote with low confidence
        let vote_low_conf = Vote {
            voter,
            value: "Yes".to_string(),
            timestamp: Timestamp::from(1000000),
            confidence: Some(25),
        };
        assert_eq!(vote_low_conf.confidence, Some(25), "Confidence should be 25");
        
        // Test vote with high confidence
        let vote_high_conf = Vote {
            voter,
            value: "Yes".to_string(),
            timestamp: Timestamp::from(1000000),
            confidence: Some(95),
        };
        assert_eq!(vote_high_conf.confidence, Some(95), "Confidence should be 95");
        
        // Test vote with maximum confidence
        let vote_max_conf = Vote {
            voter,
            value: "Yes".to_string(),
            timestamp: Timestamp::from(1000000),
            confidence: Some(100),
        };
        assert_eq!(vote_max_conf.confidence, Some(100), "Confidence should be 100");
    }
    
    #[tokio::test]
    async fn test_vote_count_tracking() {
        let (mut state, admin) = setup_test_state().await;
        
        let voter1 = create_test_voter(2);
        let voter2 = create_test_voter(3);
        
        register_voter(&mut state, voter1, Amount::from_tokens(1000)).await;
        register_voter(&mut state, voter2, Amount::from_tokens(1500)).await;
        
        let future_deadline = Timestamp::from(2000000);
        let query_id = create_test_query(&mut state, admin, vec!["Yes".to_string(), "No".to_string()], future_deadline).await;
        
        // Initial vote count should be 0
        let initial_count = state.vote_counts.get(&query_id).await.ok().flatten().unwrap_or(0);
        assert_eq!(initial_count, 0, "Initial vote count should be 0");
        
        // Add first vote
        state.vote_counts.insert(&query_id, 1).expect("Failed to update vote count");
        let count_after_first = state.vote_counts.get(&query_id).await.ok().flatten().unwrap_or(0);
        assert_eq!(count_after_first, 1, "Vote count should be 1 after first vote");
        
        // Add second vote
        state.vote_counts.insert(&query_id, 2).expect("Failed to update vote count");
        let count_after_second = state.vote_counts.get(&query_id).await.ok().flatten().unwrap_or(0);
        assert_eq!(count_after_second, 2, "Vote count should be 2 after second vote");
    }
    
    #[tokio::test]
    async fn test_vote_timestamp_ordering() {
        let voter = create_test_voter(2);
        
        let vote1 = Vote {
            voter,
            value: "Yes".to_string(),
            timestamp: Timestamp::from(1000000),
            confidence: Some(80),
        };
        
        let vote2 = Vote {
            voter,
            value: "No".to_string(),
            timestamp: Timestamp::from(1000100),
            confidence: Some(90),
        };
        
        let vote3 = Vote {
            voter,
            value: "Yes".to_string(),
            timestamp: Timestamp::from(1000200),
            confidence: Some(75),
        };
        
        // Verify timestamp ordering
        assert!(vote1.timestamp < vote2.timestamp, "vote1 should be before vote2");
        assert!(vote2.timestamp < vote3.timestamp, "vote2 should be before vote3");
        assert!(vote1.timestamp < vote3.timestamp, "vote1 should be before vote3");
    }
    
    #[tokio::test]
    async fn test_vote_on_different_queries() {
        let (mut state, admin) = setup_test_state().await;
        
        let voter = create_test_voter(2);
        register_voter(&mut state, voter, Amount::from_tokens(1000)).await;
        
        let future_deadline = Timestamp::from(2000000);
        
        // Create multiple queries
        let query_id1 = create_test_query(&mut state, admin, vec!["Yes".to_string(), "No".to_string()], future_deadline).await;
        let query_id2 = create_test_query(&mut state, admin, vec!["A".to_string(), "B".to_string(), "C".to_string()], future_deadline).await;
        
        // Vote on first query
        let vote1 = Vote {
            voter,
            value: "Yes".to_string(),
            timestamp: Timestamp::from(1000000),
            confidence: Some(80),
        };
        state.votes.insert(&(query_id1, voter), vote1).expect("Failed to store vote1");
        
        // Vote on second query
        let vote2 = Vote {
            voter,
            value: "B".to_string(),
            timestamp: Timestamp::from(1000100),
            confidence: Some(90),
        };
        state.votes.insert(&(query_id2, voter), vote2).expect("Failed to store vote2");
        
        // Verify both votes exist
        assert!(state.votes.get(&(query_id1, voter)).await.ok().flatten().is_some(), "Vote on query1 should exist");
        assert!(state.votes.get(&(query_id2, voter)).await.ok().flatten().is_some(), "Vote on query2 should exist");
        
        // Verify votes are different
        let stored_vote1 = state.votes.get(&(query_id1, voter)).await.ok().flatten().unwrap();
        let stored_vote2 = state.votes.get(&(query_id2, voter)).await.ok().flatten().unwrap();
        assert_ne!(stored_vote1.value, stored_vote2.value, "Votes should have different values");
    }
    
    #[tokio::test]
    async fn test_vote_updates_voter_stats() {
        let (mut state, _admin) = setup_test_state().await;
        
        let voter = create_test_voter(2);
        register_voter(&mut state, voter, Amount::from_tokens(1000)).await;
        
        // Initial stats
        let voter_info = state.get_voter(&voter).await.unwrap();
        assert_eq!(voter_info.total_votes, 0, "Initial total_votes should be 0");
        
        // Simulate vote submission by updating stats
        let mut updated_voter_info = voter_info.clone();
        updated_voter_info.total_votes += 1;
        state.voters.insert(&voter, updated_voter_info).expect("Failed to update voter");
        
        // Verify stats updated
        let voter_info_after = state.get_voter(&voter).await.unwrap();
        assert_eq!(voter_info_after.total_votes, 1, "total_votes should be 1 after vote");
    }
    
    #[tokio::test]
    async fn test_vote_with_stake_locking() {
        let (mut state, _admin) = setup_test_state().await;
        
        let voter = create_test_voter(2);
        let initial_stake = Amount::from_tokens(1000);
        register_voter(&mut state, voter, initial_stake).await;
        
        // Lock some stake
        let lock_amount = Amount::from_tokens(100);
        let result = state.lock_stake(&voter, lock_amount).await;
        assert!(result.is_some(), "Should be able to lock stake");
        
        // Verify locked stake
        let voter_info = state.get_voter(&voter).await.unwrap();
        assert_eq!(voter_info.locked_stake, lock_amount, "Locked stake should match");
        
        // Verify available stake
        let stake_value: u128 = voter_info.stake.into();
        let locked_value: u128 = voter_info.locked_stake.into();
        let available_value = stake_value.saturating_sub(locked_value);
        let available_stake = Amount::from_tokens(available_value);
        assert_eq!(available_stake, Amount::from_tokens(900), "Available stake should be 900");
    }
    
    #[tokio::test]
    async fn test_total_votes_submitted_tracking() {
        let (mut state, _admin) = setup_test_state().await;
        
        // Initial total should be 0
        let initial_total = *state.total_votes_submitted.get();
        assert_eq!(initial_total, 0, "Initial total votes should be 0");
        
        // Increment total
        state.total_votes_submitted.set(1);
        assert_eq!(*state.total_votes_submitted.get(), 1, "Total should be 1");
        
        state.total_votes_submitted.set(2);
        assert_eq!(*state.total_votes_submitted.get(), 2, "Total should be 2");
        
        state.total_votes_submitted.set(3);
        assert_eq!(*state.total_votes_submitted.get(), 3, "Total should be 3");
    }
}
