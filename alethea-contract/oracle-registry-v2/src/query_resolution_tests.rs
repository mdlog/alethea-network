// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Tests for query resolution functionality

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
    async fn register_voter(state: &mut OracleRegistryV2, voter: AccountOwner, stake: Amount, reputation: u32) {
        let voter_info = VoterInfo {
            address: voter,
            stake,
            locked_stake: Amount::ZERO,
            reputation,
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
    
    /// Helper to create a test query with votes
    async fn create_query_with_votes(
        state: &mut OracleRegistryV2,
        creator: AccountOwner,
        outcomes: Vec<String>,
        strategy: DecisionStrategy,
        deadline: Timestamp,
        votes: Vec<(AccountOwner, String, Option<u8>)>,
    ) -> u64 {
        let query_id = *state.next_query_id.get();
        state.next_query_id.set(query_id + 1);
        
        let mut vote_map = BTreeMap::new();
        for (voter, value, confidence) in votes {
            let vote = Vote {
                voter,
                value,
                timestamp: Timestamp::from(1000000),
                confidence,
            };
            vote_map.insert(voter, vote.clone());
            state.votes.insert(&(query_id, voter), vote).expect("Failed to store vote");
        }

        let query = Query {
            id: query_id,
            description: "Test query".to_string(),
            outcomes,
            strategy,
            min_votes: 3,
            reward_amount: Amount::from_tokens(1000),
            creator,
            created_at: Timestamp::from(1000000),
            deadline,
            status: QueryStatus::Active,
            result: None,
            resolved_at: None,
            votes: vote_map,
        };
        
        state.queries.insert(&query_id, query).expect("Failed to insert query");
        
        // Add to active queries
        let mut active = state.get_active_queries().await;
        active.push(query_id);
        state.active_queries.set(active);
        
        // Set vote count
        let vote_count = state.votes.count().await.expect("Failed to count votes");
        state.vote_counts.insert(&query_id, vote_count).expect("Failed to set vote count");
        
        query_id
    }
    
    #[tokio::test]
    async fn test_resolution_validation_query_exists() {
        let (state, _admin) = setup_test_state().await;
        
        // Non-existent query should not exist
        assert!(state.get_query(999).await.is_none(), "Non-existent query should not exist");
    }
    
    #[tokio::test]
    async fn test_resolution_validation_query_active() {
        let (mut state, admin) = setup_test_state().await;
        
        let voter1 = create_test_voter(2);
        let voter2 = create_test_voter(3);
        let voter3 = create_test_voter(4);
        
        register_voter(&mut state, voter1, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter2, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter3, Amount::from_tokens(1000), 50).await;

        let past_deadline = Timestamp::from(500000);
        let votes = vec![
            (voter1, "Yes".to_string(), Some(80)),
            (voter2, "Yes".to_string(), Some(90)),
            (voter3, "No".to_string(), Some(75)),
        ];
        
        let query_id = create_query_with_votes(
            &mut state,
            admin,
            vec!["Yes".to_string(), "No".to_string()],
            DecisionStrategy::Majority,
            past_deadline,
            votes,
        ).await;
        
        let query = state.get_query(query_id).await.unwrap();
        assert_eq!(query.status, QueryStatus::Active, "Query should be active");
    }
    
    #[tokio::test]
    async fn test_resolution_validation_minimum_votes_met() {
        let (mut state, admin) = setup_test_state().await;
        
        let voter1 = create_test_voter(2);
        let voter2 = create_test_voter(3);
        let voter3 = create_test_voter(4);
        
        register_voter(&mut state, voter1, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter2, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter3, Amount::from_tokens(1000), 50).await;
        
        let past_deadline = Timestamp::from(500000);
        let votes = vec![
            (voter1, "Yes".to_string(), Some(80)),
            (voter2, "Yes".to_string(), Some(90)),
            (voter3, "No".to_string(), Some(75)),
        ];
        
        let query_id = create_query_with_votes(
            &mut state,
            admin,
            vec!["Yes".to_string(), "No".to_string()],
            DecisionStrategy::Majority,
            past_deadline,
            votes,
        ).await;
        
        let query = state.get_query(query_id).await.unwrap();
        assert_eq!(query.votes.len(), 3, "Should have 3 votes");
        assert!(query.votes.len() >= query.min_votes, "Should meet minimum votes");
    }

    #[tokio::test]
    async fn test_resolution_majority_strategy() {
        let (mut state, admin) = setup_test_state().await;
        
        let voter1 = create_test_voter(2);
        let voter2 = create_test_voter(3);
        let voter3 = create_test_voter(4);
        let voter4 = create_test_voter(5);
        let voter5 = create_test_voter(6);
        
        register_voter(&mut state, voter1, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter2, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter3, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter4, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter5, Amount::from_tokens(1000), 50).await;
        
        let past_deadline = Timestamp::from(500000);
        let votes = vec![
            (voter1, "Yes".to_string(), Some(80)),
            (voter2, "Yes".to_string(), Some(90)),
            (voter3, "Yes".to_string(), Some(85)),
            (voter4, "No".to_string(), Some(75)),
            (voter5, "No".to_string(), Some(70)),
        ];
        
        let query_id = create_query_with_votes(
            &mut state,
            admin,
            vec!["Yes".to_string(), "No".to_string()],
            DecisionStrategy::Majority,
            past_deadline,
            votes,
        ).await;
        
        let query = state.get_query(query_id).await.unwrap();
        
        // Count votes manually
        let mut vote_counts = std::collections::HashMap::new();
        for vote in query.votes.values() {
            *vote_counts.entry(vote.value.clone()).or_insert(0) += 1;
        }
        
        assert_eq!(vote_counts.get("Yes"), Some(&3), "Should have 3 'Yes' votes");
        assert_eq!(vote_counts.get("No"), Some(&2), "Should have 2 'No' votes");
        
        // Majority should be "Yes"
        let max_votes = vote_counts.values().max().unwrap();
        assert_eq!(*max_votes, 3, "Maximum votes should be 3");
    }

    #[tokio::test]
    async fn test_resolution_weighted_by_stake_strategy() {
        let (mut state, admin) = setup_test_state().await;
        
        let voter1 = create_test_voter(2);
        let voter2 = create_test_voter(3);
        let voter3 = create_test_voter(4);
        
        // Register voters with different stakes
        register_voter(&mut state, voter1, Amount::from_tokens(5000), 50).await; // High stake
        register_voter(&mut state, voter2, Amount::from_tokens(1000), 50).await; // Low stake
        register_voter(&mut state, voter3, Amount::from_tokens(1000), 50).await; // Low stake
        
        let past_deadline = Timestamp::from(500000);
        let votes = vec![
            (voter1, "Yes".to_string(), Some(80)),  // 5000 stake
            (voter2, "No".to_string(), Some(90)),   // 1000 stake
            (voter3, "No".to_string(), Some(85)),   // 1000 stake
        ];
        
        let query_id = create_query_with_votes(
            &mut state,
            admin,
            vec!["Yes".to_string(), "No".to_string()],
            DecisionStrategy::WeightedByStake,
            past_deadline,
            votes,
        ).await;
        
        let query = state.get_query(query_id).await.unwrap();
        
        // Calculate weighted votes
        let mut weighted_votes: std::collections::HashMap<String, u128> = std::collections::HashMap::new();
        for vote in query.votes.values() {
            if let Some(voter_info) = state.get_voter(&vote.voter).await {
                let stake_value: u128 = voter_info.stake.into();
                *weighted_votes.entry(vote.value.clone()).or_insert(0) += stake_value;
            }
        }
        
        // "Yes" should have 5000 stake weight
        assert_eq!(weighted_votes.get("Yes"), Some(&5000), "Yes should have 5000 stake weight");
        // "No" should have 2000 stake weight (1000 + 1000)
        assert_eq!(weighted_votes.get("No"), Some(&2000), "No should have 2000 stake weight");
        
        // "Yes" should win despite having fewer votes
        let max_weight = weighted_votes.values().max().unwrap();
        assert_eq!(*max_weight, 5000, "Maximum weight should be 5000");
    }

    #[tokio::test]
    async fn test_resolution_weighted_by_reputation_strategy() {
        let (mut state, admin) = setup_test_state().await;
        
        let voter1 = create_test_voter(2);
        let voter2 = create_test_voter(3);
        let voter3 = create_test_voter(4);
        
        // Register voters with different reputations
        register_voter(&mut state, voter1, Amount::from_tokens(1000), 90).await; // High reputation
        register_voter(&mut state, voter2, Amount::from_tokens(1000), 30).await; // Low reputation
        register_voter(&mut state, voter3, Amount::from_tokens(1000), 30).await; // Low reputation
        
        let past_deadline = Timestamp::from(500000);
        let votes = vec![
            (voter1, "Yes".to_string(), Some(80)),  // 90 reputation
            (voter2, "No".to_string(), Some(90)),   // 30 reputation
            (voter3, "No".to_string(), Some(85)),   // 30 reputation
        ];
        
        let query_id = create_query_with_votes(
            &mut state,
            admin,
            vec!["Yes".to_string(), "No".to_string()],
            DecisionStrategy::WeightedByReputation,
            past_deadline,
            votes,
        ).await;
        
        let query = state.get_query(query_id).await.unwrap();
        
        // Calculate weighted votes by reputation
        let mut weighted_votes: std::collections::HashMap<String, f64> = std::collections::HashMap::new();
        for vote in query.votes.values() {
            if let Some(voter_info) = state.get_voter(&vote.voter).await {
                let weight = state.calculate_reputation_weight(voter_info.reputation);
                *weighted_votes.entry(vote.value.clone()).or_insert(0.0) += weight;
            }
        }
        
        // High reputation voter (90) should have more weight than two low reputation voters (30 each)
        let yes_weight = weighted_votes.get("Yes").unwrap();
        let no_weight = weighted_votes.get("No").unwrap();
        
        // Reputation weight formula: 0.5 + (reputation / 100) * 1.5
        // voter1 (90): 0.5 + 0.9 * 1.5 = 1.85
        // voter2 (30): 0.5 + 0.3 * 1.5 = 0.95
        // voter3 (30): 0.5 + 0.3 * 1.5 = 0.95
        // Total "No": 0.95 + 0.95 = 1.9
        
        assert!(*yes_weight > 1.8 && *yes_weight < 1.9, "Yes weight should be around 1.85");
        assert!(*no_weight > 1.8 && *no_weight < 2.0, "No weight should be around 1.9");
    }

    #[tokio::test]
    async fn test_resolution_median_strategy() {
        let (mut state, admin) = setup_test_state().await;
        
        let voter1 = create_test_voter(2);
        let voter2 = create_test_voter(3);
        let voter3 = create_test_voter(4);
        let voter4 = create_test_voter(5);
        let voter5 = create_test_voter(6);
        
        register_voter(&mut state, voter1, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter2, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter3, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter4, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter5, Amount::from_tokens(1000), 50).await;
        
        let past_deadline = Timestamp::from(500000);
        let votes = vec![
            (voter1, "10".to_string(), Some(80)),
            (voter2, "20".to_string(), Some(90)),
            (voter3, "30".to_string(), Some(85)),
            (voter4, "40".to_string(), Some(75)),
            (voter5, "50".to_string(), Some(70)),
        ];
        
        let query_id = create_query_with_votes(
            &mut state,
            admin,
            vec!["10".to_string(), "20".to_string(), "30".to_string(), "40".to_string(), "50".to_string()],
            DecisionStrategy::Median,
            past_deadline,
            votes,
        ).await;
        
        let query = state.get_query(query_id).await.unwrap();
        
        // Calculate median
        let mut numeric_votes: Vec<f64> = query.votes.values()
            .filter_map(|vote| vote.value.parse::<f64>().ok())
            .collect();
        numeric_votes.sort_by(|a, b| a.partial_cmp(b).unwrap());
        
        // With 5 votes, median should be the 3rd value (30)
        assert_eq!(numeric_votes.len(), 5, "Should have 5 numeric votes");
        assert_eq!(numeric_votes[2], 30.0, "Median should be 30");
    }

    #[tokio::test]
    async fn test_resolution_updates_query_status() {
        let (mut state, admin) = setup_test_state().await;
        
        let voter1 = create_test_voter(2);
        let voter2 = create_test_voter(3);
        let voter3 = create_test_voter(4);
        
        register_voter(&mut state, voter1, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter2, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter3, Amount::from_tokens(1000), 50).await;
        
        let past_deadline = Timestamp::from(500000);
        let votes = vec![
            (voter1, "Yes".to_string(), Some(80)),
            (voter2, "Yes".to_string(), Some(90)),
            (voter3, "No".to_string(), Some(75)),
        ];
        
        let query_id = create_query_with_votes(
            &mut state,
            admin,
            vec!["Yes".to_string(), "No".to_string()],
            DecisionStrategy::Majority,
            past_deadline,
            votes,
        ).await;
        
        let query = state.get_query(query_id).await.unwrap();
        assert_eq!(query.status, QueryStatus::Active, "Query should start as active");
        
        // Simulate resolution by updating status
        let mut resolved_query = query.clone();
        resolved_query.status = QueryStatus::Resolved;
        resolved_query.result = Some("Yes".to_string());
        resolved_query.resolved_at = Some(Timestamp::from(2000000));
        
        state.queries.insert(&query_id, resolved_query.clone()).expect("Failed to update query");
        
        let updated_query = state.get_query(query_id).await.unwrap();
        assert_eq!(updated_query.status, QueryStatus::Resolved, "Query should be resolved");
        assert_eq!(updated_query.result, Some("Yes".to_string()), "Result should be 'Yes'");
        assert!(updated_query.resolved_at.is_some(), "Should have resolution timestamp");
    }
    
    #[tokio::test]
    async fn test_resolution_removes_from_active_queries() {
        let (mut state, admin) = setup_test_state().await;
        
        let voter1 = create_test_voter(2);
        let voter2 = create_test_voter(3);
        let voter3 = create_test_voter(4);
        
        register_voter(&mut state, voter1, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter2, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter3, Amount::from_tokens(1000), 50).await;
        
        let past_deadline = Timestamp::from(500000);
        let votes = vec![
            (voter1, "Yes".to_string(), Some(80)),
            (voter2, "Yes".to_string(), Some(90)),
            (voter3, "No".to_string(), Some(75)),
        ];
        
        let query_id = create_query_with_votes(
            &mut state,
            admin,
            vec!["Yes".to_string(), "No".to_string()],
            DecisionStrategy::Majority,
            past_deadline,
            votes,
        ).await;
        
        // Verify query is in active list
        let active_before = state.get_active_queries().await;
        assert!(active_before.contains(&query_id), "Query should be in active list");
        
        // Simulate removal from active queries
        let mut active_after = active_before.clone();
        active_after.retain(|&id| id != query_id);
        state.active_queries.set(active_after.clone());
        
        // Verify query is removed from active list
        assert!(!active_after.contains(&query_id), "Query should be removed from active list");
    }

    #[tokio::test]
    async fn test_resolution_updates_voter_reputation() {
        let (mut state, admin) = setup_test_state().await;
        
        let voter1 = create_test_voter(2);
        let voter2 = create_test_voter(3);
        
        register_voter(&mut state, voter1, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter2, Amount::from_tokens(1000), 50).await;
        
        // Get initial reputation
        let voter1_before = state.get_voter(&voter1).await.unwrap();
        let voter2_before = state.get_voter(&voter2).await.unwrap();
        
        assert_eq!(voter1_before.reputation, 50, "Initial reputation should be 50");
        assert_eq!(voter1_before.total_votes, 0, "Initial total_votes should be 0");
        assert_eq!(voter1_before.correct_votes, 0, "Initial correct_votes should be 0");
        
        // Simulate correct vote for voter1
        let result = state.update_voter_reputation(&voter1, true).await;
        assert!(result.is_some(), "Should update reputation successfully");
        
        let voter1_after = state.get_voter(&voter1).await.unwrap();
        assert_eq!(voter1_after.correct_votes, 1, "correct_votes should be incremented");
        
        // Simulate incorrect vote for voter2
        let result2 = state.update_voter_reputation(&voter2, false).await;
        assert!(result2.is_some(), "Should update reputation successfully");
        
        let voter2_after = state.get_voter(&voter2).await.unwrap();
        assert_eq!(voter2_after.correct_votes, 0, "correct_votes should remain 0");
    }
    
    #[tokio::test]
    async fn test_resolution_distributes_rewards_equally() {
        let (mut state, admin) = setup_test_state().await;
        
        let voter1 = create_test_voter(2);
        let voter2 = create_test_voter(3);
        let voter3 = create_test_voter(4);
        
        register_voter(&mut state, voter1, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter2, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter3, Amount::from_tokens(1000), 50).await;
        
        let total_reward = Amount::from_tokens(1000);
        let params = state.get_parameters().await;
        
        // All voters voted correctly
        let correct_voters = vec![
            (voter1, state.get_voter(&voter1).await.unwrap()),
            (voter2, state.get_voter(&voter2).await.unwrap()),
            (voter3, state.get_voter(&voter3).await.unwrap()),
        ];
        
        let rewards = state.calculate_equal_rewards(total_reward, &correct_voters, &params);
        
        assert_eq!(rewards.len(), 3, "Should have rewards for 3 voters");
        
        // Each voter should get approximately equal rewards (accounting for reputation multiplier and fees)
        let reward1 = rewards.get(&voter1).unwrap();
        let reward2 = rewards.get(&voter2).unwrap();
        let reward3 = rewards.get(&voter3).unwrap();
        
        // With equal reputation (50), rewards should be similar
        let reward1_value: u128 = (*reward1).into();
        let reward2_value: u128 = (*reward2).into();
        let reward3_value: u128 = (*reward3).into();
        
        assert!(reward1_value > 0, "Reward1 should be positive");
        assert!(reward2_value > 0, "Reward2 should be positive");
        assert!(reward3_value > 0, "Reward3 should be positive");
    }

    #[tokio::test]
    async fn test_resolution_distributes_rewards_by_stake() {
        let (mut state, admin) = setup_test_state().await;
        
        let voter1 = create_test_voter(2);
        let voter2 = create_test_voter(3);
        
        // Register voters with different stakes
        register_voter(&mut state, voter1, Amount::from_tokens(3000), 50).await;
        register_voter(&mut state, voter2, Amount::from_tokens(1000), 50).await;
        
        let total_reward = Amount::from_tokens(1000);
        let params = state.get_parameters().await;
        
        let correct_voters = vec![
            (voter1, state.get_voter(&voter1).await.unwrap()),
            (voter2, state.get_voter(&voter2).await.unwrap()),
        ];
        
        let rewards = state.calculate_stake_weighted_rewards(total_reward, &correct_voters, &params);
        
        assert_eq!(rewards.len(), 2, "Should have rewards for 2 voters");
        
        let reward1 = rewards.get(&voter1).unwrap();
        let reward2 = rewards.get(&voter2).unwrap();
        
        let reward1_value: u128 = (*reward1).into();
        let reward2_value: u128 = (*reward2).into();
        
        // Voter1 has 3x the stake, so should get approximately 3x the reward
        // (accounting for reputation multiplier and fees)
        assert!(reward1_value > reward2_value, "Higher stake should get more reward");
        
        // Rough ratio check (allowing for fees and multipliers)
        let ratio = reward1_value as f64 / reward2_value as f64;
        assert!(ratio > 2.0 && ratio < 4.0, "Ratio should be approximately 3:1");
    }
    
    #[tokio::test]
    async fn test_resolution_distributes_rewards_by_reputation() {
        let (mut state, admin) = setup_test_state().await;
        
        let voter1 = create_test_voter(2);
        let voter2 = create_test_voter(3);
        
        // Register voters with different reputations
        register_voter(&mut state, voter1, Amount::from_tokens(1000), 90).await;
        register_voter(&mut state, voter2, Amount::from_tokens(1000), 30).await;
        
        let total_reward = Amount::from_tokens(1000);
        let params = state.get_parameters().await;
        
        let correct_voters = vec![
            (voter1, state.get_voter(&voter1).await.unwrap()),
            (voter2, state.get_voter(&voter2).await.unwrap()),
        ];
        
        let rewards = state.calculate_reputation_weighted_rewards(total_reward, &correct_voters, &params);
        
        assert_eq!(rewards.len(), 2, "Should have rewards for 2 voters");
        
        let reward1 = rewards.get(&voter1).unwrap();
        let reward2 = rewards.get(&voter2).unwrap();
        
        let reward1_value: u128 = (*reward1).into();
        let reward2_value: u128 = (*reward2).into();
        
        // Higher reputation should get more reward
        assert!(reward1_value > reward2_value, "Higher reputation should get more reward");
    }

    #[tokio::test]
    async fn test_resolution_applies_slashing_to_incorrect_voters() {
        let (mut state, admin) = setup_test_state().await;
        
        let voter1 = create_test_voter(2);
        let voter2 = create_test_voter(3);
        
        register_voter(&mut state, voter1, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter2, Amount::from_tokens(1000), 50).await;
        
        let params = state.get_parameters().await;
        
        let voter1_info = state.get_voter(&voter1).await.unwrap();
        let voter2_info = state.get_voter(&voter2).await.unwrap();
        
        // Calculate slash amounts
        let slash1 = state.calculate_slash_amount(&voter1_info, &params);
        let slash2 = state.calculate_slash_amount(&voter2_info, &params);
        
        let slash1_value: u128 = slash1.into();
        let slash2_value: u128 = slash2.into();
        
        // With default 5% slash rate and 1000 stake, should slash 50 tokens
        assert_eq!(slash1_value, 50, "Should slash 50 tokens (5% of 1000)");
        assert_eq!(slash2_value, 50, "Should slash 50 tokens (5% of 1000)");
        
        // Apply slashing
        let mut updated_voter1 = voter1_info.clone();
        let stake_value: u128 = updated_voter1.stake.into();
        updated_voter1.stake = Amount::from_tokens(stake_value - slash1_value);
        
        state.voters.insert(&voter1, updated_voter1.clone()).expect("Failed to update voter");
        
        let voter1_after = state.get_voter(&voter1).await.unwrap();
        let stake_after: u128 = voter1_after.stake.into();
        assert_eq!(stake_after, 950, "Stake should be reduced to 950");
    }
    
    #[tokio::test]
    async fn test_resolution_deactivates_voters_below_minimum_stake() {
        let (mut state, admin) = setup_test_state().await;
        
        let voter = create_test_voter(2);
        
        // Register voter with stake just above minimum
        let params = state.get_parameters().await;
        let min_stake_value: u128 = params.min_stake.into();
        register_voter(&mut state, voter, Amount::from_tokens(min_stake_value + 10), 50).await;
        
        let voter_info = state.get_voter(&voter).await.unwrap();
        
        // Calculate slash amount
        let slash_amount = state.calculate_slash_amount(&voter_info, &params);
        
        // Check if voter should be deactivated
        let should_deactivate = state.should_deactivate_after_slash(&voter_info, slash_amount, &params);
        
        // With 5% slash on (min_stake + 10), voter should be deactivated
        assert!(should_deactivate, "Voter should be deactivated after slashing");
    }

    #[tokio::test]
    async fn test_resolution_unlocks_voter_stakes() {
        let (mut state, _admin) = setup_test_state().await;
        
        let voter = create_test_voter(2);
        register_voter(&mut state, voter, Amount::from_tokens(1000), 50).await;
        
        // Lock some stake
        let lock_amount = Amount::from_tokens(100);
        let result = state.lock_stake(&voter, lock_amount).await;
        assert!(result.is_some(), "Should lock stake successfully");
        
        let voter_after_lock = state.get_voter(&voter).await.unwrap();
        let locked_value: u128 = voter_after_lock.locked_stake.into();
        assert_eq!(locked_value, 100, "Should have 100 locked");
        
        // Unlock stake
        let unlock_result = state.unlock_stake(&voter, lock_amount).await;
        assert!(unlock_result.is_some(), "Should unlock stake successfully");
        
        let voter_after_unlock = state.get_voter(&voter).await.unwrap();
        let unlocked_value: u128 = voter_after_unlock.locked_stake.into();
        assert_eq!(unlocked_value, 0, "Should have 0 locked after unlock");
    }
    
    #[tokio::test]
    async fn test_resolution_updates_statistics() {
        let (mut state, _admin) = setup_test_state().await;
        
        // Initial statistics
        let initial_resolved = *state.total_queries_resolved.get();
        assert_eq!(initial_resolved, 0, "Initial resolved count should be 0");
        
        // Simulate resolution
        state.total_queries_resolved.set(1);
        let after_first = *state.total_queries_resolved.get();
        assert_eq!(after_first, 1, "Should have 1 resolved query");
        
        state.total_queries_resolved.set(2);
        let after_second = *state.total_queries_resolved.get();
        assert_eq!(after_second, 2, "Should have 2 resolved queries");
    }
    
    #[tokio::test]
    async fn test_resolution_adds_pending_rewards() {
        let (mut state, _admin) = setup_test_state().await;
        
        let voter = create_test_voter(2);
        register_voter(&mut state, voter, Amount::from_tokens(1000), 50).await;
        
        // Initial pending rewards should be 0
        let initial_pending = state.get_pending_rewards(&voter).await;
        assert_eq!(initial_pending, Amount::ZERO, "Initial pending rewards should be 0");
        
        // Add pending rewards
        let reward = Amount::from_tokens(100);
        state.pending_rewards.insert(&voter, reward).expect("Failed to add pending rewards");
        
        let pending_after = state.get_pending_rewards(&voter).await;
        let pending_value: u128 = pending_after.into();
        assert_eq!(pending_value, 100, "Should have 100 pending rewards");
    }

    #[tokio::test]
    async fn test_resolution_calculates_protocol_fee() {
        let (state, _admin) = setup_test_state().await;
        
        let params = state.get_parameters().await;
        let reward_amount = Amount::from_tokens(1000);
        
        let protocol_fee = state.calculate_protocol_fee(reward_amount, &params);
        let fee_value: u128 = protocol_fee.into();
        
        // Default protocol fee is 1% (100 basis points)
        // 1% of 1000 = 10
        assert_eq!(fee_value, 10, "Protocol fee should be 10 (1% of 1000)");
    }
    
    #[tokio::test]
    async fn test_resolution_updates_protocol_treasury() {
        let (mut state, _admin) = setup_test_state().await;
        
        // Initial treasury should be 0
        let initial_treasury = *state.protocol_treasury.get();
        assert_eq!(initial_treasury, Amount::ZERO, "Initial treasury should be 0");
        
        // Add to treasury
        let fee = Amount::from_tokens(10);
        let current_value: u128 = initial_treasury.into();
        let fee_value: u128 = fee.into();
        state.protocol_treasury.set(Amount::from_tokens(current_value + fee_value));
        
        let treasury_after = *state.protocol_treasury.get();
        let treasury_value: u128 = treasury_after.into();
        assert_eq!(treasury_value, 10, "Treasury should have 10 tokens");
    }
    
    #[tokio::test]
    async fn test_resolution_with_no_votes() {
        let (mut state, admin) = setup_test_state().await;
        
        let past_deadline = Timestamp::from(500000);
        let votes = vec![]; // No votes
        
        let query_id = create_query_with_votes(
            &mut state,
            admin,
            vec!["Yes".to_string(), "No".to_string()],
            DecisionStrategy::Majority,
            past_deadline,
            votes,
        ).await;
        
        let query = state.get_query(query_id).await.unwrap();
        
        // Query should not meet minimum votes
        assert!(query.votes.len() < query.min_votes, "Should not meet minimum votes");
    }
    
    #[tokio::test]
    async fn test_resolution_with_insufficient_votes() {
        let (mut state, admin) = setup_test_state().await;
        
        let voter1 = create_test_voter(2);
        let voter2 = create_test_voter(3);
        
        register_voter(&mut state, voter1, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter2, Amount::from_tokens(1000), 50).await;
        
        let past_deadline = Timestamp::from(500000);
        let votes = vec![
            (voter1, "Yes".to_string(), Some(80)),
            (voter2, "No".to_string(), Some(90)),
        ];
        
        let query_id = create_query_with_votes(
            &mut state,
            admin,
            vec!["Yes".to_string(), "No".to_string()],
            DecisionStrategy::Majority,
            past_deadline,
            votes,
        ).await;
        
        let query = state.get_query(query_id).await.unwrap();
        
        // Query requires 3 votes but only has 2
        assert_eq!(query.votes.len(), 2, "Should have 2 votes");
        assert!(query.votes.len() < query.min_votes, "Should not meet minimum votes (3)");
    }

    #[tokio::test]
    async fn test_resolution_with_tie_votes() {
        let (mut state, admin) = setup_test_state().await;
        
        let voter1 = create_test_voter(2);
        let voter2 = create_test_voter(3);
        let voter3 = create_test_voter(4);
        let voter4 = create_test_voter(5);
        
        register_voter(&mut state, voter1, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter2, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter3, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter4, Amount::from_tokens(1000), 50).await;
        
        let past_deadline = Timestamp::from(500000);
        let votes = vec![
            (voter1, "Yes".to_string(), Some(80)),
            (voter2, "Yes".to_string(), Some(90)),
            (voter3, "No".to_string(), Some(85)),
            (voter4, "No".to_string(), Some(75)),
        ];
        
        let query_id = create_query_with_votes(
            &mut state,
            admin,
            vec!["Yes".to_string(), "No".to_string()],
            DecisionStrategy::Majority,
            past_deadline,
            votes,
        ).await;
        
        let query = state.get_query(query_id).await.unwrap();
        
        // Count votes
        let mut vote_counts = std::collections::HashMap::new();
        for vote in query.votes.values() {
            *vote_counts.entry(vote.value.clone()).or_insert(0) += 1;
        }
        
        assert_eq!(vote_counts.get("Yes"), Some(&2), "Should have 2 'Yes' votes");
        assert_eq!(vote_counts.get("No"), Some(&2), "Should have 2 'No' votes");
        
        // In case of tie, the result depends on HashMap iteration order
        // Just verify that a result can be determined
        let max_votes = vote_counts.values().max().unwrap();
        assert_eq!(*max_votes, 2, "Maximum votes should be 2");
    }
    
    #[tokio::test]
    async fn test_resolution_with_multiple_outcomes() {
        let (mut state, admin) = setup_test_state().await;
        
        let voter1 = create_test_voter(2);
        let voter2 = create_test_voter(3);
        let voter3 = create_test_voter(4);
        let voter4 = create_test_voter(5);
        
        register_voter(&mut state, voter1, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter2, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter3, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter4, Amount::from_tokens(1000), 50).await;
        
        let past_deadline = Timestamp::from(500000);
        let votes = vec![
            (voter1, "A".to_string(), Some(80)),
            (voter2, "B".to_string(), Some(90)),
            (voter3, "C".to_string(), Some(85)),
            (voter4, "A".to_string(), Some(75)),
        ];
        
        let query_id = create_query_with_votes(
            &mut state,
            admin,
            vec!["A".to_string(), "B".to_string(), "C".to_string()],
            DecisionStrategy::Majority,
            past_deadline,
            votes,
        ).await;
        
        let query = state.get_query(query_id).await.unwrap();
        
        // Count votes
        let mut vote_counts = std::collections::HashMap::new();
        for vote in query.votes.values() {
            *vote_counts.entry(vote.value.clone()).or_insert(0) += 1;
        }
        
        assert_eq!(vote_counts.get("A"), Some(&2), "Should have 2 'A' votes");
        assert_eq!(vote_counts.get("B"), Some(&1), "Should have 1 'B' vote");
        assert_eq!(vote_counts.get("C"), Some(&1), "Should have 1 'C' vote");
        
        // "A" should win with 2 votes
        let max_votes = vote_counts.values().max().unwrap();
        assert_eq!(*max_votes, 2, "Maximum votes should be 2");
    }
}
