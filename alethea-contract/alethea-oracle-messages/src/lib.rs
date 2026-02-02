// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Shared Message Types for Alethea Oracle Cross-Chain Communication
//!
//! This library defines the message types used for communication between
//! Oracle Registry and consumer applications (Markets, etc.) across different chains.
//!
//! ## Architecture
//!
//! In Linera, cross-chain messaging requires that both sender and receiver
//! use the same message type. This library provides:
//!
//! 1. `OracleRequest` - Messages sent FROM consumers TO Registry
//! 2. `OracleCallback` - Messages sent FROM Registry TO consumers
//!
//! ## Industry Standard Alignment
//!
//! This format is designed to be compatible with industry oracle standards:
//! - UMA Optimistic Oracle (identifier, ancillaryData, bond, liveness)
//! - Reality.eth (question_id, type, outcomes, timeout, minBond)
//! - Kleros ERC-792 (disputeID, choices, extraData)
//!
//! ## Usage
//!
//! Both Registry and consumer apps should:
//! 1. Add this crate as dependency
//! 2. Include these message variants in their `Message` enum
//! 3. Handle incoming messages in `execute_message`

use linera_sdk::linera_base_types::{Amount, ApplicationId, ChainId, Timestamp};
use serde::{Deserialize, Serialize};

/// Question types supported by the Oracle
/// Aligned with Reality.eth question types for compatibility
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub enum QuestionType {
    /// Yes/No questions - returns "Yes", "No", or "Invalid"
    #[default]
    Boolean,
    /// Single choice from outcomes list (zero-indexed)
    SingleSelect,
    /// Multiple choices can be selected (bit-encoded)
    MultipleSelect,
    /// Numeric answer (use with `decimals` field)
    Numeric { decimals: u8 },
    /// Datetime answer (Unix timestamp)
    Datetime,
}

/// Decision strategy for resolving queries
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub enum DecisionStrategy {
    /// Simple majority (most votes wins)
    Majority,
    /// Median value (for numeric queries)
    Median,
    /// Weighted by voter stake
    #[default]
    WeightedByStake,
    /// Weighted by voter reputation
    WeightedByReputation,
}

/// Messages sent FROM consumer applications TO Oracle Registry
/// 
/// Consumer apps (Markets, etc.) send these messages to request oracle services.
/// Registry receives and processes these in `execute_message`.
/// 
/// ## Compatibility Notes
/// - Similar to UMA's `requestPrice()` with `identifier`, `ancillaryData`, `bond`, `reward`
/// - Similar to Reality.eth's `askQuestion()` with `template_id`, `question`, `timeout`, `min_bond`
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum OracleRequest {
    /// Request to create a new query for oracle resolution (Legacy - backward compatible)
    /// 
    /// # Fields
    /// - `request_id`: Unique ID from the requesting app (e.g., market_id)
    /// - `description`: Question or description for voters
    /// - `outcomes`: Possible outcomes (e.g., ["Yes", "No"])
    /// - `deadline`: When voting should end
    /// - `callback_chain`: Chain to send callback to
    /// - `callback_app`: Application to send callback to
    /// - `callback_data`: Arbitrary data to include in callback (for request identification)
    CreateQuery {
        request_id: u64,
        description: String,
        outcomes: Vec<String>,
        deadline: Timestamp,
        callback_chain: ChainId,
        callback_app: ApplicationId,
        callback_data: Vec<u8>,
    },
    
    /// Request to create a query with bond (Recommended - Industry Standard)
    /// 
    /// This format aligns with industry standards (UMA, Reality.eth):
    /// - Bond is refundable if no dispute (similar to UMA's proposal bond)
    /// - Priority fee goes to voter rewards (similar to UMA's reward)
    /// - Dispute window allows challenging results (similar to Reality.eth timeout)
    /// 
    /// # Required Fields
    /// - `request_id`: Unique ID from the requesting app
    /// - `description`: The question to be answered
    /// - `outcomes`: Possible answers (2-10 items for SingleSelect)
    /// - `deadline`: Voting deadline
    /// - `callback_*`: Where to send the result
    /// 
    /// # Economic Fields (Industry Standard)
    /// - `bond_amount`: Refundable deposit (like UMA bond, Reality.eth minBond)
    /// - `priority_fee`: Non-refundable fee for faster resolution (like UMA reward)
    /// - `dispute_window_secs`: Time to dispute after resolution (like UMA liveness)
    /// 
    /// # Metadata Fields (Best Practice)
    /// - `question_type`: Type of answer expected (Boolean, SingleSelect, Numeric, etc.)
    /// - `resolution_criteria`: How to determine the answer
    /// - `source_urls`: Data sources for verification
    CreateQueryWithBond {
        // === Required Fields ===
        request_id: u64,
        description: String,
        outcomes: Vec<String>,
        deadline: Timestamp,
        callback_chain: ChainId,
        callback_app: ApplicationId,
        callback_data: Vec<u8>,
        
        // === Economic Fields (Industry Standard) ===
        /// Bond amount - refundable if no dispute (similar to UMA's proposerBond)
        bond_amount: Amount,
        /// Service fee - non-refundable, goes to protocol treasury (payment for oracle service)
        service_fee: Amount,
        /// Priority fee - non-refundable, adds to voter rewards (similar to UMA's reward)
        priority_fee: Option<Amount>,
        /// Dispute window in seconds after resolution (similar to UMA's liveness)
        /// Default: 3600 (1 hour)
        dispute_window_secs: Option<u64>,
        
        // === Strategy Fields ===
        /// Decision strategy for resolution
        strategy: Option<DecisionStrategy>,
        /// Minimum votes required (None = use protocol default)
        min_votes: Option<u32>,
        
        // === Metadata Fields (Best Practice) ===
        /// Question type (aligned with Reality.eth types)
        question_type: Option<QuestionType>,
        /// Resolution criteria - specific conditions to determine outcome
        /// e.g., "Use CoinGecko price at exactly 00:00 UTC on the date"
        resolution_criteria: Option<String>,
        /// Data source URLs for verification (comma-separated)
        source_urls: Option<String>,
        /// Category for indexing (e.g., "Crypto", "Sports", "Politics")
        category: Option<String>,
        /// External metadata URL (IPFS or HTTP link)
        metadata_url: Option<String>,
    },

    /// Raise a dispute against a resolved query
    /// Similar to Reality.eth's answer replacement or UMA's dispute mechanism
    RaiseDispute {
        query_id: u64,
        /// The outcome the disputer claims is correct
        disputed_outcome: String,
        /// Dispute bond (must equal or exceed original bond)
        dispute_bond: Amount,
        /// Reason for dispute
        reason: String,
        /// Evidence URLs supporting the dispute
        evidence_urls: Option<String>,
        callback_chain: ChainId,
        callback_app: ApplicationId,
    },
    
    /// Cancel a pending query request
    CancelQuery {
        query_id: u64,
        callback_chain: ChainId,
        callback_app: ApplicationId,
    },
}

