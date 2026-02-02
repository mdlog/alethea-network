// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

#[cfg(test)]
mod tests {
    use crate::test_utils::test_helpers::*;
    use crate::state::{ProtocolParameters, VoterInfo};
    use linera_sdk::linera_base_types::Amount;

    /// Simplified voter info for testing (without AccountOwner dependency)
    struct TestVoterInfo {
        stake: Amount,
        reputation: u32,
        total_votes: u64,
        correct_votes: u64,
    }

    impl TestVoterInfo {
        fn to_voter_info(&self) -> VoterInfo {
            // We can't create a real VoterInfo without AccountOwner,
            // so we'll just test the calculation logic directly
            VoterInfo {
                address: unsafe { std::mem::zeroed() }, // Placeholder - not used in calculations
                stake: self.stake,
                locked_stake: Amount::ZERO,
                reputation: self.reputation,
                total_votes: self.total_votes,
                correct_votes: self.correct_votes,
                registered_at: unsafe { std::mem::zeroed() },
                is_active: true,
                name: None,
                metadata_url: None,
            }
        }
    }

    /// Helper to create a test voter info
    fn create_test_voter(
        stake: u128,
        reputation: u32,
        total_votes: u64,
        correct_votes: u64,
    ) -> TestVoterInfo {
        TestVoterInfo {
            stake: Amount::from_tokens(stake),
            reputation,
            total_votes,
            correct_votes,
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

    /// Helper function to calculate voter reward (mirrors state method)
    fn calculate_voter_reward(
        base_reward: Amount,
        voter_info: &TestVoterInfo,
        params: &ProtocolParameters,
    ) -> Amount {
        let base_value: u128 = base_reward.into();
        
        // Calculate reputation multiplier (0.8 to 1.2)
        let reputation_multiplier = 0.8 + (voter_info.reputation as f64 / 100.0) * 0.4;
        
        // Apply reputation multiplier
        let reward_with_reputation = (base_value as f64 * reputation_multiplier) as u128;
        
        // Deduct protocol fee
        let fee_multiplier = 1.0 - (params.protocol_fee as f64 / 10000.0);
        let final_reward = (reward_with_reputation as f64 * fee_multiplier) as u128;
        
        Amount::from_tokens(final_reward)
    }

    /// Helper function to calculate slash amount (mirrors state method)
    fn calculate_slash_amount(
        voter_info: &TestVoterInfo,
        params: &ProtocolParameters,
    ) -> Amount {
        let stake_value: u128 = voter_info.stake.into();
        let slash_multiplier = params.slash_percentage as f64 / 10000.0;
        let slash_amount = (stake_value as f64 * slash_multiplier) as u128;
        Amount::from_tokens(slash_amount)
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

    #[test]
    fn test_calculate_voter_reward_neutral_reputation() {
        let params = create_test_params();
        let voter = create_test_voter(1000, 50, 10, 8);
        let base_reward = Amount::from_tokens(100);

        let reward = calculate_voter_reward(base_reward, &voter, &params);
        let reward_value: u128 = reward.into();

        // Reputation 50 = 1.0 multiplier
        // 100 × 1.0 = 100
        // 100 × 0.99 (1% fee) = 99
        assert_eq!(reward_value, 99);
    }

    #[test]
    fn test_calculate_voter_reward_high_reputation() {
        let params = create_test_params();
        let voter = create_test_voter(1000, 100, 100, 95);
        let base_reward = Amount::from_tokens(100);

        let reward = calculate_voter_reward(base_reward, &voter, &params);
        let reward_value: u128 = reward.into();

        // Reputation 100 = 1.2 multiplier
        // 100 × 1.2 = 120
        // 120 × 0.99 (1% fee) = 118.8 ≈ 118
        assert_eq!(reward_value, 118);
    }

    #[test]
    fn test_calculate_voter_reward_low_reputation() {
        let params = create_test_params();
        let voter = create_test_voter(1000, 0, 10, 2);
        let base_reward = Amount::from_tokens(100);

        let reward = calculate_voter_reward(base_reward, &voter, &params);
        let reward_value: u128 = reward.into();

        // Reputation 0 = 0.8 multiplier
        // 100 × 0.8 = 80
        // 80 × 0.99 (1% fee) = 79.2 ≈ 79
        assert_eq!(reward_value, 79);
    }

    #[test]
    fn test_calculate_slash_amount() {
        let params = create_test_params();
        let voter = create_test_voter(1000, 50, 10, 5);

        let slash = calculate_slash_amount(&voter, &params);
        let slash_value: u128 = slash.into();

        // 1000 × 0.05 (5%) = 50
        assert_eq!(slash_value, 50);
    }

    #[test]
    fn test_calculate_slash_amount_zero_percentage() {
        let mut params = create_test_params();
        params.slash_percentage = 0;
        let voter = create_test_voter(1000, 50, 10, 5);

        let slash = calculate_slash_amount(&voter, &params);
        let slash_value: u128 = slash.into();

        assert_eq!(slash_value, 0);
    }

    #[test]
    fn test_calculate_protocol_fee() {
        let params = create_test_params();
        let reward = Amount::from_tokens(1000);

        let fee = calculate_protocol_fee(reward, &params);
        let fee_value: u128 = fee.into();

        // 1000 × 0.01 (1%) = 10
        assert_eq!(fee_value, 10);
    }

    #[test]
    fn test_calculate_protocol_fee_zero_percentage() {
        let mut params = create_test_params();
        params.protocol_fee = 0;
        let reward = Amount::from_tokens(1000);

        let fee = calculate_protocol_fee(reward, &params);
        let fee_value: u128 = fee.into();

        assert_eq!(fee_value, 0);
    }

    #[test]
    fn test_calculate_total_reward_pool() {
        let query_reward = Amount::from_tokens(1000);
        let protocol_fees = Amount::from_tokens(50);

        let reward_value: u128 = query_reward.into();
        let fees_value: u128 = protocol_fees.into();
        let total = Amount::from_tokens(reward_value + fees_value);
        let total_value: u128 = total.into();

        assert_eq!(total_value, 1050);
    }

    #[test]
    fn test_reputation_multiplier_range() {
        let params = create_test_params();
        let base_reward = Amount::from_tokens(1000);

        // Test minimum reputation (0)
        let voter_min = create_test_voter(1000, 0, 10, 0);
        let reward_min = calculate_voter_reward(base_reward, &voter_min, &params);
        let min_value: u128 = reward_min.into();
        // 1000 × 0.8 × 0.99 = 792
        assert_eq!(min_value, 792);

        // Test maximum reputation (100)
        let voter_max = create_test_voter(1000, 100, 100, 100);
        let reward_max = calculate_voter_reward(base_reward, &voter_max, &params);
        let max_value: u128 = reward_max.into();
        // 1000 × 1.2 × 0.99 = 1188
        assert_eq!(max_value, 1188);

        // Verify max is 1.5x min (before fees)
        // 792 / 0.99 = 800 (min before fee)
        // 1188 / 0.99 = 1200 (max before fee)
        // 1200 / 800 = 1.5 ✓
    }

    #[test]
    fn test_high_protocol_fee() {
        let mut params = create_test_params();
        params.protocol_fee = 1000; // 10%
        let voter = create_test_voter(1000, 50, 10, 8);
        let base_reward = Amount::from_tokens(100);

        let reward = calculate_voter_reward(base_reward, &voter, &params);
        let reward_value: u128 = reward.into();

        // 100 × 1.0 (rep 50) × 0.90 (10% fee) = 90
        assert_eq!(reward_value, 90);
    }

    #[test]
    fn test_high_slash_percentage() {
        let mut params = create_test_params();
        params.slash_percentage = 2000; // 20%
        let voter = create_test_voter(1000, 50, 10, 5);

        let slash = calculate_slash_amount(&voter, &params);
        let slash_value: u128 = slash.into();

        // 1000 × 0.20 = 200
        assert_eq!(slash_value, 200);
    }
}
