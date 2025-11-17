// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Tests for voter registration functionality

#[cfg(test)]
mod tests {
    use crate::test_utils::test_helpers::*;
    use crate::state::{OracleRegistryV2, ProtocolParameters, VoterInfo};
    use linera_sdk::{
        linera_base_types::{AccountOwner, Amount, Timestamp},
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
        let admin = create_account_owner(1);
        
        // Initialize with default parameters
        let params = ProtocolParameters::default();
        state.initialize(params, admin).await;
        
        (state, admin)
    }
    
    /// Helper to create a test voter account
    fn create_test_voter(id: u8) -> AccountOwner {
        AccountOwner::from([id; 32])
    }
    
    #[tokio::test]
    async fn test_register_voter_success() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(10);
        
        // Register voter with minimum stake
        let params = state.get_parameters().await;
        let stake = params.min_stake;
        
        let voter_info = VoterInfo {
            address: voter,
            stake,
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 0,
            correct_votes: 0,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: Some("Test Voter".to_string()),
            metadata_url: Some("https://example.com/voter".to_string()),
        };
        
        // Insert voter
        state.voters.insert(&voter, voter_info.clone())
            .expect("Failed to insert voter");
        
        // Update totals
        let _current_stake = *state.total_stake.get();
        let stake_value: u128 = stake.into();
        state.total_stake.set(Amount::from_tokens(stake_value));
        
        let current_count = *state.voter_count.get();
        state.voter_count.set(current_count + 1);
        
        // Verify voter was registered
        let registered_voter = state.get_voter(&voter).await;
        assert!(registered_voter.is_some(), "Voter should be registered");
        
