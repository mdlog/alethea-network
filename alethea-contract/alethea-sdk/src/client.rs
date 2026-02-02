// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Alethea Client Implementation

use linera_sdk::{
    linera_base_types::{ApplicationId, Timestamp},
    ContractRuntime, Contract,
};
use alethea_oracle_types::RegistryMessage;
use crate::{AletheaError, Result, ResolutionResult, MarketRegistration};

/// Alethea Oracle Client
/// 
/// Simple client for integrating Alethea Oracle into your dApp.
/// 
/// # Example
/// 
/// ```rust,no_run
/// use alethea_sdk::AletheaClient;
/// 
/// // Create client
/// let client = AletheaClient::new();
/// 
/// // Request resolution
/// client.request_resolution(
///     &runtime,
///     "Will BTC reach $100k?".to_string(),
///     vec!["Yes".to_string(), "No".to_string()],
///     deadline,
///     market_id_bytes,
/// ).await?;
/// ```
pub struct AletheaClient {
    registry_id: Option<ApplicationId>,
}

impl AletheaClient {
    /// Create new client with canonical registry
    /// 
    /// Uses the well-known Alethea Oracle Registry ApplicationId.
    pub fn new() -> Self {
        Self {
            registry_id: None, // Will use canonical ID
        }
    }
    
    /// Create client with custom registry (for testing)
    /// 
    /// # Arguments
    /// * `registry_id` - Custom registry ApplicationId
    pub fn with_registry(registry_id: ApplicationId) -> Self {
        Self {
            registry_id: Some(registry_id),
        }
    }
    
    /// Get registry ApplicationId
    fn get_registry_id(&self) -> Result<ApplicationId> {
        if let Some(id) = self.registry_id {
            Ok(id)
        } else {
            crate::canonical_registry_id()
        }
    }
    
    /// Request market resolution
    /// 
    /// Sends a market registration request to the Oracle Registry.
    /// The registry will select voters and coordinate the resolution process.
    /// 
    /// # Arguments
    /// * `runtime` - Contract runtime
    /// * `question` - Question to be resolved
    /// * `outcomes` - Possible outcomes (2-10)
    /// * `deadline` - When resolution should happen
    /// * `callback_data` - Data to include in resolution callback (e.g., market ID)
    /// 
    /// # Returns
    /// Ok(()) if request was sent successfully
    /// 
    /// # Example
    /// 
    /// ```rust,no_run
    /// let market_id = 123u64;
    /// client.request_resolution(
    ///     &runtime,
    ///     "Will it rain tomorrow?".to_string(),
    ///     vec!["Yes".to_string(), "No".to_string()],
    ///     Timestamp::from(tomorrow),
    ///     market_id.to_le_bytes().to_vec(),
    /// ).await?;
    /// ```
    pub async fn request_resolution<C: Contract>(
        &self,
        runtime: &mut ContractRuntime<C>,
        question: String,
        outcomes: Vec<String>,
        deadline: Timestamp,
        callback_data: Vec<u8>,
    ) -> Result<MarketRegistration> {
        // Validate parameters
        if outcomes.len() < 2 || outcomes.len() > 10 {
            return Err(AletheaError::InvalidParameters(
                "Outcomes must be between 2 and 10".to_string()
            ));
        }
        
        // Return registration info for caller to send message
        // Caller must send RegistryMessage::RegisterMarket to registry
        Ok(MarketRegistration {
            question,
            outcomes,
            deadline: deadline.micros(),
            callback_data,
        })
    }
    
