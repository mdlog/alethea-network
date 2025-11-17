// Transaction preparation and submission for MetaMask signing

use anyhow::Result;
use linera_base::{
    crypto::CryptoHash,
    data_types::BlockHeight,
    identifiers::{ApplicationId, ChainId},
};
use oracle_registry_v2::Operation as RegistryOperation;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct UnsignedTransaction {
    pub chain_id: String,
    pub application_id: String,
    pub operation: String,
    pub block_height: u64,
    pub timestamp: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SignedTransaction {
    pub transaction: UnsignedTransaction,
    pub signature: String,
}

pub fn prepare_transaction(
    chain_id: &ChainId,
    app_id: &ApplicationId,
    operation: &RegistryOperation,
    block_height: u64,
) -> Result<UnsignedTransaction> {
    let operation_json = serde_json::to_string(operation)?;
    
    Ok(UnsignedTransaction {
        chain_id: chain_id.to_string(),
        application_id: app_id.to_string(),
        operation: operation_json,
        block_height,
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)?
            .as_secs(),
    })
}

pub async fn submit_signed_transaction(
    signed_tx: SignedTransaction,
) -> Result<String> {
    // Submit to Linera service
    // This would send the signed transaction to validators
    
    Ok(format!("Transaction submitted: {:?}", signed_tx))
}
