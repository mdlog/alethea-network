// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Alethea Client Implementation
//! 
//! Uses `alethea-oracle-messages` types which are compatible with `oracle-registry-v2`.

use linera_sdk::linera_base_types::{Amount, ApplicationId, ChainId, Timestamp};
use alethea_oracle_messages::{OracleRequest, OracleCallback, DecisionStrategy, encode_request_id};
use crate::{AletheaError, Result, ResolutionResult};

/// Alethea Oracle Client
/// 
/// Simple client for integrating Alethea Oracle into your dApp.
/// Uses standard `OracleRequest` and `OracleCallback` message types
/// from `alethea-oracle-messages`.
/// 
/// # Example
/// 
/// ```rust,ignore
/// use alethea_sdk::AletheaClient;
/// 
/// let client = AletheaClient::new();
/// 
/// // Create a resolution request
/// let request = client.create_resolution_request(
///     "Will BTC reach $100k?".to_string(),
///     vec!["Yes".to_string(), "No".to_string()],
///     deadline,
///     market_id,
/// )?;
/// 
/// // Send the OracleRequest message to the registry
/// // runtime.send_message(registry_chain, request.to_oracle_request());
/// ```
pub struct AletheaClient {
    registry_id: Option<ApplicationId>,
}

impl AletheaClient {
    /// Create new client (registry will be configured later)
    pub fn new() -> Self {
        Self {
            registry_id: None,
        }
    }
    
    /// Create client with specific registry
    /// 
    /// # Arguments
    /// * `registry_id` - Registry ApplicationId (from deployment)
    pub fn with_registry(registry_id: ApplicationId) -> Self {
        Self {
            registry_id: Some(registry_id),
        }
    }
    
    /// Set registry ApplicationId
    pub fn set_registry(&mut self, registry_id: ApplicationId) {
        self.registry_id = Some(registry_id);
    }
    
    /// Get registry ApplicationId
    pub fn get_registry_id(&self) -> Result<ApplicationId> {
        self.registry_id.ok_or(AletheaError::RegistryNotConfigured)
    }
    
    /// Create a resolution request (Legacy - without bond)
    /// 
    /// Creates an `OracleRequest::CreateQuery` that can be sent to the registry
    /// as a cross-chain message.
    /// 
    /// # Arguments
    /// * `question` - Question to resolve
    /// * `outcomes` - Possible outcomes (2-10)
    /// * `deadline` - When voting ends
    /// * `request_id` - Your internal market/request ID
    /// * `callback_chain` - Your chain ID to receive callback
    /// * `callback_app` - Your app ID to receive callback
    /// 
    /// # Returns
    /// `OracleRequest` message ready to send to registry
    pub fn create_resolution_request(
        &self,
        question: String,
        outcomes: Vec<String>,
        deadline: Timestamp,
        request_id: u64,
        callback_chain: ChainId,
        callback_app: ApplicationId,
    ) -> Result<OracleRequest> {
        // Validate parameters
        if outcomes.len() < 2 || outcomes.len() > 10 {
            return Err(AletheaError::InvalidParameters(
                "Outcomes must be between 2 and 10".to_string()
            ));
        }
        
        if question.is_empty() {
            return Err(AletheaError::InvalidParameters(
                "Question cannot be empty".to_string()
            ));
        }
        
        Ok(OracleRequest::CreateQuery {
            request_id,
            description: question,
            outcomes,
            deadline,
            callback_chain,
            callback_app,
            callback_data: encode_request_id(request_id),
        })
    }
    
    /// Create a resolution request with bond (Hybrid Model - Recommended)
    /// 
    /// Creates an `OracleRequest::CreateQueryWithBond` for the hybrid economic model.
    /// Bond is refundable if no dispute is raised.
    /// 
    /// # Arguments
    /// * `question` - Question to resolve
    /// * `outcomes` - Possible outcomes (2-10)
    /// * `deadline` - When voting ends
    /// * `request_id` - Your internal market/request ID
    /// * `callback_chain` - Your chain ID
    /// * `callback_app` - Your app ID
    /// * `bond_amount` - Refundable bond (min 100 ALTH)
    /// * `service_fee` - Non-refundable fee for oracle service
    /// 
    /// # Returns
    /// `OracleRequest` message ready to send to registry
    pub fn create_resolution_request_with_bond(
        &self,
        question: String,
        outcomes: Vec<String>,
        deadline: Timestamp,
        request_id: u64,
        callback_chain: ChainId,
        callback_app: ApplicationId,
        bond_amount: Amount,
        service_fee: Amount,
    ) -> Result<OracleRequest> {
        if outcomes.len() < 2 || outcomes.len() > 10 {
            return Err(AletheaError::InvalidParameters(
                "Outcomes must be between 2 and 10".to_string()
            ));
        }
        
        if question.is_empty() {
            return Err(AletheaError::InvalidParameters(
                "Question cannot be empty".to_string()
            ));
        }
        
        Ok(OracleRequest::CreateQueryWithBond {
            request_id,
            description: question,
            outcomes,
            deadline,
            callback_chain,
            callback_app,
            callback_data: encode_request_id(request_id),
            bond_amount,
            service_fee,
            priority_fee: None,
            dispute_window_secs: None,
            strategy: Some(DecisionStrategy::WeightedByStake),
            min_votes: None,
            question_type: None,
            resolution_criteria: None,
            source_urls: None,
            category: None,
            metadata_url: None,
        })
    }
    
