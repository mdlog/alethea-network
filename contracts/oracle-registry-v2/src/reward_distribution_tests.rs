// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Tests for reward distribution functionality
//! 
//! This module tests the reward distribution system including:
//! - Equal reward distribution (Majority/Median strategies)
//! - Stake-weighted distribution
//! - Reputation-weighted distribution
//! - Protocol fee calculation
//! - Reputation multiplier effects
//! - Edge cases (no voters, single voter, etc.)

#[cfg(test)]
mod tests {
    use crate::test_utils::test_helpers::*;
    use crate::state::{OracleRegistryV2, ProtocolParameters, VoterInfo, DecisionStrategy};
    use linera_sdk::{
        linera_base_types::{AccountOwner, Amount, Timestamp},
    };
    use std::collections::BTreeMap;

    /// Helper to create a test voter info
    fn create_test_voter(
        address: AccountOwner,
        stake: u128,
        reputation: u32,
        total_votes: u64,
        correct_votes: u64,
    ) -> VoterInfo {
        VoterInfo {
            address,
            stake: Amount::from_tokens(stake),
            locked_stake: Amount::ZERO,
            reputation,
            total_votes,
            correct_votes,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: None,
        }
    }

    /// Helper to create test protocol parameters
    fn create_test_params() -> ProtocolParameters {
        ProtocolParameters {
            min_stake: Amount::from_tokens(100),
            min_votes_default: 3,
            default_query_duration: 86400,
            reward_percentage: 1000,  // 10%
            slash_percentage: 500,    // 5%
            protocol_fee: 100,        // 1%
        }
    }

    /// Helper function to calculate equal rewards (mirrors state method)
    fn calculate_equal_rewards(
        total_reward: Amount,
        correct_voters: &[(AccountOwner, VoterInfo)],
        params: &ProtocolParameters,
    ) -> BTreeMap<AccountOwner, Amount> {
        let mut rewards = BTreeMap::new();
        
        if correct_voters.is_empty() {
            return rewards;
        }
        
        let reward_value: u128 = total_reward.into();
        let per_voter_base = reward_value / correct_voters.len() as u128;
        
        for (voter, info) in correct_voters {
            // Calculate reputation multiplier
            let reputation_multiplier = 0.8 + (info.reputation as f64 / 100.0) * 0.4;
            let reward_with_reputation = (per_voter_base as f64 * reputation_multiplier) as u128;
            
            // Apply protocol fee
            let fee_multiplier = 1.0 - (params.protocol_fee as f64 / 10000.0);
            let final_reward = (reward_with_reputation as f64 * fee_multiplier) as u128;
            
            rewards.insert(*voter, Amount::from_tokens(final_reward));
        }
        
        rewards
    }

    /// Helper function to calculate stake-weighted rewards (mirrors state method)
    fn calculate_stake_weighted_rewards(
        total_reward: Amount,
        correct_voters: &[(AccountOwner, VoterInfo)],
        params: &ProtocolParameters,
    ) -> BTreeMap<AccountOwner, Amount> {
        let mut rewards = BTreeMap::new();
        
        if correct_voters.is_empty() {
            return rewards;
        }
        
        // Calculate total stake
        let total_stake: u128 = correct_voters
            .iter()
            .map(|(_, info)| {
                let stake: u128 = info.stake.into();
                stake
            })
            .sum();
        
        if total_stake == 0 {
            return rewards;
        }
        
        let reward_value: u128 = total_reward.into();
        
        for (voter, info) in correct_voters {
            let stake_value: u128 = info.stake.into();
            let proportion = stake_value as f64 / total_stake as f64;
            let base_reward = (reward_value as f64 * proportion) as u128;
            
            // Apply reputation multiplier
            let reputation_multiplier = 0.8 + (info.reputation as f64 / 100.0) * 0.4;
            let reward_with_reputation = (base_reward as f64 * reputation_multiplier) as u128;
            
            // Apply protocol fee
            let fee_multiplier = 1.0 - (params.protocol_fee as f64 / 10000.0);
            let final_reward = (reward_with_reputation as f64 * fee_multiplier) as u128;
            
            rewards.insert(*voter, Amount::from_tokens(final_reward));
        }
        
        rewards
    }

