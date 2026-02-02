// Helper functions for integration tests
// Provides utilities for deploying contracts and setting up test environments

use linera_sdk::{
    base::{Amount, ApplicationId, ChainId, Timestamp},
    views::ViewStorageContext,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Test environment containing deployed contracts
#[derive(Clone)]
pub struct TestEnvironment {
    pub registry_chain_id: ChainId,
    pub registry_app_id: ApplicationId,
    pub market_chain_id: ChainId,
    pub market_app_id: ApplicationId,
    pub voter_chain_ids: Vec<ChainId>,
    pub voter_app_ids: Vec<ApplicationId>,
    pub external_dapp_chain_id: ChainId,
    pub external_dapp_app_id: ApplicationId,
}

/// Mock contract deployment result
#[derive(Debug, Clone)]
pub struct DeploymentResult {
    pub chain_id: ChainId,
    pub application_id: ApplicationId,
}

/// Helper to create test chain IDs
pub fn create_test_chain_id(index: u8) -> ChainId {
    let mut bytes = [0u8; 32];
    bytes[0] = index;
    ChainId::from(bytes)
}

/// Helper to create test application IDs
pub fn create_test_app_id(index: u8) -> ApplicationId {
    let mut bytes = [0u8; 32];
    bytes[0] = index;
    ApplicationId::from(bytes)
}

/// Deploy Oracle Registry contract
pub async fn deploy_registry() -> DeploymentResult {
    // In a real integration test, this would:
    // 1. Compile the oracle-registry contract
    // 2. Deploy to a test chain
    // 3. Initialize with default parameters
    
    DeploymentResult {
        chain_id: create_test_chain_id(1),
        application_id: create_test_app_id(1),
    }
}

/// Deploy Market Chain contract
pub async fn deploy_market_chain(registry_app_id: ApplicationId) -> DeploymentResult {
    // In a real integration test, this would:
    // 1. Compile the market-chain contract
    // 2. Deploy to a test chain
    // 3. Initialize with registry application ID
    
    DeploymentResult {
        chain_id: create_test_chain_id(2),
        application_id: create_test_app_id(2),
    }
}

/// Deploy multiple voter contracts
pub async fn deploy_voters(count: usize, registry_app_id: ApplicationId) -> Vec<DeploymentResult> {
    // In a real integration test, this would:
    // 1. Compile the voter-template contract
    // 2. Deploy multiple instances to different chains
    // 3. Register each voter with the registry
    
    let mut voters = Vec::new();
    for i in 0..count {
        voters.push(DeploymentResult {
            chain_id: create_test_chain_id(10 + i as u8),
            application_id: create_test_app_id(10 + i as u8),
        });
    }
    voters
}

/// Deploy external dApp contract
pub async fn deploy_external_dapp(registry_app_id: ApplicationId) -> DeploymentResult {
    // In a real integration test, this would:
    // 1. Compile the external-market-dapp contract
    // 2. Deploy to a test chain
    // 3. Initialize with registry application ID
    
    DeploymentResult {
        chain_id: create_test_chain_id(20),
        application_id: create_test_app_id(20),
    }
}

/// Set up complete test environment
pub async fn setup_test_environment() -> TestEnvironment {
    // Deploy Registry first
    let registry = deploy_registry().await;
    
    // Deploy Market Chain
    let market_chain = deploy_market_chain(registry.application_id).await;
    
    // Deploy 3 voters
    let voters = deploy_voters(3, registry.application_id).await;
    
    // Deploy external dApp
    let external_dapp = deploy_external_dapp(registry.application_id).await;
    
    TestEnvironment {
        registry_chain_id: registry.chain_id,
        registry_app_id: registry.application_id,
        market_chain_id: market_chain.chain_id,
        market_app_id: market_chain.application_id,
        voter_chain_ids: voters.iter().map(|v| v.chain_id).collect(),
        voter_app_ids: voters.iter().map(|v| v.application_id).collect(),
        external_dapp_chain_id: external_dapp.chain_id,
        external_dapp_app_id: external_dapp.application_id,
    }
}

/// Helper to create future timestamp
pub fn future_timestamp(seconds_from_now: u64) -> Timestamp {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_micros() as u64;
    Timestamp::from(now + (seconds_from_now * 1_000_000))
}

/// Helper to create test amount
pub fn test_amount(tokens: u128) -> Amount {
    Amount::from_tokens(tokens)
}

/// Mock GraphQL client for testing
pub struct MockGraphQLClient {
    pub endpoint: String,
    pub responses: HashMap<String, serde_json::Value>,
}

impl MockGraphQLClient {
    pub fn new(endpoint: String) -> Self {
        Self {
            endpoint,
            responses: HashMap::new(),
        }
    }
    
    pub fn add_response(&mut self, query: String, response: serde_json::Value) {
        self.responses.insert(query, response);
    }
    
    pub async fn execute(&self, query: &str) -> Result<serde_json::Value, String> {
        self.responses
            .get(query)
            .cloned()
            .ok_or_else(|| format!("No mock response for query: {}", query))
    }
}

/// Wait for callback to be received (with timeout)
pub async fn wait_for_callback(
    timeout_seconds: u64,
    check_fn: impl Fn() -> bool,
) -> Result<(), String> {
    let start = std::time::Instant::now();
    let timeout = std::time::Duration::from_secs(timeout_seconds);
    
    while start.elapsed() < timeout {
        if check_fn() {
            return Ok(());
        }
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }
    
    Err("Timeout waiting for callback".to_string())
}

/// Verify market status
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum MarketStatus {
    Active,
    Voting,
    Resolved,
    WaitingResolution,
}

/// Test market data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestMarket {
    pub id: u64,
    pub question: String,
    pub outcomes: Vec<String>,
    pub deadline: Timestamp,
    pub status: MarketStatus,
    pub final_outcome: Option<u32>,
    pub callback_received: bool,
}

impl TestMarket {
    pub fn new(id: u64, question: String, outcomes: Vec<String>, deadline: Timestamp) -> Self {
        Self {
            id,
            question,
            outcomes,
            deadline,
            status: MarketStatus::Active,
            final_outcome: None,
            callback_received: false,
        }
    }
    
    pub fn is_resolved(&self) -> bool {
        self.status == MarketStatus::Resolved && self.final_outcome.is_some()
    }
}

#[cfg(test)]
mod helper_tests {
    use super::*;
    
    #[test]
    fn test_create_chain_ids() {
        let chain1 = create_test_chain_id(1);
        let chain2 = create_test_chain_id(2);
        assert_ne!(chain1, chain2);
    }
    
    #[test]
    fn test_create_app_ids() {
        let app1 = create_test_app_id(1);
        let app2 = create_test_app_id(2);
        assert_ne!(app1, app2);
    }
    
    #[test]
    fn test_future_timestamp() {
        let future = future_timestamp(3600);
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_micros() as u64;
        assert!(future.micros() > now);
    }
    
    #[test]
    fn test_market_status() {
        let market = TestMarket::new(
            1,
            "Test?".to_string(),
            vec!["Yes".to_string(), "No".to_string()],
            future_timestamp(3600),
        );
        assert!(!market.is_resolved());
        assert_eq!(market.status, MarketStatus::Active);
    }
}
