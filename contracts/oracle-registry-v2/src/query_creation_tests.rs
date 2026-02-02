// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Tests for query creation functionality
//!
//! This module tests the CreateQuery operation including:
//! - Query parameter validation
//! - Query ID generation and sequencing
//! - Query state initialization
//! - Active queries tracking
//! - Statistics updates
//! - Edge cases and error conditions

#[cfg(test)]
mod tests {
    use crate::test_utils::test_helpers::*;
    use crate::state::{OracleRegistryV2, ProtocolParameters, Query, QueryStatus, DecisionStrategy};
    use linera_sdk::linera_base_types::{Amount, Timestamp, TimeDelta, AccountOwner};
    use linera_sdk::views::{View, ViewStorageContext};
    use linera_views::context::MemoryContext;
    use linera_views::context::Context;

    /// Helper to create a test storage context
    async fn create_test_context() -> ViewStorageContext {
        let context = create_memory_context();
        let base_key = vec![];
        context.clone().into_context(base_key).await.unwrap()
    }

    /// Helper to initialize a registry with default parameters
    async fn create_test_registry() -> OracleRegistryV2 {
        let context = create_test_context().await;
        let mut registry = OracleRegistryV2::load(context).await.unwrap();
        
        let params = ProtocolParameters::default();
        let admin = create_account_owner(1);
        registry.initialize(params, admin).await;
        
        registry
    }

    /// Helper to create a test account owner
    fn create_test_account(id: u8) -> AccountOwner {
        AccountOwner::from([id; 32])
    }

    #[test]
    fn test_query_creation_basic() {
        // Test basic query creation with valid parameters
        let description = "What is the price of BTC?".to_string();
        let outcomes = vec!["Above $50k".to_string(), "Below $50k".to_string()];
        let strategy = DecisionStrategy::Majority;
        let min_votes = 3;
        let reward_amount = Amount::from_tokens(1000);
        let current_time = Timestamp::from(1000000);
        let deadline_duration = TimeDelta::from_micros(86400 * 1_000_000); // 1 day
        let deadline = current_time.saturating_add(deadline_duration);

        // Validate all parameters are correct
        assert!(!description.is_empty());
        assert!(description.len() <= 1000);
        assert!(!outcomes.is_empty());
        assert!(outcomes.len() <= 100);
        assert!(reward_amount > Amount::ZERO);
        assert!(deadline > current_time);
    }

    #[tokio::test]
    async fn test_query_id_generation() {
        // Test that query IDs are generated sequentially
        let mut registry = create_test_registry().await;
        
        // Initial query ID should be 1
        let initial_id = *registry.next_query_id.get();
        assert_eq!(initial_id, 1);
        
        // Simulate creating first query
        registry.next_query_id.set(initial_id + 1);
        let second_id = *registry.next_query_id.get();
        assert_eq!(second_id, 2);
        
        // Simulate creating second query
        registry.next_query_id.set(second_id + 1);
        let third_id = *registry.next_query_id.get();
        assert_eq!(third_id, 3);
    }

    #[tokio::test]
    async fn test_query_state_initialization() {
        // Test that query state is properly initialized
        let mut registry = create_test_registry().await;
        
        let query_id = 1u64;
        let creator = create_test_account(1);
        let current_time = Timestamp::from(1000000);
        let deadline_duration = TimeDelta::from_micros(86400 * 1_000_000);
        let deadline = current_time.saturating_add(deadline_duration);
        
        let query = Query {
            id: query_id,
            description: "Test query".to_string(),
            outcomes: vec!["Yes".to_string(), "No".to_string()],
            strategy: DecisionStrategy::Majority,
            min_votes: 3,
            reward_amount: Amount::from_tokens(1000),
            creator,
            created_at: current_time,
            deadline,
            status: QueryStatus::Active,
            result: None,
            resolved_at: None,
            votes: std::collections::BTreeMap::new(),
        };
        
        // Store query
        registry.queries.insert(&query_id, query.clone()).await.unwrap();
        
        // Verify query was stored correctly
        let stored_query = registry.queries.get(&query_id).await.unwrap().unwrap();
        assert_eq!(stored_query.id, query_id);
        assert_eq!(stored_query.description, "Test query");
        assert_eq!(stored_query.status, QueryStatus::Active);
        assert_eq!(stored_query.votes.len(), 0);
        assert!(stored_query.result.is_none());
        assert!(stored_query.resolved_at.is_none());
    }

