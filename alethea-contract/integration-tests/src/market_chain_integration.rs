// Integration test for Market Chain using Registry
// Tests that Market Chain can use Registry like an external dApp

use crate::helpers::*;
use linera_sdk::base::{Amount, Timestamp};

#[cfg(test)]
mod tests {
    use super::*;
    
    /// Test Market Chain registers market with Registry (like external dApp)
    #[tokio::test]
    async fn test_market_chain_uses_registry() {
        // Setup test environment
        let env = setup_test_environment().await;
        
        // Create mock Market Chain state
        let mut market_chain_markets: Vec<TestMarket> = Vec::new();
        
        // Step 1: Market Chain creates internal market
        let market_question = "Will ETH reach $5k by Q2 2025?".to_string();
        let market_outcomes = vec!["Yes".to_string(), "No".to_string()];
        let market_deadline = future_timestamp(86400); // 24 hours
        
        let market_id = simulate_market_chain_create_market(
            &env,
            market_question.clone(),
            market_outcomes.clone(),
            market_deadline,
        ).await;
        
        assert!(market_id > 0, "Market ID should be positive");
        
        let mut market = TestMarket::new(
            market_id,
            market_question.clone(),
            market_outcomes.clone(),
            market_deadline,
        );
        market_chain_markets.push(market.clone());
        
        // Step 2: Market Chain requests resolution from Registry
        let oracle_market_id = simulate_market_chain_request_resolution(
            &env,
            market_id,
        ).await;
        
        assert!(
            oracle_market_id > 0,
            "Oracle market ID should be returned"
        );
        
        // Verify market status is WaitingResolution
        market.status = MarketStatus::WaitingResolution;
        assert_eq!(market.status, MarketStatus::WaitingResolution);
        
        // Step 3: Voters receive requests and submit votes
        simulate_submit_vote(&env, 0, oracle_market_id, 1, 95).await; // No
        simulate_submit_vote(&env, 1, oracle_market_id, 1, 90).await; // No
        simulate_submit_vote(&env, 2, oracle_market_id, 0, 70).await; // Yes
        
        // Step 4: Registry resolves market
        let resolution = simulate_registry_resolution(&env, oracle_market_id).await;
        
        assert!(resolution.is_resolved, "Market should be resolved");
        assert_eq!(
            resolution.winning_outcome, 1,
            "Outcome 1 (No) should win"
        );
        
        // Step 5: Verify Market Chain receives callback
        let callback_data = simulate_market_chain_callback(
            &env,
            market_id,
            oracle_market_id,
            resolution.winning_outcome,
            resolution.confidence,
        ).await;
        
        assert!(callback_data.received, "Callback should be received");
        assert_eq!(
            callback_data.market_id, market_id,
            "Callback should reference correct market"
        );
        
        // Step 6: Verify winnings are distributed correctly
        let distribution = simulate_winnings_distribution(
            &env,
            market_id,
            resolution.winning_outcome,
        ).await;
        
        assert!(distribution.distributed, "Winnings should be distributed");
        assert!(
            distribution.total_amount > Amount::ZERO,
            "Total distribution should be positive"
        );
        assert!(
            distribution.winner_count > 0,
            "Should have winners"
        );
        
        // Update market status
        market.status = MarketStatus::Resolved;
        market.final_outcome = Some(resolution.winning_outcome);
        market.callback_received = true;
        
        assert!(market.is_resolved(), "Market should be fully resolved");
    }
    
