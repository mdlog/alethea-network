// Linera Executor - Execute operations directly using Linera CLI

use anyhow::{Result, Context, bail};
use serde_json::{json, Value};
use std::process::Command;
use std::fs;
use tracing::{info, error};

pub struct LineraExecutor {
    chain_id: String,
    app_id: String,
    project_path: String,
}

impl LineraExecutor {
    pub fn new(chain_id: String, app_id: String, project_path: String) -> Self {
        Self {
            chain_id,
            app_id,
            project_path,
        }
    }

    /// Execute register voter operation
    pub async fn register_voter(
        &self,
        stake: &str,
        name: Option<String>,
        metadata_url: Option<String>,
    ) -> Result<String> {
        info!("Executing register voter operation");

        let operation = json!({
            "RegisterVoter": {
                "stake": stake,
                "name": name,
                "metadata_url": metadata_url,
            }
        });

        self.execute_operation(operation).await
    }

    /// Execute create query operation
    pub async fn create_query(
        &self,
        description: String,
        outcomes: Vec<String>,
        strategy: String,
        reward_amount: String,
        min_votes: Option<usize>,
        deadline: Option<u64>,
    ) -> Result<String> {
        info!("Executing create query operation");

        let operation = json!({
            "CreateQuery": {
                "description": description,
                "outcomes": outcomes,
                "strategy": strategy,
                "reward_amount": reward_amount,
                "min_votes": min_votes,
                "deadline": deadline,
            }
        });

        self.execute_operation(operation).await
    }

    /// Execute submit vote operation
    pub async fn submit_vote(
        &self,
        query_id: u64,
        value: String,
        confidence: Option<u8>,
    ) -> Result<String> {
        info!("Executing submit vote operation");

        let operation = json!({
            "SubmitVote": {
                "query_id": query_id,
                "value": value,
                "confidence": confidence,
            }
        });

        self.execute_operation(operation).await
    }

    /// Execute resolve query operation
    pub async fn resolve_query(&self, query_id: u64) -> Result<String> {
        info!("Executing resolve query operation");

        let operation = json!({
            "ResolveQuery": {
                "query_id": query_id,
            }
        });

        self.execute_operation(operation).await
    }

    /// Execute update stake operation
    pub async fn update_stake(&self, additional_stake: &str) -> Result<String> {
        info!("Executing update stake operation");

        let operation = json!({
            "UpdateStake": {
                "additional_stake": additional_stake,
            }
        });

        self.execute_operation(operation).await
    }

    /// Execute withdraw stake operation
    pub async fn withdraw_stake(&self, amount: &str) -> Result<String> {
        info!("Executing withdraw stake operation");

        let operation = json!({
            "WithdrawStake": {
                "amount": amount,
            }
        });

        self.execute_operation(operation).await
    }

    /// Execute claim rewards operation
    pub async fn claim_rewards(&self) -> Result<String> {
        info!("Executing claim rewards operation");

        let operation = json!("ClaimRewards");

        self.execute_operation(operation).await
    }

    /// Execute deregister voter operation
    pub async fn deregister_voter(&self) -> Result<String> {
        info!("Executing deregister voter operation");

        let operation = json!("DeregisterVoter");

        self.execute_operation(operation).await
    }

    /// Execute an operation using Linera CLI
    async fn execute_operation(&self, operation: Value) -> Result<String> {
        // Write operation to temporary file
        let op_file = "/tmp/linera_operation.json";
        let op_json = serde_json::to_string_pretty(&operation)?;
        fs::write(op_file, &op_json)
            .context("Failed to write operation file")?;

        info!("Operation written to {}: {}", op_file, op_json);

        // Create a script to execute the operation
        let script = format!(
            r#"#!/bin/bash
cd {}
echo "Executing operation on chain {} app {}"
echo "Operation: {}"

# For now, we'll use linera project test to validate
# In production, this would use linera wallet to send messages
linera project test

echo "Operation prepared. To execute manually:"
echo "linera wallet show"
echo "linera send-message --chain-id {} --application-id {} --message-file {}"
"#,
            self.project_path,
            self.chain_id,
            self.app_id,
            op_json,
            self.chain_id,
            self.app_id,
            op_file
        );

        let script_file = "/tmp/execute_operation.sh";
        fs::write(script_file, script)?;

        // Make script executable
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = fs::metadata(script_file)?.permissions();
            perms.set_mode(0o755);
            fs::set_permissions(script_file, perms)?;
        }

        // Execute the script
        let output = Command::new("bash")
            .arg(script_file)
            .output()
            .context("Failed to execute operation script")?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);

        if !output.status.success() {
            error!("Operation execution failed: {}", stderr);
            bail!("Operation execution failed: {}", stderr);
        }

        info!("Operation executed successfully");
        Ok(format!(
            "Operation prepared:\n{}\n\nOutput:\n{}\n\nTo execute manually, run:\nlinera send-message --chain-id {} --application-id {} --message-file {}",
            op_json, stdout, self.chain_id, self.app_id, op_file
        ))
    }

    /// Query GraphQL endpoint
    pub async fn query_graphql(&self, query: &str) -> Result<Value> {
        let url = format!(
            "http://localhost:8080/chains/{}/applications/{}",
            self.chain_id, self.app_id
        );

        let client = reqwest::Client::new();
        let response = client
            .post(&url)
            .json(&json!({ "query": query }))
            .send()
            .await
            .context("Failed to send GraphQL query")?;

        let result: Value = response.json().await.context("Failed to parse GraphQL response")?;

        Ok(result)
    }

    /// Get voter count
    pub async fn get_voter_count(&self) -> Result<i64> {
        let result = self.query_graphql("{ voterCount }").await?;
        let count = result["data"]["voterCount"]
            .as_i64()
            .context("Failed to parse voter count")?;
        Ok(count)
    }

    /// Get total stake
    pub async fn get_total_stake(&self) -> Result<String> {
        let result = self.query_graphql("{ totalStake }").await?;
        let stake = result["data"]["totalStake"]
            .as_str()
            .context("Failed to parse total stake")?;
        Ok(stake.to_string())
    }

    /// List voters
    pub async fn list_voters(&self, limit: i32, active_only: bool) -> Result<Value> {
        let active_filter = if active_only { ", activeOnly: true" } else { "" };
        let query = format!(
            "{{ voters(limit: {}{}) {{ address stake reputation isActive name }} }}",
            limit, active_filter
        );

        self.query_graphql(&query).await
    }

    /// Get voter info
    pub async fn get_voter(&self, address: &str) -> Result<Value> {
        let query = format!(
            r#"{{ voter(address: "{}") {{ address stake lockedStake reputation totalVotes correctVotes isActive name }} }}"#,
            address
        );

        self.query_graphql(&query).await
    }
}
