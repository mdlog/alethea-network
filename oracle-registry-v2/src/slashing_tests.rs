// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Tests for slashing functionality
//! 
//! This module tests the slashing mechanism that penalizes voters
//! who vote incorrectly on resolved queries.

#[cfg(test)]
mod tests {
    use crate::test_utils::test_helpers::*;
    use crate::state::{OracleRegistryV2, ProtocolParameters, VoterInfo, Query, QueryStatus, DecisionStrategy, Vote};
    use linera_sdk::{
        linera_base_types::{Amount, AccountOwner, Timestamp},
        views::{View, ViewStorageContext},
    };
    use std::collections::BTreeMap;

    /// Helper to create test voter info
    fn create_test_voter(
        address: AccountOwner,
        stake: Amount,
        reputation: u32,
    ) -> VoterInfo {
        VoterInfo {
            address,
            stake,
            locked_stake: Amount::ZERO,
            reputation,
            total_votes: 10,
            correct_votes: 7,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: Some("Test Voter".to_string()),
            metadata_url: None,
        }
    }

    /// Helper to create test protocol parameters with custom slash percentage
    fn create_test_params(slash_percentage: u32) -> ProtocolParameters {
        ProtocolParameters {
            min_stake: Amount::from_tokens(100),
            min_votes_default: 3,
            default_query_duration: 86400,
            reward_percentage: 1000,
            slash_percentage,
            protocol_fee: 100,
        }
    }

    #[test]
    fn test_calculate_slash_amount_5_percent() {
        let state = OracleRegistryV2::default();
        let voter = create_test_voter(
            create_account_owner(1),
            Amount::from_tokens(1000),
            50,
        );
        let params = create_test_params(500); // 5%

        let slash_amount = state.calculate_slash_amount(&voter, &params);
        
        // 5% of 1000 = 50
        assert_eq!(slash_amount, Amount::from_tokens(50));
    }

    #[test]
    fn test_calculate_slash_amount_10_percent() {
        let state = OracleRegistryV2::default();
        let voter = create_test_voter(
            create_account_owner(1),
            Amount::from_tokens(2000),
            50,
        );
        let params = create_test_params(1000); // 10%

        let slash_amount = state.calculate_slash_amount(&voter, &params);
        
        // 10% of 2000 = 200
        assert_eq!(slash_amount, Amount::from_tokens(200));
    }

    #[test]
    fn test_calculate_slash_amount_1_percent() {
        let state = OracleRegistryV2::default();
        let voter = create_test_voter(
            create_account_owner(1),
            Amount::from_tokens(10000),
            50,
        );
        let params = create_test_params(100); // 1%

        let slash_amount = state.calculate_slash_amount(&voter, &params);
        
        // 1% of 10000 = 100
        assert_eq!(slash_amount, Amount::from_tokens(100));
    }

    #[test]
    fn test_calculate_slash_amount_zero_percent() {
        let state = OracleRegistryV2::default();
        let voter = create_test_voter(
            create_account_owner(1),
            Amount::from_tokens(1000),
            50,
        );
        let params = create_test_params(0); // 0% (no slashing)

        let slash_amount = state.calculate_slash_amount(&voter, &params);
        
        assert_eq!(slash_amount, Amount::ZERO);
    }

    #[test]
    fn test_should_deactivate_after_slash_true() {
        let state = OracleRegistryV2::default();
        let voter = create_test_voter(
            create_account_owner(1),
            Amount::from_tokens(150), // Just above minimum
            50,
        );
        let params = create_test_params(500); // 5%
        let slash_amount = Amount::from_tokens(75); // Would leave 75, below min of 100

        let should_deactivate = state.should_deactivate_after_slash(&voter, slash_amount, &params);
        
        assert!(should_deactivate, "Voter should be deactivated when stake falls below minimum");
    }

