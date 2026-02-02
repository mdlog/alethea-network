// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::sync::Arc;

use alethea_token::{AletheaTokenAbi, Operation, Parameters};
use async_graphql::{EmptySubscription, Object, Request, Response, Schema, SimpleObject};
use linera_sdk::{
    linera_base_types::{Account, AccountOwner, Amount, WithServiceAbi},
    views::View,
    Service, ServiceRuntime,
};

use self::state::AletheaTokenState;

#[derive(Clone)]
pub struct AletheaTokenService {
    state: Arc<AletheaTokenState>,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(AletheaTokenService);

impl WithServiceAbi for AletheaTokenService {
    type Abi = AletheaTokenAbi;
}

impl Service for AletheaTokenService {
    type Parameters = Parameters;

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = AletheaTokenState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        AletheaTokenService {
            state: Arc::new(state),
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            QueryRoot {
                state: self.state.clone(),
            },
            MutationRoot {
                runtime: self.runtime.clone(),
            },
            EmptySubscription,
        )
        .finish();
        schema.execute(request).await
    }
}

struct MutationRoot {
    runtime: Arc<ServiceRuntime<AletheaTokenService>>,
}

#[Object]
impl MutationRoot {
    /// Mint tokens to an account (admin only in contract, but exposed for testing)
    /// Format: AccountOwner string (e.g., "0x..." for addresses)
    async fn mint(
        &self,
        to: String,
        amount: String,
    ) -> String {
        // Parse AccountOwner string
        let to: AccountOwner = match to.parse() {
            Ok(owner) => owner,
            Err(e) => return format!("Invalid recipient format: {}", e),
        };
        
        let amount: Amount = match amount.parse() {
            Ok(a) => a,
            Err(e) => return format!("Invalid amount: {}", e),
        };
        
        let operation = Operation::Mint { to, amount };
        
        self.runtime.schedule_operation(&operation);
        format!("Mint {} tokens scheduled", amount)
    }

    /// Transfer tokens to another account
    async fn transfer(
        &self,
        owner: String,
        amount: String,
        target_chain: String,
        target_owner: String,
    ) -> String {
        let owner: AccountOwner = match owner.parse() {
            Ok(o) => o,
            Err(e) => return format!("Invalid owner: {}", e),
        };
        
        let amount: Amount = match amount.parse() {
            Ok(a) => a,
            Err(e) => return format!("Invalid amount: {}", e),
        };
        
        let target_chain: linera_sdk::linera_base_types::ChainId = match target_chain.parse() {
            Ok(c) => c,
            Err(e) => return format!("Invalid target_chain: {}", e),
        };
        
        let target_owner: AccountOwner = match target_owner.parse() {
            Ok(o) => o,
            Err(e) => return format!("Invalid target_owner: {}", e),
        };
        
        let operation = Operation::Transfer {
            owner,
            amount,
            target_account: Account {
                chain_id: target_chain,
                owner: target_owner,
            },
        };
        
        // Schedule operation (returns bytes for client to submit)
        self.runtime.schedule_operation(&operation);
        "Transfer operation scheduled".to_string()
    }

    /// Transfer tokens to an application (e.g., for staking)
    async fn transfer_to_application(
        &self,
        owner: String,
        amount: String,
        target_application: String,
        target_chain: String,
    ) -> String {
        let owner: AccountOwner = match owner.parse() {
            Ok(o) => o,
            Err(e) => return format!("Invalid owner: {}", e),
        };
        
        let amount: Amount = match amount.parse() {
            Ok(a) => a,
            Err(e) => return format!("Invalid amount: {}", e),
        };
        
        let target_application: linera_sdk::linera_base_types::ApplicationId = match target_application.parse() {
            Ok(a) => a,
            Err(e) => return format!("Invalid target_application: {}", e),
        };
        
        let target_chain: linera_sdk::linera_base_types::ChainId = match target_chain.parse() {
            Ok(c) => c,
            Err(e) => return format!("Invalid target_chain: {}", e),
        };
        
        let operation = Operation::TransferToApplication {
            owner,
            amount,
            target_application,
            target_chain,
        };
        
        self.runtime.schedule_operation(&operation);
        "Transfer to application scheduled".to_string()
    }