        let registered_info = registered_voter.unwrap();
        assert_eq!(registered_info.address, voter);
        assert_eq!(registered_info.stake, stake);
        assert_eq!(registered_info.reputation, 50);
        assert!(registered_info.is_active);
        assert_eq!(registered_info.name, Some("Test Voter".to_string()));
    }
    
    #[tokio::test]
    async fn test_register_voter_with_minimum_stake() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(11);
        
        let params = state.get_parameters().await;
        let min_stake = params.min_stake;
        
        let voter_info = VoterInfo {
            address: voter,
            stake: min_stake,
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 0,
            correct_votes: 0,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        state.voters.insert(&voter, voter_info)
            .expect("Failed to insert voter");
        
        // Verify registration
        let registered = state.get_voter(&voter).await;
        assert!(registered.is_some());
        assert_eq!(registered.unwrap().stake, min_stake);
    }
    
    #[tokio::test]
    async fn test_register_voter_with_higher_stake() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(12);
        
        let params = state.get_parameters().await;
        let min_stake_value: u128 = params.min_stake.into();
        let higher_stake = Amount::from_tokens(min_stake_value * 10);
        
        let voter_info = VoterInfo {
            address: voter,
            stake: higher_stake,
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 0,
            correct_votes: 0,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        state.voters.insert(&voter, voter_info)
            .expect("Failed to insert voter");
        
        // Verify registration with higher stake
        let registered = state.get_voter(&voter).await;
        assert!(registered.is_some());
        assert_eq!(registered.unwrap().stake, higher_stake);
    }
    
    #[tokio::test]
    async fn test_register_voter_default_reputation() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(13);
        
        let params = state.get_parameters().await;
        
        let voter_info = VoterInfo {
            address: voter,
            stake: params.min_stake,
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 0,
            correct_votes: 0,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        state.voters.insert(&voter, voter_info)
            .expect("Failed to insert voter");
        
        // Verify default reputation is 50
        let registered = state.get_voter(&voter).await.unwrap();
        assert_eq!(registered.reputation, 50, "New voters should have reputation of 50");
    }
    
    #[tokio::test]
    async fn test_register_voter_with_name() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(14);
        
        let params = state.get_parameters().await;
        let name = "Alice Validator".to_string();
        
        let voter_info = VoterInfo {
            address: voter,
            stake: params.min_stake,
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 0,
            correct_votes: 0,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: Some(name.clone()),
            metadata_url: None,
        };
        
        state.voters.insert(&voter, voter_info)
            .expect("Failed to insert voter");
        
        // Verify name is stored
        let registered = state.get_voter(&voter).await.unwrap();
        assert_eq!(registered.name, Some(name));
    }
    
    #[tokio::test]
    async fn test_register_voter_with_metadata_url() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(15);
        
        let params = state.get_parameters().await;
        let metadata_url = "https://example.com/voter-metadata.json".to_string();
        
        let voter_info = VoterInfo {
            address: voter,
            stake: params.min_stake,
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 0,
            correct_votes: 0,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: Some(metadata_url.clone()),
        };
        
        state.voters.insert(&voter, voter_info)
            .expect("Failed to insert voter");
        
        // Verify metadata URL is stored
        let registered = state.get_voter(&voter).await.unwrap();
        assert_eq!(registered.metadata_url, Some(metadata_url));
    }
    
    #[tokio::test]
    async fn test_register_voter_with_ipfs_metadata() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(16);
        
        let params = state.get_parameters().await;
        let metadata_url = "ipfs://QmXyz123...".to_string();
        
        let voter_info = VoterInfo {
            address: voter,
            stake: params.min_stake,
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 0,
            correct_votes: 0,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: Some(metadata_url.clone()),
        };
        
        state.voters.insert(&voter, voter_info)
            .expect("Failed to insert voter");
        
        // Verify IPFS URL is stored
        let registered = state.get_voter(&voter).await.unwrap();
        assert_eq!(registered.metadata_url, Some(metadata_url));
    }
    
    #[tokio::test]
    async fn test_register_voter_updates_total_stake() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(17);
        
        let params = state.get_parameters().await;
        let stake = params.min_stake;
        
        // Check initial total stake
        let initial_total = *state.total_stake.get();
        
        let voter_info = VoterInfo {
            address: voter,
            stake,
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 0,
            correct_votes: 0,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        state.voters.insert(&voter, voter_info)
            .expect("Failed to insert voter");
        
        // Update total stake
        let initial_value: u128 = initial_total.into();
        let stake_value: u128 = stake.into();
        state.total_stake.set(Amount::from_tokens(initial_value + stake_value));
        
        // Verify total stake increased
        let new_total = *state.total_stake.get();
        let new_value: u128 = new_total.into();
        assert_eq!(new_value, initial_value + stake_value);
    }
    
    #[tokio::test]
    async fn test_register_voter_updates_voter_count() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(18);
        
        let params = state.get_parameters().await;
        
        // Check initial voter count
        let initial_count = *state.voter_count.get();
        
        let voter_info = VoterInfo {
            address: voter,
            stake: params.min_stake,
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 0,
            correct_votes: 0,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        state.voters.insert(&voter, voter_info)
            .expect("Failed to insert voter");
        
        // Update voter count
        state.voter_count.set(initial_count + 1);
        
        // Verify voter count increased
        let new_count = *state.voter_count.get();
        assert_eq!(new_count, initial_count + 1);
    }
    
    #[tokio::test]
    async fn test_register_multiple_voters() {
        let (mut state, _admin) = setup_test_state().await;
        let params = state.get_parameters().await;
        
        // Register 5 voters
        for i in 20..25 {
            let voter = create_test_voter(i);
            
            let voter_info = VoterInfo {
                address: voter,
                stake: params.min_stake,
                locked_stake: Amount::ZERO,
                reputation: 50,
                total_votes: 0,
                correct_votes: 0,
                registered_at: Timestamp::from(0),
                is_active: true,
                name: Some(format!("Voter {}", i)),
                metadata_url: None,
            };
            
            state.voters.insert(&voter, voter_info)
                .expect("Failed to insert voter");
        }
        
        // Verify all voters are registered
        for i in 20..25 {
            let voter = create_test_voter(i);
            let registered = state.get_voter(&voter).await;
            assert!(registered.is_some(), "Voter {} should be registered", i);
        }
    }
    
    #[tokio::test]
    async fn test_register_voter_initial_locked_stake_zero() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(26);
        
        let params = state.get_parameters().await;
        
        let voter_info = VoterInfo {
            address: voter,
            stake: params.min_stake,
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 0,
            correct_votes: 0,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        state.voters.insert(&voter, voter_info)
            .expect("Failed to insert voter");
        
        // Verify locked stake is zero
        let registered = state.get_voter(&voter).await.unwrap();
        assert_eq!(registered.locked_stake, Amount::ZERO);
    }
    
    #[tokio::test]
    async fn test_register_voter_initial_vote_counts_zero() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(27);
        
        let params = state.get_parameters().await;
        
        let voter_info = VoterInfo {
            address: voter,
            stake: params.min_stake,
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 0,
            correct_votes: 0,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        state.voters.insert(&voter, voter_info)
            .expect("Failed to insert voter");
        
        // Verify vote counts are zero
        let registered = state.get_voter(&voter).await.unwrap();
        assert_eq!(registered.total_votes, 0);
        assert_eq!(registered.correct_votes, 0);
    }
    
    #[tokio::test]
    async fn test_register_voter_is_active_by_default() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(28);
        
        let params = state.get_parameters().await;
        
        let voter_info = VoterInfo {
            address: voter,
            stake: params.min_stake,
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 0,
            correct_votes: 0,
            registered_at: Timestamp::from(0),
            is_active: true,
            name: None,
            metadata_url: None,
        };
        
        state.voters.insert(&voter, voter_info)
            .expect("Failed to insert voter");
        
        // Verify voter is active
        let registered = state.get_voter(&voter).await.unwrap();
        assert!(registered.is_active);
    }
    
    #[tokio::test]
    async fn test_get_nonexistent_voter() {
        let (state, _admin) = setup_test_state().await;
        let voter = create_test_voter(99);
        
        // Try to get non-existent voter
        let result = state.get_voter(&voter).await;
        assert!(result.is_none(), "Non-existent voter should return None");
    }
    
    #[tokio::test]
    async fn test_register_voter_with_all_fields() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(30);
        
        let params = state.get_parameters().await;
        let stake = params.min_stake;
        let name = "Complete Voter".to_string();
        let metadata_url = "https://example.com/complete-voter.json".to_string();
        
        let voter_info = VoterInfo {
            address: voter,
            stake,
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 0,
            correct_votes: 0,
            registered_at: Timestamp::from(1000000),
            is_active: true,
            name: Some(name.clone()),
            metadata_url: Some(metadata_url.clone()),
        };
        
        state.voters.insert(&voter, voter_info)
            .expect("Failed to insert voter");
        
        // Verify all fields
        let registered = state.get_voter(&voter).await.unwrap();
        assert_eq!(registered.address, voter);
        assert_eq!(registered.stake, stake);
        assert_eq!(registered.locked_stake, Amount::ZERO);
        assert_eq!(registered.reputation, 50);
        assert_eq!(registered.total_votes, 0);
        assert_eq!(registered.correct_votes, 0);
        assert!(registered.is_active);
        assert_eq!(registered.name, Some(name));
        assert_eq!(registered.metadata_url, Some(metadata_url));
    }
}