    #[test]
    fn test_should_deactivate_after_slash_false() {
        let state = OracleRegistryV2::default();
        let voter = create_test_voter(
            create_account_owner(1),
            Amount::from_tokens(1000),
            50,
        );
        let params = create_test_params(500); // 5%
        let slash_amount = Amount::from_tokens(50); // Would leave 950, above min of 100

        let should_deactivate = state.should_deactivate_after_slash(&voter, slash_amount, &params);
        
        assert!(!should_deactivate, "Voter should remain active when stake stays above minimum");
    }

    #[test]
    fn test_should_deactivate_at_exact_minimum() {
        let state = OracleRegistryV2::default();
        let voter = create_test_voter(
            create_account_owner(1),
            Amount::from_tokens(200),
            50,
        );
        let params = create_test_params(5000); // 50%
        let slash_amount = Amount::from_tokens(100); // Would leave exactly 100 (minimum)

        let should_deactivate = state.should_deactivate_after_slash(&voter, slash_amount, &params);
        
        assert!(!should_deactivate, "Voter should remain active at exact minimum stake");
    }

    #[test]
    fn test_calculate_slashing_stats_multiple_voters() {
        let state = OracleRegistryV2::default();
        let params = create_test_params(500); // 5%

        let incorrect_voters = vec![
            (
                create_account_owner(1),
                create_test_voter(create_account_owner(1), Amount::from_tokens(1000), 50),
            ),
            (
                create_account_owner(2),
                create_test_voter(create_account_owner(2), Amount::from_tokens(2000), 60),
            ),
            (
                create_account_owner(3),
                create_test_voter(create_account_owner(3), Amount::from_tokens(500), 40),
            ),
        ];

        let (total_slashed, voters_slashed, voters_deactivated) = 
            state.calculate_slashing_stats(&incorrect_voters, &params);

        // Expected slashing:
        // Voter 1: 5% of 1000 = 50
        // Voter 2: 5% of 2000 = 100
        // Voter 3: 5% of 500 = 25
        // Total: 175
        assert_eq!(total_slashed, Amount::from_tokens(175));
        assert_eq!(voters_slashed, 3);
        
        // Voter 3 would have 475 remaining, above minimum of 100, so no deactivations
        assert_eq!(voters_deactivated, 0);
    }

    #[test]
    fn test_calculate_slashing_stats_with_deactivation() {
        let state = OracleRegistryV2::default();
        let params = create_test_params(5000); // 50% (aggressive slashing)

        let incorrect_voters = vec![
            (
                create_account_owner(1),
                create_test_voter(create_account_owner(1), Amount::from_tokens(1000), 50),
            ),
            (
                create_account_owner(2),
                create_test_voter(create_account_owner(2), Amount::from_tokens(150), 60),
            ),
        ];

        let (total_slashed, voters_slashed, voters_deactivated) = 
            state.calculate_slashing_stats(&incorrect_voters, &params);

        // Expected slashing:
        // Voter 1: 50% of 1000 = 500 (remains active with 500)
        // Voter 2: 50% of 150 = 75 (deactivated with 75 < 100 minimum)
        // Total: 575
        assert_eq!(total_slashed, Amount::from_tokens(575));
        assert_eq!(voters_slashed, 2);
        assert_eq!(voters_deactivated, 1);
    }

    #[test]
    fn test_slashing_with_zero_stake() {
        let state = OracleRegistryV2::default();
        let voter = create_test_voter(
            create_account_owner(1),
            Amount::ZERO,
            50,
        );
        let params = create_test_params(500); // 5%

        let slash_amount = state.calculate_slash_amount(&voter, &params);
        
        assert_eq!(slash_amount, Amount::ZERO);
    }

    #[test]
    fn test_slashing_proportional_to_stake() {
        let state = OracleRegistryV2::default();
        let params = create_test_params(500); // 5%

        let voter_small = create_test_voter(
            create_account_owner(1),
            Amount::from_tokens(100),
            50,
        );
        let voter_large = create_test_voter(
            create_account_owner(2),
            Amount::from_tokens(10000),
            50,
        );

        let slash_small = state.calculate_slash_amount(&voter_small, &params);
        let slash_large = state.calculate_slash_amount(&voter_large, &params);

        // Slashing should be proportional
        assert_eq!(slash_small, Amount::from_tokens(5));
        assert_eq!(slash_large, Amount::from_tokens(500));
        
        // Verify proportionality: 10000/100 = 100x, so slash should be 100x
        let small_value: u128 = slash_small.into();
        let large_value: u128 = slash_large.into();
        assert_eq!(large_value / small_value, 100);
    }

