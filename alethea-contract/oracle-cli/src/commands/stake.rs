// Stake management command handlers

use anyhow::{Result, Context};
use colored::*;
use crate::config::Config;
use crate::operations;
use std::fs;

pub async fn handle_update_stake(
    config: &Config,
    amount: u64,
) -> Result<()> {
    println!("{}", "Updating stake...".bright_blue());
    println!();
    
    // Build operation
    let operation = operations::build_update_stake(amount);
    
    // Save operation to temp file
    let temp_file = "/tmp/oracle_update_stake.json";
    let operation_json = serde_json::to_string_pretty(&operation)?;
    fs::write(temp_file, &operation_json)
        .context("Failed to write operation file")?;
    
    println!("Operation:");
    println!("{}", operation_json.bright_yellow());
    println!();
    
    println!("{}", "📝 Operation file created:".bright_blue());
    println!("  {}", temp_file.bright_yellow());
    println!();
    
    println!("{}", "Stake Update:".bright_blue());
    println!("  Additional Stake: {} tokens", amount.to_string().bright_white());
    println!();
    
    Ok(())
}

pub async fn handle_withdraw_stake(
    config: &Config,
    amount: u64,
) -> Result<()> {
    println!("{}", "Withdrawing stake...".bright_blue());
    println!();
    
    // Build operation
    let operation = operations::build_withdraw_stake(amount);
    
    // Save operation to temp file
    let temp_file = "/tmp/oracle_withdraw_stake.json";
    let operation_json = serde_json::to_string_pretty(&operation)?;
    fs::write(temp_file, &operation_json)
        .context("Failed to write operation file")?;
    
    println!("Operation:");
    println!("{}", operation_json.bright_yellow());
    println!();
    
    println!("{}", "📝 Operation file created:".bright_blue());
    println!("  {}", temp_file.bright_yellow());
    println!();
    
    println!("{}", "Stake Withdrawal:".bright_blue());
    println!("  Amount: {} tokens", amount.to_string().bright_white());
    println!();
    
    Ok(())
}