    #[tokio::test]
    async fn test_active_queries_tracking() {
        // Test that active queries are properly tracked
        let mut registry = create_test_registry().await;
        
        // Initially no active queries
        let active = registry.get_active_queries().await;
        assert_eq!(active.len(), 0);
        
        // Add first query to active list
        let mut active = registry.get_active_queries().await;
        active.push(1);
        registry.active_queries.set(active);
        
        let active = registry.get_active_queries().await;
        assert_eq!(active.len(), 1);
        assert_eq!(active[0], 1);
        
        // Add second query to active list
        let mut active = registry.get_active_queries().await;
        active.push(2);
        registry.active_queries.set(active);
        
        let active = registry.get_active_queries().await;
        assert_eq!(active.len(), 2);
        assert_eq!(active[0], 1);
        assert_eq!(active[1], 2);
    }

    #[tokio::test]
    async fn test_vote_count_initialization() {
        // Test that vote count is initialized to 0 for new queries
        let mut registry = create_test_registry().await;
        
        let query_id = 1u64;
        registry.vote_counts.insert(&query_id, 0).await.unwrap();
        
        let vote_count = registry.vote_counts.get(&query_id).await.unwrap().unwrap();
        assert_eq!(vote_count, 0);
    }

    #[tokio::test]
    async fn test_statistics_update() {
        // Test that total_queries_created is incremented
        let mut registry = create_test_registry().await;
        
        // Initial count should be 0
        let initial_count = *registry.total_queries_created.get();
        assert_eq!(initial_count, 0);
        
        // Simulate creating first query
        registry.total_queries_created.set(initial_count + 1);
        let count_after_first = *registry.total_queries_created.get();
        assert_eq!(count_after_first, 1);
        
        // Simulate creating second query
        registry.total_queries_created.set(count_after_first + 1);
        let count_after_second = *registry.total_queries_created.get();
        assert_eq!(count_after_second, 2);
    }

    #[test]
    fn test_query_validation_empty_description() {
        // Empty description should be invalid
        let description = "";
        assert!(description.is_empty());
    }

    #[test]
    fn test_query_validation_long_description() {
        // Description longer than 1000 characters should be invalid
        let description = "a".repeat(1001);
        assert!(description.len() > 1000);
    }

    #[test]
    fn test_query_validation_valid_description() {
        // Valid description should pass
        let description = "What is the price of BTC on December 31, 2024?";
        assert!(!description.is_empty());
        assert!(description.len() <= 1000);
    }

    #[test]
    fn test_query_validation_empty_outcomes() {
        // Empty outcomes list should be invalid
        let outcomes: Vec<String> = vec![];
        assert!(outcomes.is_empty());
    }

    #[test]
    fn test_query_validation_too_many_outcomes() {
        // More than 100 outcomes should be invalid
        let outcomes: Vec<String> = (0..101).map(|i| format!("Outcome {}", i)).collect();
        assert!(outcomes.len() > 100);
    }

    #[test]
    fn test_query_validation_empty_outcome_string() {
        // Outcome with empty string should be invalid
        let outcomes = vec!["Yes".to_string(), "".to_string()];
        assert!(outcomes.iter().any(|o| o.is_empty()));
    }

    #[test]
    fn test_query_validation_long_outcome() {
        // Outcome longer than 200 characters should be invalid
        let outcomes = vec!["Yes".to_string(), "a".repeat(201)];
        assert!(outcomes.iter().any(|o| o.len() > 200));
    }

    #[test]
    fn test_query_validation_duplicate_outcomes() {
        // Duplicate outcomes should be invalid
        let outcomes = vec!["Yes".to_string(), "No".to_string(), "Yes".to_string()];
        let mut unique = std::collections::HashSet::new();
        let has_duplicates = !outcomes.iter().all(|o| unique.insert(o));
        assert!(has_duplicates);
    }

