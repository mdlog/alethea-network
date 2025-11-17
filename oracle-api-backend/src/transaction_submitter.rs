// Transaction Submitter for Linera
// Submits operations to Linera chain using CLI

use anyhow::{Context, Result};
use serde_json::Value;
use std::process::{Command, Stdio};
use std::io::Write;
use tracing::{info, warn, error};
use uuid::Uuid;

pub struct TransactionSubmitter {
    wallet_path: String,
    chain_id: String,
    app_id: String,
}

impl TransactionSubmitter {
    pub fn new(
        wallet_path: String,
        chain_id: String,
        app_id: String,
    ) -> Self {
        Self {
            wallet_path,
            chain_id,
            app_id,
        }
    }
    
    /// Submit operation to Linera chain
    /// This creates a real transaction and submits it to validators
    pub async fn submit_operation(&self, operation: &Value) -> Result<TransactionResult> {
        info!("Submitting operation to chain {}", self.chain_id);
        info!("Operation: {}", serde_json::to_string_pretty(operation)?);
        
        // Strategy: Use GraphQL mutation to execute operation
        let graphql_url = format!(
            "http://localhost:8080/chains/{}/applications/{}",
            self.chain_id, self.app_id
        );
        
        // Build GraphQL mutation based on operation type
        let mutation = self.build_graphql_mutation(operation)?;
        
        info!("Calling GraphQL mutation: {}", mutation);
        
        // Call GraphQL endpoint
        let client = reqwest::Client::new();
        let response = client
            .post(&graphql_url)
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "query": mutation
            }))
            .send()
            .await
            .context("Failed to send GraphQL request")?;
        
        let response_text = response.text().await?;
        info!("GraphQL response: {}", response_text);
        
        // Parse response to get certificate hash
        let response_json: serde_json::Value = serde_json::from_str(&response_text)
            .context("Failed to parse GraphQL response")?;
        
        // Check if mutation was successful
        if let Some(data) = response_json.get("data") {
            if let Some(cert_hash) = data.as_str() {
                info!("✅ Operation scheduled with certificate: {}", cert_hash);
                
                // Wait a moment for operation to be processed
                tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
                
                Ok(TransactionResult {
                    success: true,
                    certificate_hash: Some(cert_hash.to_string()),
                    message: "Operation executed successfully".to_string(),
                    output: response_text,
                })
            } else {
                Err(anyhow::anyhow!("Unexpected response format: {}", response_text))
            }
        } else if let Some(errors) = response_json.get("errors") {
            error!("❌ GraphQL errors: {}", errors);
            Err(anyhow::anyhow!("GraphQL errors: {}", errors))
        } else {
            Err(anyhow::anyhow!("Unexpected response: {}", response_text))
        }
    }
    
    /// Build GraphQL mutation from operation
    fn build_graphql_mutation(&self, operation: &Value) -> Result<String> {
        // Extract operation type and parameters
        if let Some(obj) = operation.as_object() {
            if let Some((op_type, params)) = obj.iter().next() {
                match op_type.as_str() {
                    "RegisterVoterFor" => {
                        let voter_address = params["voter_address"].as_str().unwrap_or("");
                        let stake_str = params["stake"].as_str().unwrap_or("0");
                        // Remove trailing dot if present (Amount::to_string() adds it)
                        let stake = stake_str.trim_end_matches('.');
                        let name = params["name"].as_str().map(|s| format!(", name: \"{}\"", s)).unwrap_or_default();
                        let metadata_url = params["metadata_url"].as_str().map(|s| format!(", metadataUrl: \"{}\"", s)).unwrap_or_default();
                        
                        // Use executeRegisterVoterFor mutation
                        // Note: This mutation must exist in the deployed contract's GraphQL schema
                        // If you get "Unknown field" error, the contract needs to be redeployed
                        Ok(format!(
                            "mutation {{ executeRegisterVoterFor(voterAddress: \"{}\", stake: \"{}\"{}{}) }}",
                            voter_address, stake, name, metadata_url
                        ))
                    }
                    "CreateQuery" => {
                        // TODO: Implement CreateQuery mutation
                        Err(anyhow::anyhow!("CreateQuery not yet implemented"))
                    }
                    "SubmitVote" => {
                        // TODO: Implement SubmitVote mutation
                        Err(anyhow::anyhow!("SubmitVote not yet implemented"))
                    }
                    _ => Err(anyhow::anyhow!("Unknown operation type: {}", op_type))
                }
            } else {
                Err(anyhow::anyhow!("Empty operation object"))
            }
        } else {
            Err(anyhow::anyhow!("Operation is not an object"))
        }
    }
    
    /// Submit operation using alternative method (direct block creation)
    pub async fn submit_operation_direct(&self, operation: &Value) -> Result<TransactionResult> {
        info!("Submitting operation directly to chain {}", self.chain_id);
        
        // Create operation file
        let temp_file = format!("/tmp/linera_op_{}.json", Uuid::new_v4());
        std::fs::write(&temp_file, serde_json::to_string(operation)?)
            .context("Failed to write operation file")?;
        
        // Use linera service to execute operation
        let output = Command::new("linera")
            .args(&[
                "service",
                "--with-wallet", &self.wallet_path,
                "--chain-id", &self.chain_id,
            ])
            .env("LINERA_WALLET", &self.wallet_path)
            .output()
            .context("Failed to execute linera service")?;
        
        // Clean up
        let _ = std::fs::remove_file(&temp_file);
        
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            info!("✅ Operation executed successfully");
            
            Ok(TransactionResult {
                success: true,
                certificate_hash: None,
                message: "Operation executed".to_string(),
                output: stdout.to_string(),
            })
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            error!("❌ Operation failed: {}", stderr);
            
            Err(anyhow::anyhow!("Operation failed: {}", stderr))
        }
    }
    
    /// Extract certificate hash from linera output
    fn extract_certificate_hash(&self, output: &str) -> Option<String> {
        // Look for certificate hash in output
        // Format: "Certificate hash: <hash>" or just the hash on last line
        for line in output.lines().rev() {
            let line = line.trim();
            if line.len() == 64 && line.chars().all(|c| c.is_ascii_hexdigit()) {
                return Some(line.to_string());
            }
            if line.starts_with("Certificate hash:") {
                return line.split(':').nth(1).map(|s| s.trim().to_string());
            }
        }
        None
    }
}

#[derive(Debug, Clone)]
pub struct TransactionResult {
    pub success: bool,
    pub certificate_hash: Option<String>,
    pub message: String,
    pub output: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_extract_certificate_hash() {
        let submitter = TransactionSubmitter::new(
            "wallet.json".to_string(),
            "chain123".to_string(),
            "app456".to_string(),
        );
        
        let output = "Some output\n5bf4f9d3ae7940193d1d5780d25dbd49b3aabac1eabd34ede66afccd76c34ff8\n";
        let hash = submitter.extract_certificate_hash(output);
        
        assert!(hash.is_some());
        assert_eq!(hash.unwrap().len(), 64);
    }
}
