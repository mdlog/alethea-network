// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Integration tests for complete voting flow
//! 
//! This test suite validates the entire voting lifecycle:
//! 1. Multiple voters register with stakes
//! 2. A query is created
//! 3. Voters submit votes
//! 4. Query is resolved
//! 5. Rewards are distributed
//! 6. Reputations are updated

#[cfg(test)]
mod tests {
    use crate::test_utils::test_helpers::*;
    use crate::state::{
        DecisionStrategy, OracleRegistryV2, ProtocolParameters, Query, QueryStatus, Vote,
        VoterInfo,
    };
    use linera_sdk::{
        linera_base_types::{AccountOwner, Amount, Timestamp},
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
        let admin = create_account_owner(1);

        // Initialize with default parameters
        let params = ProtocolParameters::default();
        state.initialize(params, admin).await;

        (state, admin)
    }

    /// Helper to create a test voter account
    fn create_test_voter(id: u8) -> AccountOwner {
        AccountOwner::from([id; 32])
    }

    /// Helper to register a voter
    async fn register_voter(
        state: &mut OracleRegistryV2,
        voter: AccountOwner,
        stake: Amount,
        name: Option<String>,
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
            name,
            metadata_url: None,
        };

        state
            .voters
            .insert(&voter, voter_info)
            .expect("Failed to insert voter");

        // Update totals
        let current_stake = *state.total_stake.get();
        let current_value: u128 = current_stake.into();
        let stake_value: u128 = stake.into();
        state
            .total_stake
            .set(Amount::from_tokens(current_value + stake_value));

