// Vote command handler

use anyhow::{Result, Context};
use colored::*;
use crate::config::Config;
use crate::operations;
use std::fs;

pub async fn handle_vote(
    config: &Config,
    query_id: u64,
    value: String,
    confidence: Option<u8>,
) -> Result<()> {
    println!("{}", "Submitting vote...".bright_blue());
    println!();
    
    // Validate confidence
    if let Some(c) = confidence {
        if c > 100 {
            anyhow::bail!("Confidence must be between 0 and 100");
        }
    }
    
    // Build operation
    let operation = operations::build_submit_vote(query_id, value.clone(), confidence);
    
    // Save operation to temp file
    let temp_file = format!("/tmp/oracle_vote_{}.json", query_id);
    let operation_json = serde_json::to_string_pretty(&operation)?;
    fs::write(&temp_file, &operation_json)
        .context("Failed to write operation file")?;
    
    println!("Operation:");
    println!("{}", operation_json.bright_yellow());
    println!();
    
    println!("{}", "📝 Operation file created:".bright_blue());
    println!("  {}", temp_file.bright_yellow());
    println!();
    
    println!("{}", "Vote Details:".bright_blue());
    println!("  Query ID: {}", query_id.to_string().bright_white());
    println!("  Value: {}", value.bright_white());
    println!("  Confidence: {}%", confidence.map(|c| c.to_string()).unwrap_or("not specified".to_string()).bright_white());
    println!();
    
    Ok(())
}
