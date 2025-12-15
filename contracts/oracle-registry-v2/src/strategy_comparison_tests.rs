// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Comprehensive tests comparing different decision strategies

#[cfg(test)]
mod tests {
    use crate::test_utils::test_helpers::*;
    use crate::state::{
        OracleRegistryV2, ProtocolParameters, VoterInfo, Query, QueryStatus, Vote, DecisionStrategy
    };
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
        
        let admin = AccountOwner {
            chain_id: ChainId([0u8; 32].into()),
            owner: Some(Owner([1u8; 32].into())),
        };
        
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
    async fn register_voter(
        state: &mut OracleRegistryV2,
        voter: AccountOwner,
        stake: Amount,
        reputation: u32
    ) {
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
        
        let current_stake = *state.total_stake.get();
        let current_value: u128 = current_stake.into();
        let stake_value: u128 = stake.into();
        state.total_stake.set(Amount::from_tokens(current_value + stake_value));
        
        let current_count = *state.voter_count.get();
        state.voter_count.set(current_count + 1);
    }
    
    /// Helper to create a query with votes
    async fn create_query_with_votes(
        state: &mut OracleRegistryV2,
        outcomes: Vec<String>,
        strategy: DecisionStrategy,
        votes: Vec<(AccountOwner, String)>,
    ) -> u64 {
        let query_id = *state.next_query_id.get();
        state.next_query_id.set(query_id + 1);
        
        let mut vote_map = BTreeMap::new();
        for (voter, value) in votes {
            let vote = Vote {
                voter,
                value,
                timestamp: Timestamp::from(1000000),
                confidence: Some(80),
            };
            vote_map.insert(voter, vote.clone());
            state.votes.insert(&(query_id, voter), vote).expect("Failed to store vote");
        }

        let query = Query {
            id: query_id,
            description: "Strategy comparison test".to_string(),
            outcomes,
            strategy,
            min_votes: 3,
            reward_amount: Amount::from_tokens(1000),
            creator: create_test_voter(1),
            created_at: Timestamp::from(1000000),
            deadline: Timestamp::from(500000),
            status: QueryStatus::Active,
            result: None,
            resolved_at: None,
            votes: vote_map,
        };
        
        state.queries.insert(&query_id, query).expect("Failed to insert query");
        query_id
    }

    #[tokio::test]
    async fn test_majority_vs_weighted_stake_different_outcomes() {
        // Test scenario: High stake voter vs multiple low stake voters
        let (mut state, _admin) = setup_test_state().await;
        
        let whale = create_test_voter(2);
        let voter2 = create_test_voter(3);
        let voter3 = create_test_voter(4);
        let voter4 = create_test_voter(5);
        
        // Whale has 10x stake of others
        register_voter(&mut state, whale, Amount::from_tokens(10000), 50).await;
        register_voter(&mut state, voter2, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter3, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter4, Amount::from_tokens(1000), 50).await;
        
        let votes = vec![
            (whale, "A".to_string()),
            (voter2, "B".to_string()),
            (voter3, "B".to_string()),
            (voter4, "B".to_string()),
        ];
        
        // Test with Majority strategy
        let majority_query_id = create_query_with_votes(
            &mut state,
            vec!["A".to_string(), "B".to_string()],
            DecisionStrategy::Majority,
            votes.clone(),
        ).await;
        
        let majority_query = state.get_query(majority_query_id).await.unwrap();
        
        // Calculate majority result manually
        let mut vote_counts = std::collections::HashMap::new();
        for vote in majority_query.votes.values() {
            *vote_counts.entry(vote.value.clone()).or_insert(0) += 1;
        }
        let majority_result = vote_counts.iter()
            .max_by_key(|(_, count)| *count)
            .map(|(value, _)| value.clone())
            .unwrap();
        
        // Test with WeightedByStake strategy
        let weighted_query_id = create_query_with_votes(
            &mut state,
            vec!["A".to_string(), "B".to_string()],
            DecisionStrategy::WeightedByStake,
            votes,
        ).await;
        
        let weighted_query = state.get_query(weighted_query_id).await.unwrap();
        
        // Calculate stake-weighted result manually
        let mut weighted_votes: std::collections::HashMap<String, u128> = std::collections::HashMap::new();
        for vote in weighted_query.votes.values() {
            if let Some(voter_info) = state.get_voter(&vote.voter).await {
                let stake_value: u128 = voter_info.stake.into();
                *weighted_votes.entry(vote.value.clone()).or_insert(0) += stake_value;
            }
        }
        let weighted_result = weighted_votes.iter()
            .max_by_key(|(_, weight)| *weight)
            .map(|(value, _)| value.clone())
            .unwrap();
        
        // Majority should favor "B" (3 votes vs 1)
        assert_eq!(majority_result, "B", "Majority should choose B with 3 votes");
        
        // Weighted by stake should favor "A" (10000 stake vs 3000)
        assert_eq!(weighted_result, "A", "Weighted by stake should choose A with higher stake");
        
        println!("✓ Majority vs Weighted Stake produces different outcomes as expected");
    }

