// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Protocol constants and canonical IDs

use linera_sdk::linera_base_types::Amount;

// ==================== PROTOCOL CONSTANTS ====================

/// Canonical Oracle Registry ApplicationId
/// Current Deployment: Conway Testnet (Nov 9, 2025)
/// This should never change after deployment
pub const CANONICAL_REGISTRY_ID_PLACEHOLDER: &str = "36667e825932001d2ce55963d507964291d6d6388d22c881777358cb9b9b50ec";

/// Minimum stake for voter registration (in tokens)
pub const MIN_VOTER_STAKE: u128 = 1000;

/// Minimum voters required per market
pub const MIN_VOTERS_PER_MARKET: u32 = 20;

/// Maximum voters per market
pub const MAX_VOTERS_PER_MARKET: u32 = 50;

/// Commit phase duration (in seconds)
pub const COMMIT_PHASE_DURATION: u64 = 3600; // 1 hour

/// Reveal phase duration (in seconds)
pub const REVEAL_PHASE_DURATION: u64 = 3600; // 1 hour

/// Base market registration fee (in tokens)
pub const BASE_MARKET_FEE: u128 = 10;

/// Protocol fee percentage (0-100)
pub const PROTOCOL_FEE_PERCENTAGE: u8 = 10;

/// Slash percentage for incorrect votes (0-100)
pub const SLASH_PERCENTAGE: u8 = 10;

/// Minimum reputation score to remain active
pub const MIN_REPUTATION: u64 = 20;

/// Initial reputation for new voters
pub const INITIAL_REPUTATION: u64 = 100;

/// Reputation increase for correct vote
pub const REPUTATION_INCREASE_BASE: u64 = 10;

/// Reputation increase per streak
pub const REPUTATION_INCREASE_PER_STREAK: u64 = 2;

/// Reputation decrease for incorrect vote
pub const REPUTATION_DECREASE: u64 = 5;

/// Maximum outcomes per market
pub const MAX_OUTCOMES: usize = 10;

/// Minimum outcomes per market
pub const MIN_OUTCOMES: usize = 2;

/// Maximum hash input size (for WASM safety)
pub const MAX_HASH_INPUT: usize = 10_000;

// ==================== ERROR CODES ====================

/// Error code ranges
pub mod error_codes {
    // Market errors: 1000-1999
    pub const MARKET_NOT_FOUND: u32 = 1001;
    pub const INVALID_OUTCOMES: u32 = 1002;
    pub const INSUFFICIENT_FEE: u32 = 1003;
    pub const DEADLINE_PASSED: u32 = 1004;
    pub const MARKET_ALREADY_RESOLVED: u32 = 1005;
    
    // Voter errors: 2000-2999
    pub const VOTER_NOT_REGISTERED: u32 = 2001;
    pub const INSUFFICIENT_STAKE: u32 = 2002;
    pub const VOTER_ALREADY_REGISTERED: u32 = 2003;
    pub const VOTER_SUSPENDED: u32 = 2004;
    pub const NOT_SELECTED_FOR_MARKET: u32 = 2005;
    
    // Vote errors: 3000-3999
    pub const COMMITMENT_NOT_FOUND: u32 = 3001;
    pub const INVALID_REVEAL: u32 = 3002;
    pub const VOTE_ALREADY_SUBMITTED: u32 = 3003;
    pub const VOTING_PHASE_CLOSED: u32 = 3004;
    
    // Protocol errors: 4000-4999
    pub const PROTOCOL_PAUSED: u32 = 4001;
    pub const UNAUTHORIZED_OPERATION: u32 = 4002;
    pub const INVALID_PARAMETERS: u32 = 4003;
    
    // System errors: 5000-5999
    pub const STATE_CORRUPTION: u32 = 5001;
    pub const MESSAGE_SEND_FAILED: u32 = 5002;
    
    // Voter application errors: 6000-6999
    pub const VOTER_NOT_INITIALIZED: u32 = 6001;
    pub const VOTER_ALREADY_INITIALIZED: u32 = 6002;
    pub const VOTE_NOT_FOUND: u32 = 6004;
    pub const INVALID_OUTCOME_INDEX: u32 = 6006;
    pub const INVALID_CONFIDENCE: u32 = 6007;
    pub const REGISTRY_NOT_SET: u32 = 6008;
}

// ==================== HELPER FUNCTIONS ====================

/// Get minimum stake as Amount
pub fn min_stake() -> Amount {
    Amount::from_tokens(MIN_VOTER_STAKE)
}

/// Get base market fee as Amount
pub fn base_market_fee() -> Amount {
    Amount::from_tokens(BASE_MARKET_FEE)
}

/// Validate outcome count
pub fn is_valid_outcome_count(count: usize) -> bool {
    count >= MIN_OUTCOMES && count <= MAX_OUTCOMES
}

/// Validate confidence score
pub fn is_valid_confidence(confidence: u8) -> bool {
    confidence <= 100
}

/// Validate fee percentage
pub fn is_valid_fee_percentage(percentage: u8) -> bool {
    percentage <= 100
}

/// Calculate reputation increase for correct vote
pub fn calculate_reputation_increase(streak: u32) -> u64 {
    REPUTATION_INCREASE_BASE + (streak as u64 * REPUTATION_INCREASE_PER_STREAK)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_constants() {
        assert_eq!(MIN_VOTERS_PER_MARKET, 20);
        assert_eq!(MAX_VOTERS_PER_MARKET, 50);
        assert_eq!(PROTOCOL_FEE_PERCENTAGE, 10);
    }
    
    #[test]
    fn test_validation() {
        assert!(is_valid_outcome_count(2));
        assert!(is_valid_outcome_count(10));
        assert!(!is_valid_outcome_count(1));
        assert!(!is_valid_outcome_count(11));
        
        assert!(is_valid_confidence(0));
        assert!(is_valid_confidence(100));
        assert!(!is_valid_confidence(101));
        
        assert!(is_valid_fee_percentage(0));
        assert!(is_valid_fee_percentage(100));
        assert!(!is_valid_fee_percentage(101));
    }
    
    #[test]
    fn test_reputation_calculation() {
        assert_eq!(calculate_reputation_increase(0), 10);
        assert_eq!(calculate_reputation_increase(1), 12);
        assert_eq!(calculate_reputation_increase(5), 20);
    }
}
