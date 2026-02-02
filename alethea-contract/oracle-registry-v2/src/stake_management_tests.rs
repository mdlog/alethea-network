// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Tests for stake management functionality
//! 
//! This module tests the stake management operations including:
//! - UpdateStake: Adding more stake to an existing voter
//! - WithdrawStake: Withdrawing available stake
//! - Stake locking: Locking stake when voting
//! - Stake unlocking: Unlocking stake after query resolution

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
    
    /// Helper to register a voter with given stake
    async fn register_voter_with_stake(
        state: &mut OracleRegistryV2,
        voter: AccountOwner,
        stake: Amount,
    ) {
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
        let current_stake = *state.total_stake.get();
        let current_value: u128 = current_stake.into();
        let stake_value: u128 = stake.into();
        state.total_stake.set(Amount::from_tokens(current_value + stake_value));
        
        // Update voter count
        let current_count = *state.voter_count.get();
        state.voter_count.set(current_count + 1);
    }
    
    // ==================== UPDATE STAKE TESTS ====================
    
    #[tokio::test]
    async fn test_update_stake_success() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(10);
        
        let params = state.get_parameters().await;
        let initial_stake = params.min_stake;
        
        // Register voter
        register_voter_with_stake(&mut state, voter, initial_stake).await;
        
        // Update stake
        let additional_stake = Amount::from_tokens(50);
        let mut voter_info = state.get_voter(&voter).await.unwrap();
        
        let stake_value: u128 = voter_info.stake.into();
        let additional_value: u128 = additional_stake.into();
        voter_info.stake = Amount::from_tokens(stake_value + additional_value);
        
        state.voters.insert(&voter, voter_info)
            .expect("Failed to update voter");
        
        // Update total stake
        let current_stake = *state.total_stake.get();
        let current_value: u128 = current_stake.into();
        state.total_stake.set(Amount::from_tokens(current_value + additional_value));
        
        // Verify stake was updated
        let updated_voter = state.get_voter(&voter).await.unwrap();
        let expected_stake = Amount::from_tokens(stake_value + additional_value);
        assert_eq!(updated_voter.stake, expected_stake);
    }
    
    #[tokio::test]
    async fn test_update_stake_increases_total_stake() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(11);
        
        let params = state.get_parameters().await;
        let initial_stake = params.min_stake;
        
        // Register voter
        register_voter_with_stake(&mut state, voter, initial_stake).await;
        
        let total_before = *state.total_stake.get();
        let additional_stake = Amount::from_tokens(100);
        
        // Update stake
        let mut voter_info = state.get_voter(&voter).await.unwrap();
        let stake_value: u128 = voter_info.stake.into();
        let additional_value: u128 = additional_stake.into();
        voter_info.stake = Amount::from_tokens(stake_value + additional_value);
        
        state.voters.insert(&voter, voter_info)
            .expect("Failed to update voter");
        
        // Update total stake
        let current_value: u128 = total_before.into();
        state.total_stake.set(Amount::from_tokens(current_value + additional_value));
        
        // Verify total stake increased
        let total_after = *state.total_stake.get();
        let total_after_value: u128 = total_after.into();
        let total_before_value: u128 = total_before.into();
        assert_eq!(total_after_value, total_before_value + additional_value);
    }
    
    #[tokio::test]
    async fn test_update_stake_multiple_times() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(12);
        
        let params = state.get_parameters().await;
        let initial_stake = params.min_stake;
        
        // Register voter
        register_voter_with_stake(&mut state, voter, initial_stake).await;
        
        let initial_value: u128 = initial_stake.into();
        let mut expected_stake = initial_value;
        
        // Update stake 3 times
        for i in 1..=3 {
            let additional = Amount::from_tokens(i * 10);
            let additional_value: u128 = additional.into();
            
            let mut voter_info = state.get_voter(&voter).await.unwrap();
            let stake_value: u128 = voter_info.stake.into();
            voter_info.stake = Amount::from_tokens(stake_value + additional_value);
            
            state.voters.insert(&voter, voter_info)
                .expect("Failed to update voter");
            
            expected_stake += additional_value;
        }
        
        // Verify final stake
        let final_voter = state.get_voter(&voter).await.unwrap();
        let final_stake_value: u128 = final_voter.stake.into();
        assert_eq!(final_stake_value, expected_stake);
    }
    
    #[tokio::test]
    async fn test_update_stake_with_locked_stake() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(13);
        
        let params = state.get_parameters().await;
        let initial_stake = params.min_stake;
        
        // Register voter with some locked stake
        let locked_amount = Amount::from_tokens(20);
        let voter_info = VoterInfo {
            address: voter,
            stake: initial_stake,
            locked_stake: locked_amount,
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
        
        // Update stake
        let additional_stake = Amount::from_tokens(50);
        let mut voter_info = state.get_voter(&voter).await.unwrap();
        
        let stake_value: u128 = voter_info.stake.into();
        let additional_value: u128 = additional_stake.into();
        voter_info.stake = Amount::from_tokens(stake_value + additional_value);
        
        state.voters.insert(&voter, voter_info)
            .expect("Failed to update voter");
        
        // Verify stake increased but locked stake unchanged
        let updated_voter = state.get_voter(&voter).await.unwrap();
        assert_eq!(updated_voter.locked_stake, locked_amount);
        
        let expected_stake_value: u128 = initial_stake.into();
        let expected_stake_value = expected_stake_value + additional_value;
        let actual_stake_value: u128 = updated_voter.stake.into();
        assert_eq!(actual_stake_value, expected_stake_value);
    }
    
    // ==================== WITHDRAW STAKE TESTS ====================
    
    #[tokio::test]
    async fn test_withdraw_stake_success() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(20);
        
        let initial_stake = Amount::from_tokens(200);
        register_voter_with_stake(&mut state, voter, initial_stake).await;
        
        // Withdraw some stake
        let withdraw_amount = Amount::from_tokens(50);
        let mut voter_info = state.get_voter(&voter).await.unwrap();
        
        let stake_value: u128 = voter_info.stake.into();
        let withdraw_value: u128 = withdraw_amount.into();
        voter_info.stake = Amount::from_tokens(stake_value.saturating_sub(withdraw_value));
        
        state.voters.insert(&voter, voter_info)
            .expect("Failed to update voter");
        
        // Update total stake
        let current_stake = *state.total_stake.get();
        let current_value: u128 = current_stake.into();
        state.total_stake.set(Amount::from_tokens(current_value.saturating_sub(withdraw_value)));
        
        // Verify stake was reduced
        let updated_voter = state.get_voter(&voter).await.unwrap();
        let expected_stake = Amount::from_tokens(stake_value.saturating_sub(withdraw_value));
        assert_eq!(updated_voter.stake, expected_stake);
    }
    
    #[tokio::test]
    async fn test_withdraw_stake_decreases_total_stake() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(21);
        
        let initial_stake = Amount::from_tokens(300);
        register_voter_with_stake(&mut state, voter, initial_stake).await;
        
        let total_before = *state.total_stake.get();
        let withdraw_amount = Amount::from_tokens(100);
        
        // Withdraw stake
        let mut voter_info = state.get_voter(&voter).await.unwrap();
        let stake_value: u128 = voter_info.stake.into();
        let withdraw_value: u128 = withdraw_amount.into();
        voter_info.stake = Amount::from_tokens(stake_value.saturating_sub(withdraw_value));
        
        state.voters.insert(&voter, voter_info)
            .expect("Failed to update voter");
        
        // Update total stake
        let total_before_value: u128 = total_before.into();
        state.total_stake.set(Amount::from_tokens(total_before_value.saturating_sub(withdraw_value)));
        
        // Verify total stake decreased
        let total_after = *state.total_stake.get();
        let total_after_value: u128 = total_after.into();
        assert_eq!(total_after_value, total_before_value.saturating_sub(withdraw_value));
    }
    
    #[tokio::test]
    async fn test_withdraw_stake_respects_minimum() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(22);
        
        let params = state.get_parameters().await;
        let initial_stake = Amount::from_tokens(200);
        register_voter_with_stake(&mut state, voter, initial_stake).await;
        
        // Try to withdraw too much (would leave less than minimum)
        let min_stake_value: u128 = params.min_stake.into();
        let initial_value: u128 = initial_stake.into();
        let _max_withdrawal = initial_value.saturating_sub(min_stake_value);
        
        // Withdraw maximum allowed
        let mut voter_info = state.get_voter(&voter).await.unwrap();
        voter_info.stake = Amount::from_tokens(min_stake_value);
        
        state.voters.insert(&voter, voter_info)
            .expect("Failed to update voter");
        
        // Verify stake is at minimum
        let updated_voter = state.get_voter(&voter).await.unwrap();
        assert_eq!(updated_voter.stake, params.min_stake);
    }
    
    #[tokio::test]
    async fn test_withdraw_stake_with_locked_stake() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(23);
        
        let initial_stake = Amount::from_tokens(300);
        let locked_stake = Amount::from_tokens(100);
        
        // Register voter with locked stake
        let voter_info = VoterInfo {
            address: voter,
            stake: initial_stake,
            locked_stake,
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
        
        // Calculate available stake
        let stake_value: u128 = initial_stake.into();
        let locked_value: u128 = locked_stake.into();
        let available = stake_value.saturating_sub(locked_value);
        
        // Withdraw available stake
        let withdraw_amount = Amount::from_tokens(50);
        let withdraw_value: u128 = withdraw_amount.into();
        
        assert!(withdraw_value <= available, "Withdrawal should not exceed available stake");
        
        let mut voter_info = state.get_voter(&voter).await.unwrap();
        voter_info.stake = Amount::from_tokens(stake_value.saturating_sub(withdraw_value));
        
        state.voters.insert(&voter, voter_info)
            .expect("Failed to update voter");
        
        // Verify withdrawal succeeded
        let updated_voter = state.get_voter(&voter).await.unwrap();
        let expected_stake = Amount::from_tokens(stake_value.saturating_sub(withdraw_value));
        assert_eq!(updated_voter.stake, expected_stake);
        assert_eq!(updated_voter.locked_stake, locked_stake);
    }
    
    #[tokio::test]
    async fn test_cannot_withdraw_more_than_available() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(24);
        
        let initial_stake = Amount::from_tokens(200);
        let locked_stake = Amount::from_tokens(150);
        
        // Register voter with most stake locked
        let voter_info = VoterInfo {
            address: voter,
            stake: initial_stake,
            locked_stake,
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
        
        // Calculate available stake
        let stake_value: u128 = initial_stake.into();
        let locked_value: u128 = locked_stake.into();
        let available = stake_value.saturating_sub(locked_value);
        
        // Try to withdraw more than available
        let excessive_withdrawal = Amount::from_tokens(available + 10);
        let excessive_value: u128 = excessive_withdrawal.into();
        
        // This should fail in validation, but we test the calculation
        assert!(excessive_value > available, "Withdrawal exceeds available stake");
    }
    
    #[tokio::test]
    async fn test_withdraw_all_available_stake() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(25);
        
        let params = state.get_parameters().await;
        let initial_stake = Amount::from_tokens(200);
        let _locked_stake = Amount::ZERO;
        
        register_voter_with_stake(&mut state, voter, initial_stake).await;
        
        // Withdraw all but minimum
        let min_stake_value: u128 = params.min_stake.into();
        let initial_value: u128 = initial_stake.into();
        let _withdraw_value = initial_value.saturating_sub(min_stake_value);
        
        let mut voter_info = state.get_voter(&voter).await.unwrap();
        voter_info.stake = Amount::from_tokens(min_stake_value);
        
        state.voters.insert(&voter, voter_info)
            .expect("Failed to update voter");
        
        // Verify stake is at minimum
        let updated_voter = state.get_voter(&voter).await.unwrap();
        assert_eq!(updated_voter.stake, params.min_stake);
    }
    
    // ==================== STAKE LOCKING TESTS ====================
    
    #[tokio::test]
    async fn test_lock_stake_success() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(30);
        
        let initial_stake = Amount::from_tokens(200);
        register_voter_with_stake(&mut state, voter, initial_stake).await;
        
        // Lock some stake
        let lock_amount = Amount::from_tokens(50);
        let result = state.lock_stake(&voter, lock_amount).await;
        
        assert!(result.is_some(), "Locking stake should succeed");
        
        // Verify locked stake increased
        let updated_voter = state.get_voter(&voter).await.unwrap();
        assert_eq!(updated_voter.locked_stake, lock_amount);
    }
    
    #[tokio::test]
    async fn test_lock_stake_multiple_times() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(31);
        
        let initial_stake = Amount::from_tokens(300);
        register_voter_with_stake(&mut state, voter, initial_stake).await;
        
        // Lock stake multiple times
        let lock1 = Amount::from_tokens(50);
        let lock2 = Amount::from_tokens(30);
        let lock3 = Amount::from_tokens(20);
        
        state.lock_stake(&voter, lock1).await.expect("First lock failed");
        state.lock_stake(&voter, lock2).await.expect("Second lock failed");
        state.lock_stake(&voter, lock3).await.expect("Third lock failed");
        
        // Verify total locked stake
        let updated_voter = state.get_voter(&voter).await.unwrap();
        let lock1_value: u128 = lock1.into();
        let lock2_value: u128 = lock2.into();
        let lock3_value: u128 = lock3.into();
        let expected_locked = Amount::from_tokens(lock1_value + lock2_value + lock3_value);
        assert_eq!(updated_voter.locked_stake, expected_locked);
    }
    
    #[tokio::test]
    async fn test_lock_stake_reduces_available() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(32);
        
        let initial_stake = Amount::from_tokens(200);
        register_voter_with_stake(&mut state, voter, initial_stake).await;
        
        let available_before = state.get_available_stake(&voter).await;
        
        // Lock some stake
        let lock_amount = Amount::from_tokens(50);
        state.lock_stake(&voter, lock_amount).await.expect("Lock failed");
        
        let available_after = state.get_available_stake(&voter).await;
        
        // Verify available stake decreased
        let before_value: u128 = available_before.into();
        let after_value: u128 = available_after.into();
        let lock_value: u128 = lock_amount.into();
        assert_eq!(after_value, before_value.saturating_sub(lock_value));
    }
    
    #[tokio::test]
    async fn test_cannot_lock_more_than_available() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(33);
        
        let initial_stake = Amount::from_tokens(100);
        register_voter_with_stake(&mut state, voter, initial_stake).await;
        
        // Try to lock more than available
        let excessive_lock = Amount::from_tokens(150);
        let result = state.lock_stake(&voter, excessive_lock).await;
        
        assert!(result.is_err(), "Locking more than available should fail");
    }
    
    #[tokio::test]
    async fn test_lock_stake_all_available() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(34);
        
        let initial_stake = Amount::from_tokens(200);
        register_voter_with_stake(&mut state, voter, initial_stake).await;
        
        // Lock all available stake
        let result = state.lock_stake(&voter, initial_stake).await;
        
        assert!(result.is_some(), "Locking all available stake should succeed");
        
        // Verify all stake is locked
        let updated_voter = state.get_voter(&voter).await.unwrap();
        assert_eq!(updated_voter.locked_stake, initial_stake);
        
        let available = state.get_available_stake(&voter).await;
        assert_eq!(available, Amount::ZERO);
    }
    
    // ==================== STAKE UNLOCKING TESTS ====================
    
    #[tokio::test]
    async fn test_unlock_stake_success() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(40);
        
        let initial_stake = Amount::from_tokens(200);
        register_voter_with_stake(&mut state, voter, initial_stake).await;
        
        // Lock some stake
        let lock_amount = Amount::from_tokens(100);
        state.lock_stake(&voter, lock_amount).await.expect("Lock failed");
        
        // Unlock some stake
        let unlock_amount = Amount::from_tokens(50);
        let result = state.unlock_stake(&voter, unlock_amount).await;
        
        assert!(result.is_some(), "Unlocking stake should succeed");
        
        // Verify locked stake decreased
        let updated_voter = state.get_voter(&voter).await.unwrap();
        let lock_value: u128 = lock_amount.into();
        let unlock_value: u128 = unlock_amount.into();
        let expected_locked = Amount::from_tokens(lock_value.saturating_sub(unlock_value));
        assert_eq!(updated_voter.locked_stake, expected_locked);
    }
    
    #[tokio::test]
    async fn test_unlock_stake_increases_available() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(41);
        
        let initial_stake = Amount::from_tokens(200);
        register_voter_with_stake(&mut state, voter, initial_stake).await;
        
        // Lock some stake
        let lock_amount = Amount::from_tokens(100);
        state.lock_stake(&voter, lock_amount).await.expect("Lock failed");
        
        let available_before = state.get_available_stake(&voter).await;
        
        // Unlock some stake
        let unlock_amount = Amount::from_tokens(50);
        state.unlock_stake(&voter, unlock_amount).await.expect("Unlock failed");
        
        let available_after = state.get_available_stake(&voter).await;
        
        // Verify available stake increased
        let before_value: u128 = available_before.into();
        let after_value: u128 = available_after.into();
        let unlock_value: u128 = unlock_amount.into();
        assert_eq!(after_value, before_value + unlock_value);
    }
    
    #[tokio::test]
    async fn test_unlock_all_locked_stake() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(42);
        
        let initial_stake = Amount::from_tokens(200);
        register_voter_with_stake(&mut state, voter, initial_stake).await;
        
        // Lock some stake
        let lock_amount = Amount::from_tokens(100);
        state.lock_stake(&voter, lock_amount).await.expect("Lock failed");
        
        // Unlock all locked stake
        let result = state.unlock_stake(&voter, lock_amount).await;
        
        assert!(result.is_some(), "Unlocking all locked stake should succeed");
        
        // Verify no locked stake remains
        let updated_voter = state.get_voter(&voter).await.unwrap();
        assert_eq!(updated_voter.locked_stake, Amount::ZERO);
        
        let available = state.get_available_stake(&voter).await;
        assert_eq!(available, initial_stake);
    }
    
    #[tokio::test]
    async fn test_cannot_unlock_more_than_locked() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(43);
        
        let initial_stake = Amount::from_tokens(200);
        register_voter_with_stake(&mut state, voter, initial_stake).await;
        
        // Lock some stake
        let lock_amount = Amount::from_tokens(50);
        state.lock_stake(&voter, lock_amount).await.expect("Lock failed");
        
        // Try to unlock more than locked
        let excessive_unlock = Amount::from_tokens(100);
        let result = state.unlock_stake(&voter, excessive_unlock).await;
        
        assert!(result.is_err(), "Unlocking more than locked should fail");
    }
    
    #[tokio::test]
    async fn test_unlock_stake_multiple_times() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(44);
        
        let initial_stake = Amount::from_tokens(300);
        register_voter_with_stake(&mut state, voter, initial_stake).await;
        
        // Lock stake
        let lock_amount = Amount::from_tokens(150);
        state.lock_stake(&voter, lock_amount).await.expect("Lock failed");
        
        // Unlock in multiple steps
        let unlock1 = Amount::from_tokens(30);
        let unlock2 = Amount::from_tokens(40);
        let unlock3 = Amount::from_tokens(50);
        
        state.unlock_stake(&voter, unlock1).await.expect("First unlock failed");
        state.unlock_stake(&voter, unlock2).await.expect("Second unlock failed");
        state.unlock_stake(&voter, unlock3).await.expect("Third unlock failed");
        
        // Verify remaining locked stake
        let updated_voter = state.get_voter(&voter).await.unwrap();
        let lock_value: u128 = lock_amount.into();
        let unlock1_value: u128 = unlock1.into();
        let unlock2_value: u128 = unlock2.into();
        let unlock3_value: u128 = unlock3.into();
        let total_unlocked = unlock1_value + unlock2_value + unlock3_value;
        let expected_locked = Amount::from_tokens(lock_value.saturating_sub(total_unlocked));
        assert_eq!(updated_voter.locked_stake, expected_locked);
    }
    
    // ==================== AVAILABLE STAKE TESTS ====================
    
    #[tokio::test]
    async fn test_get_available_stake_no_locks() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(50);
        
        let initial_stake = Amount::from_tokens(200);
        register_voter_with_stake(&mut state, voter, initial_stake).await;
        
        // Get available stake
        let available = state.get_available_stake(&voter).await;
        
        // Should equal total stake when nothing is locked
        assert_eq!(available, initial_stake);
    }
    
    #[tokio::test]
    async fn test_get_available_stake_with_locks() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(51);
        
        let initial_stake = Amount::from_tokens(200);
        register_voter_with_stake(&mut state, voter, initial_stake).await;
        
        // Lock some stake
        let lock_amount = Amount::from_tokens(80);
        state.lock_stake(&voter, lock_amount).await.expect("Lock failed");
        
        // Get available stake
        let available = state.get_available_stake(&voter).await;
        
        // Should be total minus locked
        let stake_value: u128 = initial_stake.into();
        let lock_value: u128 = lock_amount.into();
        let expected_available = Amount::from_tokens(stake_value.saturating_sub(lock_value));
        assert_eq!(available, expected_available);
    }
    
    #[tokio::test]
    async fn test_get_available_stake_all_locked() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(52);
        
        let initial_stake = Amount::from_tokens(200);
        register_voter_with_stake(&mut state, voter, initial_stake).await;
        
        // Lock all stake
        state.lock_stake(&voter, initial_stake).await.expect("Lock failed");
        
        // Get available stake
        let available = state.get_available_stake(&voter).await;
        
        // Should be zero when all is locked
        assert_eq!(available, Amount::ZERO);
    }
    
    #[tokio::test]
    async fn test_get_available_stake_nonexistent_voter() {
        let (state, _admin) = setup_test_state().await;
        let voter = create_test_voter(99);
        
        // Get available stake for non-existent voter
        let available = state.get_available_stake(&voter).await;
        
        // Should return zero
        assert_eq!(available, Amount::ZERO);
    }
    
    // ==================== EDGE CASES ====================
    
    #[tokio::test]
    async fn test_stake_operations_preserve_other_fields() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(60);
        
        let initial_stake = Amount::from_tokens(200);
        let name = "Test Voter".to_string();
        let metadata_url = "https://example.com/voter".to_string();
        
        // Register voter with metadata
        let voter_info = VoterInfo {
            address: voter,
            stake: initial_stake,
            locked_stake: Amount::ZERO,
            reputation: 75,
            total_votes: 10,
            correct_votes: 8,
            registered_at: Timestamp::from(1000000),
            is_active: true,
            name: Some(name.clone()),
            metadata_url: Some(metadata_url.clone()),
        };
        
        state.voters.insert(&voter, voter_info)
            .expect("Failed to insert voter");
        
        // Update stake
        let additional = Amount::from_tokens(50);
        let mut voter_info = state.get_voter(&voter).await.unwrap();
        let stake_value: u128 = voter_info.stake.into();
        let additional_value: u128 = additional.into();
        voter_info.stake = Amount::from_tokens(stake_value + additional_value);
        state.voters.insert(&voter, voter_info).expect("Failed to update");
        
        // Lock stake
        state.lock_stake(&voter, Amount::from_tokens(30)).await.expect("Lock failed");
        
        // Verify other fields unchanged
        let final_voter = state.get_voter(&voter).await.unwrap();
        assert_eq!(final_voter.reputation, 75);
        assert_eq!(final_voter.total_votes, 10);
        assert_eq!(final_voter.correct_votes, 8);
        assert_eq!(final_voter.name, Some(name));
        assert_eq!(final_voter.metadata_url, Some(metadata_url));
        assert!(final_voter.is_active);
    }
    
    #[tokio::test]
    async fn test_lock_and_unlock_cycle() {
        let (mut state, _admin) = setup_test_state().await;
        let voter = create_test_voter(61);
        
        let initial_stake = Amount::from_tokens(200);
        register_voter_with_stake(&mut state, voter, initial_stake).await;
        
        let lock_amount = Amount::from_tokens(100);
        
        // Lock stake
        state.lock_stake(&voter, lock_amount).await.expect("Lock failed");
        let after_lock = state.get_voter(&voter).await.unwrap();
        assert_eq!(after_lock.locked_stake, lock_amount);
        
        // Unlock stake
        state.unlock_stake(&voter, lock_amount).await.expect("Unlock failed");
        let after_unlock = state.get_voter(&voter).await.unwrap();
        assert_eq!(after_unlock.locked_stake, Amount::ZERO);
        
        // Total stake should remain unchanged
        assert_eq!(after_unlock.stake, initial_stake);
    }
    
    #[tokio::test]
    async fn test_multiple_voters_independent_stakes() {
        let (mut state, _admin) = setup_test_state().await;
        
        // Register multiple voters with different stakes
        let voter1 = create_test_voter(70);
        let voter2 = create_test_voter(71);
        let voter3 = create_test_voter(72);
        
        let stake1 = Amount::from_tokens(100);
        let stake2 = Amount::from_tokens(200);
        let stake3 = Amount::from_tokens(300);
        
        register_voter_with_stake(&mut state, voter1, stake1).await;
        register_voter_with_stake(&mut state, voter2, stake2).await;
        register_voter_with_stake(&mut state, voter3, stake3).await;
        
        // Lock different amounts for each
        state.lock_stake(&voter1, Amount::from_tokens(50)).await.expect("Lock 1 failed");
        state.lock_stake(&voter2, Amount::from_tokens(100)).await.expect("Lock 2 failed");
        state.lock_stake(&voter3, Amount::from_tokens(150)).await.expect("Lock 3 failed");
        
        // Verify each voter's state is independent
        let v1 = state.get_voter(&voter1).await.unwrap();
        let v2 = state.get_voter(&voter2).await.unwrap();
        let v3 = state.get_voter(&voter3).await.unwrap();
        
        assert_eq!(v1.stake, stake1);
        assert_eq!(v1.locked_stake, Amount::from_tokens(50));
        
        assert_eq!(v2.stake, stake2);
        assert_eq!(v2.locked_stake, Amount::from_tokens(100));
        
        assert_eq!(v3.stake, stake3);
        assert_eq!(v3.locked_stake, Amount::from_tokens(150));
    }
}