/// Messages sent FROM Oracle Registry TO consumer applications
/// 
/// Registry sends these messages when queries are resolved or status changes.
/// Consumer apps receive and process these in `execute_message`.
/// 
/// ## Compatibility Notes
/// - QueryResolved is similar to UMA's `settleAndGetPrice()` callback
/// - QueryDisputed is similar to Reality.eth's answer replacement notification
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum OracleCallback {
    /// Query has been created successfully
    QueryCreated {
        query_id: u64,
        request_id: u64,
        callback_data: Vec<u8>,
        /// Estimated resolution timestamp
        estimated_resolution: Option<Timestamp>,
        /// Dispute window end (when result becomes final)
        dispute_window_end: Option<Timestamp>,
    },
    
    /// Query has been resolved with a result
    /// 
    /// ## Important: Dispute Window
    /// The result is NOT final until `dispute_window_end` passes.
    /// Consumer apps should wait for `QueryFinalized` or check `is_final`.
    /// 
    /// # Fields
    /// - `query_id`: The Registry's query ID
    /// - `result`: The resolved outcome (e.g., "Yes" or "No")
    /// - `result_index`: Zero-based index into outcomes array (for type safety)
    /// - `resolved_at`: Timestamp when resolution occurred
    /// - `callback_data`: Original callback data from request (contains request_id)
    /// - `vote_count`: Number of votes received
    /// - `confidence`: Confidence score (0-100), similar to UMA's resolved price confidence
    /// - `dispute_window_end`: When result becomes final (can be disputed until then)
    /// - `is_final`: True if dispute window passed and no disputes raised
    QueryResolved {
        query_id: u64,
        result: String,
        result_index: Option<u32>,
        resolved_at: Timestamp,
        callback_data: Vec<u8>,
        vote_count: u32,
        confidence: u8,
        /// When the dispute window ends - result is final after this
        dispute_window_end: Option<Timestamp>,
        /// Whether the result is final (dispute window passed, no disputes)
        is_final: bool,
        /// Total voting weight behind this result
        total_voting_weight: Option<u128>,
    },
    
    /// Query result has been finalized (dispute window passed)
    /// 
    /// This callback is sent after the dispute window ends without disputes.
    /// Consumer apps should use this as the definitive signal to act on the result.
    QueryFinalized {
        query_id: u64,
        result: String,
        result_index: Option<u32>,
        finalized_at: Timestamp,
        callback_data: Vec<u8>,
        /// Bond refund amount (if applicable)
        bond_refunded: Option<Amount>,
    },
    
    /// Query result has been disputed
    /// 
    /// Similar to Reality.eth's new answer submission.
    /// The original requester may need to wait for re-resolution.
    QueryDisputed {
        query_id: u64,
        original_result: String,
        disputed_by: ChainId,
        disputed_outcome: String,
        dispute_reason: String,
        callback_data: Vec<u8>,
        /// New deadline for dispute resolution
        new_deadline: Option<Timestamp>,
    },
    
    /// Dispute has been resolved
    DisputeResolved {
        query_id: u64,
        /// The final result after dispute
        final_result: String,
        /// Whether the disputer won
        disputer_won: bool,
        /// Bond distribution: winner gets loser's bond
        winner_payout: Amount,
        callback_data: Vec<u8>,
    },
    
    /// Query expired without resolution (not enough votes)
    QueryExpired {
        query_id: u64,
        callback_data: Vec<u8>,
        votes_received: u32,
        votes_required: u32,
        /// Bond refund (if query expired without resolution)
        bond_refunded: Option<Amount>,
    },
    
    /// Query was cancelled
    QueryCancelled {
        query_id: u64,
        callback_data: Vec<u8>,
        reason: String,
        /// Bond refund on cancellation
        bond_refunded: Option<Amount>,
    },
}

