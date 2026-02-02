// Resolve query command handler

use anyhow::{Result, Context};
use colored::*;
use crate::config::Config;
use crate::operations;
use std::fs;

pub async fn handle_resolve(
    config: &Config,
    query_id: u64,
) -> Result<()> {
    println!("{}", "Resolving query...".bright_blue());
    println!();
    
    // Build operation
    let operation = operations::build_resolve_query(query_id);
    
    // Save operation to temp file
    let temp_file = format!("/tmp/oracle_resolve_{}.json", query_id);
    let operation_json = serde_json::to_string_pretty(&operation)?;
    fs::write(&temp_file, &operation_json)
        .context("Failed to write operation file")?;
    
    println!("Operation:");
    println!("{}", operation_json.bright_yellow());
    println!();
    
    println!("{}", "📝 Operation file created:".bright_blue());
    println!("  {}", temp_file.bright_yellow());
    println!();
    
    println!("{}", "Resolving Query:".bright_blue());
    println!("  Query ID: {}", query_id.to_string().bright_white());
    println!();
    
    Ok(())
}