    /// Send cross-chain transfer message
    /// This allows users to transfer tokens from their chain to the token chain
    /// without requiring direct permission check on the token chain
    async fn send_transfer_message(
        &self,
        token_chain: String,
        amount: String,
        target_owner: String,
    ) -> String {
        let token_chain: linera_sdk::linera_base_types::ChainId = match token_chain.parse() {
            Ok(c) => c,
            Err(e) => return format!("Invalid token_chain: {}", e),
        };
        
        let amount: Amount = match amount.parse() {
            Ok(a) => a,
            Err(e) => return format!("Invalid amount: {}", e),
        };
        
        // Handle target_owner parsing - support both chain ID and AccountOwner formats
        let target_owner: AccountOwner = if target_owner.len() == 64 && target_owner.chars().all(|c| c.is_ascii_hexdigit()) {
            // Looks like a chain ID (64 hex chars) - convert to Address32
            match target_owner.parse::<linera_sdk::linera_base_types::ChainId>() {
                Ok(chain_id) => {
                    let chain_bytes: [u8; 32] = chain_id.0.into();
                    AccountOwner::Address32(chain_bytes.into())
                },
                Err(e) => return format!("Invalid chain ID format: {}", e),
            }
        } else if target_owner.starts_with("0x") && target_owner.len() == 66 && target_owner[2..].chars().all(|c| c.is_ascii_hexdigit()) {
            // Chain ID with 0x prefix - remove prefix and convert
            match target_owner[2..].parse::<linera_sdk::linera_base_types::ChainId>() {
                Ok(chain_id) => {
                    let chain_bytes: [u8; 32] = chain_id.0.into();
                    AccountOwner::Address32(chain_bytes.into())
                },
                Err(e) => return format!("Invalid chain ID format (with 0x): {}", e),
            }
        } else {
            // Try to parse as AccountOwner directly
            match target_owner.parse() {
                Ok(owner) => owner,
                Err(e) => return format!("Invalid target_owner format: {}. Expected chain ID (64 hex chars) or AccountOwner format", e),
            }
        };
        
        let operation = Operation::SendTransferMessage {
            token_chain,
            amount,
            target_owner,
        };
        
        self.runtime.schedule_operation(&operation);
        "Cross-chain transfer message scheduled".to_string()
    }

    // ===== INSECURE MUTATIONS REMOVED FOR PRODUCTION =====
    // The following mutations were removed because they bypass security checks:
    // - stake_transfer() - INSECURE: No permission check, anyone can call via HTTP
    // - unstake_transfer() - INSECURE: No permission check, anyone can call via HTTP
    //
    // USE SECURE ALTERNATIVES:
    // - send_stake_request() - SECURE: Uses cross-chain messages with authentication
    // - send_unstake_request() - SECURE: Uses cross-chain messages with authentication
    //
    // These secure methods ensure that only the actual owner of the chain can
    // initiate stake/unstake operations through authenticated cross-chain messages.

    /// SECURE: Send stake request via cross-chain message
    /// This should be called via WASM from user's chain
    /// The sender chain is authenticated by Linera runtime
    async fn send_stake_request(
        &self,
        token_chain: String,
        owner: String,
        amount: String,
        to_registry: String,
    ) -> String {
        let token_chain: linera_sdk::linera_base_types::ChainId = match token_chain.parse() {
            Ok(c) => c,
            Err(e) => return format!("Invalid token_chain: {}", e),
        };
        let owner: AccountOwner = match owner.parse() {
            Ok(o) => o,
            Err(e) => return format!("Invalid owner: {}", e),
        };
        let amount: Amount = match amount.parse() {
            Ok(a) => a,
            Err(e) => return format!("Invalid amount: {}", e),
        };
        let to_registry: linera_sdk::linera_base_types::ApplicationId = match to_registry.parse() {
            Ok(a) => a,
            Err(e) => return format!("Invalid to_registry: {}", e),
        };
        
        let operation = Operation::SendStakeRequest {
            token_chain,
            owner,
            amount,
            to_registry,
        };
        
        self.runtime.schedule_operation(&operation);
        format!("Stake request sent: {} tokens from {:?}", amount, owner)
    }