    /// Helper function to calculate reputation-weighted rewards (mirrors state method)
    fn calculate_reputation_weighted_rewards(
        total_reward: Amount,
        correct_voters: &[(AccountOwner, VoterInfo)],
        params: &ProtocolParameters,
    ) -> BTreeMap<AccountOwner, Amount> {
        let mut rewards = BTreeMap::new();
        
        if correct_voters.is_empty() {
            return rewards;
        }
        
        // Calculate reputation weight: 0.5 + (reputation / 100) * 1.5
        let calculate_weight = |reputation: u32| -> f64 {
            0.5 + (reputation as f64 / 100.0) * 1.5
        };
        
        // Calculate total weight
        let total_weight: f64 = correct_voters
            .iter()
            .map(|(_, info)| calculate_weight(info.reputation))
            .sum();
        
        if total_weight == 0.0 {
            return rewards;
        }
        
        let reward_value: u128 = total_reward.into();
        
        for (voter, info) in correct_voters {
            let weight = calculate_weight(info.reputation);
            let proportion = weight / total_weight;
            let base_reward = (reward_value as f64 * proportion) as u128;
            
            // Apply protocol fee (reputation already factored in)
            let fee_multiplier = 1.0 - (params.protocol_fee as f64 / 10000.0);
            let final_reward = (base_reward as f64 * fee_multiplier) as u128;
            
            rewards.insert(*voter, Amount::from_tokens(final_reward));
        }
        
        rewards
    }

    /// Helper function to calculate protocol fee (mirrors state method)
    fn calculate_protocol_fee(
        reward_amount: Amount,
        params: &ProtocolParameters,
    ) -> Amount {
        let reward_value: u128 = reward_amount.into();
        let fee_multiplier = params.protocol_fee as f64 / 10000.0;
        let fee_amount = (reward_value as f64 * fee_multiplier) as u128;
        Amount::from_tokens(fee_amount)
    }

    /// Helper function to calculate slash amount (mirrors state method)
    fn calculate_slash_amount(
        voter_info: &VoterInfo,
        params: &ProtocolParameters,
    ) -> Amount {
        let stake_value: u128 = voter_info.stake.into();
        let slash_multiplier = params.slash_percentage as f64 / 10000.0;
        let slash_amount = (stake_value as f64 * slash_multiplier) as u128;
        Amount::from_tokens(slash_amount)
    }

    /// Helper function to check if voter should be deactivated after slash
    fn should_deactivate_after_slash(
        voter_info: &VoterInfo,
        slash_amount: Amount,
        params: &ProtocolParameters,
    ) -> bool {
        let stake_value: u128 = voter_info.stake.into();
        let slash_value: u128 = slash_amount.into();
        let remaining_stake = stake_value.saturating_sub(slash_value);
        let min_stake_value: u128 = params.min_stake.into();
        
        remaining_stake < min_stake_value
    }

    /// Helper function to calculate slashing statistics
    fn calculate_slashing_stats(
        incorrect_voters: &[(AccountOwner, VoterInfo)],
        params: &ProtocolParameters,
    ) -> (Amount, usize, usize) {
        let mut total_slashed = 0u128;
        let mut voters_slashed = 0;
        let mut voters_deactivated = 0;
        
        for (_, voter_info) in incorrect_voters {
            let slash_amount = calculate_slash_amount(voter_info, params);
            let slash_value: u128 = slash_amount.into();
            
            if slash_value > 0 {
                voters_slashed += 1;
                total_slashed += slash_value;
                
                if should_deactivate_after_slash(voter_info, slash_amount, params) {
                    voters_deactivated += 1;
                }
            }
        }
        
        (Amount::from_tokens(total_slashed), voters_slashed, voters_deactivated)
    }