    #[test]
    fn test_slashing_different_percentages() {
        let state = OracleRegistryV2::default();
        let voter = create_test_voter(
            create_account_owner(1),
            Amount::from_tokens(1000),
            50,
        );

        // Test various slash percentages
        let test_cases = vec![
            (100, 10),    // 1% -> 10 tokens
            (500, 50),    // 5% -> 50 tokens
            (1000, 100),  // 10% -> 100 tokens
            (2500, 250),  // 25% -> 250 tokens
            (5000, 500),  // 50% -> 500 tokens
        ];

        for (slash_percentage, expected_slash) in test_cases {
            let params = create_test_params(slash_percentage);
            let slash_amount = state.calculate_slash_amount(&voter, &params);
            assert_eq!(
                slash_amount,
                Amount::from_tokens(expected_slash),
                "Failed for slash percentage {}",
                slash_percentage
            );
        }
    }

    #[test]
    fn test_reputation_calculation_after_incorrect_vote() {
        let state = OracleRegistryV2::default();
        
        // Voter with good track record
        let mut voter = create_test_voter(
            create_account_owner(1),
            Amount::from_tokens(1000),
            80, // High reputation
        );
        
        // Initial reputation based on 7 correct out of 10 votes
        let initial_reputation = state.calculate_reputation(&voter);
        assert_eq!(initial_reputation, 80); // 70% accuracy + 1 participation point
        
        // After an incorrect vote (total_votes already incremented in submit_vote)
        // Now: 7 correct out of 11 votes
        voter.total_votes = 11;
        let new_reputation = state.calculate_reputation(&voter);
        
        // New accuracy: 7/11 = 63.6% -> 63 points
        // Participation: 11/100 * 10 = 1.1 points
        // Total: ~64 points
        assert!(new_reputation < initial_reputation, "Reputation should decrease after incorrect vote");
        assert!(new_reputation >= 63 && new_reputation <= 65, "Reputation should be around 64");
    }

    #[test]
    fn test_slashing_edge_case_all_stake() {
        let state = OracleRegistryV2::default();
        let voter = create_test_voter(
            create_account_owner(1),
            Amount::from_tokens(100),
            50,
        );
        let params = create_test_params(10000); // 100% (slash everything)

        let slash_amount = state.calculate_slash_amount(&voter, &params);
        
        // Should slash entire stake
        assert_eq!(slash_amount, Amount::from_tokens(100));
        
        // Should definitely be deactivated
        let should_deactivate = state.should_deactivate_after_slash(&voter, slash_amount, &params);
        assert!(should_deactivate);
    }

    #[test]
    fn test_slashing_stats_empty_list() {
        let state = OracleRegistryV2::default();
        let params = create_test_params(500);
        let incorrect_voters: Vec<(AccountOwner, VoterInfo)> = vec![];

        let (total_slashed, voters_slashed, voters_deactivated) = 
            state.calculate_slashing_stats(&incorrect_voters, &params);

        assert_eq!(total_slashed, Amount::ZERO);
        assert_eq!(voters_slashed, 0);
        assert_eq!(voters_deactivated, 0);
    }

    #[test]
    fn test_slashing_with_locked_stake() {
        let state = OracleRegistryV2::default();
        let mut voter = create_test_voter(
            create_account_owner(1),
            Amount::from_tokens(1000),
            50,
        );
        
        // Voter has some locked stake from active votes
        voter.locked_stake = Amount::from_tokens(200);
        
        let params = create_test_params(500); // 5%

        // Slashing is calculated on total stake, not available stake
        let slash_amount = state.calculate_slash_amount(&voter, &params);
        assert_eq!(slash_amount, Amount::from_tokens(50)); // 5% of 1000
    }
}
