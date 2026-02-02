// Copyright (c) Market Resolution Oracle Project
// SPDX-License-Identifier: MIT

use linera_sdk::{
    linera_base_types::{AccountOwner, Timestamp, Amount, ApplicationId, ChainId},
    views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext},
};
use serde::{Deserialize, Serialize};
use alethea_market_chain::MarketStatus;

/// The application state for Market Chain
#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct MarketState {
    /// Counter for next market ID
    pub next_market_id: RegisterView<u64>,
    
    /// Map of market ID to market details
    pub markets: MapView<u64, Market>,
    
    /// Map of (market_id, owner) to position
    pub positions: MapView<(u64, AccountOwner), Position>,
    
    /// Registry chain ID for oracle resolution
    pub registry_chain_id: RegisterView<Option<ChainId>>,
    
    /// Registry application ID for oracle resolution
    pub registry_application_id: RegisterView<Option<ApplicationId>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, async_graphql::SimpleObject)]
pub struct Market {
    pub id: u64,
    pub question: String,
    pub outcomes: Vec<String>,
    pub creator: Option<AccountOwner>,
    pub total_liquidity: Amount,
    pub outcome_pools: Vec<Amount>,
    pub resolution_deadline: Timestamp,
    pub status: MarketStatus,
    pub final_outcome: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize, async_graphql::SimpleObject)]
pub struct Position {
    pub market_id: u64,
    pub owner: AccountOwner,
    pub outcome_index: usize,
    pub shares: u64,
    pub average_price: Amount,
}

impl MarketState {
    /// Get balance for a position - WASM safe
    pub async fn get_position(&self, market_id: u64, owner: &AccountOwner) -> Option<Position> {
        self.positions.get(&(market_id, *owner)).await.ok().flatten()
    }
    
    /// Get market by ID - WASM safe
    pub async fn get_market(&self, market_id: u64) -> Option<Market> {
        self.markets.get(&market_id).await.ok().flatten()
    }
    
    /// Get Registry application ID
    pub async fn get_registry_app(&self) -> Option<ApplicationId> {
        self.registry_application_id.get().clone()
    }
    
    /// Set Registry application ID
    pub async fn set_registry_app(&mut self, chain_id: ChainId, app_id: ApplicationId) {
        self.registry_chain_id.set(Some(chain_id));
        self.registry_application_id.set(Some(app_id));
    }
    
    /// Verify message is from Registry
    pub async fn verify_registry_message(&self, sender_chain: ChainId, sender_app: ApplicationId) -> bool {
        let expected_chain = self.registry_chain_id.get();
        let expected_app = self.registry_application_id.get();
        
        match (expected_chain, expected_app) {
            (Some(chain), Some(app)) => *chain == sender_chain && *app == sender_app,
            _ => false,
        }
    }
}

