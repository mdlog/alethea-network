// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Tests for admin authorization

#[cfg(test)]
mod tests {
    use crate::test_utils::test_helpers::*;
    use crate::state::{OracleRegistryV2, ProtocolParameters};
    use linera_sdk::{
        linera_base_types::{AccountOwner, Amount, ChainId},
        views::View,
    };
    use linera_views::context::MemoryContext;
    
    /// Helper to create a test account owner
    fn test_account(id: u8) -> AccountOwner {
        AccountOwner {
            chain_id: ChainId([0u8; 32].into()),
            owner: Some(Owner([id; 32].into())),
        }
    }
    
    #[tokio::test]
    async fn test_admin_is_set_on_initialization() {
        let context = create_memory_context();
        let mut state = OracleRegistryV2::load(context)
            .await
            .expect("Failed to load state");
        
        let admin = test_account(1);
        let params = ProtocolParameters::default();
        
        state.initialize(params, admin).await;
        
        // Verify admin is set correctly
        assert_eq!(state.get_admin().await, Some(admin));
        assert!(state.is_admin(&admin).await);
    }
    
    #[tokio::test]
    async fn test_non_admin_is_not_admin() {
        let context = create_memory_context();
        let mut state = OracleRegistryV2::load(context)
            .await
            .expect("Failed to load state");
        
        let admin = test_account(1);
        let non_admin = test_account(2);
        let params = ProtocolParameters::default();
        
        state.initialize(params, admin).await;
        
        // Verify non-admin is not recognized as admin
        assert!(!state.is_admin(&non_admin).await);
    }
    
    #[tokio::test]
    async fn test_admin_can_update_parameters() {
        let context = create_memory_context();
        let mut state = OracleRegistryV2::load(context)
            .await
            .expect("Failed to load state");
        
        let admin = test_account(1);
        let params = ProtocolParameters::default();
        
        state.initialize(params.clone(), admin).await;
        
        // Verify admin check passes
        assert!(state.is_admin(&admin).await);
        
        // Update parameters
        let new_params = ProtocolParameters {
            min_stake: Amount::from_tokens(200),
            min_votes_default: 5,
            ..params
        };
        
        state.parameters.set(new_params.clone());
        
        // Verify parameters were updated
        let updated_params = state.get_parameters().await;
        assert_eq!(updated_params.min_stake, Amount::from_tokens(200));
        assert_eq!(updated_params.min_votes_default, 5);
    }
    
    #[tokio::test]
    async fn test_admin_can_pause_protocol() {
        let context = create_memory_context();
        let mut state = OracleRegistryV2::load(context)
            .await
            .expect("Failed to load state");
        
        let admin = test_account(1);
        let params = ProtocolParameters::default();
        
        state.initialize(params, admin).await;
        
        // Verify protocol is not paused initially
        assert!(!state.is_paused().await);
        
        // Pause protocol
        state.is_paused.set(true);
        
        // Verify protocol is paused
        assert!(state.is_paused().await);
    }
    
    #[tokio::test]
    async fn test_admin_can_unpause_protocol() {
        let context = create_memory_context();
        let mut state = OracleRegistryV2::load(context)
            .await
            .expect("Failed to load state");
        
        let admin = test_account(1);
        let params = ProtocolParameters::default();
        
        state.initialize(params, admin).await;
        
        // Pause protocol first
        state.is_paused.set(true);
        assert!(state.is_paused().await);
        
        // Unpause protocol
        state.is_paused.set(false);
        
        // Verify protocol is unpaused
        assert!(!state.is_paused().await);
    }
    
    #[tokio::test]
    async fn test_multiple_admins_check() {
        let context = create_memory_context();
        let mut state = OracleRegistryV2::load(context)
            .await
            .expect("Failed to load state");
        
        let admin = test_account(1);
        let user1 = test_account(2);
        let user2 = test_account(3);
        let params = ProtocolParameters::default();
        
        state.initialize(params, admin).await;
        
        // Verify only admin is recognized
        assert!(state.is_admin(&admin).await);
        assert!(!state.is_admin(&user1).await);
        assert!(!state.is_admin(&user2).await);
    }
    
    #[tokio::test]
    async fn test_admin_authorization_pattern() {
        let context = create_memory_context();
        let mut state = OracleRegistryV2::load(context)
            .await
            .expect("Failed to load state");
        
        let admin = test_account(1);
        let non_admin = test_account(2);
        let params = ProtocolParameters::default();
        
        state.initialize(params, admin).await;
        
        // Simulate authorization check pattern used in contract
        let check_admin = |caller: &AccountOwner| async {
            if !state.is_admin(caller).await {
                return Err("Unauthorized: only admin can perform this operation");
            }
            Ok(())
        };
        
        // Admin should pass
        assert!(check_admin(&admin).await.is_some());
        
        // Non-admin should fail
        assert!(check_admin(&non_admin).await.is_err());
    }
}
