// Transaction Builder for Linera Operations
// Creates properly formatted operation JSON for submission to Linera chain

use linera_sdk::linera_base_types::{Amount, ApplicationId, ChainId};
use serde_json::{json, Value};
use anyhow::Result;

pub struct TransactionBuilder {
    chain_id: ChainId,
    app_id: ApplicationId,
}

impl TransactionBuilder {
    pub fn new(chain_id: String, app_id: String) -> Result<Self> {
        let chain_id = chain_id.parse::<ChainId>()
            .map_err(|e| anyhow::anyhow!("Invalid chain ID: {}", e))?;
        
        let app_id = app_id.parse::<ApplicationId>()
            .map_err(|e| anyhow::anyhow!("Invalid application ID: {}", e))?;
        
        Ok(Self { chain_id, app_id })
    }
    
    /// Build RegisterVoterFor operation
    /// This allows admin to register voters by specifying their address
    pub fn build_register_voter_for(
        &self,
        voter_address: String,
        stake: Amount,
        name: Option<String>,
        metadata_url: Option<String>,
    ) -> Value {
        json!({
            "RegisterVoterFor": {
                "voter_address": voter_address,
                "stake": stake.to_string(),
                "name": name,
                "metadata_url": metadata_url
            }
        })
    }
    
    /// Build CreateQuery operation
    pub fn build_create_query(
        &self,
        description: String,
        outcomes: Vec<String>,
        strategy: String,
        min_votes: Option<usize>,
        reward_amount: Amount,
        deadline: Option<u64>,
    ) -> Value {
        json!({
            "CreateQuery": {
                "description": description,
                "outcomes": outcomes,
                "strategy": strategy,
                "min_votes": min_votes,
                "reward_amount": reward_amount.to_string(),
                "deadline": deadline
            }
        })
    }
    
    /// Build SubmitVote operation
    pub fn build_submit_vote(
        &self,
        query_id: u64,
        value: String,
        confidence: Option<u8>,
    ) -> Value {
        json!({
            "SubmitVote": {
                "query_id": query_id,
                "value": value,
                "confidence": confidence
            }
        })
    }
    
    /// Build ResolveQuery operation
    pub fn build_resolve_query(&self, query_id: u64) -> Value {
        json!({
            "ResolveQuery": {
                "query_id": query_id
            }
        })
    }
    
    /// Build ClaimRewards operation
    pub fn build_claim_rewards(&self) -> Value {
        json!("ClaimRewards")
    }
    
    /// Get chain ID
    pub fn chain_id(&self) -> &ChainId {
        &self.chain_id
    }
    
    /// Get application ID
    pub fn app_id(&self) -> &ApplicationId {
        &self.app_id
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_build_register_voter_for() {
        let builder = TransactionBuilder::new(
            "95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4".to_string(),
            "8393789dd5c9b3fe5ac9aa9cee606993769feee666925058f07e0a9882a3396b".to_string(),
        ).unwrap();
        
        let operation = builder.build_register_voter_for(
            "0xfb3d8fcd4e78e5e4cd755307374561e3436e2dd48420e051af86333bc75d7c82".to_string(),
            Amount::from_tokens(100),
            Some("Alice".to_string()),
            None,
        );
        
        assert!(operation.is_object());
        assert!(operation.get("RegisterVoterFor").is_some());
    }
}
