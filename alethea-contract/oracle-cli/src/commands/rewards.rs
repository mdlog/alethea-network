// Rewards command handler

use anyhow::{Result, Context};
use colored::*;
use crate::config::Config;
use crate::operations;
use std::fs;

pub async fn handle_claim_rewards(
    config: &Config,
) -> Result<()> {
    println!("{}", "Claiming rewards...".bright_blue());
    println!();
    
    // Build operation
    let operation = operations::build_claim_rewards();
    
    // Save operation to temp file
    let temp_file = "/tmp/oracle_claim_rewards.json";
    let operation_json = serde_json::to_string_pretty(&operation)?;
    fs::write(temp_file, &operation_json)
        .context("Failed to write operation file")?;
    
    println!("Operation:");
    println!("{}", operation_json.bright_yellow());
    println!();
    
    println!("{}", "📝 Operation file created:".bright_blue());
    println!("  {}", temp_file.bright_yellow());
    println!();
    
    Ok(())
}