    /// SECURE: Send unstake request via cross-chain message
    /// This should be called via WASM from user's chain
    async fn send_unstake_request(
        &self,
        token_chain: String,
        owner: String,
        amount: String,
        from_registry: String,
    ) -> String {
        let token_chain: linera_sdk::linera_base_types::ChainId = match token_chain.parse() {
            Ok(c) => c,
            Err(e) => return format!("Invalid token_chain: {}", e),
        };
        let owner: AccountOwner = match owner.parse() {
            Ok(o) => o,
            Err(e) => return format!("Invalid owner: {}", e),
        };
        let amount: Amount = match amount.parse() {
            Ok(a) => a,
            Err(e) => return format!("Invalid amount: {}", e),
        };
        let from_registry: linera_sdk::linera_base_types::ApplicationId = match from_registry.parse() {
            Ok(a) => a,
            Err(e) => return format!("Invalid from_registry: {}", e),
        };
        
        let operation = Operation::SendUnstakeRequest {
            token_chain,
            owner,
            amount,
            from_registry,
        };
        
        self.runtime.schedule_operation(&operation);
        format!("Unstake request sent: {} tokens from {:?}", amount, owner)
    }

    /// Simple transfer between users using chainId as identifier
    /// This is for transfers where tokens are stored under Address32(chainId)
    /// No permission check - relies on frontend to authenticate user
    async fn simple_transfer(
        &self,
        from_chain_id: String,
        to_chain_id: String,
        amount: String,
    ) -> String {
        let from_chain_id: linera_sdk::linera_base_types::ChainId = match from_chain_id.parse() {
            Ok(c) => c,
            Err(e) => return format!("Invalid from_chain_id: {}", e),
        };
        
        // Handle to_chain_id with or without 0x prefix
        let to_chain_id_clean = if to_chain_id.starts_with("0x") {
            &to_chain_id[2..]
        } else {
            &to_chain_id
        };
        let to_chain_id: linera_sdk::linera_base_types::ChainId = match to_chain_id_clean.parse() {
            Ok(c) => c,
            Err(e) => return format!("Invalid to_chain_id: {}", e),
        };
        
        let amount: Amount = match amount.parse() {
            Ok(a) => a,
            Err(e) => return format!("Invalid amount: {}", e),
        };
        
        let operation = Operation::SimpleTransfer {
            from_chain_id,
            to_chain_id,
            amount,
        };
        
        self.runtime.schedule_operation(&operation);
        format!("Transfer scheduled: {} tokens from {} to {}", amount, from_chain_id, to_chain_id)
    }

    /// Add a registry to the authorized list (admin only)
    async fn add_authorized_registry(&self, registry_app_id: String) -> String {
        let registry_app_id: linera_sdk::linera_base_types::ApplicationId = match registry_app_id.parse() {
            Ok(app_id) => app_id,
            Err(e) => return format!("Invalid registry_app_id: {}", e),
        };
        
        let operation = Operation::AddAuthorizedRegistry { registry_app_id };
        
        self.runtime.schedule_operation(&operation);
        format!("Add authorized registry scheduled: {}", registry_app_id)
    }

    /// Remove a registry from the authorized list (admin only)
    async fn remove_authorized_registry(&self, registry_app_id: String) -> String {
        let registry_app_id: linera_sdk::linera_base_types::ApplicationId = match registry_app_id.parse() {
            Ok(app_id) => app_id,
            Err(e) => return format!("Invalid registry_app_id: {}", e),
        };
        
        let operation = Operation::RemoveAuthorizedRegistry { registry_app_id };
        
        self.runtime.schedule_operation(&operation);
        format!("Remove authorized registry scheduled: {}", registry_app_id)
    }
}

struct QueryRoot {
    state: Arc<AletheaTokenState>,
}

