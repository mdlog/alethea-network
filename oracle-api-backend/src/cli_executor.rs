// CLI Executor - Execute operations using oracle-cli tool

use anyhow::{Result, Context, bail};
use serde_json::Value;
use std::process::Command;
use std::path::Path;
use tracing::{info, error};

pub struct CliExecutor {
    cli_path: String,
    chain_id: String,
    app_id: String,
}

impl CliExecutor {
    pub fn new(chain_id: String, app_id: String) -> Result<Self> {
        // Find oracle-cli binary
        let cli_path = Self::find_cli_binary()?;
        
        Ok(Self {
            cli_path,
            chain_id,
            app_id,
        })
    }
    
    /// Find oracle-cli binary
    fn find_cli_binary() -> Result<String> {
        // Try common locations (workspace structure)
        let locations = vec![
            "../target/release/oracle-cli",           // Workspace target (most common)
            "../target/debug/oracle-cli",             // Workspace debug
            "../oracle-cli/target/release/oracle-cli", // Individual crate target
            "../oracle-cli/target/debug/oracle-cli",   // Individual crate debug
            "./oracle-cli",                            // Current directory
            "oracle-cli",                              // PATH
        ];
        
        for location in locations {
            if Path::new(location).exists() {
                info!("Found oracle-cli at: {}", location);
                return Ok(location.to_string());
            }
        }
        
        bail!("oracle-cli binary not found. Please build it first: cd oracle-cli && cargo build --release")
    }
    
    /// Execute register voter operation
    pub async fn register_voter(
        &self,
        stake: u64,
        name: Option<String>,
        metadata_url: Option<String>,
    ) -> Result<String> {
        info!("Executing register voter via CLI");
        
        let mut args = vec![
            "--chain-id".to_string(),
            self.chain_id.clone(),
            "--app-id".to_string(),
            self.app_id.clone(),
            "register".to_string(),
            "--stake".to_string(),
            stake.to_string(),
            "--execute".to_string(),
        ];
        
        if let Some(n) = name {
            args.push("--name".to_string());
            args.push(n);
        }
        
        if let Some(url) = metadata_url {
            args.push("--metadata-url".to_string());
            args.push(url);
        }
        
        self.execute_cli(&args).await
    }
    
    /// Execute create query operation
    pub async fn create_query(
        &self,
        description: String,
        outcomes: Vec<String>,
        strategy: String,
        min_votes: Option<usize>,
        reward: u64,
    ) -> Result<String> {
        info!("Executing create query via CLI");
        
        let mut args = vec![
            "--chain-id".to_string(),
            self.chain_id.clone(),
            "--app-id".to_string(),
            self.app_id.clone(),
            "create-query".to_string(),
            "--description".to_string(),
            description,
            "--outcomes".to_string(),
            outcomes.join(","),
            "--strategy".to_string(),
            strategy,
            "--reward".to_string(),
            reward.to_string(),
            "--execute".to_string(),
        ];
        
        if let Some(mv) = min_votes {
            args.push("--min-votes".to_string());
            args.push(mv.to_string());
        }
        
        self.execute_cli(&args).await
    }
    
    /// Execute submit vote operation
    pub async fn submit_vote(
        &self,
        query_id: u64,
        value: String,
        confidence: Option<u8>,
    ) -> Result<String> {
        info!("Executing submit vote via CLI");
        
        let mut args = vec![
            "--chain-id".to_string(),
            self.chain_id.clone(),
            "--app-id".to_string(),
            self.app_id.clone(),
            "vote".to_string(),
            "--query-id".to_string(),
            query_id.to_string(),
            "--value".to_string(),
            value,
            "--execute".to_string(),
        ];
        
        if let Some(c) = confidence {
            args.push("--confidence".to_string());
            args.push(c.to_string());
        }
        
        self.execute_cli(&args).await
    }
    
    /// Execute resolve query operation
    pub async fn resolve_query(&self, query_id: u64) -> Result<String> {
        info!("Executing resolve query via CLI");
        
        let args = vec![
            "--chain-id".to_string(),
            self.chain_id.clone(),
            "--app-id".to_string(),
            self.app_id.clone(),
            "resolve".to_string(),
            "--query-id".to_string(),
            query_id.to_string(),
            "--execute".to_string(),
        ];
        
        self.execute_cli(&args).await
    }
    
    /// Execute update stake operation
    pub async fn update_stake(&self, amount: u64) -> Result<String> {
        info!("Executing update stake via CLI");
        
        let args = vec![
            "--chain-id".to_string(),
            self.chain_id.clone(),
            "--app-id".to_string(),
            self.app_id.clone(),
            "update-stake".to_string(),
            "--amount".to_string(),
            amount.to_string(),
            "--execute".to_string(),
        ];
        
        self.execute_cli(&args).await
    }
    
    /// Execute withdraw stake operation
    pub async fn withdraw_stake(&self, amount: u64) -> Result<String> {
        info!("Executing withdraw stake via CLI");
        
        let args = vec![
            "--chain-id".to_string(),
            self.chain_id.clone(),
            "--app-id".to_string(),
            self.app_id.clone(),
            "withdraw-stake".to_string(),
            "--amount".to_string(),
            amount.to_string(),
            "--execute".to_string(),
        ];
        
        self.execute_cli(&args).await
    }
    
    /// Execute claim rewards operation
    pub async fn claim_rewards(&self) -> Result<String> {
        info!("Executing claim rewards via CLI");
        
        let args = vec![
            "--chain-id".to_string(),
            self.chain_id.clone(),
            "--app-id".to_string(),
            self.app_id.clone(),
            "claim-rewards".to_string(),
            "--execute".to_string(),
        ];
        
        self.execute_cli(&args).await
    }
    
    /// Query voters
    pub async fn list_voters(&self, limit: i32, active_only: bool) -> Result<Value> {
        info!("Querying voters via CLI");
        
        let mut args = vec![
            "--chain-id".to_string(),
            self.chain_id.clone(),
            "--app-id".to_string(),
            self.app_id.clone(),
            "list-voters".to_string(),
            "--limit".to_string(),
            limit.to_string(),
        ];
        
        if active_only {
            args.push("--active-only".to_string());
        }
        
        let output = self.execute_cli(&args).await?;
        
        // Parse JSON output
        serde_json::from_str(&output)
            .context("Failed to parse voters JSON")
    }
    
    /// Query queries
    pub async fn list_queries(&self, active_only: bool) -> Result<Value> {
        info!("Querying queries via CLI");
        
        let mut args = vec![
            "--chain-id".to_string(),
            self.chain_id.clone(),
            "--app-id".to_string(),
            self.app_id.clone(),
            "list-queries".to_string(),
        ];
        
        if active_only {
            args.push("--active-only".to_string());
        }
        
        let output = self.execute_cli(&args).await?;
        
        // Parse JSON output
        serde_json::from_str(&output)
            .context("Failed to parse queries JSON")
    }
    
    /// Execute CLI command
    async fn execute_cli(&self, args: &[String]) -> Result<String> {
        info!("Executing CLI: {} {:?}", self.cli_path, args);
        
        let output = Command::new(&self.cli_path)
            .args(args)
            .output()
            .context("Failed to execute oracle-cli")?;
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            error!("CLI execution failed: {}", stderr);
            bail!("CLI execution failed: {}", stderr);
        }
        
        let stdout = String::from_utf8_lossy(&output.stdout);
        info!("CLI output: {}", stdout);
        
        Ok(stdout.to_string())
    }
}
