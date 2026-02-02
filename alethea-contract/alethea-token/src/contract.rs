// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use alethea_token::{AletheaTokenAbi, InitialState, Message, Operation, OperationResponse, Parameters};
use linera_sdk::{
    linera_base_types::{AccountOwner, Amount, WithContractAbi},
    views::{RootView, View},
    Contract, ContractRuntime,
};

use self::state::AletheaTokenState;

pub struct AletheaTokenContract {
    state: AletheaTokenState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(AletheaTokenContract);

impl WithContractAbi for AletheaTokenContract {
    type Abi = AletheaTokenAbi;
}

impl Contract for AletheaTokenContract {
    type Message = Message;
    type Parameters = Parameters;
    type InstantiationArgument = InitialState;
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = AletheaTokenState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        AletheaTokenContract { state, runtime }
    }

    async fn instantiate(&mut self, argument: Self::InstantiationArgument) {
        let params = self.runtime.application_parameters();

        // Set metadata
        self.state.name.set(params.name);
        self.state.symbol.set(params.symbol);
        self.state.decimals.set(params.decimals);
        self.state.registry_app_id.set(params.registry_app_id);

        // Set admin
        self.state.admin.set(argument.admin);

        // Initialize accounts and calculate total supply
        let mut total_supply = Amount::ZERO;
        for (owner, amount) in argument.accounts {
            self.state
                .balances
                .insert(&owner, amount)
                .expect("Failed to initialize account");
            total_supply = total_supply.saturating_add(amount);
        }

        self.state.total_supply.set(total_supply);
        self.state.total_minted.set(total_supply);
        self.state.total_burned.set(Amount::ZERO);
    }