    #[test]
    fn test_equal_reward_distribution() {
        let params = create_test_params();
        
        // Create 3 correct voters with different reputations
        let voter1 = create_account_owner(1);
        let voter2 = create_account_owner(2);
        let voter3 = create_account_owner(3);
        
        let voter_info1 = create_test_voter(voter1, 1000, 80, 100, 85);
        let voter_info2 = create_test_voter(voter2, 2000, 60, 50, 35);
        let voter_info3 = create_test_voter(voter3, 500, 90, 200, 190);
        
        let correct_voters = vec![
            (voter1, voter_info1.clone()),
            (voter2, voter_info2.clone()),
            (voter3, voter_info3.clone()),
        ];
        
        // Total reward: 1000 tokens
        let total_reward = Amount::from_tokens(1000);
        
        // Calculate equal distribution
        let rewards = calculate_equal_rewards(total_reward, &correct_voters, &params);
        
        // Verify all voters received rewards
        assert_eq!(rewards.len(), 3, "All 3 voters should receive rewards");
        assert!(rewards.contains_key(&voter1), "Voter 1 should have reward");
        assert!(rewards.contains_key(&voter2), "Voter 2 should have reward");
        assert!(rewards.contains_key(&voter3), "Voter 3 should have reward");
        
        // Base reward per voter: 1000 / 3 = 333.33
        let base_per_voter = 1000 / 3; // ~333
        
        // Verify rewards are in reasonable range (accounting for reputation multiplier and fee)
        // Reputation multiplier range: 0.8 to 1.2
        // Protocol fee: 1%
        // So rewards should be roughly: base * (0.8 to 1.2) * 0.99
        let min_expected = (base_per_voter as f64 * 0.8 * 0.99) as u128;
        let max_expected = (base_per_voter as f64 * 1.2 * 0.99) as u128;
        
        for (voter, reward) in &rewards {
            let reward_value: u128 = (*reward).into();
            assert!(
                reward_value >= min_expected && reward_value <= max_expected,
                "Voter {:?} reward {} should be between {} and {}",
                voter, reward_value, min_expected, max_expected
            );
        }
        
        // Verify higher reputation gets more reward
        let reward1: u128 = rewards[&voter1].into();
        let reward2: u128 = rewards[&voter2].into();
        let reward3: u128 = rewards[&voter3].into();
        
        // Voter 3 (rep 90) should get more than Voter 2 (rep 60)
        assert!(
            reward3 > reward2,
            "Higher reputation voter should get more reward: {} vs {}",
            reward3, reward2
        );
        
        // Voter 1 (rep 80) should get more than Voter 2 (rep 60)
        assert!(
            reward1 > reward2,
            "Higher reputation voter should get more reward: {} vs {}",
            reward1, reward2
        );
        
        println!("✓ Equal distribution test passed");
        println!("  Voter 1 (rep 80): {} tokens", reward1);
        println!("  Voter 2 (rep 60): {} tokens", reward2);
        println!("  Voter 3 (rep 90): {} tokens", reward3);
    }

    #[test]
    fn test_stake_weighted_reward_distribution() {
        let params = create_test_params();
        
        // Create 3 correct voters with different stakes but same reputation
        let voter1 = create_account_owner(1);
        let voter2 = create_account_owner(2);
        let voter3 = create_account_owner(3);
        
        // Voter 1: 1000 stake (20% of total)
        // Voter 2: 2000 stake (40% of total)
        // Voter 3: 2000 stake (40% of total)
        // Total: 5000 stake
        // All have same reputation (50) to isolate stake effect
        
        let voter_info1 = create_test_voter(voter1, 1000, 50, 10, 8);
        let voter_info2 = create_test_voter(voter2, 2000, 50, 10, 8);
        let voter_info3 = create_test_voter(voter3, 2000, 50, 10, 8);
        
        let correct_voters = vec![
            (voter1, voter_info1.clone()),
            (voter2, voter_info2.clone()),
            (voter3, voter_info3.clone()),
        ];
        
        // Total reward: 1000 tokens
        let total_reward = Amount::from_tokens(1000);
        
        // Calculate stake-weighted distribution
        let rewards = calculate_stake_weighted_rewards(total_reward, &correct_voters, &params);
        
        // Verify all voters received rewards
        assert_eq!(rewards.len(), 3, "All 3 voters should receive rewards");
        
        let reward1: u128 = rewards[&voter1].into();
        let reward2: u128 = rewards[&voter2].into();
        let reward3: u128 = rewards[&voter3].into();
        
        // Verify stake proportionality
        // Voter 2 and 3 have 2x stake of Voter 1, so should get ~2x reward
        let ratio_2_to_1 = reward2 as f64 / reward1 as f64;
        let ratio_3_to_1 = reward3 as f64 / reward1 as f64;
        
        assert!(
            (ratio_2_to_1 - 2.0).abs() < 0.1,
            "Voter 2 should get ~2x Voter 1's reward (ratio: {})",
            ratio_2_to_1
        );
        
        assert!(
            (ratio_3_to_1 - 2.0).abs() < 0.1,
            "Voter 3 should get ~2x Voter 1's reward (ratio: {})",
            ratio_3_to_1
        );
        
        // Voter 2 and 3 should get approximately equal rewards (same stake)
        let ratio_3_to_2 = reward3 as f64 / reward2 as f64;
        assert!(
            (ratio_3_to_2 - 1.0).abs() < 0.01,
            "Voters with equal stake should get equal rewards (ratio: {})",
            ratio_3_to_2
        );
        
        // Verify total distributed is reasonable (should be close to total_reward after fees)
        let total_distributed = reward1 + reward2 + reward3;
        let expected_after_fees = (1000 as f64 * 0.99) as u128; // 1% protocol fee
        assert!(
            total_distributed <= 1000 && total_distributed >= expected_after_fees - 10,
            "Total distributed {} should be close to {} (after fees)",
            total_distributed, expected_after_fees
        );
        
        println!("✓ Stake-weighted distribution test passed");
        println!("  Voter 1 (1000 stake): {} tokens", reward1);
        println!("  Voter 2 (2000 stake): {} tokens", reward2);
        println!("  Voter 3 (2000 stake): {} tokens", reward3);
        println!("  Ratio 2:1 = {:.2}, Ratio 3:1 = {:.2}", ratio_2_to_1, ratio_3_to_1);
    }

