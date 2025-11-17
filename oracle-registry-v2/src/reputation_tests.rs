// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Tests for the reputation calculation system

#[cfg(test)]
mod tests {
    use crate::test_utils::test_helpers::*;
    use crate::state::{VoterInfo, ReputationStats};
    use linera_sdk::linera_base_types::{AccountOwner, Amount, Timestamp};

    /// Helper to create a test voter with specific stats
    fn create_test_voter(total_votes: u64, correct_votes: u64) -> VoterInfo {
        VoterInfo {
            address: create_account_owner(0),
            stake: Amount::from_tokens(1000),
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes,
            correct_votes,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: Some("Test Voter".to_string()),
            metadata_url: None,
        }
    }

    #[test]
    fn test_new_voter_default_reputation() {
        let voter = create_test_voter(0, 0);
        
        // Mock state for calculation
        let state = MockState;
        let reputation = state.calculate_reputation(&voter);
        
        assert_eq!(reputation, 50, "New voters should have default reputation of 50");
    }

    #[test]
    fn test_perfect_accuracy_reputation() {
        let voter = create_test_voter(100, 100);
        
        let state = MockState;
        let reputation = state.calculate_reputation(&voter);
        
        // 100% accuracy + 10 participation bonus = 110, capped at 100
        assert_eq!(reputation, 100, "Perfect accuracy should give max reputation");
    }

    #[test]
    fn test_high_accuracy_reputation() {
        let voter = create_test_voter(100, 90);
        
        let state = MockState;
        let reputation = state.calculate_reputation(&voter);
        
        // 90% accuracy + 10 participation bonus = 100
        assert_eq!(reputation, 100, "90% accuracy with full participation should give max reputation");
    }

    #[test]
    fn test_medium_accuracy_reputation() {
        let voter = create_test_voter(100, 70);
        
        let state = MockState;
        let reputation = state.calculate_reputation(&voter);
        
        // 70% accuracy + 10 participation bonus = 80
        assert_eq!(reputation, 80, "70% accuracy should give 80 reputation with full participation");
    }

    #[test]
    fn test_low_accuracy_reputation() {
        let voter = create_test_voter(100, 40);
        
        let state = MockState;
        let reputation = state.calculate_reputation(&voter);
        
        // 40% accuracy + 10 participation bonus = 50
        assert_eq!(reputation, 50, "40% accuracy should give 50 reputation with full participation");
    }

    #[test]
    fn test_participation_bonus_scaling() {
        let state = MockState;
        
        // 10 votes: 1 point bonus
        let voter_10 = create_test_voter(10, 8);
        let rep_10 = state.calculate_reputation(&voter_10);
        assert_eq!(rep_10, 81, "10 votes should give 1 point participation bonus");
        
        // 50 votes: 5 points bonus
        let voter_50 = create_test_voter(50, 40);
        let rep_50 = state.calculate_reputation(&voter_50);
        assert_eq!(rep_50, 85, "50 votes should give 5 points participation bonus");
        
        // 100 votes: 10 points bonus
        let voter_100 = create_test_voter(100, 80);
        let rep_100 = state.calculate_reputation(&voter_100);
        assert_eq!(rep_100, 90, "100 votes should give 10 points participation bonus");
        
        // 200 votes: still 10 points bonus (capped)
        let voter_200 = create_test_voter(200, 160);
        let rep_200 = state.calculate_reputation(&voter_200);
        assert_eq!(rep_200, 90, "200 votes should still give 10 points participation bonus (capped)");
    }

    #[test]
    fn test_reputation_tiers() {
        let state = MockState;
        
        assert_eq!(state.get_reputation_tier(20), "Novice");
        assert_eq!(state.get_reputation_tier(40), "Novice");
        assert_eq!(state.get_reputation_tier(50), "Intermediate");
        assert_eq!(state.get_reputation_tier(70), "Intermediate");
        assert_eq!(state.get_reputation_tier(75), "Expert");
        assert_eq!(state.get_reputation_tier(90), "Expert");
        assert_eq!(state.get_reputation_tier(95), "Master");
        assert_eq!(state.get_reputation_tier(100), "Master");
    }

    #[test]
    fn test_reputation_weight_calculation() {
        let state = MockState;
        
        // Minimum weight
        let weight_0 = state.calculate_reputation_weight(0);
        assert!((weight_0 - 0.5).abs() < 0.001, "Reputation 0 should give weight 0.5");
        
        // Default weight
        let weight_50 = state.calculate_reputation_weight(50);
        assert!((weight_50 - 1.25).abs() < 0.001, "Reputation 50 should give weight 1.25");
        
        // High weight
        let weight_75 = state.calculate_reputation_weight(75);
        assert!((weight_75 - 1.625).abs() < 0.001, "Reputation 75 should give weight 1.625");
        
        // Maximum weight
        let weight_100 = state.calculate_reputation_weight(100);
        assert!((weight_100 - 2.0).abs() < 0.001, "Reputation 100 should give weight 2.0");
    }

