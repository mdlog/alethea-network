// Linera Executor Implementation
// Menggunakan Linera SDK untuk mengeksekusi operasi

use anyhow::{Context, Result, bail};
use linera_base::data_types::Amount;
use oracle_registry_v2::{Operation, Message, state::DecisionStrategy};
use tracing::{info, warn};

pub struct LineraExecutor {
    chain_id: String,
    app_id: String,
    wallet_path: String,
    storage_path: String,
}

impl LineraExecutor {
    pub fn new(
        chain_id: String,
        app_id: String,
        wallet_path: String,
        storage_path: String,
    ) -> Result<Self> {
        Ok(Self {
            chain_id,
            app_id,
            wallet_path,
            storage_path,
        })
    }

    /// Register voter
    pub async fn register_voter(
        &self,
        stake: String,
        name: Option<String>,
        metadata_url: Option<String>,
    ) -> Result<String> {
        info!("Creating RegisterVoter operation...");

        // Parse stake as tokens (not attos)
        let stake_amount = Amount::from_tokens(stake.parse()?);

        let operation = Operation::RegisterVoter {
            stake: stake_amount,
            name,
            metadata_url,
        };

        self.execute_operation(operation).await
    }

    /// Submit vote
    pub async fn submit_vote(
        &self,
        query_id: u64,
        value: String,
        confidence: Option<u8>,
    ) -> Result<String> {
        info!("Creating SubmitVote operation...");

        let operation = Operation::SubmitVote {
            query_id,
            value,
            confidence,
        };

        self.execute_operation(operation).await
    }

    /// Create query
    pub async fn create_query(
        &self,
        description: String,
        outcomes: Vec<String>,
        strategy: String,
        min_votes: Option<u32>,
        reward_amount: String,
    ) -> Result<String> {
        info!("Creating CreateQuery operation...");

        let strategy = match strategy.as_str() {
            "Majority" => DecisionStrategy::Majority,
            "Median" => DecisionStrategy::Median,
            "WeightedByStake" => DecisionStrategy::WeightedByStake,
            "WeightedByReputation" => DecisionStrategy::WeightedByReputation,
            _ => bail!("Invalid strategy: {}", strategy),
        };

        // Convert u32 to usize for min_votes
        let min_votes_usize = min_votes.map(|v| v as usize);

        let operation = Operation::CreateQuery {
            description,
            outcomes,
            strategy,
            min_votes: min_votes_usize,
            reward_amount: Amount::from_tokens(reward_amount.parse()?),
            deadline: None,
        };

        self.execute_operation(operation).await
    }

    /// Update stake
    pub async fn update_stake(&self, additional_stake: String) -> Result<String> {
        info!("Creating UpdateStake operation...");

        let operation = Operation::UpdateStake {
            additional_stake: Amount::from_tokens(additional_stake.parse()?),
        };

        self.execute_operation(operation).await
    }

    /// Withdraw stake
    pub async fn withdraw_stake(&self, amount: String) -> Result<String> {
        info!("Creating WithdrawStake operation...");

        let operation = Operation::WithdrawStake {
            amount: Amount::from_tokens(amount.parse()?),
        };

        self.execute_operation(operation).await
    }

    /// Claim rewards
    pub async fn claim_rewards(&self) -> Result<String> {
        info!("Creating ClaimRewards operation...");

        let operation = Operation::ClaimRewards;

        self.execute_operation(operation).await
    }

    /// Execute operation using linera CLI
    pub async fn execute_operation(&self, operation: Operation) -> Result<String> {
        info!("Executing operation: {:?}", operation);

        // Serialize operation to JSON
        let operation_json = serde_json::to_string_pretty(&operation)?;
        info!("Operation JSON:\n{}", operation_json);

        // Write to temp file
        let temp_file = format!("/tmp/linera_op_{}.json", std::process::id());
        std::fs::write(&temp_file, &operation_json)
            .context("Failed to write operation file")?;

        info!("Operation file: {}", temp_file);

        // Method 1: Try using linera CLI to execute
        // Note: This might not work directly as Linera doesn't have execute-operation command
        // We'll use a workaround by creating a block proposal

        warn!("⚠️  Direct operation execution not yet implemented in Linera CLI");
        warn!("⚠️  Using workaround: GraphQL mutation (returns instructions only)");

        // For now, return the operation details
        // In production, this would need proper SDK integration
        Ok(format!(
            "Operation prepared:\n{}\n\n\
            ⚠️  Note: Direct execution requires Linera SDK integration.\n\
            Operation file saved to: {}\n\n\
            To execute manually:\n\
            1. Use linera project test (for testing)\n\
            2. Or implement proper SDK integration\n\
            3. Or send as message to target chain",
            operation_json,
            temp_file
        ))
    }

    /// Send message to another chain
    pub async fn send_message(
        &self,
        target_chain: String,
        message: Message,
    ) -> Result<String> {
        info!("Sending message to chain: {}", target_chain);

        // Serialize message
        let message_json = serde_json::to_string_pretty(&message)?;
        info!("Message JSON:\n{}", message_json);

        // Write to temp file
        let temp_file = format!("/tmp/linera_msg_{}.json", std::process::id());
        std::fs::write(&temp_file, &message_json)
            .context("Failed to write message file")?;

        // Try to send message using linera CLI
        // Note: This requires proper message sending implementation
        
        warn!("⚠️  Message sending not yet fully implemented");
        
        Ok(format!(
            "Message prepared:\n{}\n\n\
            Message file saved to: {}\n\n\
            To send manually, use linera CLI with proper message sending",
            message_json,
            temp_file
        ))
    }

    /// Test connection
    pub async fn test_connection(&self) -> Result<String> {
        info!("Testing connection to Linera service...");

        // Try to query the chain using GraphQL
        let url = format!(
            "http://localhost:8080/chains/{}/applications/{}",
            self.chain_id, self.app_id
        );

        info!("GraphQL endpoint: {}", url);

        let client = reqwest::Client::new();
        let response = client
            .post(&url)
            .json(&serde_json::json!({
                "query": "{ voters { address } }"
            }))
            .send()
            .await
            .context("Failed to connect to Linera service")?;

        let status = response.status();
        let text = response.text().await?;

        if status.is_success() {
            Ok(format!(
                "✅ Connection successful!\n\
                Status: {}\n\
                Response: {}",
                status, text
            ))
        } else {
            bail!("Connection failed: {} - {}", status, text)
        }
    }
}