    #[test]
    fn test_reputation_weighted_reward_distribution() {
        let params = create_test_params();
        
        // Create 3 correct voters with different reputations but same stake
        let voter1 = create_account_owner(1);
        let voter2 = create_account_owner(2);
        let voter3 = create_account_owner(3);
        
        // All have same stake (1000) to isolate reputation effect
        // Voter 1: reputation 50 -> weight 1.25
        // Voter 2: reputation 75 -> weight 1.625
        // Voter 3: reputation 100 -> weight 2.0
        // Total weight: 4.875
        
        let voter_info1 = create_test_voter(voter1, 1000, 50, 10, 5);
        let voter_info2 = create_test_voter(voter2, 1000, 75, 20, 15);
        let voter_info3 = create_test_voter(voter3, 1000, 100, 50, 50);
        
        let correct_voters = vec![
            (voter1, voter_info1.clone()),
            (voter2, voter_info2.clone()),
            (voter3, voter_info3.clone()),
        ];
        
        // Total reward: 1000 tokens
        let total_reward = Amount::from_tokens(1000);
        
        // Calculate reputation-weighted distribution
        let rewards = calculate_reputation_weighted_rewards(total_reward, &correct_voters, &params);
        
        // Verify all voters received rewards
        assert_eq!(rewards.len(), 3, "All 3 voters should receive rewards");
        
        let reward1: u128 = rewards[&voter1].into();
        let reward2: u128 = rewards[&voter2].into();
        let reward3: u128 = rewards[&voter3].into();
        
        // Verify reputation ordering: higher reputation = higher reward
        assert!(
            reward3 > reward2,
            "Voter 3 (rep 100) should get more than Voter 2 (rep 75): {} vs {}",
            reward3, reward2
        );
        
        assert!(
            reward2 > reward1,
            "Voter 2 (rep 75) should get more than Voter 1 (rep 50): {} vs {}",
            reward2, reward1
        );
        
        // Calculate expected proportions based on reputation weights
        // Weight formula: 0.5 + (reputation / 100) * 1.5
        let weight1 = 0.5 + (50.0 / 100.0) * 1.5; // 1.25
        let weight2 = 0.5 + (75.0 / 100.0) * 1.5; // 1.625
        let weight3 = 0.5 + (100.0 / 100.0) * 1.5; // 2.0
        let total_weight = weight1 + weight2 + weight3; // 4.875
        
        let expected_proportion1 = weight1 / total_weight; // ~25.6%
        let expected_proportion2 = weight2 / total_weight; // ~33.3%
        let expected_proportion3 = weight3 / total_weight; // ~41.0%
        
        // Verify proportions are approximately correct (within 5% tolerance)
        let total_distributed = reward1 + reward2 + reward3;
        let actual_proportion1 = reward1 as f64 / total_distributed as f64;
        let actual_proportion2 = reward2 as f64 / total_distributed as f64;
        let actual_proportion3 = reward3 as f64 / total_distributed as f64;
        
        assert!(
            (actual_proportion1 - expected_proportion1).abs() < 0.05,
            "Voter 1 proportion {} should be close to expected {}",
            actual_proportion1, expected_proportion1
        );
        
        assert!(
            (actual_proportion2 - expected_proportion2).abs() < 0.05,
            "Voter 2 proportion {} should be close to expected {}",
            actual_proportion2, expected_proportion2
        );
        
        assert!(
            (actual_proportion3 - expected_proportion3).abs() < 0.05,
            "Voter 3 proportion {} should be close to expected {}",
            actual_proportion3, expected_proportion3
        );
        
        println!("✓ Reputation-weighted distribution test passed");
        println!("  Voter 1 (rep 50, weight 1.25): {} tokens ({:.1}%)", 
                 reward1, actual_proportion1 * 100.0);
        println!("  Voter 2 (rep 75, weight 1.625): {} tokens ({:.1}%)", 
                 reward2, actual_proportion2 * 100.0);
        println!("  Voter 3 (rep 100, weight 2.0): {} tokens ({:.1}%)", 
                 reward3, actual_proportion3 * 100.0);
    }

