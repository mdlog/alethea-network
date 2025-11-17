// Linera Client - Interacts with Linera blockchain using CLI

use anyhow::{Context, Result};
use linera_base::identifiers::{ApplicationId, ChainId};
use linera_sdk::linera_base_types::Amount;
use oracle_registry_v2::{Message as RegistryMessage, Operation as RegistryOperation};
use std::path::PathBuf;
use tracing::{debug, info, warn};

/// Linera client for interacting with Oracle Registry via CLI
pub struct LineraClient {
    chain_id: ChainId,
    app_id: ApplicationId,
    wallet_path: PathBuf,
    storage_path: String,
}

impl LineraClient {
    /// Create a new Linera client
    pub async fn new(
        chain_id: String,
        app_id: String,
        wallet_path: String,
        storage_path: String,
    ) -> Result<Self> {
        // Parse chain ID
        let chain_id = chain_id
            .parse::<ChainId>()
            .context("Invalid chain ID format")?;

        // Parse application ID
        let app_id = app_id
            .parse::<ApplicationId>()
            .context("Invalid application ID format")?;

        info!(
            "Linera client created for chain {} and app {}",
            chain_id, app_id
        );

        Ok(Self {
            chain_id,
            app_id,
            wallet_path: PathBuf::from(wallet_path),
            storage_path,
        })
    }

    /// Register a voter
    pub async fn register_voter(
        &self,
        stake: String,
        name: Option<String>,
        metadata_url: Option<String>,
    ) -> Result<String> {
        info!("Registering voter with stake: {}", stake);

        // Parse stake amount
        let stake_amount = stake.parse::<Amount>().context("Invalid stake amount")?;

        // Create operation
        let operation = RegistryOperation::RegisterVoter {
            stake: stake_amount,
            name,
            metadata_url,
        };

        self.execute_operation(operation).await
    }

    /// Update stake
    pub async fn update_stake(&self, additional_stake: String) -> Result<String> {
        info!("Updating stake: {}", additional_stake);

        let stake_amount = additional_stake
            .parse::<Amount>()
            .context("Invalid stake amount")?;

        let operation = RegistryOperation::UpdateStake {
            additional_stake: stake_amount,
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
        info!("Submitting vote for query {}", query_id);

        let operation = RegistryOperation::SubmitVote {
            query_id,
            value,
            confidence,
        };

        self.execute_operation(operation).await
    }

    /// Claim rewards
    pub async fn claim_rewards(&self) -> Result<String> {
        info!("Claiming rewards");

        let operation = RegistryOperation::ClaimRewards;

        self.execute_operation(operation).await
    }

    /// Execute an operation on the blockchain
    async fn execute_operation(&self, operation: RegistryOperation) -> Result<String> {
        // Use GraphQL mutation instead of CLI
        self.execute_via_graphql(operation).await
    }

    /// Execute operation via GraphQL mutation (Account-Based Registry)
    async fn execute_via_graphql(&self, operation: RegistryOperation) -> Result<String> {
        info!("Executing operation via GraphQL mutation");

        // Build GraphQL mutation
        let mutation = match &operation {
            RegistryOperation::RegisterVoter { stake, name, metadata_url } => {
                // Convert Amount to u128 and format as string
                let stake_value: u128 = (*stake).into();
                let stake_str = stake_value.to_string();
                
                let name_arg = name.as_ref()
                    .map(|n| format!(r#", name: "{}""#, n.replace('"', r#"\""#)))
                    .unwrap_or_default();
                let metadata_arg = metadata_url.as_ref()
                    .map(|m| format!(r#", metadataUrl: "{}""#, m.replace('"', r#"\""#)))
                    .unwrap_or_default();
                
                format!(
                    r#"mutation {{ registerVoter(stake: "{}"{}{}) }}"#,
                    stake_str, name_arg, metadata_arg
                )
            },
            _ => {
                return Err(anyhow::anyhow!("Only RegisterVoter is supported for now"))
            }
        };

        info!("GraphQL mutation: {}", mutation);

        // Send GraphQL request to linera service
        let url = format!(
            "http://localhost:8080/chains/{}/applications/{}",
            self.chain_id, self.app_id
        );

        let client = reqwest::Client::new();
        let response = client
            .post(&url)
            .json(&serde_json::json!({
                "query": mutation
            }))
            .send()
            .await?;

        let status = response.status();
        let body = response.text().await?;

        if status.is_success() {
            info!("GraphQL mutation executed successfully");
            Ok(format!("✅ Mutation executed:\n{}", body))
        } else {
            warn!("GraphQL mutation failed: {}", body);
            Err(anyhow::anyhow!("Mutation failed: {}", body))
        }
    }
}
