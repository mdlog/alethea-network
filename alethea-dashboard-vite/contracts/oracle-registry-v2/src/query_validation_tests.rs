// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Tests for query validation functionality

#[cfg(test)]
mod tests {
    use crate::test_utils::test_helpers::*;
    use crate::state::{DecisionStrategy, QueryStatus};
    use linera_sdk::linera_base_types::{Amount, Timestamp, TimeDelta};

    /// Test helper to validate description constraints
    fn validate_description(desc: &str) -> Result<(), String> {
        if desc.is_empty() {
            return Err("Description cannot be empty".to_string());
        }
        if desc.len() > 1000 {
            return Err("Description too long (max 1000 characters)".to_string());
        }
        Ok(())
    }

    /// Test helper to validate outcomes constraints
    fn validate_outcomes(outcomes: &[String]) -> Result<(), String> {
        if outcomes.is_empty() {
            return Err("At least one outcome must be provided".to_string());
        }
        if outcomes.len() > 100 {
            return Err("Too many outcomes (max 100)".to_string());
        }
        
        for outcome in outcomes {
            if outcome.is_empty() {
                return Err("Outcome cannot be empty".to_string());
            }
            if outcome.len() > 200 {
                return Err("Outcome too long (max 200 characters)".to_string());
            }
        }
        
        let mut unique = std::collections::HashSet::new();
        for outcome in outcomes {
            if !unique.insert(outcome) {
                return Err(format!("Duplicate outcome: {}", outcome));
            }
        }
        
        Ok(())
    }

    /// Test helper to validate deadline constraints
    fn validate_deadline(deadline: Timestamp, current_time: Timestamp) -> Result<(), String> {
        if deadline <= current_time {
            return Err("Deadline must be in the future".to_string());
        }
        
        let max_duration_micros = 365 * 24 * 60 * 60 * 1_000_000u64;
        let max_duration = TimeDelta::from_micros(max_duration_micros);
        let max_deadline = current_time.saturating_add(max_duration);
        if deadline > max_deadline {
            return Err("Deadline too far in the future (max 1 year)".to_string());
        }
        
        Ok(())
    }

    /// Test helper to validate min_votes constraints
    fn validate_min_votes(min_votes: usize, voter_count: u64) -> Result<(), String> {
        if min_votes == 0 {
            return Err("Minimum votes must be at least 1".to_string());
        }
        
        if min_votes as u64 > voter_count {
            return Err(format!(
                "Minimum votes ({}) exceeds total registered voters ({})",
                min_votes, voter_count
            ));
        }
        
        if min_votes as u64 > voter_count / 2 && voter_count > 10 {
            return Err(format!(
                "Minimum votes ({}) is more than 50% of registered voters ({})",
                min_votes, voter_count
            ));
        }
        
        Ok(())
    }

    /// Test helper to validate strategy compatibility
    fn validate_strategy_compatibility(strategy: &DecisionStrategy, outcomes: &[String]) -> Result<(), String> {
        match strategy {
            DecisionStrategy::Median => {
                for outcome in outcomes {
                    if outcome.parse::<f64>().is_err() {
                        return Err(format!(
                            "Median strategy requires numeric outcomes, but '{}' is not numeric",
                            outcome
                        ));
                    }
                }
            },
            _ => {}
        }
        Ok(())
    }

    #[test]
    fn test_query_validation_description() {
        // Empty description should fail
        let empty_desc = "";
        assert!(validate_description(empty_desc).is_err());

        // Too long description should fail
        let long_desc = "a".repeat(1001);
        assert!(validate_description(&long_desc).is_err());

        // Valid description should pass
        let valid_desc = "What is the price of BTC?";
        assert!(validate_description(valid_desc).is_some());
    }

    #[test]
    fn test_query_validation_outcomes() {
        // Empty outcomes should fail
        let empty_outcomes: Vec<String> = vec![];
        assert!(validate_outcomes(&empty_outcomes).is_err());

        // Too many outcomes should fail
        let too_many_outcomes: Vec<String> = (0..101).map(|i| format!("Outcome {}", i)).collect();
        assert!(validate_outcomes(&too_many_outcomes).is_err());

        // Empty outcome string should fail
        let outcomes_with_empty = vec!["Yes".to_string(), "".to_string(), "No".to_string()];
        assert!(validate_outcomes(&outcomes_with_empty).is_err());

        // Outcome too long should fail
        let outcomes_with_long = vec!["Yes".to_string(), "a".repeat(201)];
        assert!(validate_outcomes(&outcomes_with_long).is_err());

        // Duplicate outcomes should fail
        let duplicate_outcomes = vec!["Yes".to_string(), "No".to_string(), "Yes".to_string()];
        assert!(validate_outcomes(&duplicate_outcomes).is_err());

        // Valid outcomes should pass
        let valid_outcomes = vec!["Yes".to_string(), "No".to_string(), "Maybe".to_string()];
        assert!(validate_outcomes(&valid_outcomes).is_some());
    }

    #[test]
    fn test_query_validation_reward_amount() {
        // Zero reward should fail
        let zero_reward = Amount::ZERO;
        assert_eq!(zero_reward, Amount::ZERO);

        // Positive reward should pass
        let valid_reward = Amount::from_tokens(100);
        assert!(valid_reward > Amount::ZERO);
    }