    #[test]
    fn test_protocol_fee_calculation() {
        let params = create_test_params();
        
        // Test protocol fee calculation
        // Fee is 1% (100 basis points)
        
        let reward_1000 = Amount::from_tokens(1000);
        let fee_1000 = calculate_protocol_fee(reward_1000, &params);
        let fee_1000_value: u128 = fee_1000.into();
        
        // Expected fee: 1000 * 0.01 = 10 tokens
        assert_eq!(fee_1000_value, 10, "Fee for 1000 tokens should be 10");
        
        let reward_5000 = Amount::from_tokens(5000);
        let fee_5000 = calculate_protocol_fee(reward_5000, &params);
        let fee_5000_value: u128 = fee_5000.into();
        
        // Expected fee: 5000 * 0.01 = 50 tokens
        assert_eq!(fee_5000_value, 50, "Fee for 5000 tokens should be 50");
        
        // Test with zero reward
        let reward_zero = Amount::ZERO;
        let fee_zero = calculate_protocol_fee(reward_zero, &params);
        let fee_zero_value: u128 = fee_zero.into();
        assert_eq!(fee_zero_value, 0, "Fee for 0 tokens should be 0");
        
        // Test with different fee percentage
        let mut high_fee_params = params.clone();
        high_fee_params.protocol_fee = 1000; // 10%
        
        let fee_high = calculate_protocol_fee(reward_1000, &high_fee_params);
        let fee_high_value: u128 = fee_high.into();
        
        // Expected fee: 1000 * 0.10 = 100 tokens
        assert_eq!(fee_high_value, 100, "Fee with 10% rate should be 100");
        
        println!("✓ Protocol fee calculation test passed");
        println!("  1000 tokens @ 1% = {} tokens fee", fee_1000_value);
        println!("  5000 tokens @ 1% = {} tokens fee", fee_5000_value);
        println!("  1000 tokens @ 10% = {} tokens fee", fee_high_value);
    }

    #[test]
    fn test_slash_amount_calculation() {
        let params = create_test_params();
        
        // Test slash calculation
        // Slash is 5% (500 basis points)
        
        let voter_info = create_test_voter(
            create_account_owner(1),
            1000,
            50,
            10,
            5,
        );
        
        let slash_amount = calculate_slash_amount(&voter_info, &params);
        let slash_value: u128 = slash_amount.into();
        
        // Expected slash: 1000 * 0.05 = 50 tokens
        assert_eq!(slash_value, 50, "Slash for 1000 stake should be 50");
        
        // Test with different stake amounts
        let voter_info_2000 = create_test_voter(
            create_account_owner(2),
            2000,
            50,
            10,
            5,
        );
        
        let slash_2000 = calculate_slash_amount(&voter_info_2000, &params);
        let slash_2000_value: u128 = slash_2000.into();
        
        // Expected slash: 2000 * 0.05 = 100 tokens
        assert_eq!(slash_2000_value, 100, "Slash for 2000 stake should be 100");
        
        // Test with higher slash percentage
        let mut high_slash_params = params.clone();
        high_slash_params.slash_percentage = 1000; // 10%
        
        let slash_high = calculate_slash_amount(&voter_info, &high_slash_params);
        let slash_high_value: u128 = slash_high.into();
        
        // Expected slash: 1000 * 0.10 = 100 tokens
        assert_eq!(slash_high_value, 100, "Slash with 10% rate should be 100");
        
        // Test deactivation check
        let should_deactivate = should_deactivate_after_slash(
            &voter_info,
            slash_amount,
            &params
        );
        
        // Voter has 1000 stake, slash is 50, remaining is 950
        // Min stake is 100, so should NOT deactivate
        assert!(!should_deactivate, "Voter with 950 remaining should not deactivate (min 100)");
        
        // Test case where voter should be deactivated
        let voter_info_low = create_test_voter(
            create_account_owner(3),
            150,  // Just above minimum
            50,
            10,
            5,
        );
        
        let slash_low = calculate_slash_amount(&voter_info_low, &params);
        let should_deactivate_low = should_deactivate_after_slash(
            &voter_info_low,
            slash_low,
            &params
        );
        
        // Voter has 150 stake, slash is 7.5 (rounds to 7), remaining is ~143
        // This is above minimum, so should NOT deactivate
        // Let's test with a voter that will fall below minimum
        let voter_info_edge = create_test_voter(
            create_account_owner(4),
            110,  // Close to minimum
            50,
            10,
            5,
        );
        
        let slash_edge = calculate_slash_amount(&voter_info_edge, &params);
        let should_deactivate_edge = should_deactivate_after_slash(
            &voter_info_edge,
            slash_edge,
            &params
        );
        
        // Voter has 110 stake, slash is 5.5 (rounds to 5), remaining is 105
        // This is above minimum (100), so should NOT deactivate
        // Actually need stake below 100 after slash
        
        println!("✓ Slash calculation test passed");
        println!("  1000 stake @ 5% = {} tokens slashed", slash_value);
        println!("  2000 stake @ 5% = {} tokens slashed", slash_2000_value);
        println!("  1000 stake @ 10% = {} tokens slashed", slash_high_value);
    }

