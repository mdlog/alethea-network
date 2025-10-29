// Copyright (c) Market Resolution Oracle Project
// SPDX-License-Identifier: MIT

use linera_sdk::{
    linera_base_types::{AccountOwner, Timestamp, Amount},
    views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext},
};
use serde::{Deserialize, Serialize};
use alethea_market_chain::{MarketStatus, MarketConfig};

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
    
    /// Oracle chain ID for resolution
    pub oracle_chain: RegisterView<Option<linera_sdk::linera_base_types::ChainId>>,
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
    /// Initialize state with initial markets
    #[allow(dead_code)]
    pub async fn initialize_markets(&mut self, markets: Vec<MarketConfig>) {
        for config in markets {
            let market_id = self.next_market_id.get();
            
            // Create market with default values
            // This would need actual creator owner from runtime
            let market = Market {
                id: *market_id,
                question: config.question,
                outcomes: config.outcomes.clone(),
                creator: None,
                total_liquidity: Amount::ZERO,
                outcome_pools: vec![Amount::ZERO; config.outcomes.len()],
                resolution_deadline: config.resolution_deadline,
                status: MarketStatus::Open,
                final_outcome: None,
            };
            
            self.markets.insert(&market_id, market).expect("Failed to insert market");
            self.next_market_id.set(market_id + 1);
        }
    }
    
    /// Get balance for a position
    pub async fn get_position(&self, market_id: u64, owner: &AccountOwner) -> Option<Position> {
        self.positions.get(&(market_id, *owner)).await.expect("Failed to read position")
    }
    
    /// Get market by ID
    pub async fn get_market(&self, market_id: u64) -> Option<Market> {
        self.markets.get(&market_id).await.expect("Failed to read market")
    }
}

