// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

use async_graphql::{Request, Response};
use linera_sdk::linera_base_types::{Account, AccountOwner, Amount, ApplicationId, ChainId, ContractAbi, ServiceAbi};
use serde::{Deserialize, Serialize};

#[cfg(test)]
mod tests;

pub struct AletheaTokenAbi;

impl ContractAbi for AletheaTokenAbi {
    type Operation = Operation;
    type Response = OperationResponse;
}

impl ServiceAbi for AletheaTokenAbi {
    type Query = Request;
    type QueryResponse = Response;
}

/// Token parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Parameters {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    /// Optional: Oracle Registry application ID for minting rewards
    pub registry_app_id: Option<ApplicationId>,
    
    // ===== SECURITY PARAMETERS =====
    /// Minimum stake amount (e.g., 100 ALTH)
    pub min_stake_amount: Amount,
    /// Maximum stake amount per transaction (e.g., 10,000,000 ALTH)
    pub max_stake_amount: Amount,
    /// Maximum total stake per user (e.g., 1,000,000 ALTH = 0.1% of 1B supply)
    pub max_stake_per_user: Amount,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InitialState {
    pub accounts: std::collections::BTreeMap<AccountOwner, Amount>,
    /// Initial admin (can mint/burn)
    pub admin: Option<AccountOwner>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Operation {
    /// Standard transfer between accounts
    Transfer {
        owner: AccountOwner,
        amount: Amount,
        target_account: Account,
    },
    /// Transfer tokens to an application (e.g., staking to registry)
    TransferToApplication {
        owner: AccountOwner,
        amount: Amount,
        target_application: ApplicationId,
        target_chain: ChainId,
    },
    /// Claim tokens back from an application
    Claim {
        owner: AccountOwner,
        amount: Amount,
        source_application: ApplicationId,
        source_chain: ChainId,
    },
    /// Mint new tokens (admin only)
    Mint {
        to: AccountOwner,
        amount: Amount,
    },
    /// Burn tokens (admin or owner)
    Burn {
        from: AccountOwner,
        amount: Amount,
    },
    /// Set new admin
    SetAdmin {
        new_admin: AccountOwner,
    },
    /// Set registry app ID (for authorized minting)
    SetRegistryAppId {
        registry_app_id: ApplicationId,
    },
    /// Send cross-chain transfer request (called from user's chain)
    /// This allows users to transfer tokens without direct permission check
    /// by sending a message to the token chain
    SendTransferMessage {
        /// Target chain where token contract lives
        token_chain: ChainId,
        /// Amount to transfer
        amount: Amount,
        /// Target recipient
        target_owner: AccountOwner,
    },
    
    // ===== DEPRECATED INSECURE OPERATIONS =====
    // WARNING: The following operations are DEPRECATED and INSECURE.
    // They are kept ONLY for backward compatibility with existing code.
    // 
    // SECURITY ISSUE: These operations can be called by ANYONE via HTTP
    // without proper authentication, allowing potential theft of tokens.
    //
    // DO NOT USE IN PRODUCTION!
    //
    // USE SECURE ALTERNATIVES:
    // - Instead of StakeTransfer, use SendStakeRequest
    // - Instead of UnstakeTransfer, use SendUnstakeRequest
    //
    // The secure alternatives use cross-chain messages with proper
    // authentication by the Linera runtime.
    
    /// DEPRECATED: Stake transfer - INSECURE, use SendStakeRequest instead
    /// WARNING: Can be called by anyone via HTTP - DO NOT USE IN PRODUCTION
    #[deprecated(since = "1.0.0", note = "INSECURE: Use SendStakeRequest instead")]
    StakeTransfer {
        /// User's chainId (owner of tokens)
        from_chain_id: ChainId,
        /// Amount to stake
        amount: Amount,
        /// Registry app ID to receive tokens
        to_registry: ApplicationId,
    },
    /// DEPRECATED: Unstake transfer - INSECURE, use SendUnstakeRequest instead
    /// WARNING: Can be called by anyone via HTTP - DO NOT USE IN PRODUCTION
    #[deprecated(since = "1.0.0", note = "INSECURE: Use SendUnstakeRequest instead")]
    UnstakeTransfer {
        /// User's chainId to receive tokens
        to_chain_id: ChainId,
        /// Amount to return
        amount: Amount,
        /// Registry app ID that holds tokens
        from_registry: ApplicationId,
    },
    
    // ===== SECURE OPERATIONS (USE THESE) =====
    
    /// Send stake request from user's chain to token chain
    /// SECURE: Uses cross-chain messages with authentication
    SendStakeRequest {
        /// Token chain where token contract lives
        token_chain: ChainId,
        /// Owner address for balance lookup
        owner: AccountOwner,
        /// Amount to stake
        amount: Amount,
        /// Registry app ID to receive tokens
        to_registry: ApplicationId,
    },
    /// Send unstake request from user's chain to token chain
    /// SECURE: Uses cross-chain messages with authentication
    SendUnstakeRequest {
        /// Token chain where token contract lives  
        token_chain: ChainId,
        /// Owner address for balance lookup
        owner: AccountOwner,
        /// Amount to unstake
        amount: Amount,
        /// Registry app ID that holds tokens
        from_registry: ApplicationId,
    },
    /// Simple transfer between users using chainId as identifier
    /// This is for transfers where tokens are stored under Address32(chainId)
    SimpleTransfer {
        /// Sender's chainId
        from_chain_id: ChainId,
        /// Recipient's chainId  
        to_chain_id: ChainId,
        /// Amount to transfer
        amount: Amount,
    },
    /// Add a registry to the authorized list (admin only)
    AddAuthorizedRegistry {
        registry_app_id: ApplicationId,
    },
    /// Remove a registry from the authorized list (admin only)
    RemoveAuthorizedRegistry {
        registry_app_id: ApplicationId,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Message {
    /// Credit tokens to an account (cross-chain transfer)
    Credit {
        target: AccountOwner,
        amount: Amount,
        source: AccountOwner,
    },
    /// Notify application that tokens were received (for staking)
    ReceiveFromAccount {
        sender_chain: ChainId,
        sender: AccountOwner,
        amount: Amount,
    },
    /// Withdraw tokens from application back to user
    WithdrawToAccount {
        target_chain: ChainId,
        target: AccountOwner,
        amount: Amount,
    },
    /// Mint tokens (from authorized registry for rewards)
    MintReward {
        to_chain: ChainId,
        to: AccountOwner,
        amount: Amount,
    },
    /// Burn tokens (from registry for slashing)
    BurnSlash {
        from_chain: ChainId,
        from: AccountOwner,
        amount: Amount,
    },
    /// Request transfer from user's chain to token chain
    /// The sender_owner is authenticated by the sending chain
    RequestTransfer {
        sender_chain: ChainId,
        sender_owner: AccountOwner,
        target_owner: AccountOwner,
        amount: Amount,
    },
    /// Request stake from user's chain - authenticated by sender chain
    RequestStake {
        sender_chain: ChainId,
        sender_owner: AccountOwner,  // Added: owner address for balance lookup
        amount: Amount,
        to_registry: ApplicationId,
    },
    /// Request unstake from user's chain - authenticated by sender chain
    RequestUnstake {
        sender_chain: ChainId,
        sender_owner: AccountOwner,  // Added: owner address for balance lookup
        amount: Amount,
        from_registry: ApplicationId,
    },
    /// Stake confirmed - tokens already deducted on sender chain
    /// This is sent AFTER deduction on user's chain
    StakeConfirmed {
        sender_chain: ChainId,
        sender_owner: AccountOwner,
        amount: Amount,
        to_registry: ApplicationId,
    },
    /// Unstake confirmed - tokens should be credited back to user
    UnstakeConfirmed {
        sender_chain: ChainId,
        sender_owner: AccountOwner,
        amount: Amount,
        from_registry: ApplicationId,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationResponse {
    pub success: bool,
    pub message: String,
}

impl OperationResponse {
    pub fn success(message: impl Into<String>) -> Self {
        Self {
            success: true,
            message: message.into(),
        }
    }

    pub fn error(message: impl Into<String>) -> Self {
        Self {
            success: false,
            message: message.into(),
        }
    }
}
