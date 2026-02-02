// Linera Executor - Tool untuk mengeksekusi operasi pada Linera chain
// Menggunakan Linera SDK untuk direct execution

use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use oracle_registry_v2::{Operation, Message};
use std::path::PathBuf;
use tracing::info;

mod executor;
use executor::LineraExecutor;

#[derive(Parser)]
#[command(name = "linera-executor")]
#[command(about = "Execute operations on Linera chains", long_about = None)]
struct Cli {
    /// Chain ID to execute on
    #[arg(long, env = "CHAIN_ID")]
    chain_id: Option<String>,

    /// Application ID
    #[arg(long, env = "APP_ID")]
    app_id: Option<String>,

    /// Wallet path
    #[arg(long, env = "WALLET_PATH", default_value = "~/.config/linera/wallet.json")]
    wallet_path: String,

    /// Storage path
    #[arg(long, env = "STORAGE_PATH", default_value = "rocksdb:~/.config/linera/wallet.db")]
    storage_path: String,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Register as a voter
    RegisterVoter {
        /// Stake amount
        #[arg(long)]
        stake: String,

        /// Voter name (optional)
        #[arg(long)]
        name: Option<String>,

        /// Metadata URL (optional)
        #[arg(long)]
        metadata_url: Option<String>,
    },

    /// Submit a vote
    SubmitVote {
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

    /// Create a query
    CreateQuery {
        /// Query description
        #[arg(long)]
        description: String,

        /// Possible outcomes (comma-separated)
        #[arg(long)]
        outcomes: String,

        /// Decision strategy
        #[arg(long, default_value = "Majority")]
        strategy: String,

        /// Minimum votes required
        #[arg(long)]
        min_votes: Option<u32>,

        /// Reward amount
        #[arg(long)]
        reward: String,
    },

    /// Update stake
    UpdateStake {
        /// Additional stake amount
        #[arg(long)]
        amount: String,
    },

    /// Withdraw stake
    WithdrawStake {
        /// Amount to withdraw
        #[arg(long)]
        amount: String,
    },

    /// Claim rewards
    ClaimRewards,

    /// Execute operation from JSON file
    ExecuteFile {
        /// Path to operation JSON file
        #[arg(long)]
        file: PathBuf,
    },

    /// Send message to chain
    SendMessage {
        /// Target chain ID
        #[arg(long)]
        target_chain: String,

        /// Message JSON
        #[arg(long)]
        message: String,
    },

    /// Test connection
    Test,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive(tracing::Level::INFO.into()),
        )
        .init();

    let cli = Cli::parse();

    info!("🔷 Linera Executor");
    info!("==================");

    // Expand home directory in paths
    let wallet_path = expand_home(&cli.wallet_path);
    let storage_path = expand_storage_path(&cli.storage_path);

    info!("Wallet: {}", wallet_path);
    info!("Storage: {}", storage_path);

    // Get chain and app IDs
    let chain_id = cli.chain_id
        .context("Chain ID required (use --chain-id or CHAIN_ID env)")?;
    let app_id = cli.app_id
        .context("App ID required (use --app-id or APP_ID env)")?;

    info!("Chain ID: {}", chain_id);
    info!("App ID: {}", app_id);
    info!("");

    // Create executor
    let executor = LineraExecutor::new(
        chain_id.clone(),
        app_id.clone(),
        wallet_path,
        storage_path,
    )?;

    // Execute command
    match cli.command {
        Commands::RegisterVoter { stake, name, metadata_url } => {
            info!("📝 Registering voter...");
            info!("  Stake: {}", stake);
            info!("  Name: {:?}", name);
            info!("  Metadata URL: {:?}", metadata_url);
            info!("");

            let result = executor.register_voter(stake, name, metadata_url).await?;
            
            info!("✅ Success!");
            info!("{}", result);
        }

        Commands::SubmitVote { query_id, value, confidence } => {
            info!("🗳️  Submitting vote...");
            info!("  Query ID: {}", query_id);
            info!("  Value: {}", value);
            info!("  Confidence: {:?}", confidence);
            info!("");

            let result = executor.submit_vote(query_id, value, confidence).await?;
            
            info!("✅ Success!");
            info!("{}", result);
        }

        Commands::CreateQuery { description, outcomes, strategy, min_votes, reward } => {
            info!("📋 Creating query...");
            info!("  Description: {}", description);
            info!("  Outcomes: {}", outcomes);
            info!("  Strategy: {}", strategy);
            info!("  Min votes: {:?}", min_votes);
            info!("  Reward: {}", reward);
            info!("");

            let outcomes_vec: Vec<String> = outcomes
                .split(',')
                .map(|s| s.trim().to_string())
                .collect();

            let result = executor.create_query(
                description,
                outcomes_vec,
                strategy,
                min_votes,
                reward,
            ).await?;
            
            info!("✅ Success!");
            info!("{}", result);
        }

        Commands::UpdateStake { amount } => {
            info!("💰 Updating stake...");
            info!("  Amount: {}", amount);
            info!("");

            let result = executor.update_stake(amount).await?;
            
            info!("✅ Success!");
            info!("{}", result);
        }

        Commands::WithdrawStake { amount } => {
            info!("💸 Withdrawing stake...");
            info!("  Amount: {}", amount);
            info!("");

            let result = executor.withdraw_stake(amount).await?;
            
            info!("✅ Success!");
            info!("{}", result);
        }

        Commands::ClaimRewards => {
            info!("🎁 Claiming rewards...");
            info!("");

            let result = executor.claim_rewards().await?;
            
            info!("✅ Success!");
            info!("{}", result);
        }

        Commands::ExecuteFile { file } => {
            info!("📄 Executing operation from file...");
            info!("  File: {:?}", file);
            info!("");

            let content = std::fs::read_to_string(&file)
                .context("Failed to read operation file")?;
            
            let operation: Operation = serde_json::from_str(&content)
                .context("Failed to parse operation JSON")?;

            let result = executor.execute_operation(operation).await?;
            
            info!("✅ Success!");
            info!("{}", result);
        }

        Commands::SendMessage { target_chain, message } => {
            info!("📨 Sending message...");
            info!("  Target chain: {}", target_chain);
            info!("  Message: {}", message);
            info!("");

            let msg: Message = serde_json::from_str(&message)
                .context("Failed to parse message JSON")?;

            let result = executor.send_message(target_chain, msg).await?;
            
            info!("✅ Success!");
            info!("{}", result);
        }

        Commands::Test => {
            info!("🧪 Testing connection...");
            info!("");

            let result = executor.test_connection().await?;
            
            info!("✅ Connection OK!");
            info!("{}", result);
        }
    }

    Ok(())
}

fn expand_home(path: &str) -> String {
    if path.starts_with("~/") {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        path.replacen("~", &home, 1)
    } else {
        path.to_string()
    }
}

fn expand_storage_path(path: &str) -> String {
    if path.contains("~/") {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        path.replace("~", &home)
    } else {
        path.to_string()
    }
}