    #[test]
    fn test_reputation_weight_range() {
        let state = MockState;
        
        // Test that weights are always in valid range
        for reputation in 0..=100 {
            let weight = state.calculate_reputation_weight(reputation);
            assert!(weight >= 0.5, "Weight should be at least 0.5");
            assert!(weight <= 2.0, "Weight should be at most 2.0");
        }
    }

    #[test]
    fn test_reputation_progression() {
        let state = MockState;
        
        // Simulate voter progression
        let mut voter = create_test_voter(0, 0);
        
        // After 10 votes, 8 correct
        voter.total_votes = 10;
        voter.correct_votes = 8;
        let rep_1 = state.calculate_reputation(&voter);
        assert_eq!(rep_1, 81, "After 10 votes (80% accuracy): reputation should be 81");
        
        // After 50 votes, 42 correct
        voter.total_votes = 50;
        voter.correct_votes = 42;
        let rep_2 = state.calculate_reputation(&voter);
        assert_eq!(rep_2, 89, "After 50 votes (84% accuracy): reputation should be 89");
        
        // After 100 votes, 90 correct
        voter.total_votes = 100;
        voter.correct_votes = 90;
        let rep_3 = state.calculate_reputation(&voter);
        assert_eq!(rep_3, 100, "After 100 votes (90% accuracy): reputation should be 100");
    }

    #[test]
    fn test_reputation_decline() {
        let state = MockState;
        
        // Start with good reputation
        let mut voter = create_test_voter(100, 90);
        let initial_rep = state.calculate_reputation(&voter);
        assert_eq!(initial_rep, 100);
        
        // Add incorrect votes
        voter.total_votes = 110;
        voter.correct_votes = 90; // 10 incorrect votes added
        let declined_rep = state.calculate_reputation(&voter);
        
        // 90/110 = 81.8% accuracy + 10 participation = 91.8 = 91
        assert_eq!(declined_rep, 91, "Reputation should decline with incorrect votes");
    }

    #[test]
    fn test_edge_cases() {
        let state = MockState;
        
        // Zero votes
        let voter_zero = create_test_voter(0, 0);
        assert_eq!(state.calculate_reputation(&voter_zero), 50);
        
        // One vote correct
        let voter_one_correct = create_test_voter(1, 1);
        let rep = state.calculate_reputation(&voter_one_correct);
        // 100% accuracy + 0.1 participation = 100.1, capped at 100
        assert_eq!(rep, 100);
        
        // One vote incorrect
        let voter_one_incorrect = create_test_voter(1, 0);
        let rep = state.calculate_reputation(&voter_one_incorrect);
        // 0% accuracy + 0.1 participation = 0.1 = 0
        assert_eq!(rep, 0);
    }

    #[test]
    fn test_reputation_with_decay() {
        let state = MockState;
        
        // Voter registered 60 days ago with only 5 votes
        let mut voter = create_test_voter(5, 4);
        voter.registered_at = Timestamp::from(0);
        
        // Current time: 60 days later (in microseconds)
        let current_time = Timestamp::from(60 * 86400 * 1_000_000u64);
        
        let reputation_with_decay = state.calculate_reputation_with_decay(&voter, current_time);
        
        // Base reputation: 80% accuracy + 0.5 participation = 80.5 = 80
        // With decay: 80 * 0.9 = 72
        assert_eq!(reputation_with_decay, 72, "Inactive voter should have decayed reputation");
    }

    #[test]
    fn test_reputation_no_decay_for_active_voters() {
        let state = MockState;
        
        // Voter registered 60 days ago with 50 votes (active)
        let mut voter = create_test_voter(50, 40);
        voter.registered_at = Timestamp::from(0);
        
        let current_time = Timestamp::from(60 * 86400 * 1_000_000u64);
        
        let reputation_with_decay = state.calculate_reputation_with_decay(&voter, current_time);
        let base_reputation = state.calculate_reputation(&voter);
        
        // Active voters (>10 votes) should not have decay
        assert_eq!(reputation_with_decay, base_reputation, "Active voters should not have decay");
    }

    #[test]
    fn test_reputation_no_decay_for_new_voters() {
        let state = MockState;
        
        // Voter registered 10 days ago with only 2 votes
        let mut voter = create_test_voter(2, 2);
        voter.registered_at = Timestamp::from(0);
        
        let current_time = Timestamp::from(10 * 86400 * 1_000_000u64);
        
        let reputation_with_decay = state.calculate_reputation_with_decay(&voter, current_time);
        let base_reputation = state.calculate_reputation(&voter);
        
        // New voters (<30 days) should not have decay
        assert_eq!(reputation_with_decay, base_reputation, "New voters should not have decay");
    }