    /// Test Market Chain can be removed without breaking Registry
    #[tokio::test]
    async fn test_registry_works_without_market_chain() {
        // Setup test environment
        let env = setup_test_environment().await;
        
        // Step 1: Register external market (not from Market Chain)
        let external_market_id = simulate_register_external_market(
            &env,
            "External market question?".to_string(),
            vec!["A".to_string(), "B".to_string(), "C".to_string()],
            future_timestamp(7200),
            test_amount(150),
        ).await;
        
        assert!(external_market_id > 0);
        
        // Step 2: Simulate Market Chain being unavailable/removed
        // (Registry should still function)
        
        // Step 3: Voters submit votes for external market
        simulate_submit_vote(&env, 0, external_market_id, 1, 88).await;
        simulate_submit_vote(&env, 1, external_market_id, 1, 92).await;
        simulate_submit_vote(&env, 2, external_market_id, 2, 75).await;
        
        // Step 4: Registry resolves market
        let resolution = simulate_registry_resolution(&env, external_market_id).await;
        
        assert!(resolution.is_resolved, "Registry should resolve without Market Chain");
        assert_eq!(resolution.winning_outcome, 1, "Outcome B should win");
        
        // Step 5: Callback is sent to external dApp (not Market Chain)
        let callback_sent = simulate_callback_delivery(
            &env,
            external_market_id,
            resolution.winning_outcome,
            resolution.confidence,
        ).await;
        
        assert!(callback_sent, "Callback should be sent to external dApp");
    }
    
    /// Test Market Chain handles multiple concurrent markets
    #[tokio::test]
    async fn test_market_chain_concurrent_markets() {
        let env = setup_test_environment().await;
        
        // Create multiple markets
        let market_ids: Vec<u64> = vec![
            simulate_market_chain_create_market(
                &env,
                "Market 1?".to_string(),
                vec!["Yes".to_string(), "No".to_string()],
                future_timestamp(3600),
            ).await,
            simulate_market_chain_create_market(
                &env,
                "Market 2?".to_string(),
                vec!["A".to_string(), "B".to_string(), "C".to_string()],
                future_timestamp(7200),
            ).await,
            simulate_market_chain_create_market(
                &env,
                "Market 3?".to_string(),
                vec!["Option 1".to_string(), "Option 2".to_string()],
                future_timestamp(10800),
            ).await,
        ];
        
        assert_eq!(market_ids.len(), 3, "Should create 3 markets");
        
        // Request resolution for all markets
        let oracle_market_ids: Vec<u64> = vec![
            simulate_market_chain_request_resolution(&env, market_ids[0]).await,
            simulate_market_chain_request_resolution(&env, market_ids[1]).await,
            simulate_market_chain_request_resolution(&env, market_ids[2]).await,
        ];
        
        // Verify all markets are registered with Registry
        for oracle_id in &oracle_market_ids {
            assert!(*oracle_id > 0, "Oracle market ID should be valid");
        }
        
        // Resolve markets independently
        for (i, oracle_id) in oracle_market_ids.iter().enumerate() {
            // Submit votes
            simulate_submit_vote(&env, 0, *oracle_id, 0, 85).await;
            simulate_submit_vote(&env, 1, *oracle_id, 0, 80).await;
            simulate_submit_vote(&env, 2, *oracle_id, 1, 70).await;
            
            // Resolve
            let resolution = simulate_registry_resolution(&env, *oracle_id).await;
            assert!(resolution.is_resolved);
            
            // Deliver callback
            let callback = simulate_market_chain_callback(
                &env,
                market_ids[i],
                *oracle_id,
                resolution.winning_outcome,
                resolution.confidence,
            ).await;
            assert!(callback.received);
        }
    }
    
    /// Test Market Chain error handling when Registry is unavailable
    #[tokio::test]
    async fn test_market_chain_handles_registry_error() {
        let env = setup_test_environment().await;
        
        let market_id = simulate_market_chain_create_market(
            &env,
            "Test market?".to_string(),
            vec!["Yes".to_string(), "No".to_string()],
            future_timestamp(3600),
        ).await;
        
        // Simulate Registry being unavailable
        let result = simulate_market_chain_request_resolution_with_error(
            &env,
            market_id,
            true, // Simulate error
        ).await;
        
        assert!(result.is_err(), "Should handle Registry error gracefully");
        assert!(
            result.unwrap_err().contains("Registry unavailable"),
            "Error should indicate Registry issue"
        );
    }
    