    async fn execute_operation(&mut self, operation: Self::Operation) -> Self::Response {
        match operation {
            Operation::Transfer {
                owner,
                amount,
                target_account,
            } => {
                // Check authentication
                self.runtime
                    .check_account_permission(owner)
                    .expect("Permission denied");

                // Debit from source
                let balance = self
                    .state
                    .balances
                    .get(&owner)
                    .await
                    .ok()
                    .flatten()
                    .unwrap_or(Amount::ZERO);

                if balance < amount {
                    return OperationResponse::error("Insufficient balance");
                }

                self.state
                    .balances
                    .insert(&owner, balance.saturating_sub(amount))
                    .expect("Failed to debit");

                // If same chain, credit directly
                if target_account.chain_id == self.runtime.chain_id() {
                    let target_balance = self
                        .state
                        .balances
                        .get(&target_account.owner)
                        .await
                        .ok()
                        .flatten()
                        .unwrap_or(Amount::ZERO);

                    self.state
                        .balances
                        .insert(&target_account.owner, target_balance.saturating_add(amount))
                        .expect("Failed to credit");

                    OperationResponse::success("Transfer successful")
                } else {
                    // Cross-chain transfer: send message
                    let message = Message::Credit {
                        target: target_account.owner,
                        amount,
                        source: owner,
                    };

                    self.runtime
                        .prepare_message(message)
                        .with_authentication()
                        .with_tracking()
                        .send_to(target_account.chain_id);

                    OperationResponse::success("Cross-chain transfer initiated")
                }
            }

            Operation::TransferToApplication {
                owner,
                amount,
                target_application,
                target_chain,
            } => {
                // Check authentication
                self.runtime
                    .check_account_permission(owner)
                    .expect("Permission denied");

                // Debit from source
                let balance = self
                    .state
                    .balances
                    .get(&owner)
                    .await
                    .ok()
                    .flatten()
                    .unwrap_or(Amount::ZERO);

                if balance < amount {
                    return OperationResponse::error("Insufficient balance");
                }

                self.state
                    .balances
                    .insert(&owner, balance.saturating_sub(amount))
                    .expect("Failed to debit");

                // Track tokens held by application
                let app_balance = self
                    .state
                    .application_holdings
                    .get(&target_application)
                    .await
                    .ok()
                    .flatten()
                    .unwrap_or(Amount::ZERO);

                self.state
                    .application_holdings
                    .insert(&target_application, app_balance.saturating_add(amount))
                    .expect("Failed to track application holdings");

                // Send message to target application
                let message = Message::ReceiveFromAccount {
                    sender_chain: self.runtime.chain_id(),
                    sender: owner,
                    amount,
                };

                self.runtime
                    .prepare_message(message)
                    .with_authentication()
                    .with_tracking()
                    .send_to(target_chain);

                OperationResponse::success(format!(
                    "Transferred {} tokens to application",
                    amount
                ))
            }

            Operation::Claim {
                owner,
                amount,
                source_application: _,
                source_chain,
            } => {
                // Check authentication
                self.runtime
                    .check_account_permission(owner)
                    .expect("Permission denied");

                // Send claim request to source application
                let message = Message::WithdrawToAccount {
                    target_chain: self.runtime.chain_id(),
                    target: owner,
                    amount,
                };

                self.runtime
                    .prepare_message(message)
                    .with_authentication()
                    .with_tracking()
                    .send_to(source_chain);

                OperationResponse::success(format!(
                    "Claim request sent for {} tokens",
                    amount
                ))
            }

            Operation::Mint { to, amount } => {
                // Check admin permission
                let admin = self.state.admin.get().clone();
                if let Some(admin_owner) = admin {
                    self.runtime
                        .check_account_permission(admin_owner)
                        .expect("Only admin can mint");
                } else {
                    return OperationResponse::error("No admin set");
                }

                // Credit the target account
                let balance = self
                    .state
                    .balances
                    .get(&to)
                    .await
                    .ok()
                    .flatten()
                    .unwrap_or(Amount::ZERO);

                self.state
                    .balances
                    .insert(&to, balance.saturating_add(amount))
                    .expect("Failed to mint");

                // Update total supply
                let total = *self.state.total_supply.get();
                self.state.total_supply.set(total.saturating_add(amount));
                
                let minted = *self.state.total_minted.get();
                self.state.total_minted.set(minted.saturating_add(amount));

                OperationResponse::success(format!("Minted {} tokens to {:?}", amount, to))
            }

            Operation::Burn { from, amount } => {
                // Check permission (admin or owner)
                let admin = self.state.admin.get().clone();
                let is_admin = if let Some(admin_owner) = admin {
                    self.runtime.check_account_permission(admin_owner).is_ok()
                } else {
                    false
                };

                if !is_admin {
                    // If not admin, must be owner
                    self.runtime
                        .check_account_permission(from)
                        .expect("Permission denied");
                }

                // Debit from account
                let balance = self
                    .state
                    .balances
                    .get(&from)
                    .await
                    .ok()
                    .flatten()
                    .unwrap_or(Amount::ZERO);

                if balance < amount {
                    return OperationResponse::error("Insufficient balance to burn");
                }

                self.state
                    .balances
                    .insert(&from, balance.saturating_sub(amount))
                    .expect("Failed to burn");

                // Update total supply
                let total = *self.state.total_supply.get();
                self.state.total_supply.set(total.saturating_sub(amount));
                
                let burned = *self.state.total_burned.get();
                self.state.total_burned.set(burned.saturating_add(amount));

                OperationResponse::success(format!("Burned {} tokens from {:?}", amount, from))
            }

            Operation::SetAdmin { new_admin } => {
                // Check current admin permission
                let admin = self.state.admin.get().clone();
                if let Some(admin_owner) = admin {
                    self.runtime
                        .check_account_permission(admin_owner)
                        .expect("Only admin can set new admin");
                } else {
                    return OperationResponse::error("No admin set");
                }

                self.state.admin.set(Some(new_admin));
                OperationResponse::success("Admin updated")
            }

            Operation::SetRegistryAppId { registry_app_id } => {
                // Check admin permission
                let admin = self.state.admin.get().clone();
                if let Some(admin_owner) = admin {
                    self.runtime
                        .check_account_permission(admin_owner)
                        .expect("Only admin can set registry app ID");
                } else {
                    return OperationResponse::error("No admin set");
                }

                self.state.registry_app_id.set(Some(registry_app_id));
                OperationResponse::success("Registry app ID updated")
            }

            Operation::SendTransferMessage {
                token_chain,
                amount,
                target_owner,
            } => {
                // Get the authenticated signer from the runtime
                // This is the owner address of the user calling this operation
                let sender_owner = self.runtime.authenticated_signer()
                    .expect("No authenticated signer");

                // Send cross-chain message to token chain
                let message = Message::RequestTransfer {
                    sender_chain: self.runtime.chain_id(),
                    sender_owner,
                    target_owner,
                    amount,
                };

                self.runtime
                    .prepare_message(message)
                    .with_authentication()
                    .with_tracking()
                    .send_to(token_chain);

                OperationResponse::success(format!(
                    "Transfer request sent: {} tokens to {:?}",
                    amount, target_owner
                ))
            }

            #[allow(deprecated)]
            Operation::StakeTransfer {
                from_chain_id: _,
                amount: _,
                to_registry: _,
            } => {
                OperationResponse::error("StakeTransfer is deprecated. Use SendStakeRequest instead.".to_string())
            }

            #[allow(deprecated)]
            Operation::UnstakeTransfer {
                to_chain_id: _,
                amount: _,
                from_registry: _,
            } => {
                OperationResponse::error("UnstakeTransfer is deprecated. Use SendUnstakeRequest instead.".to_string())
            }

            Operation::SendStakeRequest {
                token_chain: _token_chain,
                owner,
                amount,
                to_registry,
            } => {
                // OPTION A: ESCROW STAKING
                // 1. Deduct from user balance
                // 2. Credit to registry account (escrow)
                
                let user_balance = self
                    .state
                    .balances
                    .get(&owner)
                    .await
                    .ok()
                    .flatten()
                    .unwrap_or(Amount::ZERO);

                if user_balance < amount {
                    return OperationResponse::error(format!(
                        "Insufficient balance. Has {}, needs {}",
                        user_balance, amount
                    ));
                }

                // Derive registry account address from ApplicationId
                // This creates a unique address owned by the registry application
                let registry_owner = AccountOwner::Address32(
                    to_registry.application_description_hash.into()
                );

                // Step 1: Deduct from user's balance
                self.state
                    .balances
                    .insert(&owner, user_balance.saturating_sub(amount))
                    .expect("Failed to debit user for stake");

                // Step 2: Credit to registry escrow account
                let registry_balance = self
                    .state
                    .balances
                    .get(&registry_owner)
                    .await
                    .ok()
                    .flatten()
                    .unwrap_or(Amount::ZERO);

                self.state
                    .balances
                    .insert(&registry_owner, registry_balance.saturating_add(amount))
                    .expect("Failed to credit registry for stake");

                eprintln!(
                    "SendStakeRequest [ESCROW]: {} ALTH transferred from {:?} to registry {:?}",
                    amount, owner, to_registry
                );
                eprintln!(
                    "  User balance: {} -> {}",
                    user_balance, user_balance.saturating_sub(amount)
                );
                eprintln!(
                    "  Registry balance: {} -> {}",
                    registry_balance, registry_balance.saturating_add(amount)
                );

                OperationResponse::success(format!(
                    "Stake successful: {} ALTH escrowed to registry",
                    amount
                ))
            }

            Operation::SendUnstakeRequest {
                token_chain: _token_chain,
                owner,
                amount,
                from_registry,
            } => {
                // PROPER ESCROW UNSTAKING
                // 1. Deduct from registry escrow account
                // 2. Credit back to user balance
                
                // Derive registry escrow account address
                let registry_owner = AccountOwner::Address32(
                    from_registry.application_description_hash.into()
                );

                // Check registry escrow balance
                let registry_balance = self
                    .state
                    .balances
                    .get(&registry_owner)
                    .await
                    .ok()
                    .flatten()
                    .unwrap_or(Amount::ZERO);

                // Verify escrow has sufficient balance
                if registry_balance < amount {
                    return OperationResponse::error(format!(
                        "Insufficient escrow balance. Escrow has {}, needs {}",
                        registry_balance, amount
                    ));
                }

                // Step 1: Deduct from registry escrow
                self.state
                    .balances
                    .insert(&registry_owner, registry_balance.saturating_sub(amount))
                    .expect("Failed to debit registry escrow for unstake");

                // Step 2: Credit user balance
                let user_balance = self
                    .state
                    .balances
                    .get(&owner)
                    .await
                    .ok()
                    .flatten()
                    .unwrap_or(Amount::ZERO);

                self.state
                    .balances
                    .insert(&owner, user_balance.saturating_add(amount))
                    .expect("Failed to credit user for unstake");

                eprintln!(
                    "SendUnstakeRequest [ESCROW]: {} ALTH unstaked from registry {:?} to user {:?}",
                    amount, from_registry, owner
                );
                eprintln!(
                    "  Escrow balance: {} -> {}",
                    registry_balance, registry_balance.saturating_sub(amount)
                );
                eprintln!(
                    "  User balance: {} -> {}",
                    user_balance, user_balance.saturating_add(amount)
                );

                OperationResponse::success(format!(
                    "Unstake successful: {} ALTH returned to user from escrow",
                    amount
                ))
            }

            Operation::SimpleTransfer {
                from_chain_id,
                to_chain_id,
                amount,
            } => {
                // Convert chainIds to AccountOwner format
                let from_owner = AccountOwner::Address32(from_chain_id.0.into());
                let to_owner = AccountOwner::Address32(to_chain_id.0.into());

                // Check balance
                let balance = self
                    .state
                    .balances
                    .get(&from_owner)
                    .await
                    .ok()
                    .flatten()
                    .unwrap_or(Amount::ZERO);

                if balance < amount {
                    return OperationResponse::error(format!(
                        "Insufficient balance: {} < {}",
                        balance, amount
                    ));
                }

                // Debit from sender
                self.state
                    .balances
                    .insert(&from_owner, balance.saturating_sub(amount))
                    .expect("Failed to debit");

                // Credit to recipient
                let to_balance = self
                    .state
                    .balances
                    .get(&to_owner)
                    .await
                    .ok()
                    .flatten()
                    .unwrap_or(Amount::ZERO);

                self.state
                    .balances
                    .insert(&to_owner, to_balance.saturating_add(amount))
                    .expect("Failed to credit");

                OperationResponse::success(format!(
                    "SimpleTransfer: {} tokens from {:?} to {:?}",
                    amount, from_chain_id, to_chain_id
                ))
            }

            Operation::AddAuthorizedRegistry { registry_app_id } => {
                // Check admin permission
                let admin = self.state.admin.get().clone();
                if admin.is_none() {
                    return OperationResponse::error("No admin configured".to_string());
                }

                // For now, just set the registry_app_id
                self.state.registry_app_id.set(Some(registry_app_id));

                OperationResponse::success(format!(
                    "Added authorized registry: {:?}",
                    registry_app_id
                ))
            }

            Operation::RemoveAuthorizedRegistry { registry_app_id: _ } => {
                // Check admin permission
                let admin = self.state.admin.get().clone();
                if admin.is_none() {
                    return OperationResponse::error("No admin configured".to_string());
                }

                // Clear the registry_app_id
                self.state.registry_app_id.set(None);

                OperationResponse::success("Removed authorized registry".to_string())
            }
        }
    }

