// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! # Alethea Consumer SDK
//! 
//! SDK for integrating consumer applications (prediction markets, insurance, etc.)
//! with Alethea Oracle Network for decentralized resolution.
//! 
//! ## Overview
//! 
//! This SDK provides:
//! - Standard message types for Oracle callbacks
//! - Consumer App Registration helpers
//! - Traits for implementing Oracle consumers
//! - Helper functions for encoding/decoding callback data
//! 
//! ## Quick Start
//! 
//! ```rust,ignore
//! use alethea_consumer_sdk::{OracleConsumer, OracleCallback, CallbackData, ConsumerAppRegistration};
//! 
//! // Register as consumer app during instantiate
//! impl MyContract {
//!     async fn instantiate(&mut self, args: Args) {
//!         // Register with Oracle
//!         ConsumerAppRegistration::register(
//!             &mut self.runtime,
//!             registry_app_id,
//!             "My App",
//!             AppCategory::PredictionMarket,
//!             Amount::ZERO, // Free tier
//!         );
//!     }
//! }
//! 
//! // Handle resolution callbacks
//! impl OracleConsumer for MyContract {
//!     fn handle_resolution(&mut self, callback: OracleCallback) {
//!         let market_id = CallbackData::decode_u64(&callback.callback_data);
//!         // Update your market with the resolved outcome
//!     }
//! }
//! ```
//! 
//! ## Consumer App Registration
//! 
//! Starting from v0.2.0, consumer apps should register with the Oracle Registry.
//! This enables:
//! - Access control (only registered apps can create queries)
//! - Rate limiting (tiered limits based on stake)
//! - Analytics (track app usage and reputation)
//! 
//! ### Registration Tiers
//! 
//! | Tier | Stake | Rate Limit | Priority |
//! |------|-------|------------|----------|
//! | Free | 0 ALTH | 10/hour | Low |
//! | Standard | 100 ALTH | 100/hour | Medium |
//! | Premium | 1000 ALTH | 1000/hour | High |
//! | Enterprise | 10000 ALTH | Unlimited | Highest |
//! 
//! ## Integration Flow
//! 
//! ```text
//! 1. Consumer registers with Oracle Registry (during instantiate)
//! 2. Consumer creates query via cross-app call to Oracle Registry
//! 3. Oracle voters vote on the query
//! 4. Oracle sends QueryResolutionCallback message to Consumer
//! 5. Consumer handles the callback and updates its state
//! ```

use linera_sdk::linera_base_types::{ApplicationId, ChainId, Timestamp, Amount};
use serde::{Deserialize, Serialize};

/// Message sent from Oracle Registry to Consumer after query resolution
/// 
/// Consumer contracts MUST handle this message type to receive resolution results.
/// 
/// # Example
/// 
/// ```rust,ignore
/// async fn execute_message(&mut self, message: Message) {
///     match message {
///         Message::QueryResolutionCallback(callback) => {
///             self.handle_oracle_callback(callback).await;
///         }
///     }
/// }
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OracleCallback {
    /// Query ID in the Oracle Registry
    pub query_id: u64,
    
    /// Resolved outcome (e.g., "Yes", "No", or custom outcome)
    pub resolved_outcome: String,
    
    /// Timestamp when the query was resolved
    pub resolved_at: Timestamp,
    
    /// Custom data passed during query creation (e.g., encoded market_id)
    /// Use CallbackData helpers to encode/decode
    pub callback_data: Vec<u8>,
}

