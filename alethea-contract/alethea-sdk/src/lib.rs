// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Alethea Client SDK
//! 
//! Simple client library for integrating Alethea Oracle Protocol into your dApp.
//! 
//! This SDK uses the standard message types from `alethea-oracle-messages` which are
//! compatible with the `oracle-registry-v2` contract.
//! 
//! ## Quick Start
//! 
//! ```rust,ignore
//! use alethea_sdk::AletheaClient;
//! use alethea_oracle_messages::OracleCallback;
//! 
//! // Create client
//! let client = AletheaClient::new();
//! 
//! // Request market resolution
//! let request = client.create_resolution_request(
//!     "Will it rain tomorrow?".to_string(),
//!     vec!["Yes".to_string(), "No".to_string()],
//!     deadline,
//!     42u64, // your market_id
//! )?;
//! 
//! // Handle resolution callback
//! if let Some(result) = client.handle_callback(callback) {
//!     println!("Resolved: {}", result.resolved_outcome);
//! }
//! ```

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