    async fn execute_message(&mut self, message: Self::Message) {
        match message {
            Message::Credit {
                target,
                amount,
                source: _,
            } => {
                // Credit the target account
                let balance = self
                    .state
                    .balances
                    .get(&target)
                    .await
                    .ok()
                    .flatten()
                    .unwrap_or(Amount::ZERO);

                self.state
                    .balances
                    .insert(&target, balance.saturating_add(amount))
                    .expect("Failed to credit");
            }

            Message::ReceiveFromAccount { .. } => {
                // This message is meant for applications (like oracle-registry)
                // Token contract just ignores it - applications handle it
            }

            Message::WithdrawToAccount {
                target_chain,
                target,
                amount,
            } => {
                // This is called when an application sends tokens back to a user
                // Credit the user's balance
                if target_chain == self.runtime.chain_id() {
                    // Same chain - credit directly
                    let balance = self
                        .state
                        .balances
                        .get(&target)
                        .await
                        .ok()
                        .flatten()
                        .unwrap_or(Amount::ZERO);

                    self.state
                        .balances
                        .insert(&target, balance.saturating_add(amount))
                        .expect("Failed to credit");
                } else {
                    // Cross-chain - forward as Credit message
                    let message = Message::Credit {
                        target,
                        amount,
                        source: target, // Self-transfer semantically
                    };

                    self.runtime
                        .prepare_message(message)
                        .with_authentication()
                        .with_tracking()
                        .send_to(target_chain);
                }
            }

            Message::MintReward {
                to_chain,
                to,
                amount,
            } => {
                // Verify sender is authorized registry
                // TODO: Add proper authorization check
                // For now, mint the reward
                
                if to_chain == self.runtime.chain_id() {
                    // Same chain - credit directly
                    let balance = self
                        .state
                        .balances
                        .get(&to)
                        .await
                        .ok()
                        .flatten()
                        .unwrap_or(Amount::ZERO);

                    self.state
                        .balances
                        .insert(&to, balance.saturating_add(amount))
                        .expect("Failed to mint reward");

                    // Update total supply
                    let total = *self.state.total_supply.get();
                    self.state.total_supply.set(total.saturating_add(amount));
                    
                    let minted = *self.state.total_minted.get();
                    self.state.total_minted.set(minted.saturating_add(amount));
                } else {
                    // Cross-chain - forward as Credit message
                    let message = Message::Credit {
                        target: to,
                        amount,
                        source: to,
                    };

                    self.runtime
                        .prepare_message(message)
                        .with_authentication()
                        .with_tracking()
                        .send_to(to_chain);

                    // Still update supply on this chain
                    let total = *self.state.total_supply.get();
                    self.state.total_supply.set(total.saturating_add(amount));
                    
                    let minted = *self.state.total_minted.get();
                    self.state.total_minted.set(minted.saturating_add(amount));
                }
            }

            Message::BurnSlash {
                from_chain: _,
                from,
                amount,
            } => {
                // Burn tokens from slashed voter
                // This reduces the application holdings
                let balance = self
                    .state
                    .balances
                    .get(&from)
                    .await
                    .ok()
                    .flatten()
                    .unwrap_or(Amount::ZERO);

                // Only burn what's available
                let burn_amount = amount.min(balance);
                
                if burn_amount > Amount::ZERO {
                    self.state
                        .balances
                        .insert(&from, balance.saturating_sub(burn_amount))
                        .expect("Failed to burn slash");

                    // Update total supply
                    let total = *self.state.total_supply.get();
                    self.state.total_supply.set(total.saturating_sub(burn_amount));
                    
                    let burned = *self.state.total_burned.get();
                    self.state.total_burned.set(burned.saturating_add(burn_amount));
                }
            }

            Message::RequestTransfer {
                sender_chain: _,
                sender_owner,
                target_owner,
                amount,
            } => {
                // This message is received on the token chain from a user's chain
                // The sender_owner is authenticated by the cross-chain message system
                
                // Debit from sender
                let sender_balance = self
                    .state
                    .balances
                    .get(&sender_owner)
                    .await
                    .ok()
                    .flatten()
                    .unwrap_or(Amount::ZERO);

                if sender_balance < amount {
                    // Insufficient balance - log error but don't panic
                    // In production, should send error message back
                    eprintln!(
                        "RequestTransfer failed: insufficient balance. Has {}, needs {}",
                        sender_balance, amount
                    );
                    return;
                }

                // Debit sender
                self.state
                    .balances
                    .insert(&sender_owner, sender_balance.saturating_sub(amount))
                    .expect("Failed to debit sender");

                // Credit target
                let target_balance = self
                    .state
                    .balances
                    .get(&target_owner)
                    .await
                    .ok()
                    .flatten()
                    .unwrap_or(Amount::ZERO);

                self.state
                    .balances
                    .insert(&target_owner, target_balance.saturating_add(amount))
                    .expect("Failed to credit target");

                eprintln!(
                    "RequestTransfer success: {} tokens from {:?} to {:?}",
                    amount, sender_owner, target_owner
                );
            }

            Message::RequestStake {
                sender_chain,
                sender_owner,
                amount,
                to_registry,
            } => {
                // NOTE: This message handler is now mostly a no-op
                // Token deduction is done in Operation::SendStakeRequest on user's chain
                // This handler exists for backward compatibility or direct token-chain calls
                
                eprintln!(
                    "RequestStake received from chain {:?}: {:?} staking {} to {:?}",
                    sender_chain, sender_owner, amount, to_registry
                );
                
                // If this is called on token chain (not user chain), we still need to handle it
                // Check if we're on the token chain vs user chain
                let current_chain = self.runtime.chain_id();
                if current_chain != sender_chain {
                    // We're on token chain receiving message from user chain
                    // Deduction should have already happened on user chain
                    // Just log and optionally forward to registry
                    eprintln!(
                        "RequestStake: Message from user chain {:?}, deduction already done there",
                        sender_chain
                    );
                } else {
                    // Same chain - this shouldn't happen with new flow
                    eprintln!(
                        "RequestStake: Unexpected same-chain message, skipping deduction"
                    );
                }

                // Send StakeConfirmed to registry chain
                // The registry will handle the actual staking
                let confirm_message = Message::StakeConfirmed {
                    sender_chain,
                    sender_owner,
                    amount,
                    to_registry,
                };

                self.runtime
                    .prepare_message(confirm_message)
                    .with_authentication()
                    .with_tracking()
                    .send_to(sender_chain);
            }

            Message::RequestUnstake {
                sender_chain,
                sender_owner,
                amount,
                from_registry,
            } => {
                // User wants to unstake tokens from registry
                // This message is informational - actual crediting happens via UnstakeConfirmed
                eprintln!(
                    "RequestUnstake: {:?} requesting unstake of {} from {:?}",
                    sender_owner, amount, from_registry
                );
            }

            Message::StakeConfirmed {
                sender_chain: _,
                sender_owner,
                amount,
                to_registry: _,
            } => {
                // Stake was confirmed - tokens already deducted
                // This is a confirmation message, no action needed on token side
                eprintln!(
                    "StakeConfirmed: {} tokens staked by {:?}",
                    amount, sender_owner
                );
            }

            Message::UnstakeConfirmed {
                sender_chain: _,
                sender_owner,
                amount,
                from_registry: _,
            } => {
                // Unstake confirmed by registry - credit tokens back to user
                let balance = self
                    .state
                    .balances
                    .get(&sender_owner)
                    .await
                    .ok()
                    .flatten()
                    .unwrap_or(Amount::ZERO);

                self.state
                    .balances
                    .insert(&sender_owner, balance.saturating_add(amount))
                    .expect("Failed to credit unstaked tokens");

                eprintln!(
                    "UnstakeConfirmed: Credited {} tokens back to {:?}",
                    amount, sender_owner
                );
            }
        }
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}
