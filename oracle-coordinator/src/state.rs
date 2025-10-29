// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

use linera_sdk::{
    linera_base_types::{AccountOwner, ChainId, Amount, Timestamp},
    views::{linera_views, MapView, RegisterView, RootView, View, ViewStorageContext},
};
use serde::{Deserialize, Serialize};

use crate::types::{VoterInfo, Market, MarketStatus, VoteCommitment, VoteReveal};

/// The application state for Oracle Coordinator
#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct OracleCoordinatorState {
    pub next_market_id: RegisterView<u64>,
    pub total_markets_created: RegisterView<u64>,
    pub total_markets_resolved: RegisterView<u64>,
    pub voters: MapView<ChainId, VoterInfo>,
    pub markets: MapView<u64, Market>,
    pub commitments: MapView<(u64, ChainId), VoteCommitment>,
    pub reveals: MapView<(u64, ChainId), VoteReveal>,
}

impl OracleCoordinatorState {
    pub async fn initialize(&mut self) {
        self.next_market_id.set(0);
        self.total_markets_created.set(0);
        self.total_markets_resolved.set(0);
    }
    
    pub async fn next_market_id(&mut self) -> u64 {
        let id = *self.next_market_id.get();
        self.next_market_id.set(id + 1);
        id
    }
    
    pub async fn add_market(&mut self, market_id: u64, market: Market) {
        let _ = self.markets.insert(&market_id, market);
        let current = *self.total_markets_created.get();
        self.total_markets_created.set(current.saturating_add(1));
    }
    
    pub async fn get_market(&self, market_id: u64) -> Option<Market> {
        self.markets.get(&market_id).await.ok().flatten()
    }
    
    pub async fn update_market(&mut self, market_id: u64, market: Market) {
        let _ = self.markets.insert(&market_id, market);
    }
    
    pub async fn register_voter(&mut self, chain_id: ChainId, info: VoterInfo) {
        let _ = self.voters.insert(&chain_id, info);
    }
    
    pub async fn is_voter_registered(&self, chain_id: &ChainId) -> bool {
        self.voters.get(chain_id).await.ok().flatten().is_some()
    }
    
    pub async fn get_voter_info(&self, chain_id: ChainId) -> Option<VoterInfo> {
        self.voters.get(&chain_id).await.ok().flatten()
    }
    
    pub async fn get_all_voters(&self) -> Vec<ChainId> {
        self.voters.indices().await.unwrap_or_default()
    }
    
    pub async fn add_commitment(&mut self, market_id: u64, voter: ChainId, commitment: VoteCommitment) {
        let _ = self.commitments.insert(&(market_id, voter), commitment);
    }
    
    pub async fn get_commitment(&self, market_id: u64, voter: ChainId) -> Option<VoteCommitment> {
        self.commitments.get(&(market_id, voter)).await.ok().flatten()
    }
    
    pub async fn add_reveal(&mut self, market_id: u64, voter: ChainId, reveal: VoteReveal) {
        let _ = self.reveals.insert(&(market_id, voter), reveal);
    }
    
    pub async fn get_all_reveals(&self, _market_id: u64) -> Vec<VoteReveal> {
        Vec::new()
    }
    
    pub async fn get_active_markets(&self) -> Vec<Market> {
        Vec::new()
    }
    
    pub async fn lock_voter_stake(&mut self, voter: ChainId, amount: Amount) {
        if let Some(mut info) = self.get_voter_info(voter).await {
            info.locked_stake = info.locked_stake.saturating_add(amount);
            let _ = self.voters.insert(&voter, info);
        }
    }
    
    pub async fn unlock_voter_stake(&mut self, voter: ChainId, amount: Amount) {
        if let Some(mut info) = self.get_voter_info(voter).await {
            info.locked_stake = info.locked_stake.saturating_sub(amount);
            let _ = self.voters.insert(&voter, info);
        }
    }
    
    pub async fn slash_voter(&mut self, voter: ChainId, amount: Amount) {
        if let Some(mut info) = self.get_voter_info(voter).await {
            info.total_stake = info.total_stake.saturating_sub(amount);
            info.locked_stake = info.locked_stake.saturating_sub(amount);
            let _ = self.voters.insert(&voter, info);
        }
    }
    
    pub async fn update_voter_reputation_correct(&mut self, voter: ChainId) {
        if let Some(mut info) = self.get_voter_info(voter).await {
            info.total_votes = info.total_votes.saturating_add(1);
            info.total_correct = info.total_correct.saturating_add(1);
            info.correct_streak = info.correct_streak.saturating_add(1);
            info.reputation_score = info.reputation_score.saturating_add((10 + (info.correct_streak * 2)) as u64);
            info.last_active = Timestamp::from(0);
            let _ = self.voters.insert(&voter, info);
        }
    }
    
    pub async fn update_voter_reputation_incorrect(&mut self, voter: ChainId) {
        if let Some(mut info) = self.get_voter_info(voter).await {
            info.total_votes = info.total_votes.saturating_add(1);
            info.total_incorrect = info.total_incorrect.saturating_add(1);
            info.correct_streak = 0;
            info.reputation_score = info.reputation_score.saturating_sub(5);
            info.last_active = Timestamp::from(0);
            let _ = self.voters.insert(&voter, info);
        }
    }
}