/// Parameters for creating a query with callback
/// 
/// Use this when calling Oracle Registry's CreateQueryWithCallback operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateQueryParams {
    /// Question description (e.g., "Did BTC close above $100k on Dec 20, 2024?")
    pub description: String,
    
    /// Possible outcomes (e.g., ["Yes", "No"])
    /// Must have 2-10 outcomes
    pub outcomes: Vec<String>,
    
    /// Decision strategy for determining consensus
    pub strategy: DecisionStrategy,
    
    /// Minimum number of votes required (None = use protocol default)
    pub min_votes: Option<usize>,
    
    /// Reward amount for correct voters (in ALTH tokens)
    pub reward_amount: u128,
    
    /// Resolution deadline (None = use protocol default duration)
    pub deadline: Option<Timestamp>,
    
    /// Chain ID where callback should be sent
    pub callback_chain: ChainId,
    
    /// Application ID to receive the callback
    pub callback_app: ApplicationId,
    
    /// Custom data to include in callback (e.g., encoded market_id)
    pub callback_data: Vec<u8>,
}

/// Decision strategy for query resolution
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum DecisionStrategy {
    /// Simple majority vote (most votes wins)
    Majority,
    
    /// Median value (for numeric outcomes)
    Median,
    
    /// Weighted by voter stake (recommended)
    WeightedByStake,
    
    /// Weighted by voter reputation
    WeightedByReputation,
}

impl Default for DecisionStrategy {
    fn default() -> Self {
        DecisionStrategy::WeightedByStake
    }
}

// ==================== CONSUMER APP REGISTRATION ====================

/// App categories for consumer app registration
/// 
/// Used when registering your app with the Oracle Registry.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum AppCategory {
    /// Prediction markets
    PredictionMarket,
    /// Insurance protocols
    Insurance,
    /// Gaming applications
    Gaming,
    /// DeFi protocols
    DeFi,
    /// Data feed consumers
    DataFeed,
    /// Custom category
    Custom(String),
}

impl Default for AppCategory {
    fn default() -> Self {
        AppCategory::Custom("Other".to_string())
    }
}

/// Registration tier with different privileges
/// 
/// Tier is automatically determined by stake amount:
/// - Free: 0 ALTH
/// - Standard: 100+ ALTH
/// - Premium: 1000+ ALTH
/// - Enterprise: 10000+ ALTH
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum RegistrationTier {
    /// Free tier: 10 queries/hour
    Free,
    /// Standard tier: 100 queries/hour
    Standard,
    /// Premium tier: 1000 queries/hour
    Premium,
    /// Enterprise tier: unlimited queries
    Enterprise,
}

impl RegistrationTier {
    /// Get rate limit for this tier (queries per hour)
    pub fn rate_limit(&self) -> u32 {
        match self {
            RegistrationTier::Free => 10,
            RegistrationTier::Standard => 100,
            RegistrationTier::Premium => 1000,
            RegistrationTier::Enterprise => u32::MAX,
        }
    }
    
    /// Get minimum stake required for this tier
    pub fn min_stake(&self) -> Amount {
        match self {
            RegistrationTier::Free => Amount::ZERO,
            RegistrationTier::Standard => Amount::from_tokens(100),
            RegistrationTier::Premium => Amount::from_tokens(1000),
            RegistrationTier::Enterprise => Amount::from_tokens(10000),
        }
    }
    
    /// Determine tier from stake amount
    pub fn from_stake(stake: Amount) -> Self {
        let stake_value: u128 = stake.into();
        if stake_value >= 10000 {
            RegistrationTier::Enterprise
        } else if stake_value >= 1000 {
            RegistrationTier::Premium
        } else if stake_value >= 100 {
            RegistrationTier::Standard
        } else {
            RegistrationTier::Free
        }
    }
}

impl Default for RegistrationTier {
    fn default() -> Self {
        RegistrationTier::Free
    }
}

/// Consumer app registration parameters
/// 
/// Use this struct to register your app with the Oracle Registry.
/// 
/// # Example
/// 
/// ```rust,ignore
/// let registration = ConsumerAppRegistration {
///     name: "My Prediction Market".to_string(),
///     category: AppCategory::PredictionMarket,
///     stake: Amount::from_tokens(100), // Standard tier
///     metadata_url: Some("https://myapp.com/metadata.json".to_string()),
/// };
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsumerAppRegistration {
    /// Human-readable app name
    pub name: String,
    
    /// App category
    pub category: AppCategory,
    
    /// Registration stake (determines tier)
    pub stake: Amount,
    
    /// Optional metadata URL (logo, description, etc.)
    pub metadata_url: Option<String>,
}