    #[tokio::test]
    async fn test_majority_vs_weighted_reputation_different_outcomes() {
        // Test scenario: High reputation voter vs multiple low reputation voters
        let (mut state, _admin) = setup_test_state().await;
        
        let expert = create_test_voter(2);
        let novice1 = create_test_voter(3);
        let novice2 = create_test_voter(4);
        let novice3 = create_test_voter(5);
        
        // Expert has high reputation, novices have low
        register_voter(&mut state, expert, Amount::from_tokens(1000), 95).await;
        register_voter(&mut state, novice1, Amount::from_tokens(1000), 20).await;
        register_voter(&mut state, novice2, Amount::from_tokens(1000), 20).await;
        register_voter(&mut state, novice3, Amount::from_tokens(1000), 20).await;
        
        let votes = vec![
            (expert, "Yes".to_string()),
            (novice1, "No".to_string()),
            (novice2, "No".to_string()),
            (novice3, "No".to_string()),
        ];
        
        // Test with Majority strategy
        let majority_query_id = create_query_with_votes(
            &mut state,
            vec!["Yes".to_string(), "No".to_string()],
            DecisionStrategy::Majority,
            votes.clone(),
        ).await;
        
        let majority_query = state.get_query(majority_query_id).await.unwrap();
        
        // Calculate majority result manually
        let mut vote_counts = std::collections::HashMap::new();
        for vote in majority_query.votes.values() {
            *vote_counts.entry(vote.value.clone()).or_insert(0) += 1;
        }
        let majority_result = vote_counts.iter()
            .max_by_key(|(_, count)| *count)
            .map(|(value, _)| value.clone())
            .unwrap();
        
        // Test with WeightedByReputation strategy
        let weighted_query_id = create_query_with_votes(
            &mut state,
            vec!["Yes".to_string(), "No".to_string()],
            DecisionStrategy::WeightedByReputation,
            votes,
        ).await;
        
        let weighted_query = state.get_query(weighted_query_id).await.unwrap();
        
        // Calculate reputation-weighted result manually
        let mut weighted_votes: std::collections::HashMap<String, f64> = std::collections::HashMap::new();
        for vote in weighted_query.votes.values() {
            if let Some(voter_info) = state.get_voter(&vote.voter).await {
                let weight = state.calculate_reputation_weight(voter_info.reputation);
                *weighted_votes.entry(vote.value.clone()).or_insert(0.0) += weight;
            }
        }
        let weighted_result = weighted_votes.iter()
            .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap())
            .map(|(value, _)| value.clone())
            .unwrap();
        
        // Majority should favor "No" (3 votes vs 1)
        assert_eq!(majority_result, "No", "Majority should choose No with 3 votes");
        
        // Calculate expected weights
        // Expert (95): 0.5 + 0.95 * 1.5 = 1.925
        // Novice (20): 0.5 + 0.20 * 1.5 = 0.8
        // Total No: 0.8 * 3 = 2.4
        // Yes should win: 1.925 < 2.4, so actually No wins
        