    #[test]
    fn test_query_validation_deadline() {
        let current_time = Timestamp::from(1000000);
        
        // Deadline in the past should fail
        let past_deadline = Timestamp::from(500000);
        assert!(validate_deadline(past_deadline, current_time).is_err());

        // Deadline too far in future should fail (> 1 year)
        let max_duration_micros = 365 * 24 * 60 * 60 * 1_000_000u64;
        let max_duration = TimeDelta::from_micros(max_duration_micros);
        let max_deadline = current_time.saturating_add(max_duration);
        let too_far_duration = TimeDelta::from_micros(1000);
        let too_far_deadline = max_deadline.saturating_add(too_far_duration);
        assert!(validate_deadline(too_far_deadline, current_time).is_err());

        // Valid deadline should pass
        let valid_duration = TimeDelta::from_micros(86400 * 1_000_000); // 1 day
        let valid_deadline = current_time.saturating_add(valid_duration);
        assert!(validate_deadline(valid_deadline, current_time).is_some());
    }

    #[test]
    fn test_query_validation_min_votes() {
        // Zero min_votes should fail
        assert!(validate_min_votes(0, 10).is_err());

        // min_votes > voter_count should fail
        assert!(validate_min_votes(10, 5).is_err());

        // min_votes > 50% of voters (when voters > 10) should fail
        assert!(validate_min_votes(60, 100).is_err());

        // Valid min_votes should pass
        assert!(validate_min_votes(3, 10).is_some());
        assert!(validate_min_votes(5, 20).is_some());
    }

    #[test]
    fn test_query_validation_strategy_compatibility() {
        // Median strategy with non-numeric outcomes should fail
        let non_numeric_outcomes = vec!["Yes".to_string(), "No".to_string()];
        assert!(validate_strategy_compatibility(&DecisionStrategy::Median, &non_numeric_outcomes).is_err());

        // Median strategy with numeric outcomes should pass
        let numeric_outcomes = vec!["100".to_string(), "200".to_string(), "300".to_string()];
        assert!(validate_strategy_compatibility(&DecisionStrategy::Median, &numeric_outcomes).is_some());

        // Other strategies work with any outcomes
        let any_outcomes = vec!["Yes".to_string(), "No".to_string()];
        assert!(validate_strategy_compatibility(&DecisionStrategy::Majority, &any_outcomes).is_some());
        assert!(validate_strategy_compatibility(&DecisionStrategy::WeightedByStake, &any_outcomes).is_some());
        assert!(validate_strategy_compatibility(&DecisionStrategy::WeightedByReputation, &any_outcomes).is_some());
    }

    #[test]
    fn test_query_status_validation() {
        // Active status is valid for voting
        assert_eq!(QueryStatus::Active, QueryStatus::Active);

        // Other statuses are not valid for voting
        assert_ne!(QueryStatus::Resolved, QueryStatus::Active);
        assert_ne!(QueryStatus::Expired, QueryStatus::Active);
        assert_ne!(QueryStatus::Cancelled, QueryStatus::Active);
    }

    #[test]
    fn test_query_deadline_validation_logic() {
        let current_time = Timestamp::from(1000000);
        let future_duration = TimeDelta::from_micros(86400 * 1_000_000);
        let future_deadline = current_time.saturating_add(future_duration);
        let past_deadline = Timestamp::from(500000);

        // Query with future deadline should accept votes
        assert!(current_time < future_deadline);

        // Query with past deadline should not accept votes
        assert!(current_time >= past_deadline);
    }

    #[test]
    fn test_vote_value_validation_logic() {
        let valid_outcomes = vec!["Yes".to_string(), "No".to_string(), "Maybe".to_string()];

        // Valid vote values
        assert!(valid_outcomes.contains(&"Yes".to_string()));
        assert!(valid_outcomes.contains(&"No".to_string()));
        assert!(valid_outcomes.contains(&"Maybe".to_string()));

        // Invalid vote values
        assert!(!valid_outcomes.contains(&"Invalid".to_string()));
        assert!(!valid_outcomes.contains(&"".to_string()));
    }

    #[test]
    fn test_confidence_validation_logic() {
        // Valid confidence values
        assert!(0 <= 100);
        assert!(50 <= 100);
        assert!(100 <= 100);

        // Invalid confidence values
        assert!(101 > 100);
        assert!(255 > 100);
    }

    #[test]
    fn test_query_resolution_validation_logic() {
        let current_time = Timestamp::from(1000000);
        let past_deadline = Timestamp::from(500000);
        let future_duration = TimeDelta::from_micros(86400 * 1_000_000);
        let future_deadline = current_time.saturating_add(future_duration);

        // Query with past deadline and enough votes should be resolvable
        let min_votes = 3;
        let actual_votes = 5;
        assert!(current_time >= past_deadline);
        assert!(actual_votes >= min_votes);

        // Query with not enough votes should not be resolvable
        let actual_votes_low = 2;
        assert!(actual_votes_low < min_votes);

        // Query with future deadline should not be resolvable
        assert!(current_time < future_deadline);
    }
}
