// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Tests for protocol pause functionality

#[cfg(test)]
mod tests {
    use crate::test_utils::test_helpers::*;
    use crate::state::{OracleRegistryV2, ProtocolParameters};
    use linera_sdk::{
        linera_base_types::{AccountOwner, Amount},
        views::View,
    };
    use linera_views::context::MemoryContext;
    
    /// Helper to create test context and state
    async fn setup_test_state() -> (OracleRegistryV2, AccountOwner) {
        let context = create_memory_context();
        let mut state = OracleRegistryV2::load(context)
            .await
            .expect("Failed to load state");
        
        // Create admin account
        let admin = AccountOwner {
            chain_id: linera_sdk::linera_base_types::ChainId([0u8; 32].into()),
            owner: Some(Owner([1u8; 32].into())),
        };
        
        // Initialize with default parameters
        let params = ProtocolParameters::default();
        state.initialize(params, admin).await;
        
        (state, admin)
    }
    
    #[tokio::test]
    async fn test_pause_protocol_initial_state() {
        let (state, _admin) = setup_test_state().await;
        
        // Protocol should not be paused initially
        assert!(!state.is_paused().await, "Protocol should not be paused initially");
    }
    
    #[tokio::test]
    async fn test_pause_protocol_success() {
        let (mut state, _admin) = setup_test_state().await;
        
        // Pause the protocol
        state.is_paused.set(true);
        
        // Verify protocol is paused
        assert!(state.is_paused().await, "Protocol should be paused");
    }
    
    #[tokio::test]
    async fn test_unpause_protocol_success() {
        let (mut state, _admin) = setup_test_state().await;
        
        // Pause the protocol first
        state.is_paused.set(true);
        assert!(state.is_paused().await, "Protocol should be paused");
        
        // Unpause the protocol
        state.is_paused.set(false);
        
        // Verify protocol is not paused
        assert!(!state.is_paused().await, "Protocol should not be paused");
    }
    
    #[tokio::test]
    async fn test_admin_verification() {
        let (state, admin) = setup_test_state().await;
        
        // Verify admin is correctly set
        assert_eq!(state.get_admin().await, admin, "Admin should match");
        assert!(state.is_admin(&admin).await, "Should recognize admin");
        
        // Create non-admin account
        let non_admin = AccountOwner {
            chain_id: linera_sdk::linera_base_types::ChainId([0u8; 32].into()),
            owner: Some(Owner([2u8; 32].into())),
        };
        
        // Verify non-admin is not recognized
        assert!(!state.is_admin(&non_admin).await, "Should not recognize non-admin");
    }
    
    #[tokio::test]
    async fn test_pause_idempotency() {
        let (mut state, _admin) = setup_test_state().await;
        
        // Pause multiple times
        state.is_paused.set(true);
        assert!(state.is_paused().await);
        
        state.is_paused.set(true);
        assert!(state.is_paused().await);
        
        // Should still be paused
        assert!(state.is_paused().await, "Protocol should remain paused");
    }
    
    #[tokio::test]
    async fn test_unpause_idempotency() {
        let (mut state, _admin) = setup_test_state().await;
        
        // Unpause multiple times (starting from unpaused state)
        state.is_paused.set(false);
        assert!(!state.is_paused().await);
        
        state.is_paused.set(false);
        assert!(!state.is_paused().await);
        
        // Should still be unpaused
        assert!(!state.is_paused().await, "Protocol should remain unpaused");
    }
    
    #[tokio::test]
    async fn test_pause_state_persistence() {
        let (mut state, _admin) = setup_test_state().await;
        
        // Test pause state changes
        assert!(!state.is_paused().await, "Should start unpaused");
        
        state.is_paused.set(true);
        assert!(state.is_paused().await, "Should be paused after setting");
        
        state.is_paused.set(false);
        assert!(!state.is_paused().await, "Should be unpaused after unsetting");
        
        state.is_paused.set(true);
        assert!(state.is_paused().await, "Should be paused again");
    }
}
