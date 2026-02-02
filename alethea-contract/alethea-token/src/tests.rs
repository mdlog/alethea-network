// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

#[cfg(test)]
mod tests {
    use linera_sdk::linera_base_types::{AccountOwner, Amount, ApplicationId, ChainId};
    use crate::{Operation, Parameters, InitialState};

    // Helper to create test parameters
    fn test_parameters() -> Parameters {
        Parameters {
            name: "Alethea Token".to_string(),
            symbol: "ALTH".to_string(),
            decimals: 18,
            registry_app_id: None,
            min_stake_amount: Amount::from_tokens(100),
            max_stake_amount: Amount::from_tokens(10_000_000),
            max_stake_per_user: Amount::from_tokens(1_000_000),
        }
    }

    // Helper to create test initial state
    fn test_initial_state() -> InitialState {
        let mut accounts = std::collections::BTreeMap::new();
        let admin = AccountOwner::from([1u8; 32]);
        accounts.insert(admin, Amount::from_tokens(1_000_000_000));
        
        InitialState {
            accounts,
            admin: Some(admin),
        }
    }

    #[test]
    fn test_parameters_creation() {
        let params = test_parameters();
        assert_eq!(params.name, "Alethea Token");
        assert_eq!(params.symbol, "ALTH");
        assert_eq!(params.decimals, 18);
        assert_eq!(params.min_stake_amount, Amount::from_tokens(100));
        assert_eq!(params.max_stake_amount, Amount::from_tokens(10_000_000));
        assert_eq!(params.max_stake_per_user, Amount::from_tokens(1_000_000));
    }

    #[test]
    fn test_initial_state_creation() {
        let state = test_initial_state();
        assert!(state.admin.is_some());
        assert_eq!(state.accounts.len(), 1);
    }

    #[test]
    fn test_transfer_operation_creation() {
        let owner = AccountOwner::from([1u8; 32]);
        let target_owner = AccountOwner::from([2u8; 32]);
        let chain_id = ChainId::from([3u8; 32]);
        let amount = Amount::from_tokens(100);

        let op = Operation::Transfer {
            owner,
            amount,
            target_account: linera_sdk::linera_base_types::Account {
                chain_id,
                owner: target_owner,
            },
        };

        match op {
            Operation::Transfer { owner: o, amount: a, .. } => {
                assert_eq!(o, owner);
                assert_eq!(a, amount);
            }
            _ => panic!("Wrong operation type"),
        }
    }

    #[test]
    fn test_mint_operation_creation() {
        let to = AccountOwner::from([1u8; 32]);
        let amount = Amount::from_tokens(1000);

        let op = Operation::Mint { to, amount };

        match op {
            Operation::Mint { to: t, amount: a } => {
                assert_eq!(t, to);
                assert_eq!(a, amount);
            }
            _ => panic!("Wrong operation type"),
        }
    }

    #[test]
    fn test_burn_operation_creation() {
        let from = AccountOwner::from([1u8; 32]);
        let amount = Amount::from_tokens(500);

        let op = Operation::Burn { from, amount };

        match op {
            Operation::Burn { from: f, amount: a } => {
                assert_eq!(f, from);
                assert_eq!(a, amount);
            }
            _ => panic!("Wrong operation type"),
        }
    }

    #[test]
    fn test_stake_request_operation() {
        let token_chain = ChainId::from([1u8; 32]);
        let registry = ApplicationId {
            bytecode_id: Default::default(),
            creation: Default::default(),
        };
        let amount = Amount::from_tokens(1000);

        let op = Operation::SendStakeRequest {
            token_chain,
            amount,
            to_registry: registry,
        };

        match op {
            Operation::SendStakeRequest { amount: a, .. } => {
                assert_eq!(a, amount);
            }
            _ => panic!("Wrong operation type"),
        }
    }

    #[test]
    fn test_unstake_request_operation() {
        let token_chain = ChainId::from([1u8; 32]);
        let registry = ApplicationId {
            bytecode_id: Default::default(),
            creation: Default::default(),
        };
        let amount = Amount::from_tokens(500);

        let op = Operation::SendUnstakeRequest {
            token_chain,
            amount,
            from_registry: registry,
        };

        match op {
            Operation::SendUnstakeRequest { amount: a, .. } => {
                assert_eq!(a, amount);
            }
            _ => panic!("Wrong operation type"),
        }
    }

    #[test]
    fn test_add_authorized_registry_operation() {
        let registry = ApplicationId {
            bytecode_id: Default::default(),
            creation: Default::default(),
        };

        let op = Operation::AddAuthorizedRegistry {
            registry_app_id: registry,
        };

        match op {
            Operation::AddAuthorizedRegistry { registry_app_id: r } => {
                assert_eq!(r, registry);
            }
            _ => panic!("Wrong operation type"),
        }
    }

    #[test]
    fn test_remove_authorized_registry_operation() {
        let registry = ApplicationId {
            bytecode_id: Default::default(),
            creation: Default::default(),
        };

        let op = Operation::RemoveAuthorizedRegistry {
            registry_app_id: registry,
        };

        match op {
            Operation::RemoveAuthorizedRegistry { registry_app_id: r } => {
                assert_eq!(r, registry);
            }
            _ => panic!("Wrong operation type"),
        }
    }

    #[test]
    fn test_simple_transfer_operation() {
        let from_chain = ChainId::from([1u8; 32]);
        let to_chain = ChainId::from([2u8; 32]);
        let amount = Amount::from_tokens(250);

        let op = Operation::SimpleTransfer {
            from_chain_id: from_chain,
            to_chain_id: to_chain,
            amount,
        };

        match op {
            Operation::SimpleTransfer { from_chain_id, to_chain_id, amount: a } => {
                assert_eq!(from_chain_id, from_chain);
                assert_eq!(to_chain_id, to_chain);
                assert_eq!(a, amount);
            }
            _ => panic!("Wrong operation type"),
        }
    }

    #[test]
    fn test_amount_validation() {
        let params = test_parameters();
        
        // Test below minimum
        let small_amount = Amount::from_tokens(50);
        assert!(small_amount < params.min_stake_amount);
        
        // Test within range
        let valid_amount = Amount::from_tokens(1000);
        assert!(valid_amount >= params.min_stake_amount);
        assert!(valid_amount <= params.max_stake_amount);
        
        // Test above maximum
        let large_amount = Amount::from_tokens(20_000_000);
        assert!(large_amount > params.max_stake_amount);
    }

    #[test]
    fn test_user_stake_cap_validation() {
        let params = test_parameters();
        
        let current_stake = Amount::from_tokens(900_000);
        let new_stake = Amount::from_tokens(200_000);
        let total = current_stake.saturating_add(new_stake);
        
        // Should exceed cap
        assert!(total > params.max_stake_per_user);
        
        // Valid stake that doesn't exceed cap
        let valid_new_stake = Amount::from_tokens(50_000);
        let valid_total = current_stake.saturating_add(valid_new_stake);
        assert!(valid_total <= params.max_stake_per_user);
    }

    #[test]
    fn test_saturating_operations() {
        let amount1 = Amount::from_tokens(100);
        let amount2 = Amount::from_tokens(50);
        
        // Test saturating_add
        let sum = amount1.saturating_add(amount2);
        assert_eq!(sum, Amount::from_tokens(150));
        
        // Test saturating_sub
        let diff = amount1.saturating_sub(amount2);
        assert_eq!(diff, Amount::from_tokens(50));
        
        // Test saturating_sub with underflow protection
        let underflow = amount2.saturating_sub(amount1);
        assert_eq!(underflow, Amount::ZERO);
    }
}
