// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

#![cfg_attr(target_arch = "wasm32", no_main)]

use async_graphql::{EmptySubscription, Object, Request, Response, Schema, SimpleObject};
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{ChainId, WithServiceAbi},
    views::View,
    Service, ServiceRuntime,
};
use std::sync::Arc;

use simple_market::{
    state::MarketState,
    Bet, Market, Operation, SimpleMarketAbi
};

pub struct SimpleMarketService {
    state: Arc<MarketState>,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(SimpleMarketService);

impl WithServiceAbi for SimpleMarketService {
    type Abi = SimpleMarketAbi;
}

impl Service for SimpleMarketService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = MarketState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        
        SimpleMarketService {
            state: Arc::new(state),
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            QueryRoot { 
                runtime: self.runtime.clone(),
                storage_context: self.runtime.root_view_storage_context(),
            },
            Operation::mutation_root(self.runtime.clone()),
            EmptySubscription,
        )
        .finish();
        
        schema.execute(request).await
    }
}

/// GraphQL representation of a Market
#[derive(SimpleObject, Clone)]
pub struct MarketQL {
    pub id: String,
    pub question: String,
    pub creator: String,
    pub created_at: String,
    pub end_time: String,
    pub status: String,
    pub yes_pool: String,
    pub no_pool: String,
    pub total_pool: String,
    pub query_id: Option<String>,
    pub winning_outcome: Option<String>,
    pub resolved_at: Option<String>,
}

impl MarketQL {
    fn from_market(market: Market) -> Self {
        Self {
            id: market.id.to_string(),
            question: market.question,
            creator: format!("{:?}", market.creator),
            created_at: format!("{:?}", market.created_at),
            end_time: format!("{:?}", market.end_time),
            status: format!("{:?}", market.status),
            yes_pool: market.yes_pool.to_string(),
            no_pool: market.no_pool.to_string(),
            total_pool: market.total_pool.to_string(),
            query_id: market.query_id.map(|id| id.to_string()),
            winning_outcome: market.winning_outcome,
            resolved_at: market.resolved_at.map(|ts| format!("{:?}", ts)),
        }
    }
}

/// GraphQL representation of a Bet
#[derive(SimpleObject, Clone)]
pub struct BetQL {
    pub bettor: String,
    pub market_id: String,
    pub outcome: String,
    pub stake: String,
    pub placed_at: String,
    pub claim_status: String,
    pub payout_amount: Option<String>,
}

impl BetQL {
    fn from_bet(bet: Bet) -> Self {
        Self {
            bettor: format!("{:?}", bet.bettor),
            market_id: bet.market_id.to_string(),
            outcome: bet.outcome,
            stake: bet.stake.to_string(),
            placed_at: format!("{:?}", bet.placed_at),
            claim_status: format!("{:?}", bet.claim_status),
            payout_amount: bet.payout_amount.map(|a| a.to_string()),
        }
    }
}

struct QueryRoot {
    runtime: Arc<ServiceRuntime<SimpleMarketService>>,
    storage_context: linera_sdk::views::ViewStorageContext,
}

#[Object]
impl QueryRoot {
    /// Get a specific market by ID (with auto-status update if expired)
    async fn market(&self, id: String) -> Result<Option<MarketQL>, String> {
        let mut state = MarketState::load(self.storage_context.clone()).await
            .map_err(|e| format!("Failed to load state: {}", e))?;
            
        let market_id = id.parse::<u64>()
            .map_err(|_| "Invalid market ID".to_string())?;
        
        let market = state.markets.get(&market_id).await
            .map_err(|e| format!("Failed to get market: {}", e))?;
        
        if let Some(mut market) = market {
            // Auto-update status if market expired
            let now = self.runtime.system_time();
            if now >= market.end_time && market.status == simple_market::MarketStatus::Open {
                market.status = simple_market::MarketStatus::Voting;
                // Note: Service is read-only, cannot modify state
                // Status updates should be done in contract
            }
            
            Ok(Some(MarketQL::from_market(market)))
        } else {
            Ok(None)
        }
    }
    
    /// Get all markets (with auto-status update for expired markets)
    async fn markets(&self) -> Result<Vec<MarketQL>, String> {
        let mut state = MarketState::load(self.storage_context.clone()).await
            .map_err(|e| format!("Failed to load state: {}", e))?;
            
        let mut markets = Vec::new();
        let now = self.runtime.system_time();
        
        let indices = state.markets.indices().await
            .map_err(|e| format!("Failed to get market indices: {}", e))?;
        
        for market_id in indices {
            if let Some(mut market) = state.markets.get(&market_id).await
                .map_err(|e| format!("Failed to get market: {}", e))? {
                
                // Auto-update status if market expired
                if now >= market.end_time && market.status == simple_market::MarketStatus::Open {
                    market.status = simple_market::MarketStatus::Voting;
                    // Note: Service is read-only, cannot modify state
                    // Status updates should be done in contract
                }
                
                markets.push(MarketQL::from_market(market));
            }
        }
        
        // Note: Service doesn't need to save - state is read-only in service
        
        Ok(markets)
    }
    
    /// Get all bets for a specific user
    async fn my_bets(&self, address: String) -> Result<Vec<BetQL>, String> {
        let state = MarketState::load(self.storage_context.clone()).await
            .map_err(|e| format!("Failed to load state: {}", e))?;
            
        let chain_id = address.parse::<ChainId>()
            .map_err(|_| "Invalid chain ID".to_string())?;
        
        let mut bets = Vec::new();
        
        // Get all bet keys
        let indices = state.bets.indices().await
            .map_err(|e| format!("Failed to get bet indices: {}", e))?;
        
        for (market_id, bettor) in indices {
            if bettor == chain_id {
                if let Some(bet) = state.bets.get(&(market_id, bettor)).await
                    .map_err(|e| format!("Failed to get bet: {}", e))? {
                    bets.push(BetQL::from_bet(bet));
                }
            }
        }
        
        Ok(bets)
    }
    
    /// Get statistics
    async fn statistics(&self) -> Result<Statistics, String> {
        let state = MarketState::load(self.storage_context.clone()).await
            .map_err(|e| format!("Failed to load state: {}", e))?;
            
        Ok(Statistics {
            total_markets: (*state.total_markets_created.get()).to_string(),
            total_bets: (*state.total_bets_placed.get()).to_string(),
            total_volume: (*state.total_volume.get()).to_string(),
        })
    }
}

#[derive(SimpleObject)]
struct Statistics {
    total_markets: String,
    total_bets: String,
    total_volume: String,
}

// MutationRoot is now auto-generated by GraphQLMutationRoot derive macro
// Operations are executed directly through the Linera runtime