impl ConsumerAppRegistration {
    /// Create a new registration with Free tier
    pub fn free(name: impl Into<String>, category: AppCategory) -> Self {
        Self {
            name: name.into(),
            category,
            stake: Amount::ZERO,
            metadata_url: None,
        }
    }
    
    /// Create a new registration with Standard tier
    pub fn standard(name: impl Into<String>, category: AppCategory) -> Self {
        Self {
            name: name.into(),
            category,
            stake: Amount::from_tokens(100),
            metadata_url: None,
        }
    }
    
    /// Create a new registration with Premium tier
    pub fn premium(name: impl Into<String>, category: AppCategory) -> Self {
        Self {
            name: name.into(),
            category,
            stake: Amount::from_tokens(1000),
            metadata_url: None,
        }
    }
    
    /// Set metadata URL
    pub fn with_metadata(mut self, url: impl Into<String>) -> Self {
        self.metadata_url = Some(url.into());
        self
    }
    
    /// Get the tier this registration will result in
    pub fn tier(&self) -> RegistrationTier {
        RegistrationTier::from_stake(self.stake)
    }
}

/// Helper for encoding/decoding callback data
pub struct CallbackData;

impl CallbackData {
    /// Encode a u64 value (e.g., market_id) to callback data
    /// 
    /// # Example
    /// ```rust,ignore
    /// let callback_data = CallbackData::encode_u64(market_id);
    /// ```
    pub fn encode_u64(value: u64) -> Vec<u8> {
        value.to_le_bytes().to_vec()
    }
    
    /// Decode a u64 value from callback data
    /// 
    /// # Example
    /// ```rust,ignore
    /// let market_id = CallbackData::decode_u64(&callback.callback_data);
    /// ```
    pub fn decode_u64(data: &[u8]) -> Option<u64> {
        if data.len() >= 8 {
            Some(u64::from_le_bytes(data[..8].try_into().ok()?))
        } else {
            None
        }
    }
    
    /// Encode multiple u64 values
    pub fn encode_multiple_u64(values: &[u64]) -> Vec<u8> {
        values.iter().flat_map(|v| v.to_le_bytes()).collect()
    }
    
    /// Decode multiple u64 values
    pub fn decode_multiple_u64(data: &[u8]) -> Vec<u64> {
        data.chunks_exact(8)
            .filter_map(|chunk| chunk.try_into().ok().map(u64::from_le_bytes))
            .collect()
    }
    
    /// Encode a string to callback data
    pub fn encode_string(s: &str) -> Vec<u8> {
        let bytes = s.as_bytes();
        let mut result = (bytes.len() as u32).to_le_bytes().to_vec();
        result.extend_from_slice(bytes);
        result
    }
    
    /// Decode a string from callback data
    pub fn decode_string(data: &[u8]) -> Option<String> {
        if data.len() < 4 {
            return None;
        }
        let len = u32::from_le_bytes(data[..4].try_into().ok()?) as usize;
        if data.len() < 4 + len {
            return None;
        }
        String::from_utf8(data[4..4 + len].to_vec()).ok()
    }
}