    /// Create a binary resolution request (Yes/No)
    /// 
    /// Convenience method for binary markets.
    pub fn create_binary_request(
        &self,
        question: String,
        deadline: Timestamp,
        request_id: u64,
        callback_chain: ChainId,
        callback_app: ApplicationId,
    ) -> Result<OracleRequest> {
        self.create_resolution_request(
            question,
            vec!["Yes".to_string(), "No".to_string()],
            deadline,
            request_id,
            callback_chain,
            callback_app,
        )
    }
    
    /// Handle an OracleCallback and extract resolution result
    /// 
    /// Call this in your contract's `execute_message` handler when
    /// you receive an `OracleCallback` from the registry.
    /// 
    /// # Arguments
    /// * `callback` - OracleCallback message from registry
    /// 
    /// # Returns
    /// `Some(ResolutionResult)` if this is a resolution callback
    /// `None` if it's another callback type (created, disputed, etc.)
    /// 
    /// # Example
    /// 
    /// ```rust,ignore
    /// match message {
    ///     Message::OracleCallback(callback) => {
    ///         if let Some(result) = client.handle_callback(callback) {
    ///             // Query resolved!
    ///             self.settle_market(result.request_id, &result.resolved_outcome);
    ///         }
    ///     }
    /// }
    /// ```
    pub fn handle_callback(&self, callback: OracleCallback) -> Option<ResolutionResult> {
        match callback {
            OracleCallback::QueryResolved {
                query_id,
                result,
                resolved_at,
                callback_data,
                vote_count,
                confidence,
                is_final,
                ..
            } => Some(ResolutionResult {
                query_id,
                resolved_outcome: result,
                resolved_at,
                callback_data: callback_data.clone(),
                request_id: alethea_oracle_messages::decode_request_id(&callback_data),
                vote_count,
                confidence,
                is_final,
            }),
            
            OracleCallback::QueryFinalized {
                query_id,
                result,
                finalized_at,
                callback_data,
                ..
            } => Some(ResolutionResult {
                query_id,
                resolved_outcome: result,
                resolved_at: finalized_at,
                callback_data: callback_data.clone(),
                request_id: alethea_oracle_messages::decode_request_id(&callback_data),
                vote_count: 0,
                confidence: 100,
                is_final: true,
            }),
            
            _ => None,
        }
    }
    
    /// Check if a callback indicates the query was disputed
    pub fn is_disputed(&self, callback: &OracleCallback) -> bool {
        matches!(callback, OracleCallback::QueryDisputed { .. })
    }
    
    /// Check if a callback indicates the query expired
    pub fn is_expired(&self, callback: &OracleCallback) -> bool {
        matches!(callback, OracleCallback::QueryExpired { .. })
    }
    
    /// Extract request_id from callback_data
    pub fn extract_request_id(callback_data: &[u8]) -> Option<u64> {
        alethea_oracle_messages::decode_request_id(callback_data)
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
    }

    #[test]
    fn test_handle_query_resolved() {
        let client = AletheaClient::new();
        
        let callback_data = encode_request_id(123);
        let callback = OracleCallback::QueryResolved {
            query_id: 1,
            result: "Yes".to_string(),
            result_index: Some(0),
            resolved_at: Timestamp::from(1000000),
            callback_data,
            vote_count: 5,
            confidence: 95,
            dispute_window_end: None,
            is_final: true,
            total_voting_weight: None,
        };
        
        let result = client.handle_callback(callback);
        assert!(result.is_some());
        
        let result = result.unwrap();
        assert_eq!(result.query_id, 1);
        assert_eq!(result.resolved_outcome, "Yes");
        assert_eq!(result.request_id, Some(123));
        assert_eq!(result.vote_count, 5);
        assert_eq!(result.confidence, 95);
        assert!(result.is_final);
    }

    #[test]
    fn test_handle_non_resolution() {
        let client = AletheaClient::new();
        
        let callback = OracleCallback::QueryCreated {
            query_id: 1,
            request_id: 123,
            callback_data: vec![],
            estimated_resolution: None,
            dispute_window_end: None,
        };
        
        let result = client.handle_callback(callback);
        assert!(result.is_none());
    }

    #[test]
    fn test_is_disputed() {
        let client = AletheaClient::new();
        
        let callback = OracleCallback::QueryDisputed {
            query_id: 1,
            original_result: "Yes".to_string(),
            disputed_by: ChainId::root(0),
            disputed_outcome: "No".to_string(),
            dispute_reason: "Incorrect data".to_string(),
            callback_data: vec![],
            new_deadline: None,
        };
        
        assert!(client.is_disputed(&callback));
    }

    #[test]
    fn test_is_expired() {
        let client = AletheaClient::new();
        
        let callback = OracleCallback::QueryExpired {
            query_id: 1,
            callback_data: vec![],
            votes_received: 2,
            votes_required: 5,
            bond_refunded: None,
        };
        
        assert!(client.is_expired(&callback));
    }
    
    #[test]
    fn test_extract_request_id() {
        let data = encode_request_id(456);
        assert_eq!(AletheaClient::extract_request_id(&data), Some(456));
        
        let empty: Vec<u8> = vec![1, 2, 3];
        assert_eq!(AletheaClient::extract_request_id(&empty), None);
    }
}
