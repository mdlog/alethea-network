// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Integration tests for multiple voters scenarios
//! 
//! This test suite validates complex multi-voter interactions:
//! 1. Large number of voters (scalability)
//! 2. Voters with varying stakes and reputations
//! 3. Concurrent voting on multiple queries
//! 4. Voter churn (registration/deregistration)
//! 5. Reward distribution across many voters
//! 6. Reputation evolution over multiple queries

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
        let admin = AccountOwner::Address20([1u8; 20]);

        // Initialize with default parameters
        let params = ProtocolParameters::default();
        state.initialize(params, admin).await;

        (state, admin)
    }

    /// Helper to create a test voter account
    fn create_test_voter(id: u8) -> AccountOwner {
        // Create a 20-byte address for testing
        let mut addr = [0u8; 20];
        addr[0] = id;
        AccountOwner::Address20(addr)
    }

    /// Helper to register a voter
    async fn register_voter(
        state: &mut OracleRegistryV2,
        voter: AccountOwner,
        stake: Amount,
        reputation: u8,
        name: Option<String>,
    ) {
        let voter_info = VoterInfo {
            address: voter,
            stake,
            locked_stake: Amount::ZERO,
            reputation,
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
    async fn test_large_number_of_voters() {
        let (mut state, admin) = setup_test_state().await;
        let params = state.get_parameters().await;

        // Register 50 voters to test scalability
        let num_voters = 50;
        let mut voters = Vec::new();

        for i in 0..num_voters {
            let voter = create_test_voter(100 + i);
            register_voter(
                &mut state,
                voter,
                params.min_stake,
                50, // Default reputation
                Some(format!("Voter{}", i)),
            )
            .await;
            voters.push(voter);
        }

        // Verify all voters registered
        assert_eq!(*state.voter_count.get(), num_voters as u64);

        // Create a query
        let query_id = create_query(
            &mut state,
            admin,
            "Large scale test".to_string(),
            vec!["Yes".to_string(), "No".to_string()],
            DecisionStrategy::Majority,
            25, // Require half the voters
            Amount::from_tokens(10000),
            Timestamp::from(86400000000),
        )
        .await;

        // Have 30 voters vote "Yes" and 20 vote "No"
        for (i, voter) in voters.iter().enumerate() {
            let value = if i < 30 { "Yes" } else { "No" };
            submit_vote(
                &mut state,
                query_id,
                *voter,
                value.to_string(),
                Some(80),
                Timestamp::from(1000 + i as u64 * 100),
            )
            .await;
        }

        // Verify all votes recorded
        let vote_count = state
            .vote_counts
            .get(&query_id)
            .await
            .ok()
            .flatten()
            .unwrap_or(0);
        assert_eq!(vote_count, num_voters);

        // Verify query can be resolved (has enough votes)
        let query = state.get_query(query_id).await.expect("Query not found");
        assert!(vote_count >= query.min_votes);
    }

    #[tokio::test]
    async fn test_voters_with_varying_stakes() {
        let (mut state, admin) = setup_test_state().await;
        let params = state.get_parameters().await;

        // Register voters with exponentially increasing stakes
        let stakes = vec![
            Amount::from_tokens(100),   // Small
            Amount::from_tokens(500),   // Medium
            Amount::from_tokens(1000),  // Large
            Amount::from_tokens(5000),  // Very large
            Amount::from_tokens(10000), // Whale
        ];

        let mut voters = Vec::new();
        for (i, stake) in stakes.iter().enumerate() {
            let voter = create_test_voter(150 + i as u8);
            register_voter(
                &mut state,
                voter,
                *stake,
                50,
                Some(format!("Staker{}", i)),
            )
            .await;
            voters.push((voter, *stake));
        }

        // Verify total stake is sum of all stakes
        let expected_total: u128 = stakes.iter().map(|s| {
            let val: u128 = (*s).into();
            val
        }).sum();
        let actual_total: u128 = (*state.total_stake.get()).into();
        assert_eq!(actual_total, expected_total);

        // Create weighted by stake query
        let query_id = create_query(
            &mut state,
            admin,
            "Weighted stake test".to_string(),
            vec!["A".to_string(), "B".to_string()],
            DecisionStrategy::WeightedByStake,
            5,
            Amount::from_tokens(5000),
            Timestamp::from(86400000000),
        )
        .await;

        // Small stakers vote "A", whale votes "B"
        for i in 0..4 {
            submit_vote(
                &mut state,
                query_id,
                voters[i].0,
                "A".to_string(),
                Some(90),
                Timestamp::from(1000 + i as u64 * 100),
            )
            .await;
        }

        submit_vote(
            &mut state,
            query_id,
            voters[4].0,
            "B".to_string(),
            Some(95),
            Timestamp::from(5000),
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
        assert_eq!(vote_count, 5);

        // In weighted by stake, the whale's vote should have more weight
        // Verify we can retrieve all votes
        for (voter, _) in &voters {
            let vote = state.get_vote(query_id, voter).await;
            assert!(vote.is_some(), "Should be able to retrieve vote");
        }
    }

    #[tokio::test]
    async fn test_voters_with_varying_reputations() {
        let (mut state, admin) = setup_test_state().await;
        let params = state.get_parameters().await;

        // Register voters with different reputation levels
        let reputations = vec![10, 30, 50, 70, 90, 100];
        let mut voters = Vec::new();

        for (i, rep) in reputations.iter().enumerate() {
            let voter = create_test_voter(160 + i as u8);
            register_voter(
                &mut state,
                voter,
                params.min_stake,
                *rep,
                Some(format!("Rep{}", rep)),
            )
            .await;
            voters.push((voter, *rep));
        }

        // Verify reputations set correctly
        for (voter, expected_rep) in &voters {
            let voter_info = state.get_voter(voter).await.expect("Voter not found");
            assert_eq!(voter_info.reputation, *expected_rep);
        }

        // Create query with weighted by reputation strategy
        let query_id = create_query(
            &mut state,
            admin,
            "Reputation weighted test".to_string(),
            vec!["X".to_string(), "Y".to_string()],
            DecisionStrategy::WeightedByReputation,
            6,
            Amount::from_tokens(3000),
            Timestamp::from(86400000000),
        )
        .await;

        // All voters vote
        for (i, (voter, _)) in voters.iter().enumerate() {
            let value = if i < 3 { "X" } else { "Y" };
            submit_vote(
                &mut state,
                query_id,
                *voter,
                value.to_string(),
                Some(85),
                Timestamp::from(1000 + i as u64 * 100),
            )
            .await;
        }

        // Verify all votes recorded
        let vote_count = state
            .vote_counts
            .get(&query_id)
            .await
            .ok()
            .flatten()
            .unwrap_or(0);
        assert_eq!(vote_count, 6);

        // High reputation voters (90, 100) voted "Y"
        // Their combined weight should be significant
    }

    #[tokio::test]
    async fn test_concurrent_voting_on_multiple_queries() {
        let (mut state, admin) = setup_test_state().await;
        let params = state.get_parameters().await;

        // Register 10 voters
        let num_voters = 10;
        let mut voters = Vec::new();
        for i in 0..num_voters {
            let voter = create_test_voter(170 + i);
            register_voter(
                &mut state,
                voter,
                params.min_stake,
                50,
                Some(format!("Voter{}", i)),
            )
            .await;
            voters.push(voter);
        }

        // Create 5 queries
        let num_queries = 5;
        let mut queries = Vec::new();
        for i in 0..num_queries {
            let query_id = create_query(
                &mut state,
                admin,
                format!("Query {}", i),
                vec!["Option1".to_string(), "Option2".to_string()],
                DecisionStrategy::Majority,
                5,
                Amount::from_tokens(1000),
                Timestamp::from(86400000000),
            )
            .await;
            queries.push(query_id);
        }

        // Each voter votes on all queries
        for voter in &voters {
            for (q_idx, query_id) in queries.iter().enumerate() {
                let value = if q_idx % 2 == 0 {
                    "Option1"
                } else {
                    "Option2"
                };
                submit_vote(
                    &mut state,
                    *query_id,
                    *voter,
                    value.to_string(),
                    Some(80),
                    Timestamp::from(1000 + q_idx as u64 * 100),
                )
                .await;
            }
        }

        // Verify total votes
        let expected_total_votes = num_voters * num_queries;
        assert_eq!(*state.total_votes_submitted.get(), expected_total_votes as u64);

        // Verify each query has all votes
        for query_id in &queries {
            let vote_count = state
                .vote_counts
                .get(query_id)
                .await
                .ok()
                .flatten()
                .unwrap_or(0);
            assert_eq!(vote_count, num_voters);
        }

        // Verify each voter has voted on all queries
        for voter in &voters {
            let voter_info = state.get_voter(voter).await.expect("Voter not found");
            assert_eq!(voter_info.total_votes, num_queries as u64);
        }
    }

    #[tokio::test]
    async fn test_voter_churn_registration_and_deregistration() {
        let (mut state, _admin) = setup_test_state().await;
        let params = state.get_parameters().await;

        // Register 10 voters
        let mut voters = Vec::new();
        for i in 0..10 {
            let voter = create_test_voter(180 + i);
            register_voter(
                &mut state,
                voter,
                params.min_stake,
                50,
                Some(format!("Voter{}", i)),
            )
            .await;
            voters.push(voter);
        }

        assert_eq!(*state.voter_count.get(), 10);

        // Deregister 3 voters
        for i in 0..3 {
            let mut voter_info = state.get_voter(&voters[i]).await.expect("Voter not found");
            voter_info.is_active = false;
            state
                .voters
                .insert(&voters[i], voter_info)
                .expect("Failed to update voter");

            // Update count
            let current_count = *state.voter_count.get();
            state.voter_count.set(current_count - 1);
        }

        assert_eq!(*state.voter_count.get(), 7);

        // Register 5 new voters
        for i in 0..5 {
            let voter = create_test_voter(190 + i);
            register_voter(
                &mut state,
                voter,
                params.min_stake,
                50,
                Some(format!("NewVoter{}", i)),
            )
            .await;
            voters.push(voter);
        }

        assert_eq!(*state.voter_count.get(), 12);

        // Verify inactive voters
        for i in 0..3 {
            let voter_info = state.get_voter(&voters[i]).await.expect("Voter not found");
            assert!(!voter_info.is_active);
        }

        // Verify active voters
        for i in 3..voters.len() {
            let voter_info = state.get_voter(&voters[i]).await.expect("Voter not found");
            assert!(voter_info.is_active);
        }
    }

    #[tokio::test]
    async fn test_reward_distribution_across_many_voters() {
        let (mut state, admin) = setup_test_state().await;
        let params = state.get_parameters().await;

        // Register 20 voters
        let num_voters = 20;
        let mut voters = Vec::new();
        for i in 0..num_voters {
            let voter = create_test_voter(200 + i);
            register_voter(
                &mut state,
                voter,
                params.min_stake,
                50,
                Some(format!("Voter{}", i)),
            )
            .await;
            voters.push(voter);
        }

        // Create query with large reward
        let query_id = create_query(
            &mut state,
            admin,
            "Large reward distribution".to_string(),
            vec!["Correct".to_string(), "Wrong".to_string()],
            DecisionStrategy::Majority,
            10,
            Amount::from_tokens(20000), // Large reward pool
            Timestamp::from(86400000000),
        )
        .await;

        // 15 voters vote correctly, 5 vote incorrectly
        for (i, voter) in voters.iter().enumerate() {
            let value = if i < 15 { "Correct" } else { "Wrong" };
            submit_vote(
                &mut state,
                query_id,
                *voter,
                value.to_string(),
                Some(85),
                Timestamp::from(1000 + i as u64 * 100),
            )
            .await;
        }

        // Resolve query
        let mut query = state.get_query(query_id).await.expect("Query not found");
        query.status = QueryStatus::Resolved;
        query.result = Some("Correct".to_string());
        query.resolved_at = Some(Timestamp::from(50000));
        state
            .queries
            .insert(&query_id, query.clone())
            .expect("Failed to update query");

        // Distribute rewards to correct voters (15 voters)
        let reward_per_voter = Amount::from_tokens(20000 / 15); // ~1333 per voter

        for i in 0..15 {
            let current_rewards = state.get_pending_rewards(&voters[i]).await;
            let current_value: u128 = current_rewards.into();
            let reward_value: u128 = reward_per_voter.into();
            let new_rewards = Amount::from_tokens(current_value + reward_value);

            state
                .pending_rewards
                .insert(&voters[i], new_rewards)
                .expect("Failed to add rewards");
        }

        // Verify correct voters have rewards
        for i in 0..15 {
            let rewards = state.get_pending_rewards(&voters[i]).await;
            let rewards_value: u128 = rewards.into();
            assert!(rewards_value > 0, "Correct voter {} should have rewards", i);
        }

        // Verify incorrect voters have no rewards
        for i in 15..20 {
            let rewards = state.get_pending_rewards(&voters[i]).await;
            assert_eq!(rewards, Amount::ZERO, "Incorrect voter {} should have no rewards", i);
        }
    }

    #[tokio::test]
    async fn test_reputation_evolution_over_multiple_queries() {
        let (mut state, admin) = setup_test_state().await;
        let params = state.get_parameters().await;

        // Register 5 voters with initial reputation of 50
        let mut voters = Vec::new();
        for i in 0..5 {
            let voter = create_test_voter(210 + i);
            register_voter(
                &mut state,
                voter,
                params.min_stake,
                50,
                Some(format!("Voter{}", i)),
            )
            .await;
            voters.push(voter);
        }

        // Create and resolve 10 queries
        for q in 0..10 {
            let query_id = create_query(
                &mut state,
                admin,
                format!("Query {}", q),
                vec!["A".to_string(), "B".to_string()],
                DecisionStrategy::Majority,
                5,
                Amount::from_tokens(1000),
                Timestamp::from(86400000000),
            )
            .await;

            // Voters 0-2 always vote correctly, voters 3-4 vote incorrectly
            for (i, voter) in voters.iter().enumerate() {
                let value = if i < 3 { "A" } else { "B" };
                submit_vote(
                    &mut state,
                    query_id,
                    *voter,
                    value.to_string(),
                    Some(85),
                    Timestamp::from(1000 + i as u64 * 100),
                )
                .await;
            }

            // Resolve with "A" as correct answer
            let mut query = state.get_query(query_id).await.expect("Query not found");
            query.status = QueryStatus::Resolved;
            query.result = Some("A".to_string());
            query.resolved_at = Some(Timestamp::from(10000));
            state
                .queries
                .insert(&query_id, query)
                .expect("Failed to update query");

            // Update reputations
            for i in 0..3 {
                state
                    .update_voter_reputation(&voters[i], true)
                    .await
                    .expect("Failed to update reputation");
            }

            for i in 3..5 {
                state
                    .update_voter_reputation(&voters[i], false)
                    .await
                    .expect("Failed to update reputation");
            }
        }

        // Verify reputation evolution
        // Voters 0-2 should have high reputation (100% accuracy)
        for i in 0..3 {
            let voter_info = state.get_voter(&voters[i]).await.expect("Voter not found");
            assert_eq!(voter_info.total_votes, 10);
            assert_eq!(voter_info.correct_votes, 10);
            assert!(
                voter_info.reputation >= 90,
                "Voter {} with 100% accuracy should have high reputation, got {}",
                i,
                voter_info.reputation
            );
        }

        // Voters 3-4 should have low reputation (0% accuracy)
        for i in 3..5 {
            let voter_info = state.get_voter(&voters[i]).await.expect("Voter not found");
            assert_eq!(voter_info.total_votes, 10);
            assert_eq!(voter_info.correct_votes, 0);
            assert!(
                voter_info.reputation <= 10,
                "Voter {} with 0% accuracy should have low reputation, got {}",
                i,
                voter_info.reputation
            );
        }
    }

    #[tokio::test]
    async fn test_mixed_strategies_with_multiple_voters() {
        let (mut state, admin) = setup_test_state().await;
        let params = state.get_parameters().await;

        // Register 12 voters with varying stakes and reputations
        let voter_configs = vec![
            (Amount::from_tokens(1000), 90),  // High stake, high rep
            (Amount::from_tokens(1000), 50),  // High stake, medium rep
            (Amount::from_tokens(1000), 20),  // High stake, low rep
            (Amount::from_tokens(500), 90),   // Medium stake, high rep
            (Amount::from_tokens(500), 50),   // Medium stake, medium rep
            (Amount::from_tokens(500), 20),   // Medium stake, low rep
            (Amount::from_tokens(100), 90),   // Low stake, high rep
            (Amount::from_tokens(100), 50),   // Low stake, medium rep
            (Amount::from_tokens(100), 20),   // Low stake, low rep
            (params.min_stake, 90),           // Min stake, high rep
            (params.min_stake, 50),           // Min stake, medium rep
            (params.min_stake, 20),           // Min stake, low rep
        ];

        let mut voters = Vec::new();
        for (i, (stake, rep)) in voter_configs.iter().enumerate() {
            let voter = create_test_voter(220 + i as u8);
            register_voter(
                &mut state,
                voter,
                *stake,
                *rep,
                Some(format!("Mixed{}", i)),
            )
            .await;
            voters.push(voter);
        }

        // Create queries with different strategies
        let strategies = vec![
            DecisionStrategy::Majority,
            DecisionStrategy::WeightedByStake,
            DecisionStrategy::WeightedByReputation,
        ];

        for (s_idx, strategy) in strategies.iter().enumerate() {
            let query_id = create_query(
                &mut state,
                admin,
                format!("Strategy test {:?}", strategy),
                vec!["Option1".to_string(), "Option2".to_string()],
                strategy.clone(),
                8,
                Amount::from_tokens(5000),
                Timestamp::from(86400000000),
            )
            .await;

            // All voters vote
            for (v_idx, voter) in voters.iter().enumerate() {
                let value = if v_idx < 6 { "Option1" } else { "Option2" };
                submit_vote(
                    &mut state,
                    query_id,
                    *voter,
                    value.to_string(),
                    Some(80),
                    Timestamp::from(1000 + v_idx as u64 * 100),
                )
                .await;
            }

            // Verify all votes recorded
            let vote_count = state
                .vote_counts
                .get(&query_id)
                .await
                .ok()
                .flatten()
                .unwrap_or(0);
            assert_eq!(vote_count, 12);

            // Verify query has enough votes
            let query = state.get_query(query_id).await.expect("Query not found");
            assert!(vote_count >= query.min_votes);
        }
    }

    #[tokio::test]
    async fn test_voters_joining_mid_query() {
        let (mut state, admin) = setup_test_state().await;
        let params = state.get_parameters().await;

        // Register initial 5 voters
        let mut voters = Vec::new();
        for i in 0..5 {
            let voter = create_test_voter(230 + i);
            register_voter(
                &mut state,
                voter,
                params.min_stake,
                50,
                Some(format!("Initial{}", i)),
            )
            .await;
            voters.push(voter);
        }

        // Create query
        let query_id = create_query(
            &mut state,
            admin,
            "Mid-query join test".to_string(),
            vec!["Yes".to_string(), "No".to_string()],
            DecisionStrategy::Majority,
            8,
            Amount::from_tokens(2000),
            Timestamp::from(86400000000),
        )
        .await;

        // Initial voters vote
        for voter in &voters {
            submit_vote(
                &mut state,
                query_id,
                *voter,
                "Yes".to_string(),
                Some(85),
                Timestamp::from(1000),
            )
            .await;
        }

        // Register 5 more voters mid-query
        for i in 0..5 {
            let voter = create_test_voter(235 + i);
            register_voter(
                &mut state,
                voter,
                params.min_stake,
                50,
                Some(format!("MidJoin{}", i)),
            )
            .await;
            voters.push(voter);
        }

        // New voters also vote
        for i in 5..10 {
            submit_vote(
                &mut state,
                query_id,
                voters[i],
                "Yes".to_string(),
                Some(80),
                Timestamp::from(2000),
            )
            .await;
        }

        // Verify all votes counted
        let vote_count = state
            .vote_counts
            .get(&query_id)
            .await
            .ok()
            .flatten()
            .unwrap_or(0);
        assert_eq!(vote_count, 10);

        // Verify query can be resolved
        let query = state.get_query(query_id).await.expect("Query not found");
        assert!(vote_count >= query.min_votes);
    }
}
