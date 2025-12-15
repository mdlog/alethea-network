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
    /// Transfer tokens to another account
    async fn transfer(
        &self,
        owner: String,
        amount: String,
        target_chain: String,
        target_owner: String,
    ) -> String {
        let owner: AccountOwner = owner.parse().expect("Invalid owner");
        let amount: Amount = amount.parse().expect("Invalid amount");
        let target_chain: linera_sdk::linera_base_types::ChainId = target_chain.parse().expect("Invalid target chain");
        let target_owner: AccountOwner = target_owner.parse().expect("Invalid target owner");
        
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
        let owner: AccountOwner = owner.parse().expect("Invalid owner");
        let amount: Amount = amount.parse().expect("Invalid amount");
        let target_application: linera_sdk::linera_base_types::ApplicationId = target_application.parse().expect("Invalid application ID");
        let target_chain: linera_sdk::linera_base_types::ChainId = target_chain.parse().expect("Invalid target chain");
        
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
        let token_chain: linera_sdk::linera_base_types::ChainId = token_chain.parse().expect("Invalid token chain");
        let amount: Amount = amount.parse().expect("Invalid amount");
        let target_owner: AccountOwner = target_owner.parse().expect("Invalid target owner");
        
        let operation = Operation::SendTransferMessage {
            token_chain,
            amount,
            target_owner,
        };
        
        self.runtime.schedule_operation(&operation);
        "Cross-chain transfer message scheduled".to_string()
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
