// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

use async_graphql::{Request, Response};
use linera_sdk::linera_base_types::{Account, AccountOwner, Amount, ApplicationId, ChainId, ContractAbi, ServiceAbi};
use serde::{Deserialize, Serialize};

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