    /// Request binary market resolution (Yes/No)
    /// 
    /// Convenience method for binary markets.
    /// 
    /// # Arguments
    /// * `runtime` - Contract runtime
    /// * `question` - Question to be resolved
    /// * `deadline` - When resolution should happen
    /// * `callback_data` - Data to include in resolution callback
    /// 
    /// # Example
    /// 
    /// ```rust,no_run
    /// client.request_binary_resolution(
    ///     &runtime,
    ///     "Will BTC reach $100k by EOY?".to_string(),
    ///     Timestamp::from(end_of_year),
    ///     market_id.to_le_bytes().to_vec(),
    /// ).await?;
    /// ```
    pub async fn request_binary_resolution<C: Contract>(
        &self,
        runtime: &mut ContractRuntime<C>,
        question: String,
        deadline: Timestamp,
        callback_data: Vec<u8>,
    ) -> Result<MarketRegistration> {
        self.request_resolution(
            runtime,
            question,
            vec!["Yes".to_string(), "No".to_string()],
            deadline,
            callback_data,
        ).await
    }
    
    /// Handle resolution callback
    /// 
    /// Parses a RegistryMessage to extract resolution result.
    /// Call this in your message handler to process oracle responses.
    /// 
    /// # Arguments
    /// * `message` - Message from Oracle Registry
    /// 
    /// # Returns
    /// Some(ResolutionResult) if message is a resolution
    /// None if message is not a resolution
    /// 
    /// # Example
    /// 
    /// ```rust,no_run
    /// async fn execute_message(&mut self, message: Message) {
    ///     if let Some(result) = client.handle_resolution(message) {
    ///         // Market resolved!
    ///         self.settle_market(result.market_id, result.outcome_index).await;
    ///     }
    /// }
    /// ```
    pub fn handle_resolution(&self, message: RegistryMessage) -> Option<ResolutionResult> {
        match message {
            RegistryMessage::MarketResolved {
                market_id,
                outcome_index,
                confidence,
                callback_data,
            } => Some(ResolutionResult {
                market_id,
                outcome_index,
                confidence,
                callback_data,
            }),
            _ => None,
        }
    }
    
    /// Extract market ID from resolution result
    /// 
    /// Convenience method to extract market ID from callback data.
    /// Assumes callback data contains market ID as u64 in little-endian.
    /// 
    /// # Arguments
    /// * `result` - Resolution result
    /// 
    /// # Returns
    /// Some(market_id) if callback data contains valid u64
    /// None otherwise
    pub fn extract_market_id(&self, result: &ResolutionResult) -> Option<u64> {
        result.market_id_from_callback()
    }
}

impl Default for AletheaClient {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_client_creation() {
        let client = AletheaClient::new();
        assert!(client.registry_id.is_none());
        
        let custom_id = ApplicationId::from([1u8; 64]);
        let custom_client = AletheaClient::with_registry(custom_id);
        assert_eq!(custom_client.registry_id, Some(custom_id));
    }

    #[test]
    fn test_handle_resolution() {
        let client = AletheaClient::new();
        
        let message = RegistryMessage::MarketResolved {
            market_id: 123,
            outcome_index: 1,
            confidence: 95,
            callback_data: vec![1, 2, 3],
        };
        
        let result = client.handle_resolution(message);
        assert!(result.is_some());
        
        let result = result.unwrap();
        assert_eq!(result.market_id, 123);
        assert_eq!(result.outcome_index, 1);
        assert_eq!(result.confidence, 95);
    }

    #[test]
    fn test_handle_non_resolution_message() {
        let client = AletheaClient::new();
        
        let message = RegistryMessage::VoteRequest {
            market_id: 123,
            question: "Test?".to_string(),
            outcomes: vec!["Yes".to_string(), "No".to_string()],
            deadline: Timestamp::from(0),
            commit_deadline: Timestamp::from(0),
            reveal_deadline: Timestamp::from(0),
        };
        
        let result = client.handle_resolution(message);
        assert!(result.is_none());
    }

    #[test]
    fn test_extract_market_id() {
        let client = AletheaClient::new();
        
        let market_id = 456u64;
        let result = ResolutionResult {
            market_id: 0,
            outcome_index: 0,
            confidence: 90,
            callback_data: market_id.to_le_bytes().to_vec(),
        };
        
        assert_eq!(client.extract_market_id(&result), Some(456));
    }
}
