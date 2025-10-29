// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Oracle Coordinator Application
//! 
//! Re-exports types from alethea-oracle-types for convenience

pub use alethea_oracle_types::{
    OracleCoordinatorAbi,
    CoordinatorOperation as Operation,
    CoordinatorResponse as Response,
    Message,
    Parameters,
    Market,
    MarketStatus,
    VoterInfo,
    VoteCommitment,
    VoteReveal,
    MarketStats,
};
