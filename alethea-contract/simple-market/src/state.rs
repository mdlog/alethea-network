// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

use linera_sdk::{
    linera_base_types::{ApplicationId, ChainId},
    views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext},
};

use crate::{Bet, Market};

/// Market application state
#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct MarketState {
    /// Next market ID counter
    pub next_market_id: RegisterView<u64>,
    
    /// All markets (market_id -> Market)
    pub markets: MapView<u64, Market>,
    
    /// All bets ((market_id, bettor) -> Bet)
    pub bets: MapView<(u64, ChainId), Bet>,
    
    /// Registry v2 application ID for cross-application calls
    pub registry_app_id: RegisterView<Option<ApplicationId>>,
    
    /// Registry chain ID for cross-chain messaging
    pub registry_chain_id: RegisterView<Option<ChainId>>,
    
    /// Whether to use call_application() for local Registry Instance
    /// If true, uses call_application() (Hub-and-Spoke pattern)
    /// If false, uses cross-chain messaging (legacy mode)
    pub use_local_instance: RegisterView<bool>,
    
    /// Statistics
    pub total_markets_created: RegisterView<u64>,
    pub total_bets_placed: RegisterView<u64>,
    pub total_volume: RegisterView<u64>,
}
