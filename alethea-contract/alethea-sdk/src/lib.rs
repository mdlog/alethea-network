// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Alethea Client SDK
//! 
//! Simple client library for integrating Alethea Oracle Protocol into your dApp.
//! 
//! ## Quick Start
//! 
//! ```rust,no_run
//! use alethea_sdk::AletheaClient;
//! use linera_sdk::linera_base_types::Timestamp;
//! 
//! // Create client (uses canonical registry)
//! let client = AletheaClient::new();
//! 
//! // Request market resolution
//! client.request_resolution(
//!     &runtime,
//!     "Will it rain tomorrow?".to_string(),
//!     vec!["Yes".to_string(), "No".to_string()],
//!     Timestamp::from(future_time),
//!     market_id.to_le_bytes().to_vec(),
//! ).await?;
//! 
//! // Handle resolution callback
//! if let Some(result) = client.handle_resolution(message) {
//!     println!("Market resolved: outcome {}", result.outcome_index);
//! }
//! ```

use linera_sdk::{
    linera_base_types::{ApplicationId, Timestamp},
    ContractRuntime, Contract,
};
use alethea_oracle_types::{RegistryMessage, CANONICAL_REGISTRY_ID_PLACEHOLDER};
use thiserror::Error;

pub mod client;
pub mod types;

pub use client::AletheaClient;
pub use types::*;

/// Alethea SDK errors
#[derive(Debug, Error)]
pub enum AletheaError {
    #[error("Registry not configured")]
    RegistryNotConfigured,
    
    #[error("Invalid market parameters: {0}")]
    InvalidParameters(String),
    
    #[error("Message send failed")]
    MessageSendFailed,
    
    #[error("Invalid response")]
    InvalidResponse,
    
    #[error("Market not found: {0}")]
    MarketNotFound(u64),
}

/// Result type for Alethea SDK operations
pub type Result<T> = std::result::Result<T, AletheaError>;

/// Get canonical registry ApplicationId
/// 
/// This returns the well-known ApplicationId of the Alethea Oracle Registry.
/// All dApps use this same registry for oracle services.
pub fn canonical_registry_id() -> Result<ApplicationId> {
    // TODO: Replace with actual deployed registry ID
    // For now, return error if not configured
    if CANONICAL_REGISTRY_ID_PLACEHOLDER == "REGISTRY_NOT_DEPLOYED" {
        return Err(AletheaError::RegistryNotConfigured);
    }
    
    CANONICAL_REGISTRY_ID_PLACEHOLDER
        .parse()
        .map_err(|_| AletheaError::RegistryNotConfigured)
}
