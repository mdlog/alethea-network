// Oracle CLI - Command-line tool for Alethea Oracle Registry
// 
// This tool provides a simple interface to interact with the oracle contract
// by wrapping Linera CLI commands and providing a user-friendly experience.

use clap::{Parser, Subcommand};
use colored::*;
use anyhow::{Result, Context};
use std::process::Command;

mod config;
mod operations;
mod commands;
mod executor;

use config::Config;

#[derive(Parser)]
#[command(name = "oracle-cli")]
#[command(about = "CLI tool for Alethea Oracle Registry", long_about = None)]
struct Cli {
    /// Chain ID
    #[arg(long)]
    chain_id: Option<String>,
    
    /// Application ID
    #[arg(long)]
    app_id: Option<String>,
    
    /// Service URL
    #[arg(long, default_value = "http://localhost:8080")]
    service_url: String,
    
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Register as a voter
    Register {
        /// Stake amount in tokens
        #[arg(long)]
        stake: u64,
        
        /// Voter name (optional)
        #[arg(long)]
        name: Option<String>,
        
        /// Metadata URL (optional)
        #[arg(long)]
        metadata_url: Option<String>,
        
        /// Execute operation immediately
        #[arg(long)]
        execute: bool,
    },
    
    /// Register a voter by address (admin operation)
    RegisterFor {
        /// Voter address (hex string)
        #[arg(long)]
        address: String,
        
        /// Stake amount in tokens
        #[arg(long)]
        stake: u64,
        
        /// Voter name (optional)
        #[arg(long)]
        name: Option<String>,
        
        /// Metadata URL (optional)
        #[arg(long)]
        metadata_url: Option<String>,
        
        /// Execute operation immediately
        #[arg(long)]
        execute: bool,
    },
    
    /// Create a new query
    CreateQuery {
        /// Query description
        #[arg(long)]
        description: String,
        
        /// Possible outcomes (comma-separated)
        #[arg(long)]
        outcomes: String,
        
        /// Decision strategy (Majority, Median, WeightedByStake, WeightedByReputation)
        #[arg(long, default_value = "Majority")]
        strategy: String,
        
        /// Minimum votes required
        #[arg(long)]
        min_votes: Option<usize>,
        
        /// Reward amount in tokens
        #[arg(long)]
        reward: u64,
    },
    
    /// Submit a vote
    Vote {
        /// Query ID
        #[arg(long)]
        query_id: u64,
        
        /// Vote value
        #[arg(long)]
        value: String,
        
        /// Confidence (0-100)
        #[arg(long)]
        confidence: Option<u8>,
    },
    
    /// Resolve a query
    Resolve {
        /// Query ID
        #[arg(long)]
        query_id: u64,
    },
    
    /// Update stake
    UpdateStake {
        /// Additional stake amount
        #[arg(long)]
        amount: u64,
    },
    
    /// Withdraw stake
    WithdrawStake {
        /// Amount to withdraw
        #[arg(long)]
        amount: u64,
    },
    
    /// Claim rewards
    ClaimRewards,
    
    /// List all voters
    ListVoters {
        /// Limit number of results
        #[arg(long, default_value = "100")]
        limit: i32,
        
        /// Show only active voters
        #[arg(long)]
        active_only: bool,
    },
    
    /// List all queries
    ListQueries {
        /// Show only active queries
        #[arg(long)]
        active_only: bool,
    },
    
    /// Get voter info
    GetVoter {
        /// Voter address
        #[arg(long)]
        address: String,
    },
    
    /// Get query info
    GetQuery {
        /// Query ID
        #[arg(long)]
        query_id: u64,
    },
    
    /// Get protocol statistics
    Stats,
    
    /// Initialize configuration
    Init {
        /// Chain ID
        #[arg(long)]
        chain_id: String,
        
        /// Application ID
        #[arg(long)]
        app_id: String,
        
        /// Service URL
        #[arg(long, default_value = "http://localhost:8080")]
        service_url: String,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    
    // Print banner
    println!("{}", "🔮 Alethea Oracle CLI".bright_cyan().bold());
    println!("{}", "======================".bright_cyan());
    println!();
    
    // Handle init command separately
    if let Commands::Init { chain_id, app_id, service_url } = cli.command {
        return commands::init::handle_init(&chain_id, &app_id, &service_url).await;
    }
    
    // Load or create config
    let config = Config::load_or_create(
        cli.chain_id,
        cli.app_id,
        cli.service_url,
    )?;
    
    // Display config
    println!("{}", "Configuration:".bright_blue());
    println!("  Chain ID: {}", config.chain_id.bright_yellow());
    println!("  App ID: {}", config.app_id.bright_yellow());
    println!("  Service URL: {}", config.service_url.bright_yellow());
    println!();
    
    // Execute command
    match cli.command {
        Commands::Register { stake, name, metadata_url, execute } => {
            commands::register::handle_register(&config, stake, name, metadata_url, execute).await
        }
        Commands::RegisterFor { address, stake, name, metadata_url, execute } => {
            commands::register::handle_register_for(&config, address, stake, name, metadata_url, execute).await
        }
        Commands::CreateQuery { description, outcomes, strategy, min_votes, reward } => {
            commands::create_query::handle_create_query(
                &config,
                description,
                outcomes,
                strategy,
                min_votes,
                reward,
            ).await
        }
        Commands::Vote { query_id, value, confidence } => {
            commands::vote::handle_vote(&config, query_id, value, confidence).await
        }
        Commands::Resolve { query_id } => {
            commands::resolve::handle_resolve(&config, query_id).await
        }
        Commands::UpdateStake { amount } => {
            commands::stake::handle_update_stake(&config, amount).await
        }
        Commands::WithdrawStake { amount } => {
            commands::stake::handle_withdraw_stake(&config, amount).await
        }
        Commands::ClaimRewards => {
            commands::rewards::handle_claim_rewards(&config).await
        }
        Commands::ListVoters { limit, active_only } => {
            commands::query::handle_list_voters(&config, limit, active_only).await
        }
        Commands::ListQueries { active_only } => {
            commands::query::handle_list_queries(&config, active_only).await
        }
        Commands::GetVoter { address } => {
            commands::query::handle_get_voter(&config, &address).await
        }
        Commands::GetQuery { query_id } => {
            commands::query::handle_get_query(&config, query_id).await
        }
        Commands::Stats => {
            commands::query::handle_stats(&config).await
        }
        Commands::Init { .. } => {
            // Already handled above
            Ok(())
        }
    }
}
