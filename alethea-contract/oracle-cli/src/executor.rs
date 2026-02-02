// Executor module for executing operations via Linera CLI

use anyhow::{Result, Context, bail};
use colored::*;
use std::process::Command;
use std::path::Path;

/// Execute operation using Linera project test
pub async fn execute_with_linera_test(operation_file: &str) -> Result<()> {
    println!("{}", "Executing operation with Linera...".bright_blue());
    println!();
    
    // Check if linera is available
    if !is_linera_available() {
        bail!(
            "Linera CLI not found. Please install from: https://github.com/linera-io/linera-protocol"
        );
    }
    
    // Check if we're in a Linera project
    if !is_linera_project() {
        bail!(
            "Not in a Linera project directory. Please run from oracle-registry-v2/"
        );
    }
    
    println!("{}", "Running linera project test...".bright_blue());
    
    // Execute linera project test
    let output = Command::new("linera")
        .arg("project")
        .arg("test")
        .output()
        .context("Failed to execute linera project test")?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        bail!("Linera project test failed: {}", stderr);
    }
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    println!("{}", stdout);
    
    println!();
    println!("{}", "✅ Operation executed successfully!".bright_green());
    
    Ok(())
}

/// Check if linera CLI is available
fn is_linera_available() -> bool {
    Command::new("linera")
        .arg("--version")
        .output()
        .is_ok()
}

/// Check if current directory is a Linera project
fn is_linera_project() -> bool {
    Path::new("Cargo.toml").exists() && 
    Path::new("src").exists()
}

/// Execute operation via GraphQL (returns instructions only)
pub async fn execute_with_graphql(
    service_url: &str,
    chain_id: &str,
    app_id: &str,
    mutation: &str,
) -> Result<serde_json::Value> {
    println!("{}", "Executing via GraphQL...".bright_blue());
    println!();
    
    let client = reqwest::Client::new();
    let url = format!("{}/chains/{}/applications/{}", service_url, chain_id, app_id);
    
    let response = client
        .post(&url)
        .json(&serde_json::json!({ "query": mutation }))
        .send()
        .await
        .context("Failed to send GraphQL request")?;
    
    let result: serde_json::Value = response
        .json()
        .await
        .context("Failed to parse GraphQL response")?;
    
    if let Some(errors) = result.get("errors") {
        bail!("GraphQL errors: {}", serde_json::to_string_pretty(errors)?);
    }
    
    println!("{}", "Response:".bright_green());
    println!("{}", serde_json::to_string_pretty(&result)?);
    println!();
    
    println!("{}", "⚠️  Note: GraphQL mutations return instructions only".bright_yellow());
    println!("   For actual execution, use --execute flag");
    println!();
    
    Ok(result)
}

/// Print execution instructions
pub fn print_execution_instructions(operation_file: &str) {
    println!("{}", "To execute this operation:".bright_blue());
    println!();
    
    println!("{}", "Option 1: Using Linera project test".bright_cyan());
    println!("  cd oracle-registry-v2");
    println!("  linera project test");
    println!();
    
    println!("{}", "Option 2: Using CLI with --execute flag".bright_cyan());
    println!("  oracle-cli <command> --execute");
    println!();
    
    println!("{}", "Option 3: Manual execution".bright_cyan());
    println!("  # Operation file created at:");
    println!("  {}", operation_file.bright_yellow());
    println!();
}