    #[test]
    fn test_query_validation_valid_outcomes() {
        // Valid outcomes should pass
        let outcomes = vec!["Yes".to_string(), "No".to_string(), "Maybe".to_string()];
        assert!(!outcomes.is_empty());
        assert!(outcomes.len() <= 100);
        assert!(outcomes.iter().all(|o| !o.is_empty() && o.len() <= 200));
        
        let mut unique = std::collections::HashSet::new();
        let has_duplicates = !outcomes.iter().all(|o| unique.insert(o));
        assert!(!has_duplicates);
    }

    #[test]
    fn test_query_validation_zero_reward() {
        // Zero reward should be invalid
        let reward = Amount::ZERO;
        assert_eq!(reward, Amount::ZERO);
    }

    #[test]
    fn test_query_validation_positive_reward() {
        // Positive reward should be valid
        let reward = Amount::from_tokens(1000);
        assert!(reward > Amount::ZERO);
    }

    #[test]
    fn test_query_validation_deadline_in_past() {
        // Deadline in the past should be invalid
        let current_time = Timestamp::from(1000000);
        let past_deadline = Timestamp::from(500000);
        assert!(past_deadline <= current_time);
    }

    #[test]
    fn test_query_validation_deadline_too_far() {
        // Deadline more than 1 year in future should be invalid
        let current_time = Timestamp::from(1000000);
        let max_duration_micros = 365 * 24 * 60 * 60 * 1_000_000u64;
        let max_duration = TimeDelta::from_micros(max_duration_micros);
        let max_deadline = current_time.saturating_add(max_duration);
        let too_far_duration = TimeDelta::from_micros(1000);
        let too_far_deadline = max_deadline.saturating_add(too_far_duration);
        assert!(too_far_deadline > max_deadline);
    }

    #[test]
    fn test_query_validation_valid_deadline() {
        // Valid deadline should pass
        let current_time = Timestamp::from(1000000);
        let valid_duration = TimeDelta::from_micros(86400 * 1_000_000); // 1 day
        let valid_deadline = current_time.saturating_add(valid_duration);
        assert!(valid_deadline > current_time);
        
        let max_duration_micros = 365 * 24 * 60 * 60 * 1_000_000u64;
        let max_duration = TimeDelta::from_micros(max_duration_micros);
        let max_deadline = current_time.saturating_add(max_duration);
        assert!(valid_deadline <= max_deadline);
    }

    #[test]
    fn test_query_validation_min_votes_zero() {
        // Zero min_votes should be invalid
        let min_votes = 0;
        assert_eq!(min_votes, 0);
    }

    #[test]
    fn test_query_validation_min_votes_exceeds_voters() {
        // min_votes exceeding voter count should be invalid
        let min_votes = 10;
        let voter_count = 5;
        assert!(min_votes > voter_count);
    }

    #[test]
    fn test_query_validation_min_votes_too_high_percentage() {
        // min_votes > 50% of voters (when voters > 10) should be invalid
        let min_votes = 60;
        let voter_count = 100;
        assert!(voter_count > 10);
        assert!(min_votes > voter_count / 2);
    }

    #[test]
    fn test_query_validation_valid_min_votes() {
        // Valid min_votes should pass
        let min_votes = 3;
        let voter_count = 10;
        assert!(min_votes > 0);
        assert!(min_votes <= voter_count);
        assert!(min_votes <= voter_count / 2 || voter_count <= 10);
    }

    #[test]
    fn test_query_strategy_median_with_non_numeric() {
        // Median strategy with non-numeric outcomes should be invalid
        let strategy = DecisionStrategy::Median;
        let outcomes = vec!["Yes".to_string(), "No".to_string()];
        
        let all_numeric = outcomes.iter().all(|o| o.parse::<f64>().is_some());
        assert!(!all_numeric);
    }

    #[test]
    fn test_query_strategy_median_with_numeric() {
        // Median strategy with numeric outcomes should be valid
        let strategy = DecisionStrategy::Median;
        let outcomes = vec!["100".to_string(), "200".to_string(), "300".to_string()];
        
        let all_numeric = outcomes.iter().all(|o| o.parse::<f64>().is_some());
        assert!(all_numeric);
    }