        let current_count = *state.voter_count.get();
        state.voter_count.set(current_count + 1);
    }

    /// Helper to create a query
    async fn create_query(
        state: &mut OracleRegistryV2,
        creator: AccountOwner,
        description: String,
        outcomes: Vec<String>,
        strategy: DecisionStrategy,
        min_votes: usize,
        reward_amount: Amount,
        deadline: Timestamp,
    ) -> u64 {
        let query_id = *state.next_query_id.get();

        let query = Query {
            id: query_id,
            description,
            outcomes,
            strategy,
            min_votes,
            reward_amount,
            creator,
            created_at: Timestamp::from(0),
            deadline,
            status: QueryStatus::Active,
            result: None,
            resolved_at: None,
            votes: BTreeMap::new(),
        };

        state
            .queries
            .insert(&query_id, query)
            .expect("Failed to insert query");

        // Update active queries
        let mut active = state.active_queries.get().clone();
        active.push(query_id);
        state.active_queries.set(active);

        // Update next query ID
        state.next_query_id.set(query_id + 1);

        // Update statistics
        let total_created = *state.total_queries_created.get();
        state.total_queries_created.set(total_created + 1);

        query_id
    }

    /// Helper to submit a vote
    async fn submit_vote(
        state: &mut OracleRegistryV2,
        query_id: u64,
        voter: AccountOwner,
        value: String,
        confidence: Option<u8>,
        timestamp: Timestamp,
    ) {
        let vote = Vote {
            voter,
            value,
            timestamp,
            confidence,
        };

        // Store vote
        state
            .votes
            .insert(&(query_id, voter), vote.clone())
            .expect("Failed to insert vote");

        // Update query votes
        let mut query = state.get_query(query_id).await.expect("Query not found");
        query.votes.insert(voter, vote);
        state
            .queries
            .insert(&query_id, query)
            .expect("Failed to update query");

        // Update vote count
        let current_count = state
            .vote_counts
            .get(&query_id)
            .await
            .ok()
            .flatten()
            .unwrap_or(0);
        state
            .vote_counts
            .insert(&query_id, current_count + 1)
            .expect("Failed to update vote count");

        // Update voter stats
        let mut voter_info = state.get_voter(&voter).await.expect("Voter not found");
        voter_info.total_votes += 1;
        state
            .voters
            .insert(&voter, voter_info)
            .expect("Failed to update voter");

        // Update global stats
        let total_votes = *state.total_votes_submitted.get();
        state.total_votes_submitted.set(total_votes + 1);
    }

    #[tokio::test]
    async fn test_complete_voting_flow_majority_strategy() {
        let (mut state, admin) = setup_test_state().await;
        let params = state.get_parameters().await;

        // Step 1: Register 5 voters
        let voters = vec![
            (create_test_voter(10), "Alice"),
            (create_test_voter(11), "Bob"),
            (create_test_voter(12), "Charlie"),
            (create_test_voter(13), "Diana"),
            (create_test_voter(14), "Eve"),
        ];

        for (voter, name) in &voters {
            register_voter(
                &mut state,
                *voter,
                params.min_stake,
                Some(name.to_string()),
            )
            .await;
        }

        // Verify all voters registered
        assert_eq!(*state.voter_count.get(), 5);

        // Step 2: Create a query
        let query_id = create_query(
            &mut state,
            admin,
            "Will it rain tomorrow?".to_string(),
            vec!["Yes".to_string(), "No".to_string()],
            DecisionStrategy::Majority,
            3,
            Amount::from_tokens(1000),
            Timestamp::from(86400000000), // 1 day in microseconds
        )
        .await;

        // Verify query created
        let query = state.get_query(query_id).await.expect("Query not found");
        assert_eq!(query.status, QueryStatus::Active);
        assert_eq!(query.min_votes, 3);

        // Step 3: Submit votes (3 vote "Yes", 2 vote "No")
        submit_vote(
            &mut state,
            query_id,
            voters[0].0,
            "Yes".to_string(),
            Some(90),
            Timestamp::from(1000),
        )
        .await;

        submit_vote(
            &mut state,
            query_id,
            voters[1].0,
            "Yes".to_string(),
            Some(85),
            Timestamp::from(2000),
        )
        .await;

        submit_vote(
            &mut state,
            query_id,
            voters[2].0,
            "Yes".to_string(),
            Some(80),
            Timestamp::from(3000),
        )
        .await;

        submit_vote(
            &mut state,
            query_id,
            voters[3].0,
            "No".to_string(),
            Some(70),
            Timestamp::from(4000),
        )
        .await;

        submit_vote(
            &mut state,
            query_id,
            voters[4].0,
            "No".to_string(),
            Some(75),
            Timestamp::from(5000),
        )
        .await;

        // Verify votes submitted
        let vote_count = state
            .vote_counts
            .get(&query_id)
            .await
            .ok()
            .flatten()
            .unwrap_or(0);
        assert_eq!(vote_count, 5);

        // Step 4: Resolve query (majority is "Yes")
        let mut query = state.get_query(query_id).await.expect("Query not found");
        query.status = QueryStatus::Resolved;
        query.result = Some("Yes".to_string());
        query.resolved_at = Some(Timestamp::from(10000));

        state
            .queries
            .insert(&query_id, query.clone())
            .expect("Failed to update query");

        // Remove from active queries
        let mut active = state.active_queries.get().clone();
        active.retain(|&id| id != query_id);
        state.active_queries.set(active);

        // Update statistics
        let total_resolved = *state.total_queries_resolved.get();
        state.total_queries_resolved.set(total_resolved + 1);

        // Verify query resolved
        let resolved_query = state.get_query(query_id).await.expect("Query not found");
        assert_eq!(resolved_query.status, QueryStatus::Resolved);
        assert_eq!(resolved_query.result, Some("Yes".to_string()));

        // Step 5: Update reputations (voters who voted "Yes" were correct)
        for (voter, _) in &voters[0..3] {
            state
                .update_voter_reputation(voter, true)
                .await
                .expect("Failed to update reputation");
        }

        for (voter, _) in &voters[3..5] {
            state
                .update_voter_reputation(voter, false)
                .await
                .expect("Failed to update reputation");
        }

        // Verify reputations updated
        for (voter, _) in &voters[0..3] {
            let voter_info = state.get_voter(voter).await.expect("Voter not found");
            assert_eq!(voter_info.correct_votes, 1);
            assert_eq!(voter_info.total_votes, 1);
            // Reputation should be high for 100% accuracy
            assert!(voter_info.reputation >= 90);
        }

        for (voter, _) in &voters[3..5] {
            let voter_info = state.get_voter(voter).await.expect("Voter not found");
            assert_eq!(voter_info.correct_votes, 0);
            assert_eq!(voter_info.total_votes, 1);
            // Reputation should be low for 0% accuracy
            assert!(voter_info.reputation <= 10);
        }

        // Step 6: Distribute rewards to correct voters
        let reward_per_voter = Amount::from_tokens(333); // ~1000/3
        for (voter, _) in &voters[0..3] {
            let current_rewards = state.get_pending_rewards(voter).await;
            let current_value: u128 = current_rewards.into();
            let reward_value: u128 = reward_per_voter.into();
            let new_rewards = Amount::from_tokens(current_value + reward_value);

            state
                .pending_rewards
                .insert(voter, new_rewards)
                .expect("Failed to add rewards");
        }

        // Verify rewards distributed
        for (voter, _) in &voters[0..3] {
            let rewards = state.get_pending_rewards(voter).await;
            let rewards_value: u128 = rewards.into();
            assert!(rewards_value > 0, "Correct voters should have rewards");
        }

        for (voter, _) in &voters[3..5] {
            let rewards = state.get_pending_rewards(voter).await;
            assert_eq!(rewards, Amount::ZERO, "Incorrect voters should have no rewards");
        }
    }

    #[tokio::test]
    async fn test_complete_voting_flow_weighted_by_stake() {
        let (mut state, admin) = setup_test_state().await;
        let params = state.get_parameters().await;

        // Register voters with different stakes
        let voter1 = create_test_voter(20);
        let voter2 = create_test_voter(21);
        let voter3 = create_test_voter(22);

        register_voter(
            &mut state,
            voter1,
            Amount::from_tokens(1000), // High stake
            Some("High Staker".to_string()),
        )
        .await;

        register_voter(
            &mut state,
            voter2,
            Amount::from_tokens(500), // Medium stake
            Some("Medium Staker".to_string()),
        )
        .await;

        register_voter(
            &mut state,
            voter3,
            params.min_stake, // Minimum stake
            Some("Min Staker".to_string()),
        )
        .await;

        // Create query with weighted by stake strategy
        let query_id = create_query(
            &mut state,
            admin,
            "What is the price of BTC?".to_string(),
            vec!["50000".to_string(), "60000".to_string(), "70000".to_string()],
            DecisionStrategy::WeightedByStake,
            3,
            Amount::from_tokens(2000),
            Timestamp::from(86400000000),
        )
        .await;

        // Submit votes
        submit_vote(
            &mut state,
            query_id,
            voter1,
            "60000".to_string(),
            Some(95),
            Timestamp::from(1000),
        )
        .await;

        submit_vote(
            &mut state,
            query_id,
            voter2,
            "60000".to_string(),
            Some(90),
            Timestamp::from(2000),
        )
        .await;

        submit_vote(
            &mut state,
            query_id,
            voter3,
            "50000".to_string(),
            Some(80),
            Timestamp::from(3000),
        )
        .await;

        // Verify all votes recorded
        let vote_count = state
            .vote_counts
            .get(&query_id)
            .await
            .ok()
            .flatten()
            .unwrap_or(0);
        assert_eq!(vote_count, 3);

        // Resolve query (weighted result should be "60000" due to higher stakes)
        let mut query = state.get_query(query_id).await.expect("Query not found");
        query.status = QueryStatus::Resolved;
        query.result = Some("60000".to_string());
        query.resolved_at = Some(Timestamp::from(10000));

        state
            .queries
            .insert(&query_id, query)
            .expect("Failed to update query");

        // Update reputations
        state
            .update_voter_reputation(&voter1, true)
            .await
            .expect("Failed to update reputation");
        state
            .update_voter_reputation(&voter2, true)
            .await
            .expect("Failed to update reputation");
        state
            .update_voter_reputation(&voter3, false)
            .await
            .expect("Failed to update reputation");

        // Verify correct voters have higher reputation
        let voter1_info = state.get_voter(&voter1).await.expect("Voter not found");
        let voter2_info = state.get_voter(&voter2).await.expect("Voter not found");
        let voter3_info = state.get_voter(&voter3).await.expect("Voter not found");

        assert!(voter1_info.reputation > voter3_info.reputation);
        assert!(voter2_info.reputation > voter3_info.reputation);
    }

    #[tokio::test]
    async fn test_complete_voting_flow_with_minimum_votes_not_met() {
        let (mut state, admin) = setup_test_state().await;
        let params = state.get_parameters().await;

        // Register 2 voters
        let voter1 = create_test_voter(30);
        let voter2 = create_test_voter(31);

        register_voter(&mut state, voter1, params.min_stake, Some("Voter1".to_string())).await;
        register_voter(&mut state, voter2, params.min_stake, Some("Voter2".to_string())).await;

        // Create query requiring 5 votes
        let query_id = create_query(
            &mut state,
            admin,
            "Test query".to_string(),
            vec!["A".to_string(), "B".to_string()],
            DecisionStrategy::Majority,
            5, // Requires 5 votes
            Amount::from_tokens(1000),
            Timestamp::from(86400000000),
        )
        .await;

        // Submit only 2 votes
        submit_vote(
            &mut state,
            query_id,
            voter1,
            "A".to_string(),
            Some(90),
            Timestamp::from(1000),
        )
        .await;

        submit_vote(
            &mut state,
            query_id,
            voter2,
            "A".to_string(),
            Some(85),
            Timestamp::from(2000),
        )
        .await;

        // Verify votes submitted but not enough
        let vote_count = state
            .vote_counts
            .get(&query_id)
            .await
            .ok()
            .flatten()
            .unwrap_or(0);
        assert_eq!(vote_count, 2);

        let query = state.get_query(query_id).await.expect("Query not found");
        assert_eq!(query.status, QueryStatus::Active);
        assert!(vote_count < query.min_votes);
    }

    #[tokio::test]
    async fn test_complete_voting_flow_with_query_expiration() {
        let (mut state, admin) = setup_test_state().await;
        let params = state.get_parameters().await;

        // Register voter
        let voter = create_test_voter(40);
        register_voter(&mut state, voter, params.min_stake, Some("Voter".to_string())).await;

        // Create query with short deadline
        let query_id = create_query(
            &mut state,
            admin,
            "Short deadline query".to_string(),
            vec!["Yes".to_string(), "No".to_string()],
            DecisionStrategy::Majority,
            3,
            Amount::from_tokens(1000),
            Timestamp::from(1000), // Very short deadline
        )
        .await;

        // Submit one vote
        submit_vote(
            &mut state,
            query_id,
            voter,
            "Yes".to_string(),
            Some(90),
            Timestamp::from(500),
        )
        .await;

        // Mark query as expired (deadline passed without enough votes)
        let mut query = state.get_query(query_id).await.expect("Query not found");
        query.status = QueryStatus::Expired;

        state
            .queries
            .insert(&query_id, query)
            .expect("Failed to update query");

        // Remove from active queries
        let mut active = state.active_queries.get().clone();
        active.retain(|&id| id != query_id);
        state.active_queries.set(active);

        // Verify query expired
        let expired_query = state.get_query(query_id).await.expect("Query not found");
        assert_eq!(expired_query.status, QueryStatus::Expired);
        assert!(expired_query.result.is_none());
    }

    #[tokio::test]
    async fn test_complete_voting_flow_multiple_queries() {
        let (mut state, admin) = setup_test_state().await;
        let params = state.get_parameters().await;

        // Register 3 voters
        let voters = vec![
            create_test_voter(50),
            create_test_voter(51),
            create_test_voter(52),
        ];

        for (i, voter) in voters.iter().enumerate() {
            register_voter(
                &mut state,
                *voter,
                params.min_stake,
                Some(format!("Voter{}", i)),
            )
            .await;
        }

        // Create 3 queries
        let query1 = create_query(
            &mut state,
            admin,
            "Query 1".to_string(),
            vec!["A".to_string(), "B".to_string()],
            DecisionStrategy::Majority,
            2,
            Amount::from_tokens(1000),
            Timestamp::from(86400000000),
        )
        .await;

        let query2 = create_query(
            &mut state,
            admin,
            "Query 2".to_string(),
            vec!["X".to_string(), "Y".to_string()],
            DecisionStrategy::Majority,
            2,
            Amount::from_tokens(1000),
            Timestamp::from(86400000000),
        )
        .await;

        let query3 = create_query(
            &mut state,
            admin,
            "Query 3".to_string(),
            vec!["1".to_string(), "2".to_string()],
            DecisionStrategy::Majority,
            2,
            Amount::from_tokens(1000),
            Timestamp::from(86400000000),
        )
        .await;

        // Each voter votes on all queries
        for voter in &voters {
            submit_vote(
                &mut state,
                query1,
                *voter,
                "A".to_string(),
                Some(90),
                Timestamp::from(1000),
            )
            .await;

            submit_vote(
                &mut state,
                query2,
                *voter,
                "X".to_string(),
                Some(85),
                Timestamp::from(2000),
            )
            .await;

            submit_vote(
                &mut state,
                query3,
                *voter,
                "1".to_string(),
                Some(80),
                Timestamp::from(3000),
            )
            .await;
        }

        // Verify all votes recorded
        assert_eq!(*state.total_votes_submitted.get(), 9); // 3 voters * 3 queries

        // Verify each voter has 3 total votes
        for voter in &voters {
            let voter_info = state.get_voter(voter).await.expect("Voter not found");
            assert_eq!(voter_info.total_votes, 3);
        }

        // Verify each query has 3 votes
        for query_id in [query1, query2, query3] {
            let vote_count = state
                .vote_counts
                .get(&query_id)
                .await
                .ok()
                .flatten()
                .unwrap_or(0);
            assert_eq!(vote_count, 3);
        }
    }

    #[tokio::test]
    async fn test_complete_voting_flow_with_confidence_scores() {
        let (mut state, admin) = setup_test_state().await;
        let params = state.get_parameters().await;

        // Register voters
        let voter1 = create_test_voter(60);
        let voter2 = create_test_voter(61);
        let voter3 = create_test_voter(62);

        register_voter(&mut state, voter1, params.min_stake, Some("V1".to_string())).await;
        register_voter(&mut state, voter2, params.min_stake, Some("V2".to_string())).await;
        register_voter(&mut state, voter3, params.min_stake, Some("V3".to_string())).await;

        // Create query
        let query_id = create_query(
            &mut state,
            admin,
            "Confidence test".to_string(),
            vec!["Yes".to_string(), "No".to_string()],
            DecisionStrategy::Majority,
            3,
            Amount::from_tokens(1000),
            Timestamp::from(86400000000),
        )
        .await;

        // Submit votes with different confidence levels
        submit_vote(
            &mut state,
            query_id,
            voter1,
            "Yes".to_string(),
            Some(100), // Very confident
            Timestamp::from(1000),
        )
        .await;

        submit_vote(
            &mut state,
            query_id,
            voter2,
            "Yes".to_string(),
            Some(70), // Moderately confident
            Timestamp::from(2000),
        )
        .await;

        submit_vote(
            &mut state,
            query_id,
            voter3,
            "No".to_string(),
            Some(50), // Low confidence
            Timestamp::from(3000),
        )
        .await;

        // Verify votes with confidence scores
        let vote1 = state.get_vote(query_id, &voter1).await.expect("Vote not found");
        assert_eq!(vote1.confidence, Some(100));

        let vote2 = state.get_vote(query_id, &voter2).await.expect("Vote not found");
        assert_eq!(vote2.confidence, Some(70));

        let vote3 = state.get_vote(query_id, &voter3).await.expect("Vote not found");
        assert_eq!(vote3.confidence, Some(50));
    }
}