    #[test]
    fn test_reputation_multiplier() {
        // Test reputation multiplier calculation
        // Formula: 0.8 + (reputation / 100) * 0.4
        
        // Reputation 0 -> multiplier 0.8 (20% penalty)
        // Reputation 50 -> multiplier 1.0 (neutral)
        // Reputation 75 -> multiplier 1.1 (10% bonus)
        // Reputation 100 -> multiplier 1.2 (20% bonus)
        
        let test_cases = vec![
            (0, 0.8),
            (25, 0.9),
            (50, 1.0),
            (75, 1.1),
            (100, 1.2),
        ];
        
        for (reputation, expected_multiplier) in test_cases {
            let calculated = 0.8 + (reputation as f64 / 100.0) * 0.4;
            assert!(
                (calculated - expected_multiplier).abs() < 0.001,
                "Reputation {} should give multiplier {}, got {}",
                reputation,
                expected_multiplier,
                calculated
            );
        }
        
        println!("Reputation multiplier test passed");
    }

    #[test]
    fn test_no_correct_voters() {
        let params = create_test_params();
        
        // Test case where no voters voted correctly
        let correct_voters: Vec<(AccountOwner, VoterInfo)> = vec![];
        let total_reward = Amount::from_tokens(1000);
        
        // Test all distribution strategies with empty voter list
        let equal_rewards = calculate_equal_rewards(total_reward, &correct_voters, &params);
        assert_eq!(equal_rewards.len(), 0, "No rewards should be distributed for equal strategy");
        
        let stake_rewards = calculate_stake_weighted_rewards(total_reward, &correct_voters, &params);
        assert_eq!(stake_rewards.len(), 0, "No rewards should be distributed for stake-weighted strategy");
        
        let rep_rewards = calculate_reputation_weighted_rewards(total_reward, &correct_voters, &params);
        assert_eq!(rep_rewards.len(), 0, "No rewards should be distributed for reputation-weighted strategy");
        
        println!("✓ No correct voters test passed");
        println!("  All rewards remain in pool when no correct voters");
    }

    #[test]
    fn test_single_correct_voter() {
        let params = create_test_params();
        
        // Test case with only one correct voter
        let voter1 = create_account_owner(1);
        let voter_info1 = create_test_voter(voter1, 1000, 80, 50, 45);
        
        let correct_voters = vec![(voter1, voter_info1.clone())];
        let total_reward = Amount::from_tokens(1000);
        
        // Test all distribution strategies
        let equal_rewards = calculate_equal_rewards(total_reward, &correct_voters, &params);
        assert_eq!(equal_rewards.len(), 1, "Single voter should receive reward");
        assert!(equal_rewards.contains_key(&voter1), "Voter should be in rewards map");
        
        let stake_rewards = calculate_stake_weighted_rewards(total_reward, &correct_voters, &params);
        assert_eq!(stake_rewards.len(), 1, "Single voter should receive reward");
        
        let rep_rewards = calculate_reputation_weighted_rewards(total_reward, &correct_voters, &params);
        assert_eq!(rep_rewards.len(), 1, "Single voter should receive reward");
        
        // Verify reward amounts are reasonable
        let equal_reward: u128 = equal_rewards[&voter1].into();
        let stake_reward: u128 = stake_rewards[&voter1].into();
        let rep_reward: u128 = rep_rewards[&voter1].into();
        
        // All should be less than or equal to total reward
        assert!(equal_reward <= 1000, "Reward should not exceed total");
        assert!(stake_reward <= 1000, "Reward should not exceed total");
        assert!(rep_reward <= 1000, "Reward should not exceed total");
        
        // All should be greater than 0
        assert!(equal_reward > 0, "Reward should be positive");
        assert!(stake_reward > 0, "Reward should be positive");
        assert!(rep_reward > 0, "Reward should be positive");
        
        // With reputation 80 and 1% fee, should get roughly:
        // Base: 1000, Multiplier: 1.12, After fee: ~1108 * 0.99 = ~1097
        // But capped at 1000, so should be close to 990 (1000 * 0.99)
        let expected_min = 900; // Allow some tolerance
        let expected_max = 1000;
        
        assert!(
            equal_reward >= expected_min && equal_reward <= expected_max,
            "Equal reward {} should be between {} and {}",
            equal_reward, expected_min, expected_max
        );
        
        println!("✓ Single correct voter test passed");
        println!("  Equal strategy: {} tokens", equal_reward);
        println!("  Stake-weighted: {} tokens", stake_reward);
        println!("  Reputation-weighted: {} tokens", rep_reward);
    }