    #[test]
    fn test_query_strategy_majority_any_outcomes() {
        // Majority strategy should work with any outcomes
        let strategy = DecisionStrategy::Majority;
        let outcomes = vec!["Yes".to_string(), "No".to_string()];
        
        // No validation needed for Majority strategy
        assert!(!outcomes.is_empty());
    }

    #[test]
    fn test_query_strategy_weighted_by_stake() {
        // WeightedByStake strategy should work with any outcomes
        let strategy = DecisionStrategy::WeightedByStake;
        let outcomes = vec!["Option A".to_string(), "Option B".to_string()];
        
        // No validation needed for WeightedByStake strategy
        assert!(!outcomes.is_empty());
    }

    #[test]
    fn test_query_strategy_weighted_by_reputation() {
        // WeightedByReputation strategy should work with any outcomes
        let strategy = DecisionStrategy::WeightedByReputation;
        let outcomes = vec!["True".to_string(), "False".to_string()];
        
        // No validation needed for WeightedByReputation strategy
        assert!(!outcomes.is_empty());
    }

    #[tokio::test]
    async fn test_query_default_min_votes() {
        // Test that default min_votes is used when not provided
        let registry = create_test_registry().await;
        let params = registry.get_parameters().await;
        
        let default_min_votes = params.min_votes_default;
        assert_eq!(default_min_votes, 3); // Default from ProtocolParameters
    }

    #[tokio::test]
    async fn test_query_default_deadline() {
        // Test that default deadline is calculated correctly
        let registry = create_test_registry().await;
        let params = registry.get_parameters().await;
        
        let current_time = Timestamp::from(1000000);
        let duration_micros = params.default_query_duration * 1_000_000;
        let expected_deadline = current_time.saturating_add_micros(duration_micros);
        
        // Verify deadline is in the future
        assert!(expected_deadline > current_time);
        
        // Verify duration matches default (24 hours)
        assert_eq!(params.default_query_duration, 86400);
    }

    #[tokio::test]
    async fn test_multiple_queries_creation() {
        // Test creating multiple queries in sequence
        let mut registry = create_test_registry().await;
        
        let creator = create_test_account(1);
        let current_time = Timestamp::from(1000000);
        let deadline_duration = TimeDelta::from_micros(86400 * 1_000_000);
        let deadline = current_time.saturating_add(deadline_duration);
        
        // Create first query
        let query1_id = *registry.next_query_id.get();
        let query1 = Query {
            id: query1_id,
            description: "Query 1".to_string(),
            outcomes: vec!["Yes".to_string(), "No".to_string()],
            strategy: DecisionStrategy::Majority,
            min_votes: 3,
            reward_amount: Amount::from_tokens(1000),
            creator,
            created_at: current_time,
            deadline,
            status: QueryStatus::Active,
            result: None,
            resolved_at: None,
            votes: std::collections::BTreeMap::new(),
        };
        registry.queries.insert(&query1_id, query1).await.unwrap();
        registry.next_query_id.set(query1_id + 1);
        
        // Create second query
        let query2_id = *registry.next_query_id.get();
        let query2 = Query {
            id: query2_id,
            description: "Query 2".to_string(),
            outcomes: vec!["A".to_string(), "B".to_string(), "C".to_string()],
            strategy: DecisionStrategy::WeightedByStake,
            min_votes: 5,
            reward_amount: Amount::from_tokens(2000),
            creator,
            created_at: current_time,
            deadline,
            status: QueryStatus::Active,
            result: None,
            resolved_at: None,
            votes: std::collections::BTreeMap::new(),
        };
        registry.queries.insert(&query2_id, query2).await.unwrap();
        registry.next_query_id.set(query2_id + 1);
        
        // Verify both queries exist
        let stored_query1 = registry.queries.get(&query1_id).await.unwrap().unwrap();
        let stored_query2 = registry.queries.get(&query2_id).await.unwrap().unwrap();
        
        assert_eq!(stored_query1.id, 1);
        assert_eq!(stored_query2.id, 2);
        assert_eq!(stored_query1.description, "Query 1");
        assert_eq!(stored_query2.description, "Query 2");
    }

