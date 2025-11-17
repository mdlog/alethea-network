// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Tests for reward claiming functionality

#[cfg(test)]
mod tests {
    use crate::test_utils::test_helpers::*;
    use linera_sdk::linera_base_types::Amount;
    
    /// Test reward amount calculations
    #[test]
    fn test_reward_amount_zero() {
        let reward = Amount::ZERO;
        assert_eq!(reward, Amount::ZERO);
    }
    
    #[test]
    fn test_reward_amount_positive() {
        let reward = Amount::from_tokens(100);
        let value: u128 = reward.into();
        assert_eq!(value, 100);
    }
    
    #[test]
    fn test_reward_amount_addition() {
        let reward1 = Amount::from_tokens(100);
        let reward2 = Amount::from_tokens(200);
        
        let value1: u128 = reward1.into();
        let value2: u128 = reward2.into();
        let total = Amount::from_tokens(value1 + value2);
        
        let total_value: u128 = total.into();
        assert_eq!(total_value, 300);
    }
    
    #[test]
    fn test_reward_distribution_calculation() {
        // Test splitting rewards among multiple voters
        let total_reward = Amount::from_tokens(1000);
        let num_voters = 4;
        
        let total_value: u128 = total_reward.into();
        let per_voter_value = total_value / num_voters;
        let per_voter_reward = Amount::from_tokens(per_voter_value);
        
        let per_voter_amount: u128 = per_voter_reward.into();
        assert_eq!(per_voter_amount, 250);
    }
    
    #[test]
    fn test_reward_tracking_accumulation() {
        // Test accumulating total rewards distributed
        let initial = Amount::ZERO;
        let claim1 = Amount::from_tokens(100);
        let claim2 = Amount::from_tokens(200);
        let claim3 = Amount::from_tokens(150);
        
        let initial_value: u128 = initial.into();
        let claim1_value: u128 = claim1.into();
        let claim2_value: u128 = claim2.into();
        let claim3_value: u128 = claim3.into();
        
        let total = Amount::from_tokens(
            initial_value + claim1_value + claim2_value + claim3_value
        );
        
        let total_value: u128 = total.into();
        assert_eq!(total_value, 450);
    }
    
    #[test]
    fn test_no_rewards_to_claim() {
        // Test that zero rewards is handled correctly
        let pending = Amount::ZERO;
        assert_eq!(pending, Amount::ZERO);
        
        // Verify we can detect when there are no rewards
        let has_rewards = pending > Amount::ZERO;
        assert!(!has_rewards);
    }
    
    #[test]
    fn test_reward_comparison() {
        let reward1 = Amount::from_tokens(100);
        let reward2 = Amount::from_tokens(200);
        let zero = Amount::ZERO;
        
        assert!(reward1 > zero);
        assert!(reward2 > reward1);
        assert!(zero == Amount::ZERO);
    }
}