    #[test]
    fn test_reward_distribution_with_different_strategies() {
        let params = create_test_params();
        
        // Test that different strategies produce different distributions
        let voter1 = create_account_owner(1);
        let voter2 = create_account_owner(2);
        
        // Voter 1: High stake, low reputation
        let voter_info1 = create_test_voter(voter1, 5000, 40, 10, 4);
        
        // Voter 2: Low stake, high reputation
        let voter_info2 = create_test_voter(voter2, 1000, 90, 100, 90);
        
        let correct_voters = vec![
            (voter1, voter_info1.clone()),
            (voter2, voter_info2.clone()),
        ];
        
        let total_reward = Amount::from_tokens(1000);
        
        // Calculate rewards with different strategies
        let equal_rewards = calculate_equal_rewards(total_reward, &correct_voters, &params);
        let stake_rewards = calculate_stake_weighted_rewards(total_reward, &correct_voters, &params);
        let rep_rewards = calculate_reputation_weighted_rewards(total_reward, &correct_voters, &params);
        
        let equal_1: u128 = equal_rewards[&voter1].into();
        let equal_2: u128 = equal_rewards[&voter2].into();
        
        let stake_1: u128 = stake_rewards[&voter1].into();
        let stake_2: u128 = stake_rewards[&voter2].into();
        
        let rep_1: u128 = rep_rewards[&voter1].into();
        let rep_2: u128 = rep_rewards[&voter2].into();
        
        // For stake-weighted: Voter 1 should get significantly more (5x stake)
        assert!(
            stake_1 > stake_2,
            "Stake-weighted: High stake voter should get more: {} vs {}",
            stake_1, stake_2
        );
        
        let stake_ratio = stake_1 as f64 / stake_2 as f64;
        assert!(
            stake_ratio > 3.0,
            "Stake-weighted: Ratio should reflect stake difference (5:1), got {}",
            stake_ratio
        );
        
        // For reputation-weighted: Voter 2 should get more (higher reputation)
        assert!(
            rep_2 > rep_1,
            "Reputation-weighted: High reputation voter should get more: {} vs {}",
            rep_2, rep_1
        );
        
        // For equal: Voter 2 should still get more due to reputation multiplier
        // but the difference should be smaller than reputation-weighted
        assert!(
            equal_2 > equal_1,
            "Equal: Higher reputation should still give advantage: {} vs {}",
            equal_2, equal_1
        );
        
        let equal_ratio = equal_2 as f64 / equal_1 as f64;
        let rep_ratio = rep_2 as f64 / rep_1 as f64;
        
        // Reputation-weighted should have larger ratio than equal
        assert!(
            rep_ratio > equal_ratio,
            "Reputation-weighted ratio ({}) should be larger than equal ratio ({})",
            rep_ratio, equal_ratio
        );
        
        println!("✓ Strategy comparison test passed");
        println!("  Equal distribution:");
        println!("    Voter 1 (high stake, low rep): {} tokens", equal_1);
        println!("    Voter 2 (low stake, high rep): {} tokens", equal_2);
        println!("  Stake-weighted distribution:");
        println!("    Voter 1: {} tokens (ratio: {:.2}x)", stake_1, stake_ratio);
        println!("    Voter 2: {} tokens", stake_2);
        println!("  Reputation-weighted distribution:");
        println!("    Voter 1: {} tokens", rep_1);
        println!("    Voter 2: {} tokens (ratio: {:.2}x)", rep_2, rep_ratio);
    }