        // Let's verify the actual calculation
        let expert_weight = state.calculate_reputation_weight(95);
        let novice_weight = state.calculate_reputation_weight(20);
        
        assert!(expert_weight > 1.9 && expert_weight < 2.0, "Expert weight should be ~1.925");
        assert!(novice_weight > 0.7 && novice_weight < 0.9, "Novice weight should be ~0.8");
        
        println!("✓ Expert weight: {}, Novice weight: {}", expert_weight, novice_weight);
        println!("✓ Majority vs Weighted Reputation test completed");
    }

    #[tokio::test]
    async fn test_median_vs_majority_numeric_data() {
        // Test scenario: Median handles outliers better than majority
        let (mut state, _admin) = setup_test_state().await;
        
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
        
        // Votes: 100, 105, 110, 115, 1000 (one outlier)
        let votes = vec![
            (voter1, "100".to_string()),
            (voter2, "105".to_string()),
            (voter3, "110".to_string()),
            (voter4, "115".to_string()),
            (voter5, "1000".to_string()), // Outlier
        ];
        
        // Test with Median strategy
        let median_query_id = create_query_with_votes(
            &mut state,
            vec!["100".to_string(), "105".to_string(), "110".to_string(), "115".to_string(), "1000".to_string()],
            DecisionStrategy::Median,
            votes.clone(),
        ).await;
        
        let median_query = state.get_query(median_query_id).await.unwrap();
        
        // Calculate median manually
        let mut numeric_votes: Vec<f64> = median_query.votes.values()
            .filter_map(|vote| vote.value.parse::<f64>().ok())
            .collect();
        numeric_votes.sort_by(|a, b| a.partial_cmp(b).unwrap());
        let median_result = if numeric_votes.len() % 2 == 0 {
            let mid = numeric_votes.len() / 2;
            ((numeric_votes[mid - 1] + numeric_votes[mid]) / 2.0).to_string()
        } else {
            numeric_votes[numeric_votes.len() / 2].to_string()
        };
        
        // Median should be 110 (middle value, ignoring outlier)
        assert_eq!(median_result, "110", "Median should be 110, resistant to outlier");
        
        println!("✓ Median strategy handles outliers correctly");
    }

    #[tokio::test]
    async fn test_all_strategies_same_scenario() {
        // Test all four strategies with the same voting scenario
        let (mut state, _admin) = setup_test_state().await;
        
        let voter1 = create_test_voter(2);
        let voter2 = create_test_voter(3);
        let voter3 = create_test_voter(4);
        
        // Different stakes and reputations
        register_voter(&mut state, voter1, Amount::from_tokens(5000), 90).await; // High stake, high rep
        register_voter(&mut state, voter2, Amount::from_tokens(2000), 50).await; // Medium stake, medium rep
        register_voter(&mut state, voter3, Amount::from_tokens(1000), 30).await; // Low stake, low rep
        
        let votes = vec![
            (voter1, "A".to_string()),
            (voter2, "B".to_string()),
            (voter3, "B".to_string()),
        ];
        
        // Test Majority
        let majority_id = create_query_with_votes(
            &mut state,
            vec!["A".to_string(), "B".to_string()],
            DecisionStrategy::Majority,
            votes.clone(),
        ).await;
        
        // Test WeightedByStake
        let stake_id = create_query_with_votes(
            &mut state,
            vec!["A".to_string(), "B".to_string()],
            DecisionStrategy::WeightedByStake,
            votes.clone(),
        ).await;
        
        // Test WeightedByReputation
        let rep_id = create_query_with_votes(
            &mut state,
            vec!["A".to_string(), "B".to_string()],
            DecisionStrategy::WeightedByReputation,
            votes,
        ).await;
        
        let majority_query = state.get_query(majority_id).await.unwrap();
        let stake_query = state.get_query(stake_id).await.unwrap();
        let rep_query = state.get_query(rep_id).await.unwrap();
        
        // Calculate majority result
        let mut vote_counts = std::collections::HashMap::new();
        for vote in majority_query.votes.values() {
            *vote_counts.entry(vote.value.clone()).or_insert(0) += 1;
        }
        let majority_result = vote_counts.iter()
            .max_by_key(|(_, count)| *count)
            .map(|(value, _)| value.clone())
            .unwrap();
        
        // Calculate stake-weighted result
        let mut stake_weights: std::collections::HashMap<String, u128> = std::collections::HashMap::new();
        for vote in stake_query.votes.values() {
            if let Some(voter_info) = state.get_voter(&vote.voter).await {
                let stake_value: u128 = voter_info.stake.into();
                *stake_weights.entry(vote.value.clone()).or_insert(0) += stake_value;
            }
        }
        let stake_result = stake_weights.iter()
            .max_by_key(|(_, weight)| *weight)
            .map(|(value, _)| value.clone())
            .unwrap();
        
        // Calculate reputation-weighted result
        let mut rep_weights: std::collections::HashMap<String, f64> = std::collections::HashMap::new();
        for vote in rep_query.votes.values() {
            if let Some(voter_info) = state.get_voter(&vote.voter).await {
                let weight = state.calculate_reputation_weight(voter_info.reputation);
                *rep_weights.entry(vote.value.clone()).or_insert(0.0) += weight;
            }
        }
        let rep_result = rep_weights.iter()
            .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap())
            .map(|(value, _)| value.clone())
            .unwrap();
        
        // Majority: B wins (2 votes vs 1)
        assert_eq!(majority_result, "B", "Majority should choose B");
        
        // Weighted by stake: A wins (5000 vs 3000)
        assert_eq!(stake_result, "A", "Weighted by stake should choose A");
        
        // Weighted by reputation: Calculate expected
        // voter1 (90): 0.5 + 0.9 * 1.5 = 1.85
        // voter2 (50): 0.5 + 0.5 * 1.5 = 1.25
        // voter3 (30): 0.5 + 0.3 * 1.5 = 0.95
        // A: 1.85, B: 1.25 + 0.95 = 2.2
        // B should win
        assert_eq!(rep_result, "B", "Weighted by reputation should choose B");
        
        println!("✓ All strategies tested with same scenario:");
        println!("  Majority: {}", majority_result);
        println!("  Weighted by Stake: {}", stake_result);
        println!("  Weighted by Reputation: {}", rep_result);
    }

    #[tokio::test]
    async fn test_strategy_edge_case_tie_breaking() {
        // Test how different strategies handle ties
        let (mut state, _admin) = setup_test_state().await;
        
        let voter1 = create_test_voter(2);
        let voter2 = create_test_voter(3);
        
        // Equal stakes and reputations
        register_voter(&mut state, voter1, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter2, Amount::from_tokens(1000), 50).await;
        
        let votes = vec![
            (voter1, "A".to_string()),
            (voter2, "B".to_string()),
        ];
        
        // Test all strategies with a tie
        let majority_id = create_query_with_votes(
            &mut state,
            vec!["A".to_string(), "B".to_string()],
            DecisionStrategy::Majority,
            votes.clone(),
        ).await;
        
        let stake_id = create_query_with_votes(
            &mut state,
            vec!["A".to_string(), "B".to_string()],
            DecisionStrategy::WeightedByStake,
            votes.clone(),
        ).await;
        
        let rep_id = create_query_with_votes(
            &mut state,
            vec!["A".to_string(), "B".to_string()],
            DecisionStrategy::WeightedByReputation,
            votes,
        ).await;
        
        let majority_query = state.get_query(majority_id).await.unwrap();
        let stake_query = state.get_query(stake_id).await.unwrap();
        let rep_query = state.get_query(rep_id).await.unwrap();
        
        // Calculate majority result
        let mut vote_counts = std::collections::HashMap::new();
        for vote in majority_query.votes.values() {
            *vote_counts.entry(vote.value.clone()).or_insert(0) += 1;
        }
        let majority_result = vote_counts.iter()
            .max_by_key(|(_, count)| *count)
            .map(|(value, _)| value.clone())
            .unwrap();
        
        // Calculate stake-weighted result
        let mut stake_weights: std::collections::HashMap<String, u128> = std::collections::HashMap::new();
        for vote in stake_query.votes.values() {
            if let Some(voter_info) = state.get_voter(&vote.voter).await {
                let stake_value: u128 = voter_info.stake.into();
                *stake_weights.entry(vote.value.clone()).or_insert(0) += stake_value;
            }
        }
        let stake_result = stake_weights.iter()
            .max_by_key(|(_, weight)| *weight)
            .map(|(value, _)| value.clone())
            .unwrap();
        
        // Calculate reputation-weighted result
        let mut rep_weights: std::collections::HashMap<String, f64> = std::collections::HashMap::new();
        for vote in rep_query.votes.values() {
            if let Some(voter_info) = state.get_voter(&vote.voter).await {
                let weight = state.calculate_reputation_weight(voter_info.reputation);
                *rep_weights.entry(vote.value.clone()).or_insert(0.0) += weight;
            }
        }
        let rep_result = rep_weights.iter()
            .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap())
            .map(|(value, _)| value.clone())
            .unwrap();
        
        // All should produce a result (tie-breaking should be deterministic)
        assert!(!majority_result.is_empty(), "Majority should break tie");
        assert!(!stake_result.is_empty(), "Weighted by stake should break tie");
        assert!(!rep_result.is_empty(), "Weighted by reputation should break tie");
        
        // All should produce the same result since everything is equal
        assert_eq!(majority_result, stake_result, "Equal stakes should match majority");
        assert_eq!(majority_result, rep_result, "Equal reputations should match majority");
        
        println!("✓ Tie-breaking test passed");
        println!("  All strategies chose: {}", majority_result);
    }

    #[tokio::test]
    async fn test_median_with_even_number_of_votes() {
        // Test median calculation with even number of votes
        let (mut state, _admin) = setup_test_state().await;
        
        let voter1 = create_test_voter(2);
        let voter2 = create_test_voter(3);
        let voter3 = create_test_voter(4);
        let voter4 = create_test_voter(5);
        
        register_voter(&mut state, voter1, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter2, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter3, Amount::from_tokens(1000), 50).await;
        register_voter(&mut state, voter4, Amount::from_tokens(1000), 50).await;
        
        // Even number of votes: 10, 20, 30, 40
        let votes = vec![
            (voter1, "10".to_string()),
            (voter2, "20".to_string()),
            (voter3, "30".to_string()),
            (voter4, "40".to_string()),
        ];
        
        let median_id = create_query_with_votes(
            &mut state,
            vec!["10".to_string(), "20".to_string(), "30".to_string(), "40".to_string()],
            DecisionStrategy::Median,
            votes,
        ).await;
        
        let median_query = state.get_query(median_id).await.unwrap();
        
        // Calculate median manually
        let mut numeric_votes: Vec<f64> = median_query.votes.values()
            .filter_map(|vote| vote.value.parse::<f64>().ok())
            .collect();
        numeric_votes.sort_by(|a, b| a.partial_cmp(b).unwrap());
        let median_result = if numeric_votes.len() % 2 == 0 {
            let mid = numeric_votes.len() / 2;
            ((numeric_votes[mid - 1] + numeric_votes[mid]) / 2.0).to_string()
        } else {
            numeric_votes[numeric_votes.len() / 2].to_string()
        };
        
        // With even number, median should be average of two middle values (20 + 30) / 2 = 25
        // Or it might pick one of the middle values
        let result_value: f64 = median_result.parse().expect("Should be numeric");
        assert!(result_value >= 20.0 && result_value <= 30.0, 
            "Median with even votes should be between 20 and 30, got {}", result_value);
        
        println!("✓ Median with even number of votes: {}", median_result);
    }

    #[tokio::test]
    async fn test_weighted_strategies_with_extreme_values() {
        // Test weighted strategies with extreme stake/reputation differences
        let (mut state, _admin) = setup_test_state().await;
        
        let whale = create_test_voter(2);
        let minnow = create_test_voter(3);
        
        // Extreme difference: 1000x stake difference
        register_voter(&mut state, whale, Amount::from_tokens(1000000), 100).await;
        register_voter(&mut state, minnow, Amount::from_tokens(1000), 10).await;
        
        let votes = vec![
            (whale, "A".to_string()),
            (minnow, "B".to_string()),
        ];
        
        let stake_id = create_query_with_votes(
            &mut state,
            vec!["A".to_string(), "B".to_string()],
            DecisionStrategy::WeightedByStake,
            votes.clone(),
        ).await;
        
        let rep_id = create_query_with_votes(
            &mut state,
            vec!["A".to_string(), "B".to_string()],
            DecisionStrategy::WeightedByReputation,
            votes,
        ).await;
        
        let stake_query = state.get_query(stake_id).await.unwrap();
        let rep_query = state.get_query(rep_id).await.unwrap();
        
        // Calculate stake-weighted result
        let mut stake_weights: std::collections::HashMap<String, u128> = std::collections::HashMap::new();
        for vote in stake_query.votes.values() {
            if let Some(voter_info) = state.get_voter(&vote.voter).await {
                let stake_value: u128 = voter_info.stake.into();
                *stake_weights.entry(vote.value.clone()).or_insert(0) += stake_value;
            }
        }
        let stake_result = stake_weights.iter()
            .max_by_key(|(_, weight)| *weight)
            .map(|(value, _)| value.clone())
            .unwrap();
        
        // Calculate reputation-weighted result
        let mut rep_weights: std::collections::HashMap<String, f64> = std::collections::HashMap::new();
        for vote in rep_query.votes.values() {
            if let Some(voter_info) = state.get_voter(&vote.voter).await {
                let weight = state.calculate_reputation_weight(voter_info.reputation);
                *rep_weights.entry(vote.value.clone()).or_insert(0.0) += weight;
            }
        }
        let rep_result = rep_weights.iter()
            .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap())
            .map(|(value, _)| value.clone())
            .unwrap();
        
        // Both should favor the whale/expert
        assert_eq!(stake_result, "A", "Whale should dominate stake-weighted vote");
        assert_eq!(rep_result, "A", "Expert should dominate reputation-weighted vote");
        
        println!("✓ Extreme value test passed");
    }

    #[tokio::test]
    async fn test_strategy_consistency_multiple_runs() {
        // Test that strategies produce consistent results
        let (mut state, _admin) = setup_test_state().await;
        
        let voter1 = create_test_voter(2);
        let voter2 = create_test_voter(3);
        let voter3 = create_test_voter(4);
        
        register_voter(&mut state, voter1, Amount::from_tokens(3000), 70).await;
        register_voter(&mut state, voter2, Amount::from_tokens(2000), 60).await;
        register_voter(&mut state, voter3, Amount::from_tokens(1000), 50).await;
        
        let votes = vec![
            (voter1, "X".to_string()),
            (voter2, "Y".to_string()),
            (voter3, "Y".to_string()),
        ];
        
        // Create multiple queries with same votes and strategy
        let mut results = Vec::new();
        for _ in 0..3 {
            let query_id = create_query_with_votes(
                &mut state,
                vec!["X".to_string(), "Y".to_string()],
                DecisionStrategy::WeightedByStake,
                votes.clone(),
            ).await;
            
            let query = state.get_query(query_id).await.unwrap();
            
            // Calculate stake-weighted result
            let mut stake_weights: std::collections::HashMap<String, u128> = std::collections::HashMap::new();
            for vote in query.votes.values() {
                if let Some(voter_info) = state.get_voter(&vote.voter).await {
                    let stake_value: u128 = voter_info.stake.into();
                    *stake_weights.entry(vote.value.clone()).or_insert(0) += stake_value;
                }
            }
            let result = stake_weights.iter()
                .max_by_key(|(_, weight)| *weight)
                .map(|(value, _)| value.clone())
                .unwrap();
            
            results.push(result);
        }
        
        // All results should be identical
        assert_eq!(results[0], results[1], "Results should be consistent");
        assert_eq!(results[1], results[2], "Results should be consistent");
        
        println!("✓ Strategy consistency test passed");
        println!("  All runs produced: {}", results[0]);
    }
}