/// Trait for Oracle consumer contracts
/// 
/// Implement this trait to standardize how your contract handles Oracle callbacks.
/// 
/// # Example
/// 
/// ```rust,ignore
/// use alethea_consumer_sdk::{OracleConsumer, OracleCallback, CallbackData};
/// 
/// impl OracleConsumer for MyMarketContract {
///     async fn handle_resolution(&mut self, callback: OracleCallback) -> Result<(), String> {
///         // Decode market_id from callback data
///         let market_id = CallbackData::decode_u64(&callback.callback_data)
///             .ok_or("Invalid callback data")?;
///         
///         // Get the market
///         let mut market = self.get_market(market_id)?;
///         
///         // Update market with resolved outcome
///         market.status = MarketStatus::Resolved;
///         market.winning_outcome = Some(callback.resolved_outcome);
///         market.resolved_at = Some(callback.resolved_at);
///         
///         // Save market
///         self.save_market(market)?;
///         
///         Ok(())
///     }
/// }
/// ```
#[async_trait::async_trait]
pub trait OracleConsumer {
    /// Handle resolution callback from Oracle
    /// 
    /// This method is called when the Oracle resolves a query that was created
    /// by this consumer with a callback.
    async fn handle_resolution(&mut self, callback: OracleCallback) -> Result<(), String>;
}

/// Standard message enum for consumer contracts
/// 
/// Include this in your contract's Message enum to receive Oracle callbacks.
/// 
/// # Example
/// 
/// ```rust,ignore
/// #[derive(Debug, Clone, Serialize, Deserialize)]
/// pub enum Message {
///     // Your other messages...
///     
///     /// Oracle resolution callback
///     QueryResolutionCallback {
///         query_id: u64,
///         resolved_outcome: String,
///         resolved_at: Timestamp,
///         callback_data: Vec<u8>,
///     },
/// }
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OracleMessage {
    /// Resolution callback from Oracle Registry
    QueryResolutionCallback {
        query_id: u64,
        resolved_outcome: String,
        resolved_at: Timestamp,
        callback_data: Vec<u8>,
    },
}

impl From<OracleMessage> for OracleCallback {
    fn from(msg: OracleMessage) -> Self {
        match msg {
            OracleMessage::QueryResolutionCallback {
                query_id,
                resolved_outcome,
                resolved_at,
                callback_data,
            } => OracleCallback {
                query_id,
                resolved_outcome,
                resolved_at,
                callback_data,
            },
        }
    }
}

/// Query status returned by Oracle
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum QueryStatus {
    /// Query is active, accepting votes
    Active,
    /// In commit phase (votes hidden)
    CommitPhase,
    /// In reveal phase (votes being revealed)
    RevealPhase,
    /// Query has been resolved
    Resolved,
    /// Query expired without enough votes
    Expired,
    /// Query was cancelled
    Cancelled,
}

/// Response from Oracle when creating a query
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateQueryResponse {
    /// Whether the operation succeeded
    pub success: bool,
    /// Human-readable message
    pub message: String,
    /// Query ID if successful
    pub query_id: Option<u64>,
}

/// Protocol constants
pub mod constants {
    /// Minimum stake required to register as voter (in ALTH tokens)
    pub const MIN_VOTER_STAKE: u128 = 100;
    
    /// Default query duration in seconds
    pub const DEFAULT_QUERY_DURATION_SECS: u64 = 3600; // 1 hour
    
    /// Minimum votes required by default
    pub const DEFAULT_MIN_VOTES: usize = 3;
    
    /// Slash percentage for incorrect votes (basis points)
    pub const SLASH_PERCENTAGE_BPS: u32 = 500; // 5%
    
    /// Protocol fee percentage (basis points)
    pub const PROTOCOL_FEE_BPS: u32 = 100; // 1%
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encode_decode_u64() {
        let value = 12345u64;
        let encoded = CallbackData::encode_u64(value);
        let decoded = CallbackData::decode_u64(&encoded);
        assert_eq!(decoded, Some(value));
    }

    #[test]
    fn test_encode_decode_string() {
        let s = "Hello, Oracle!";
        let encoded = CallbackData::encode_string(s);
        let decoded = CallbackData::decode_string(&encoded);
        assert_eq!(decoded, Some(s.to_string()));
    }

    #[test]
    fn test_encode_decode_multiple_u64() {
        let values = vec![1u64, 2, 3, 42, 100];
        let encoded = CallbackData::encode_multiple_u64(&values);
        let decoded = CallbackData::decode_multiple_u64(&encoded);
        assert_eq!(decoded, values);
    }
}