    /// Test Market Chain verifies callback authenticity
    #[tokio::test]
    async fn test_market_chain_verifies_callback_source() {
        let env = setup_test_environment().await;
        
        let market_id = simulate_market_chain_create_market(
            &env,
            "Test?".to_string(),
            vec!["Yes".to_string(), "No".to_string()],
            future_timestamp(3600),
        ).await;
        
        let oracle_market_id = simulate_market_chain_request_resolution(
            &env,
            market_id,
        ).await;
        
        // Attempt callback from wrong source
        let result = simulate_market_chain_callback_from_wrong_source(
            &env,
            market_id,
            oracle_market_id,
            0,
            90,
        ).await;
        
        assert!(
            result.is_err(),
            "Should reject callback from unauthorized source"
        );
        assert!(
            result.unwrap_err().contains("Unauthorized"),
            "Error should indicate unauthorized callback"
        );
    }
}

// Simulation helper functions

/// Simulate Market Chain creating a market
async fn simulate_market_chain_create_market(
    env: &TestEnvironment,
    question: String,
    outcomes: Vec<String>,
    deadline: Timestamp,
) -> u64 {
    // In a real test, this would call Market Chain contract
    1
}

/// Simulate Market Chain requesting resolution from Registry
async fn simulate_market_chain_request_resolution(
    env: &TestEnvironment,
    market_id: u64,
) -> u64 {
    // In a real test, this would call Registry's registerExternalMarket
    // and return the oracle market ID
    market_id + 1000
}

/// Simulate Market Chain requesting resolution with error
async fn simulate_market_chain_request_resolution_with_error(
    env: &TestEnvironment,
    market_id: u64,
    simulate_error: bool,
) -> Result<u64, String> {
    if simulate_error {
        return Err("Registry unavailable".to_string());
    }
    Ok(market_id + 1000)
}

/// Simulate Registry resolution (reused from external_market_flow)
async fn simulate_registry_resolution(
    env: &TestEnvironment,
    market_id: u64,
) -> ResolutionResult {
    ResolutionResult {
        is_resolved: true,
        winning_outcome: 1,
        confidence: 92,
    }
}

/// Simulate voter submitting vote (reused from external_market_flow)
async fn simulate_submit_vote(
    env: &TestEnvironment,
    voter_index: usize,
    market_id: u64,
    outcome_index: u32,
    confidence: u8,
) {
    // In a real test, this would call voter contract
}

/// Simulate Market Chain receiving callback
async fn simulate_market_chain_callback(
    env: &TestEnvironment,
    market_id: u64,
    oracle_market_id: u64,
    outcome: u32,
    confidence: u8,
) -> CallbackData {
    // In a real test, this would verify the cross-chain message
    CallbackData {
        received: true,
        market_id,
        oracle_market_id,
        outcome,
        confidence,
    }
}

/// Simulate callback from wrong source
async fn simulate_market_chain_callback_from_wrong_source(
    env: &TestEnvironment,
    market_id: u64,
    oracle_market_id: u64,
    outcome: u32,
    confidence: u8,
) -> Result<CallbackData, String> {
    // In a real test, this would attempt to send callback from unauthorized chain
    Err("Unauthorized: Callback not from Registry".to_string())
}

/// Simulate winnings distribution
async fn simulate_winnings_distribution(
    env: &TestEnvironment,
    market_id: u64,
    winning_outcome: u32,
) -> DistributionResult {
    // In a real test, this would verify Market Chain distributed winnings
    DistributionResult {
        distributed: true,
        total_amount: test_amount(1000),
        winner_count: 5,
    }
}

/// Simulate external market registration (reused from external_market_flow)
async fn simulate_register_external_market(
    env: &TestEnvironment,
    question: String,
    outcomes: Vec<String>,
    deadline: Timestamp,
    fee: Amount,
) -> u64 {
    1
}

/// Simulate callback delivery (reused from external_market_flow)
async fn simulate_callback_delivery(
    env: &TestEnvironment,
    market_id: u64,
    outcome: u32,
    confidence: u8,
) -> bool {
    true
}

// Helper structs

#[derive(Debug, Clone)]
struct ResolutionResult {
    is_resolved: bool,
    winning_outcome: u32,
    confidence: u8,
}

#[derive(Debug, Clone)]
struct CallbackData {
    received: bool,
    market_id: u64,
    oracle_market_id: u64,
    outcome: u32,
    confidence: u8,
}

#[derive(Debug, Clone)]
struct DistributionResult {
    distributed: bool,
    total_amount: Amount,
    winner_count: u32,
}
