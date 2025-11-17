// Linera Operation Executor
// Executes operations using linera CLI (production-ready approach)

use anyhow::{Context, Result, bail};
use std::process::Command;
use std::path::Path;
use tracing::{info, error};
use serde_json;

pub struct LineraOperationExecutor {
    chain_id: String,
    app_id: String,
    wallet_path: String,
    storage_path: String,
}

impl LineraOperationExecutor {
    pub fn new(
        chain_id: String,
        app_id: String,
        wallet_path: String,
        storage_path: String,
    ) -> Self {
        Self {
            chain_id,
            app_id,
            wallet_path,
            storage_path,
        }
    }
    
    /// Register voter using GraphQL mutation
    pub async fn register_voter(
        &self,
        stake: String,
        name: Option<String>,
        metadata_url: Option<String>,
    ) -> Result<String> {
        info!("Registering voter via GraphQL mutation");
        info!("  Stake: {}", stake);
        info!("  Name: {:?}", name);
        info!("  Metadata URL: {:?}", metadata_url);
        
        // Build GraphQL mutation arguments
        let mut args = vec![format!("stake: \"{}\"", stake)];
        
        if let Some(n) = name {
            args.push(format!("name: \"{}\"", n));
        }
        
        if let Some(url) = metadata_url {
            args.push(format!("metadataUrl: \"{}\"", url));
        }
        
        let args_str = args.join(", ");
        let mutation = format!("mutation {{ registerVoter({}) }}", args_str);
        
        info!("GraphQL mutation: {}", mutation);
        
        // Execute GraphQL mutation
        self.execute_graphql_mutation(&mutation).await
    }
    
    /// Submit vote using GraphQL mutation
    pub async fn submit_vote(
        &self,
        query_id: u64,
        value: String,
        confidence: Option<u8>,
    ) -> Result<String> {
        info!("Submitting vote via GraphQL mutation");
        info!("  Query ID: {}", query_id);
        info!("  Value: {}", value);
        info!("  Confidence: {:?}", confidence);
        
        // Build GraphQL mutation arguments
        let mut args = vec![
            format!("queryId: {}", query_id),
            format!("value: \"{}\"", value),
        ];
        
        if let Some(conf) = confidence {
            args.push(format!("confidence: {}", conf));
        }
        
        let args_str = args.join(", ");
        let mutation = format!("mutation {{ submitVote({}) }}", args_str);
        
        info!("GraphQL mutation: {}", mutation);
        
        // Execute GraphQL mutation
        self.execute_graphql_mutation(&mutation).await
    }
    
    /// Execute GraphQL mutation
    async fn execute_graphql_mutation(&self, mutation: &str) -> Result<String> {
        let graphql_url = format!(
            "http://localhost:8080/chains/{}/applications/{}",
            self.chain_id, self.app_id
        );
        
        info!("Sending GraphQL request to: {}", graphql_url);
        
        let query = serde_json::json!({
            "query": mutation
        });
        
        // Execute GraphQL request
        let client = reqwest::Client::new();
        let response = client
            .post(&graphql_url)
            .json(&query)
            .send()
            .await
            .context("Failed to send GraphQL request")?;
        
        let status = response.status();
        let result_text = response.text().await?;
        
        info!("GraphQL response status: {}", status);
        info!("GraphQL response: {}", result_text);
        
        if !status.is_success() {
            bail!("GraphQL request failed with status {}: {}", status, result_text);
        }
        
        // Parse response to check for errors
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&result_text) {
            if let Some(errors) = json.get("errors") {
                bail!("GraphQL errors: {}", errors);
            }
            
            if let Some(data) = json.get("data") {
                return Ok(serde_json::to_string_pretty(data)?);
            }
        }
        
        Ok(result_text)
    }
    
    /// Alternative: Execute using GraphQL mutation (returns instructions)
    pub async fn get_operation_instructions(
        &self,
        operation_name: &str,
        params: serde_json::Value,
    ) -> Result<String> {
        info!("Getting operation instructions via GraphQL");
        
        let graphql_url = format!(
            "http://localhost:8080/chains/{}/applications/{}",
            self.chain_id, self.app_id
        );
        
        // Build GraphQL mutation
        let mutation = format!(
            "mutation {{ {}({}) }}",
            operation_name,
            self.params_to_graphql_args(params)?
        );
        
        let query = serde_json::json!({
            "query": mutation
        });
        
        // Execute GraphQL request
        let client = reqwest::Client::new();
        let response = client
            .post(&graphql_url)
            .json(&query)
            .send()
            .await
            .context("Failed to send GraphQL request")?;
        
        let result = response.text().await?;
        
        Ok(result)
    }
    
    /// Convert JSON params to GraphQL arguments
    fn params_to_graphql_args(&self, params: serde_json::Value) -> Result<String> {
        // Simple conversion for common types
        // In production, use proper GraphQL query builder
        
        if let serde_json::Value::Object(map) = params {
            let args: Vec<String> = map
                .iter()
                .map(|(k, v)| {
                    let val_str = match v {
                        serde_json::Value::String(s) => format!("\"{}\"", s),
                        serde_json::Value::Number(n) => n.to_string(),
                        serde_json::Value::Bool(b) => b.to_string(),
                        serde_json::Value::Null => "null".to_string(),
                        _ => serde_json::to_string(v).unwrap_or_default(),
                    };
                    format!("{}: {}", k, val_str)
                })
                .collect();
            
            Ok(args.join(", "))
        } else {
            bail!("Invalid params format")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_operation_executor() {
        let executor = LineraOperationExecutor::new(
            "95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4".to_string(),
            "99740274ffaa04d9ac49a6fe9af3763d7d9dbdf98379a6d68a7e04fcfb77a0e0".to_string(),
            "/home/user/.config/linera/wallet.json".to_string(),
            "rocksdb:/home/user/.config/linera/client.db".to_string(),
        );
        
        // Test operation file creation
        let result = executor.register_voter(
            "100".to_string(),
            Some("Test".to_string()),
            None,
        ).await;
        
        // Should create operation file at minimum
        assert!(result.is_ok() || result.err().unwrap().to_string().contains("Operation prepared"));
    }
}
