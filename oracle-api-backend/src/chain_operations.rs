// Chain Operations Executor
// Executes operations on Linera blockchain by creating authenticated blocks

use anyhow::{Context, Result};
use linera_base::identifiers::{ApplicationId, ChainId};
use linera_base::data_types::Amount;
use linera_client::chain_clients::ChainClient;
use linera_client::client_context::ClientContext;
use oracle_registry_v2::Operation;
use std::path::PathBuf;
use tracing::{info, error};

pub struct ChainOperationExecutor {
    chain_id: ChainId,
    app_id: ApplicationId,
    wallet_path: PathBuf,
    storage_path: String,
}

impl ChainOperationExecutor {
    pub fn new(
        chain_id: String,
        app_id: String,
        wallet_path: String,
        storage_path: String,
    ) -> Result<Self> {
        // Parse chain ID
        let chain_id = chain_id.parse::<ChainId>()
            .context("Invalid chain ID")?;
        
        // Parse application ID
        let app_id = app_id.parse::<ApplicationId>()
            .context("Invalid application ID")?;
        
        Ok(Self {
            chain_id,
            app_id,
            wallet_path: PathBuf::from(wallet_path),
            storage_path,
        })
    }
    
    /// Register a voter by creating a block with RegisterVoter operation
    pub async fn register_voter(
        &self,
        stake: Amount,
        name: Option<String>,
        metadata_url: Option<String>,
    ) -> Result<String> {
        info!("Executing RegisterVoter operation on chain");
        info!("  Chain: {}", self.chain_id);
        info!("  App: {}", self.app_id);
        info!("  Stake: {}", stake);
        
        // Create operation
        let operation = Operation::RegisterVoter {
            stake,
            name: name.clone(),
            metadata_url: metadata_url.clone(),
        };
        
        // Execute operation on chain
        let result = self.execute_operation(operation).await?;
        
        info!("RegisterVoter operation executed successfully");
        
        Ok(format!(
            "Voter registered: stake={}, name={:?}, tx={}",
            stake, name, result
        ))
    }
    
    /// Submit a vote by creating a block with SubmitVote operation
    pub async fn submit_vote(
        &self,
        query_id: u64,
        value: String,
        confidence: Option<u8>,
    ) -> Result<String> {
        info!("Executing SubmitVote operation");
        
        let operation = Operation::SubmitVote {
            query_id,
            value: value.clone(),
            confidence,
        };
        
        let result = self.execute_operation(operation).await?;
        
        Ok(format!(
            "Vote submitted: query_id={}, value={}, tx={}",
            query_id, value, result
        ))
    }
    
    /// Create a query by creating a block with CreateQuery operation
    pub async fn create_query(
        &self,
        description: String,
        outcomes: Vec<String>,
        strategy: oracle_registry_v2::state::DecisionStrategy,
        min_votes: u32,
        reward_amount: Amount,
        deadline: u64,
    ) -> Result<String> {
        info!("Executing CreateQuery operation");
        
        let operation = Operation::CreateQuery {
            description: description.clone(),
            outcomes: outcomes.clone(),
            strategy,
            min_votes,
            reward_amount,
            deadline,
        };
        
        let result = self.execute_operation(operation).await?;
        
        Ok(format!(
            "Query created: description={}, tx={}",
            description, result
        ))
    }
    
    /// Execute an operation on the chain by creating an authenticated block
    async fn execute_operation(&self, operation: Operation) -> Result<String> {
        // Initialize client context
        let context = self.get_client_context().await?;
        
        // Get chain client
        let chain_client = context.make_chain_client(self.chain_id);
        
        // Create block with operation
        // This will:
        // 1. Create a block proposal
        // 2. Include the operation
        // 3. Sign the block with chain owner's key
        // 4. Submit to validators
        // 5. Wait for confirmation
        
        info!("Creating block with operation...");
        
        // Serialize operation for the application
        let operation_bytes = bcs::to_bytes(&operation)
            .context("Failed to serialize operation")?;
        
        // Execute operation through chain client
        // Note: This is a simplified version. In production, you'd use:
        // chain_client.execute_operation(self.app_id, operation_bytes).await?
        
        // For now, we'll use a workaround since direct operation execution
        // might not be exposed in the current SDK version
        let block_hash = self.create_block_with_operation(
            &chain_client,
            operation_bytes
        ).await?;
        
        Ok(block_hash.to_string())
    }
    
    /// Get client context with wallet and storage
    async fn get_client_context(&self) -> Result<ClientContext> {
        info!("Initializing client context");
        info!("  Wallet: {:?}", self.wallet_path);
        info!("  Storage: {}", self.storage_path);
        
        // Load wallet
        let wallet = linera_client::wallet::Wallet::read(&self.wallet_path)
            .await
            .context("Failed to load wallet")?;
        
        // Initialize storage
        let storage_config = self.storage_path.parse()
            .context("Invalid storage path")?;
        
        // Create client context
        let context = ClientContext::new(
            storage_config,
            wallet,
            None, // No specific validator config
        ).await
            .context("Failed to create client context")?;
        
        info!("Client context initialized");
        
        Ok(context)
    }
    
    /// Create a block with the given operation
    async fn create_block_with_operation(
        &self,
        chain_client: &ChainClient,
        operation_bytes: Vec<u8>,
    ) -> Result<linera_base::crypto::CryptoHash> {
        info!("Creating block proposal...");
        
        // Create block proposal with operation
        // This uses the chain client to:
        // 1. Create a new block
        // 2. Add the operation to it
        // 3. Sign with chain owner's key
        // 4. Submit to validators
        
        // Note: The exact API depends on Linera SDK version
        // This is a conceptual implementation
        
        // In practice, you would use something like:
        // let block = chain_client.create_block_proposal().await?;
        // block.add_operation(self.app_id, operation_bytes);
        // let signed_block = block.sign_with_key(owner_key)?;
        // let result = chain_client.submit_block(signed_block).await?;
        
        // For now, return a placeholder
        // In production, implement proper block creation
        
        error!("Block creation not fully implemented yet");
        error!("This requires deeper Linera SDK integration");
        
        // Return error for now
        anyhow::bail!(
            "Block creation needs full SDK integration. \
            Current SDK version may not expose all required APIs. \
            Consider using: \
            1. Linera CLI commands \
            2. Test framework for development \
            3. Wait for SDK updates with better operation execution support"
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_executor_creation() {
        let executor = ChainOperationExecutor::new(
            "95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4".to_string(),
            "99740274ffaa04d9ac49a6fe9af3763d7d9dbdf98379a6d68a7e04fcfb77a0e0".to_string(),
            "/home/user/.config/linera/wallet.json".to_string(),
            "rocksdb:/home/user/.config/linera/client.db".to_string(),
        );
        
        assert!(executor.is_ok());
    }
}