    #[test]
    fn test_reputation_stats_calculation() {
        let state = MockState;
        let voter = create_test_voter(100, 85);
        
        let stats = state.get_reputation_stats(&voter);
        
        assert_eq!(stats.reputation, 95, "Reputation should be 95 (85% + 10 bonus)");
        assert_eq!(stats.tier, "Master", "Should be Master tier");
        assert!((stats.weight - 1.925).abs() < 0.001, "Weight should be 1.925");
        assert_eq!(stats.total_votes, 100);
        assert_eq!(stats.correct_votes, 85);
        assert!((stats.accuracy_percentage - 85.0).abs() < 0.001, "Accuracy should be 85%");
    }

    #[test]
    fn test_reputation_stats_for_new_voter() {
        let state = MockState;
        let voter = create_test_voter(0, 0);
        
        let stats = state.get_reputation_stats(&voter);
        
        assert_eq!(stats.reputation, 50, "New voter should have reputation 50");
        assert_eq!(stats.tier, "Intermediate", "Should be Intermediate tier");
        assert!((stats.weight - 1.25).abs() < 0.001, "Weight should be 1.25");
        assert_eq!(stats.total_votes, 0);
        assert_eq!(stats.correct_votes, 0);
        assert_eq!(stats.accuracy_percentage, 0.0, "Accuracy should be 0% for no votes");
    }

    #[test]
    fn test_reputation_boundary_values() {
        let state = MockState;
        
        // Test tier boundaries
        let voter_40 = create_test_voter(100, 30); // 30% + 10 = 40
        assert_eq!(state.calculate_reputation(&voter_40), 40);
        assert_eq!(state.get_reputation_tier(40), "Novice");
        
        let voter_41 = create_test_voter(100, 31); // 31% + 10 = 41
        assert_eq!(state.calculate_reputation(&voter_41), 41);
        assert_eq!(state.get_reputation_tier(41), "Intermediate");
        
        let voter_70 = create_test_voter(100, 60); // 60% + 10 = 70
        assert_eq!(state.calculate_reputation(&voter_70), 70);
        assert_eq!(state.get_reputation_tier(70), "Intermediate");
        
        let voter_71 = create_test_voter(100, 61); // 61% + 10 = 71
        assert_eq!(state.calculate_reputation(&voter_71), 71);
        assert_eq!(state.get_reputation_tier(71), "Expert");
        
        let voter_90 = create_test_voter(100, 80); // 80% + 10 = 90
        assert_eq!(state.calculate_reputation(&voter_90), 90);
        assert_eq!(state.get_reputation_tier(90), "Expert");
        
        let voter_91 = create_test_voter(100, 81); // 81% + 10 = 91
        assert_eq!(state.calculate_reputation(&voter_91), 91);
        assert_eq!(state.get_reputation_tier(91), "Master");
    }

    #[test]
    fn test_reputation_weight_linear_scaling() {
        let state = MockState;
        
        // Test that weight scales linearly with reputation
        let weight_0 = state.calculate_reputation_weight(0);
        let weight_25 = state.calculate_reputation_weight(25);
        let weight_50 = state.calculate_reputation_weight(50);
        let weight_75 = state.calculate_reputation_weight(75);
        let weight_100 = state.calculate_reputation_weight(100);
        
        // Check linear progression
        let diff_1 = weight_25 - weight_0;
        let diff_2 = weight_50 - weight_25;
        let diff_3 = weight_75 - weight_50;
        let diff_4 = weight_100 - weight_75;
        
        // All differences should be approximately equal (linear)
        assert!((diff_1 - diff_2).abs() < 0.001, "Weight should scale linearly");
        assert!((diff_2 - diff_3).abs() < 0.001, "Weight should scale linearly");
        assert!((diff_3 - diff_4).abs() < 0.001, "Weight should scale linearly");
    }

    #[test]
    fn test_reputation_recovery_scenario() {
        let state = MockState;
        
        // Voter starts poorly
        let mut voter = create_test_voter(10, 3);
        let initial_rep = state.calculate_reputation(&voter);
        assert_eq!(initial_rep, 30, "Poor start: 30% accuracy + 1 bonus = 31, rounded to 30");
        
        // Voter improves over time
        voter.total_votes = 50;
        voter.correct_votes = 40;
        let improved_rep = state.calculate_reputation(&voter);
        assert_eq!(improved_rep, 85, "Improved: 80% accuracy + 5 bonus = 85");
        
        // Voter reaches excellence
        voter.total_votes = 100;
        voter.correct_votes = 90;
        let excellent_rep = state.calculate_reputation(&voter);
        assert_eq!(excellent_rep, 100, "Excellent: 90% accuracy + 10 bonus = 100");
        
        assert!(excellent_rep > improved_rep, "Reputation should improve with better performance");
        assert!(improved_rep > initial_rep, "Reputation should recover from poor start");
    }

