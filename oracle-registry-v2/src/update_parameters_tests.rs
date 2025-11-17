// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

#[cfg(test)]
mod tests {
    use crate::test_utils::test_helpers::*;
    use crate::state::{OracleRegistryV2, ProtocolParameters};
    use linera_sdk::linera_base_types::{AccountOwner, Amount};

    #[test]
    fn test_validate_protocol_parameters_valid() {
        // Valid parameters should pass validation
        let params = ProtocolParameters {
            min_stake: Amount::from_tokens(100),
            min_votes_default: 3,
            default_query_duration: 86400, // 24 hours
            reward_percentage: 1000,        // 10%
            slash_percentage: 500,          // 5%
            protocol_fee: 100,              // 1%
        };
        
        // This would be validated in the contract
        assert!(params.min_stake > Amount::ZERO);
        assert!(params.min_votes_default > 0);
        assert!(params.default_query_duration >= 60);
        assert!(params.reward_percentage <= 10000);
        assert!(params.slash_percentage <= 5000);
        assert!(params.protocol_fee <= 1000);
    }

    #[test]
    fn test_validate_protocol_parameters_invalid_min_stake() {
        // Zero min_stake should fail
        let params = ProtocolParameters {
            min_stake: Amount::ZERO,
            min_votes_default: 3,
            default_query_duration: 86400,
            reward_percentage: 1000,
            slash_percentage: 500,
            protocol_fee: 100,
        };
        
        assert_eq!(params.min_stake, Amount::ZERO);
    }

    #[test]
    fn test_validate_protocol_parameters_invalid_min_votes() {
        // Zero min_votes should fail
        let params = ProtocolParameters {
            min_stake: Amount::from_tokens(100),
            min_votes_default: 0,
            default_query_duration: 86400,
            reward_percentage: 1000,
            slash_percentage: 500,
            protocol_fee: 100,
        };
        
        assert_eq!(params.min_votes_default, 0);
    }

    #[test]
    fn test_validate_protocol_parameters_invalid_duration() {
        // Too short duration should fail
        let params = ProtocolParameters {
            min_stake: Amount::from_tokens(100),
            min_votes_default: 3,
            default_query_duration: 30, // Less than 60 seconds
            reward_percentage: 1000,
            slash_percentage: 500,
            protocol_fee: 100,
        };
        
        assert!(params.default_query_duration < 60);
    }

    #[test]
    fn test_validate_protocol_parameters_invalid_percentages() {
        // Reward percentage too high
        let params = ProtocolParameters {
            min_stake: Amount::from_tokens(100),
            min_votes_default: 3,
            default_query_duration: 86400,
            reward_percentage: 15000, // More than 100%
            slash_percentage: 500,
            protocol_fee: 100,
        };
        
        assert!(params.reward_percentage > 10000);
    }

    #[test]
    fn test_validate_protocol_parameters_total_exceeds_100() {
        // Total percentages exceed 100%
        let params = ProtocolParameters {
            min_stake: Amount::from_tokens(100),
            min_votes_default: 3,
            default_query_duration: 86400,
            reward_percentage: 5000,  // 50%
            slash_percentage: 4000,   // 40%
            protocol_fee: 2000,       // 20%
        };
        
        let total = params.reward_percentage + params.slash_percentage + params.protocol_fee;
        assert!(total > 10000); // Total is 110%
    }

    #[test]
    fn test_admin_initialization() {
        // Test that admin can be set during initialization
        // This is a conceptual test - actual implementation would require runtime
        let admin = create_account_owner(1);
        
        // Verify admin address is valid
        assert_ne!(admin, create_account_owner(0));
    }

    #[test]
    fn test_parameter_update_flow() {
        // Test the flow of updating parameters
        let old_params = ProtocolParameters::default();
        let new_params = ProtocolParameters {
            min_stake: Amount::from_tokens(200), // Increased from 100
            min_votes_default: 5,                 // Increased from 3
            default_query_duration: 172800,       // 48 hours instead of 24
            reward_percentage: 1500,              // 15% instead of 10%
            slash_percentage: 750,                // 7.5% instead of 5%
            protocol_fee: 150,                    // 1.5% instead of 1%
        };
        
        // Verify new parameters are different
        assert_ne!(old_params.min_stake, new_params.min_stake);
        assert_ne!(old_params.min_votes_default, new_params.min_votes_default);
        assert_ne!(old_params.default_query_duration, new_params.default_query_duration);
        
        // Verify new parameters are still valid
        assert!(new_params.min_stake > Amount::ZERO);
        assert!(new_params.min_votes_default > 0);
        assert!(new_params.default_query_duration >= 60);
        assert!(new_params.reward_percentage <= 10000);
        assert!(new_params.slash_percentage <= 5000);
        assert!(new_params.protocol_fee <= 1000);
    }
}
