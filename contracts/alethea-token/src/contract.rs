// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use alethea_token::{AletheaTokenAbi, InitialState, Message, Operation, OperationResponse, Parameters};
use linera_sdk::{
    linera_base_types::{Amount, WithContractAbi},
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
        }
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}