/// Helper to encode request_id into callback_data
pub fn encode_request_id(request_id: u64) -> Vec<u8> {
    request_id.to_le_bytes().to_vec()
}

/// Helper to decode request_id from callback_data
pub fn decode_request_id(callback_data: &[u8]) -> Option<u64> {
    if callback_data.len() >= 8 {
        Some(u64::from_le_bytes(callback_data[..8].try_into().ok()?))
    } else {
        None
    }
}

/// Trait for applications that consume Oracle services
/// 
/// Implement this trait to handle oracle callbacks in your application.
/// 
/// ## Best Practice: Wait for Finalization
/// 
/// For critical applications (e.g., releasing funds), wait for `on_query_finalized`
/// instead of acting immediately on `on_query_resolved`. This ensures the dispute
/// window has passed and no challenges were raised.
/// 
/// ```ignore
/// impl OracleConsumer for MyContract {
///     fn on_query_resolved(&mut self, query_id: u64, result: String, is_final: bool, ..) {
///         if is_final {
///             // Safe to act on result
///             self.settle_market(result);
///         } else {
///             // Wait for finalization or dispute
///             self.mark_pending_finalization(query_id);
///         }
///     }
/// }
/// ```
pub trait OracleConsumer {
    /// Handle query creation confirmation
    fn on_query_created(&mut self, query_id: u64, request_id: u64, estimated_resolution: Option<Timestamp>);
    
    /// Handle query resolution (may still be disputed)
    /// 
    /// **Important**: Check `is_final` before acting on the result!
    /// If `is_final` is false, wait for `on_query_finalized` for safety.
    fn on_query_resolved(&mut self, query_id: u64, result: String, is_final: bool, callback_data: Vec<u8>);
    
    /// Handle query finalization (dispute window passed, result is definitive)
    /// 
    /// This is the safest point to act on the result (e.g., settle bets, release funds).
    fn on_query_finalized(&mut self, query_id: u64, result: String, callback_data: Vec<u8>);
    
    /// Handle dispute raised against a query
    /// 
    /// The original result is being challenged. Wait for `on_dispute_resolved`.
    fn on_query_disputed(&mut self, query_id: u64, original_result: String, disputed_outcome: String);
    
    /// Handle dispute resolution
    fn on_dispute_resolved(&mut self, query_id: u64, final_result: String, disputer_won: bool);
    
    /// Handle query expiration
    fn on_query_expired(&mut self, query_id: u64, callback_data: Vec<u8>, bond_refunded: Option<Amount>);
    
    /// Handle query cancellation
    fn on_query_cancelled(&mut self, query_id: u64, callback_data: Vec<u8>, reason: String, bond_refunded: Option<Amount>);
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_encode_decode_request_id() {
        let request_id = 12345u64;
        let encoded = encode_request_id(request_id);
        let decoded = decode_request_id(&encoded);
        assert_eq!(decoded, Some(request_id));
    }
    
    #[test]
    fn test_decode_invalid_data() {
        let short_data = vec![1, 2, 3];
        assert_eq!(decode_request_id(&short_data), None);
    }
}