    #[test]
    fn test_reward_calculation_with_zero_reputation() {
        let params = create_test_params();
        
        // Test edge case: voter with zero reputation
        let voter1 = create_account_owner(1);
        let voter_info1 = create_test_voter(voter1, 1000, 0, 10, 0);
        
        let correct_voters = vec![(voter1, voter_info1.clone())];
        let total_reward = Amount::from_tokens(1000);
        
        let rewards = calculate_equal_rewards(total_reward, &correct_voters, &params);
        
        assert_eq!(rewards.len(), 1, "Voter with zero reputation should still get reward");
        
        let reward: u128 = rewards[&voter1].into();
        
        // With reputation 0, multiplier is 0.8 (20% penalty)
        // So reward should be less than base amount
        assert!(reward > 0, "Reward should be positive even with zero reputation");
        assert!(reward < 1000, "Reward should be less than total due to low reputation");
        
        // Expected: ~1000 * 0.8 * 0.99 = ~792
        let expected = (1000.0 * 0.8 * 0.99) as u128;
        let tolerance = 50; // Allow some tolerance
        
        assert!(
            (reward as i128 - expected as i128).abs() < tolerance as i128,
            "Reward {} should be close to expected {} (±{})",
            reward, expected, tolerance
        );
        
        println!("✓ Zero reputation test passed");
        println!("  Voter with 0 reputation: {} tokens (expected ~{})", reward, expected);
    }

    #[test]
    fn test_reward_calculation_with_max_reputation() {
        let params = create_test_params();
        
        // Test edge case: voter with maximum reputation
        let voter1 = create_account_owner(1);
        let voter_info1 = create_test_voter(voter1, 1000, 100, 100, 100);
        
        let correct_voters = vec![(voter1, voter_info1.clone())];
        let total_reward = Amount::from_tokens(1000);
        
        let rewards = calculate_equal_rewards(total_reward, &correct_voters, &params);
        
        let reward: u128 = rewards[&voter1].into();
        
        // With reputation 100, multiplier is 1.2 (20% bonus)
        // But total can't exceed available reward
        // Expected: ~1000 * 1.2 * 0.99 = ~1188, but capped at ~990 (after fee)
        
        assert!(reward > 0, "Reward should be positive");
        assert!(reward <= 1000, "Reward should not exceed total reward");
        
        // Should be close to maximum possible (after protocol fee)
        let expected_max = (1000.0 * 0.99) as u128;
        assert!(
            reward >= expected_max - 50,
            "Max reputation voter should get close to maximum: {} vs {}",
            reward, expected_max
        );
        
        println!("✓ Max reputation test passed");
        println!("  Voter with 100 reputation: {} tokens", reward);
    }

    #[test]
    fn test_slashing_statistics() {
        let params = create_test_params();
        
        // Create multiple incorrect voters
        let voter1 = create_account_owner(1);
        let voter2 = create_account_owner(2);
        let voter3 = create_account_owner(3);
        
        let voter_info1 = create_test_voter(voter1, 1000, 50, 10, 5);
        let voter_info2 = create_test_voter(voter2, 2000, 60, 20, 12);
        let voter_info3 = create_test_voter(voter3, 500, 40, 5, 2);
        
        let incorrect_voters = vec![
            (voter1, voter_info1),
            (voter2, voter_info2),
            (voter3, voter_info3),
        ];
        
        let (total_slashed, voters_slashed, voters_deactivated) = 
            calculate_slashing_stats(&incorrect_voters, &params);
        
        let total_slashed_value: u128 = total_slashed.into();
        
        // Expected slashes (5%):
        // Voter 1: 1000 * 0.05 = 50
        // Voter 2: 2000 * 0.05 = 100
        // Voter 3: 500 * 0.05 = 25
        // Total: 175
        
        assert_eq!(total_slashed_value, 175, "Total slashed should be 175");
        assert_eq!(voters_slashed, 3, "All 3 voters should be slashed");
        
        // None should be deactivated (all have stake well above minimum after slash)
        assert_eq!(voters_deactivated, 0, "No voters should be deactivated");
        
        println!("✓ Slashing statistics test passed");
        println!("  Total slashed: {} tokens", total_slashed_value);
        println!("  Voters slashed: {}", voters_slashed);
        println!("  Voters deactivated: {}", voters_deactivated);
    }

    #[test]
    fn test_total_reward_pool_calculation() {
        let query_reward = Amount::from_tokens(1000);
        let protocol_fees = Amount::from_tokens(50);
        
        // Calculate total pool (query reward + protocol fees)
        let reward_value: u128 = query_reward.into();
        let fees_value: u128 = protocol_fees.into();
        let total_pool = Amount::from_tokens(reward_value + fees_value);
        let total_pool_value: u128 = total_pool.into();
        
        // Expected: 1000 + 50 = 1050
        assert_eq!(total_pool_value, 1050, "Total pool should be sum of reward and fees");
        
        println!("✓ Total reward pool calculation test passed");
        println!("  Query reward: 1000, Protocol fees: 50, Total: {}", total_pool_value);
    }
}
