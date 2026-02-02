// Create query command handler

use anyhow::{Result, Context};
use colored::*;
use crate::config::Config;
use crate::operations;
use std::fs;

pub async fn handle_create_query(
    config: &Config,
    description: String,
    outcomes: String,
    strategy: String,
    min_votes: Option<usize>,
    reward: u64,
) -> Result<()> {
    println!("{}", "Creating query...".bright_blue());
    println!();
    
    // Parse outcomes
    let outcomes_vec: Vec<String> = outcomes
        .split(',')
        .map(|s| s.trim().to_string())
        .collect();
    
    if outcomes_vec.is_empty() {
        anyhow::bail!("At least one outcome must be provided");
    }
    
    // Build operation
    let operation = operations::build_create_query(
        description.clone(),
        outcomes_vec.clone(),
        strategy.clone(),
        min_votes,
        reward,
    );
    
    // Save operation to temp file
    let temp_file = "/tmp/oracle_create_query.json";
    let operation_json = serde_json::to_string_pretty(&operation)?;
    fs::write(temp_file, &operation_json)
        .context("Failed to write operation file")?;
    
    println!("Operation:");
    println!("{}", operation_json.bright_yellow());
    println!();
    
    println!("{}", "📝 Operation file created:".bright_blue());
    println!("  {}", temp_file.bright_yellow());
    println!();
    
    println!("{}", "Query Details:".bright_blue());
    println!("  Description: {}", description.bright_white());
    println!("  Outcomes: {}", outcomes_vec.join(", ").bright_white());
    println!("  Strategy: {}", strategy.bright_white());
    println!("  Min Votes: {}", min_votes.map(|v| v.to_string()).unwrap_or("default".to_string()).bright_white());
    println!("  Reward: {} tokens", reward.to_string().bright_white());
    println!();
    
    println!("{}", "To execute this operation:".bright_blue());
    println!("  See register command for execution instructions");
    println!();
    
    Ok(())
}
