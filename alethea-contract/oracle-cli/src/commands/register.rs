// Register voter command handler

use anyhow::{Result, Context};
use colored::*;
use crate::config::Config;
use crate::operations;
use std::fs;
use std::process::Command;

pub async fn handle_register(
    config: &Config,
    stake: u64,
    name: Option<String>,
    metadata_url: Option<String>,
    execute: bool,
) -> Result<()> {
    println!("{}", "Registering as voter...".bright_blue());
    println!();
    
    // Build operation
    let operation = operations::build_register_voter(stake, name.clone(), metadata_url.clone());
    
    // Save operation to temp file
    let temp_file = "/tmp/oracle_register.json";
    let operation_json = serde_json::to_string_pretty(&operation)?;
    fs::write(temp_file, &operation_json)
        .context("Failed to write operation file")?;
    
    println!("Operation:");
    println!("{}", operation_json.bright_yellow());
    println!();
    
    println!("{}", "📝 Operation file created:".bright_blue());
    println!("  {}", temp_file.bright_yellow());
    println!();
    
    println!("{}", "To execute this operation:".bright_blue());
    println!();
    println!("  {}", format!(
        "# Using GraphQL mutation (returns instructions):",
    ).bright_cyan());
    println!("  {}", format!(
        "curl -X POST {} \\",
        config.graphql_url()
    ).bright_white());
    println!("  {}", "  -H \"Content-Type: application/json\" \\".bright_white());
    println!("  {}", format!(
        "  -d '{{\"query\":\"mutation {{ registerVoter(stake: \\\"{}\\\", name: \\\"{}\\\") }}\"}}'",
        stake,
        name.as_deref().unwrap_or("null")
    ).bright_white());
    println!();
    
    println!("  {}", "# Or using Linera CLI (if available):".bright_cyan());
    println!("  {}", "linera project test".bright_white());
    println!();
    
    // Execute if requested
    if execute {
        println!();
        println!("{}", "Executing operation...".bright_blue());
        crate::executor::execute_with_linera_test(temp_file).await?;
    } else {
        println!("{}", "⚠️  Note:".bright_yellow());
        println!("  Operation file created but not executed.");
        println!("  To execute, use --execute flag:");
        println!("  oracle-cli register --stake {} --execute", stake);
        println!();
        
        crate::executor::print_execution_instructions(temp_file);
    }
    
    Ok(())
}


pub async fn handle_register_for(
    config: &Config,
    address: String,
    stake: u64,
    name: Option<String>,
    metadata_url: Option<String>,
    execute: bool,
) -> Result<()> {
    println!("{}", "Registering voter by address (admin operation)...".bright_blue());
    println!();
    
    // Build operation
    let operation = operations::build_register_voter_for(address.clone(), stake, name.clone(), metadata_url.clone());
    
    // Save operation to temp file
    let temp_file = "/tmp/oracle_register_for.json";
    let operation_json = serde_json::to_string_pretty(&operation)?;
    fs::write(temp_file, &operation_json)
        .context("Failed to write operation file")?;
    
    println!("Operation:");
    println!("{}", operation_json.bright_yellow());
    println!();
    
    println!("{}", "📝 Operation file created:".bright_blue());
    println!("  {}", temp_file.bright_yellow());
    println!();
    
    // Execute if requested
    if execute {
        println!();
        println!("{}", "Executing operation...".bright_blue());
        crate::executor::execute_with_linera_test(temp_file).await?;
    } else {
        println!("{}", "⚠️  Note:".bright_yellow());
        println!("  Operation file created but not executed.");
        println!("  To execute, use --execute flag:");
        println!("  oracle-cli register-for --address {} --stake {} --execute", address, stake);
        println!();
        
        crate::executor::print_execution_instructions(temp_file);
    }
    
    Ok(())
}
