// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Types for Alethea SDK
//! 
//! These types align with `alethea-oracle-messages::OracleCallback` format
//! used by the `oracle-registry-v2` contract.

use linera_sdk::linera_base_types::Timestamp;
use serde::{Deserialize, Serialize};

/// Resolution result from oracle
/// 
/// Extracted from `OracleCallback::QueryResolved` or `OracleCallback::QueryFinalized`.
/// This is the primary type your DApp receives when a query is resolved.
/// 
/// ## Important: Check `is_final`
/// 
/// If `is_final` is false, the result can still be disputed within the dispute window.
/// For critical actions (releasing funds, settling bets), wait for `is_final: true` or
/// handle the `QueryFinalized` callback.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResolutionResult {
    /// Query ID in the Oracle Registry
    pub query_id: u64,
    
    /// Resolved outcome as a string (e.g., "Yes", "No", or custom outcome)
    pub resolved_outcome: String,
    
    /// Timestamp when the query was resolved
    pub resolved_at: Timestamp,
    
    /// Original callback data (contains encoded request_id)
    pub callback_data: Vec<u8>,
    
    /// Your original request ID (decoded from callback_data)
    /// Use this to identify which market/request was resolved
    pub request_id: Option<u64>,
    
    /// Number of votes received
    pub vote_count: u32,
    
    /// Confidence score (0-100)
    pub confidence: u8,
    
    /// Whether this result is final (dispute window passed)
    /// If false, the result can still be disputed
    pub is_final: bool,
}

impl ResolutionResult {
    /// Extract request_id from callback data (if stored as u64)
    pub fn request_id_from_callback(&self) -> Option<u64> {
        alethea_oracle_messages::decode_request_id(&self.callback_data)
    }
}

/// Resolution request to send to oracle
/// 
/// Contains all the data needed to create an `OracleRequest`.
/// Helper struct for building requests before sending.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResolutionRequest {
    /// Question to be resolved
    pub question: String,
    
    /// Possible outcomes
    pub outcomes: Vec<String>,
    
    /// Deadline for resolution (as Timestamp)
    pub deadline: Timestamp,
    
    /// Your request/market ID
    pub request_id: u64,
    
    /// Callback data (encoded request_id)
    pub callback_data: Vec<u8>,
}

impl ResolutionRequest {
    /// Create new resolution request
    pub fn new(
        question: String,
        outcomes: Vec<String>,
        deadline: Timestamp,
        request_id: u64,
    ) -> Self {
        Self {
            question,
            outcomes,
            deadline,
            request_id,
            callback_data: alethea_oracle_messages::encode_request_id(request_id),
        }
    }
    
    /// Create binary request (Yes/No)
    pub fn binary(question: String, deadline: Timestamp, request_id: u64) -> Self {
        Self::new(
            question,
            vec!["Yes".to_string(), "No".to_string()],
            deadline,
            request_id,
        )
    }
    
    /// Validate request parameters
    pub fn validate(&self) -> Result<(), String> {
        if self.question.is_empty() {
            return Err("Question cannot be empty".to_string());
        }
        
        if self.outcomes.len() < 2 {
            return Err("Must have at least 2 outcomes".to_string());
        }
        
        if self.outcomes.len() > 10 {
            return Err("Cannot have more than 10 outcomes".to_string());
        }
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolution_request_binary() {
        let req = ResolutionRequest::binary(
            "Will it rain?".to_string(),
            Timestamp::from(1000000),
            42,
        );
        
        assert_eq!(req.outcomes.len(), 2);
        assert_eq!(req.outcomes[0], "Yes");
        assert_eq!(req.outcomes[1], "No");
        assert_eq!(req.request_id, 42);
        assert!(req.validate().is_ok());
    }

    #[test]
    fn test_resolution_request_validation() {
        // Valid
        let valid = ResolutionRequest::new(
            "Test?".to_string(),
            vec!["A".to_string(), "B".to_string()],
            Timestamp::from(1000000),
            1,
        );
        assert!(valid.validate().is_ok());
        
        // Empty question
        let empty = ResolutionRequest::new(
            "".to_string(),
            vec!["A".to_string(), "B".to_string()],
            Timestamp::from(1000000),
            1,
        );
        assert!(empty.validate().is_err());
        
        // Too few outcomes
        let few = ResolutionRequest::new(
            "Test?".to_string(),
            vec!["A".to_string()],
            Timestamp::from(1000000),
            1,
        );
        assert!(few.validate().is_err());
        
        // Too many outcomes
        let many = ResolutionRequest::new(
            "Test?".to_string(),
            vec!["A".to_string(); 11],
            Timestamp::from(1000000),
            1,
        );
        assert!(many.validate().is_err());
    }
    
    #[test]
    fn test_resolution_result_request_id() {
        let data = alethea_oracle_messages::encode_request_id(123);
        let result = ResolutionResult {
            query_id: 1,
            resolved_outcome: "Yes".to_string(),
            resolved_at: Timestamp::from(1000000),
            callback_data: data,
            request_id: Some(123),
            vote_count: 5,
            confidence: 95,
            is_final: true,
        };
        
        assert_eq!(result.request_id_from_callback(), Some(123));
    }
}
