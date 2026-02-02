// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

use linera_sdk::{
    linera_base_types::{AccountOwner, Amount, ApplicationId},
    views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext},
};

#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct AletheaTokenState {
    /// User balances
    pub balances: MapView<AccountOwner, Amount>,
    /// Total supply of tokens
    pub total_supply: RegisterView<Amount>,
    /// Total minted (for tracking)
    pub total_minted: RegisterView<Amount>,
    /// Total burned (for tracking)
    pub total_burned: RegisterView<Amount>,
    /// Token name
    pub name: RegisterView<String>,
    /// Token symbol
    pub symbol: RegisterView<String>,
    /// Token decimals
    pub decimals: RegisterView<u8>,
    /// Admin account (can mint/burn)
    pub admin: RegisterView<Option<AccountOwner>>,
    /// Tokens held by applications (for tracking)
    pub application_holdings: MapView<ApplicationId, Amount>,
    /// Registry app ID (authorized to mint rewards)
    pub registry_app_id: RegisterView<Option<ApplicationId>>,
}
