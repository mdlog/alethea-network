// API Types for Oracle Backend

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterVoterRequest {
    pub stake: String,
    pub name: Option<String>,
    pub metadata_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterVoterForRequest {
    pub voter_address: String,
    pub stake: String,
    pub name: Option<String>,
    pub metadata_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransactionResultResponse {
    pub success: bool,
    pub certificate_hash: Option<String>,
    pub message: String,
    pub voter_address: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateQueryRequest {
    pub description: String,
    pub outcomes: Vec<String>,
    pub strategy: String,
    pub min_votes: Option<usize>,
    pub reward: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SubmitVoteRequest {
    pub query_id: u64,
    pub value: String,
    pub confidence: Option<u8>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResolveQueryRequest {
    pub query_id: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateStakeRequest {
    pub additional_stake: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WithdrawStakeRequest {
    pub amount: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn error(message: impl Into<String>) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(message.into()),
        }
    }
}