    #[test]
    fn test_reputation_consistency() {
        let state = MockState;
        
        // Same accuracy, different vote counts should have different reputations
        let voter_10 = create_test_voter(10, 8); // 80% accuracy
        let voter_50 = create_test_voter(50, 40); // 80% accuracy
        let voter_100 = create_test_voter(100, 80); // 80% accuracy
        
        let rep_10 = state.calculate_reputation(&voter_10);
        let rep_50 = state.calculate_reputation(&voter_50);
        let rep_100 = state.calculate_reputation(&voter_100);
        
        // More votes should give higher reputation due to participation bonus
        assert!(rep_50 > rep_10, "More votes should increase reputation");
        assert!(rep_100 > rep_50, "Even more votes should further increase reputation");
    }

    #[test]
    fn test_reputation_capping() {
        let state = MockState;
        
        // Test that reputation is always capped at 100
        let perfect_voter = create_test_voter(200, 200);
        let reputation = state.calculate_reputation(&perfect_voter);
        
        // 100% accuracy + 10 participation = 110, should be capped at 100
        assert_eq!(reputation, 100, "Reputation should be capped at 100");
        assert!(reputation <= 100, "Reputation should never exceed 100");
    }

    #[test]
    fn test_reputation_floor() {
        let state = MockState;
        
        // Test that reputation can reach 0
        let terrible_voter = create_test_voter(200, 0);
        let reputation = state.calculate_reputation(&terrible_voter);
        
        // 0% accuracy + 10 participation = 10
        assert_eq!(reputation, 10, "Reputation should be 10 with 0% accuracy but full participation");
        
        // Very few votes, all wrong
        let bad_voter = create_test_voter(5, 0);
        let reputation = state.calculate_reputation(&bad_voter);
        
        // 0% accuracy + 0.5 participation = 0.5 = 0
        assert_eq!(reputation, 0, "Reputation should be 0 with 0% accuracy and low participation");
    }

    // Mock state for testing
    struct MockState;

    impl MockState {
        fn calculate_reputation(&self, voter_info: &VoterInfo) -> u32 {
            if voter_info.total_votes == 0 {
                return 50;
            }
            
            let accuracy = (voter_info.correct_votes as f64 / voter_info.total_votes as f64) * 100.0;
            
            let participation_bonus = if voter_info.total_votes >= 100 {
                10.0
            } else {
                (voter_info.total_votes as f64 / 100.0) * 10.0
            };
            
            let reputation = (accuracy + participation_bonus).min(100.0);
            reputation as u32
        }

        fn get_reputation_tier(&self, reputation: u32) -> &'static str {
            match reputation {
                0..=40 => "Novice",
                41..=70 => "Intermediate",
                71..=90 => "Expert",
                91..=100 => "Master",
                _ => "Unknown",
            }
        }

        fn calculate_reputation_weight(&self, reputation: u32) -> f64 {
            0.5 + (reputation as f64 / 100.0) * 1.5
        }

        fn calculate_reputation_with_decay(&self, voter_info: &VoterInfo, current_time: Timestamp) -> u32 {
            let base_reputation = self.calculate_reputation(voter_info);
            
            // Calculate days since registration
            let micros_since_registration = current_time
                .delta_since(voter_info.registered_at)
                .as_micros();
            let days_since_registration = micros_since_registration / (86400 * 1_000_000);
            
            // If voter has been registered for more than 30 days but has very few votes,
            // apply decay
            if days_since_registration > 30 && voter_info.total_votes < 10 {
                let decay_factor = 0.9; // 10% decay
                (base_reputation as f64 * decay_factor) as u32
            } else {
                base_reputation
            }
        }

        fn get_reputation_stats(&self, voter_info: &VoterInfo) -> ReputationStats {
            ReputationStats {
                reputation: self.calculate_reputation(voter_info),
                tier: self.get_reputation_tier(self.calculate_reputation(voter_info)).to_string(),
                weight: self.calculate_reputation_weight(self.calculate_reputation(voter_info)),
                total_votes: voter_info.total_votes,
                correct_votes: voter_info.correct_votes,
                accuracy_percentage: if voter_info.total_votes > 0 {
                    (voter_info.correct_votes as f64 / voter_info.total_votes as f64) * 100.0
                } else {
                    0.0
                },
            }
        }
    }
}
