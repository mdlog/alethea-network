// Init command handler

use anyhow::Result;
use colored::*;
use crate::config::Config;

pub async fn handle_init(
    chain_id: &str,
    app_id: &str,
    service_url: &str,
) -> Result<()> {
    println!("{}", "Initializing Oracle CLI configuration...".bright_blue());
    println!();
    
    let config = Config {
        chain_id: chain_id.to_string(),
        app_id: app_id.to_string(),
        service_url: service_url.to_string(),
    };
    
    config.save_to_file()?;
    
    println!("{}", "✅ Configuration saved!".bright_green());
    println!();
    println!("Configuration:");
    println!("  Chain ID: {}", config.chain_id.bright_yellow());
    println!("  App ID: {}", config.app_id.bright_yellow());
    println!("  Service URL: {}", config.service_url.bright_yellow());
    println!();
    println!("You can now use oracle-cli without specifying these parameters.");
    println!();
    
    Ok(())
}