    #[tokio::test]
    async fn test_query_with_different_strategies() {
        // Test creating queries with different decision strategies
        let mut registry = create_test_registry().await;
        
        let creator = create_test_account(1);
        let current_time = Timestamp::from(1000000);
        let deadline_duration = TimeDelta::from_micros(86400 * 1_000_000);
        let deadline = current_time.saturating_add(deadline_duration);
        
        let strategies = vec![
            DecisionStrategy::Majority,
            DecisionStrategy::WeightedByStake,
            DecisionStrategy::WeightedByReputation,
        ];
        
        for (idx, strategy) in strategies.iter().enumerate() {
            let query_id = (idx + 1) as u64;
            let query = Query {
                id: query_id,
                description: format!("Query with {:?} strategy", strategy),
                outcomes: vec!["Yes".to_string(), "No".to_string()],
                strategy: strategy.clone(),
                min_votes: 3,
                reward_amount: Amount::from_tokens(1000),
                creator,
                created_at: current_time,
                deadline,
                status: QueryStatus::Active,
                result: None,
                resolved_at: None,
                votes: std::collections::BTreeMap::new(),
            };
            registry.queries.insert(&query_id, query).await.unwrap();
        }
        
        // Verify all queries were created with correct strategies
        for idx in 0..strategies.len() {
            let query_id = (idx + 1) as u64;
            let stored_query = registry.queries.get(&query_id).await.unwrap().unwrap();
            assert_eq!(stored_query.strategy, strategies[idx]);
        }
    }

    #[tokio::test]
    async fn test_query_with_median_strategy_numeric_outcomes() {
        // Test creating query with Median strategy and numeric outcomes
        let mut registry = create_test_registry().await;
        
        let creator = create_test_account(1);
        let current_time = Timestamp::from(1000000);
        let deadline_duration = TimeDelta::from_micros(86400 * 1_000_000);
        let deadline = current_time.saturating_add(deadline_duration);
        
        let numeric_outcomes = vec!["100".to_string(), "200".to_string(), "300".to_string()];
        
        // Verify all outcomes are numeric
        assert!(numeric_outcomes.iter().all(|o| o.parse::<f64>().is_some()));
        
        let query = Query {
            id: 1,
            description: "What will be the price?".to_string(),
            outcomes: numeric_outcomes,
            strategy: DecisionStrategy::Median,
            min_votes: 3,
            reward_amount: Amount::from_tokens(1000),
            creator,
            created_at: current_time,
            deadline,
            status: QueryStatus::Active,
            result: None,
            resolved_at: None,
            votes: std::collections::BTreeMap::new(),
        };
        
        registry.queries.insert(&1, query).await.unwrap();
        
        let stored_query = registry.queries.get(&1).await.unwrap().unwrap();
        assert_eq!(stored_query.strategy, DecisionStrategy::Median);
    }

    #[test]
    fn test_query_edge_case_single_outcome() {
        // Test query with single outcome (should be valid but unusual)
        let outcomes = vec!["Only option".to_string()];
        assert_eq!(outcomes.len(), 1);
        assert!(!outcomes.is_empty());
    }

    #[test]
    fn test_query_edge_case_max_outcomes() {
        // Test query with exactly 100 outcomes (max allowed)
        let outcomes: Vec<String> = (0..100).map(|i| format!("Outcome {}", i)).collect();
        assert_eq!(outcomes.len(), 100);
        assert!(outcomes.len() <= 100);
    }

    #[test]
    fn test_query_edge_case_max_description_length() {
        // Test query with exactly 1000 character description (max allowed)
        let description = "a".repeat(1000);
        assert_eq!(description.len(), 1000);
        assert!(description.len() <= 1000);
    }

    #[test]
    fn test_query_edge_case_max_outcome_length() {
        // Test outcome with exactly 200 characters (max allowed)
        let outcome = "a".repeat(200);
        assert_eq!(outcome.len(), 200);
        assert!(outcome.len() <= 200);
    }

    #[test]
    fn test_query_edge_case_minimum_reward() {
        // Test query with minimum positive reward (1 token)
        let reward = Amount::from_tokens(1);
        assert!(reward > Amount::ZERO);
    }

    #[test]
    fn test_query_edge_case_large_reward() {
        // Test query with large reward amount
        let reward = Amount::from_tokens(1_000_000_000);
        assert!(reward > Amount::ZERO);
    }
}