#[Object]
impl QueryRoot {
    /// Get balance of an account
    async fn balance(&self, owner: String) -> String {
        match owner.parse::<AccountOwner>() {
            Ok(owner) => {
                self.state
                    .balances
                    .get(&owner)
                    .await
                    .ok()
                    .flatten()
                    .unwrap_or(Amount::ZERO)
                    .to_string()
            }
            Err(_) => "0.".to_string(),
        }
    }

    /// Get balance of registry by app ID
    /// This uses the same address derivation as StakeTransfer
    async fn registry_balance(&self, registry_app_id: String) -> String {
        // Use the application description hash as Address32
        let registry_app_id: linera_sdk::linera_base_types::ApplicationId = match registry_app_id.parse() {
            Ok(app_id) => app_id,
            Err(_) => return "0.".to_string(),
        };
        let registry_owner = AccountOwner::Address32(registry_app_id.application_description_hash.into());
        
        self.state
            .balances
            .get(&registry_owner)
            .await
            .ok()
            .flatten()
            .unwrap_or(Amount::ZERO)
            .to_string()
    }

    /// Get total supply
    async fn total_supply(&self) -> String {
        self.state.total_supply.get().to_string()
    }

    /// Get total minted
    async fn total_minted(&self) -> String {
        self.state.total_minted.get().to_string()
    }

    /// Get total burned
    async fn total_burned(&self) -> String {
        self.state.total_burned.get().to_string()
    }

    /// Get token info
    async fn token_info(&self) -> TokenInfo {
        TokenInfo {
            name: self.state.name.get().clone(),
            symbol: self.state.symbol.get().clone(),
            decimals: *self.state.decimals.get(),
            total_supply: self.state.total_supply.get().to_string(),
            total_minted: self.state.total_minted.get().to_string(),
            total_burned: self.state.total_burned.get().to_string(),
        }
    }

    /// Get admin
    async fn admin(&self) -> Option<String> {
        self.state.admin.get().as_ref().map(|a| format!("{:?}", a))
    }

    /// Get registry app ID
    async fn registry_app_id(&self) -> Option<String> {
        self.state.registry_app_id.get().as_ref().map(|a| format!("{:?}", a))
    }

    /// Check if a registry is authorized
    async fn is_registry_authorized(&self, registry_app_id: String) -> bool {
        let registry_app_id: linera_sdk::linera_base_types::ApplicationId = match registry_app_id.parse() {
            Ok(app_id) => app_id,
            Err(_) => return false,
        };
        
        self.state.authorized_registries
            .contains(&registry_app_id)
            .await
            .unwrap_or(false)
    }

    /// Get total stake in a specific registry
    async fn registry_total_stake(&self, registry_app_id: String) -> String {
        let registry_app_id: linera_sdk::linera_base_types::ApplicationId = match registry_app_id.parse() {
            Ok(app_id) => app_id,
            Err(_) => return "0.".to_string(),
        };
        
        self.state.registry_stakes
            .get(&registry_app_id)
            .await
            .ok()
            .flatten()
            .unwrap_or(Amount::ZERO)
            .to_string()
    }

    /// Get user's total stake across all registries
    async fn user_total_stake(&self, owner: String) -> String {
        match owner.parse::<AccountOwner>() {
            Ok(owner) => {
                self.state.user_total_stakes
                    .get(&owner)
                    .await
                    .ok()
                    .flatten()
                    .unwrap_or(Amount::ZERO)
                    .to_string()
            }
            Err(_) => "0.".to_string(),
        }
    }

    /// Get stake limits from parameters
    async fn stake_limits(&self) -> StakeLimits {
        // Note: We can't access runtime.application_parameters() from service
        // So we return placeholder values. In production, store these in state
        // or make them queryable from the contract
        StakeLimits {
            min_stake_amount: "100.".to_string(),
            max_stake_amount: "10000000.".to_string(),
            max_stake_per_user: "1000000.".to_string(),
        }
    }
}

#[derive(SimpleObject)]
struct StakeLimits {
    min_stake_amount: String,
    max_stake_amount: String,
    max_stake_per_user: String,
}

#[derive(SimpleObject)]
struct TokenInfo {
    name: String,
    symbol: String,
    decimals: u8,
    total_supply: String,
    total_minted: String,
    total_burned: String,
}
