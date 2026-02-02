// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Types for Alethea SDK

use serde::{Deserialize, Serialize};

/// Resolution result from oracle
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResolutionResult {
    /// Market ID that was resolved
    pub market_id: u64,
    
    /// Winning outcome index
    pub outcome_index: usize,
    
    /// Confidence score (0-100)
    pub confidence: u8,
    
    /// Callback data provided during registration
    pub callback_data: Vec<u8>,
}

impl ResolutionResult {
    /// Extract market ID from callback data (if stored as u64)
    pub fn market_id_from_callback(&self) -> Option<u64> {
        if self.callback_data.len() >= 8 {
            let bytes: [u8; 8] = self.callback_data[0..8].try_into().ok()?;
            Some(u64::from_le_bytes(bytes))
        } else {
            None
        }
    }
}

/// Market registration request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketRegistration {
    /// Question to be resolved
    pub question: String,
    
    /// Possible outcomes
    pub outcomes: Vec<String>,
    
    /// Deadline for resolution
    pub deadline: u64, // Timestamp in microseconds
    
    /// Callback data (e.g., market ID)
    pub callback_data: Vec<u8>,
}

impl MarketRegistration {
    /// Create new market registration
    pub fn new(
        question: String,
        outcomes: Vec<String>,
        deadline: u64,
        callback_data: Vec<u8>,
    ) -> Self {
        Self {
            question,
            outcomes,
            deadline,
            callback_data,
        }
    }
    
    /// Create binary market (Yes/No)
    pub fn binary(question: String, deadline: u64, callback_data: Vec<u8>) -> Self {
        Self {
            question,
            outcomes: vec!["Yes".to_string(), "No".to_string()],
            deadline,
            callback_data,
        }
    }
    
    /// Validate registration parameters
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
    fn test_resolution_result_market_id_extraction() {
        let market_id = 123u64;
        let callback_data = market_id.to_le_bytes().to_vec();
        
        let result = ResolutionResult {
            market_id: 0,
            outcome_index: 1,
            confidence: 95,
            callback_data,
        };
        
        assert_eq!(result.market_id_from_callback(), Some(123));
    }

    #[test]
    fn test_market_registration_binary() {
        let reg = MarketRegistration::binary(
            "Will it rain?".to_string(),
            1000000,
            vec![1, 2, 3],
        );
        
        assert_eq!(reg.outcomes.len(), 2);
        assert_eq!(reg.outcomes[0], "Yes");
        assert_eq!(reg.outcomes[1], "No");
    }

    #[test]
    fn test_market_registration_validation() {
        // Valid registration
        let valid = MarketRegistration::new(
            "Test?".to_string(),
            vec!["A".to_string(), "B".to_string()],
            1000000,
            vec![],
        );
        assert!(valid.validate().is_ok());
        
        // Empty question
        let empty_question = MarketRegistration::new(
            "".to_string(),
            vec!["A".to_string(), "B".to_string()],
            1000000,
            vec![],
        );
        assert!(empty_question.validate().is_err());
        
        // Too few outcomes
        let too_few = MarketRegistration::new(
            "Test?".to_string(),
            vec!["A".to_string()],
            1000000,
            vec![],
        );
        assert!(too_few.validate().is_err());
        
        // Too many outcomes
        let too_many = MarketRegistration::new(
            "Test?".to_string(),
            vec!["A".to_string(); 11],
            1000000,
            vec![],
        );
        assert!(too_many.validate().is_err());
    }
}
