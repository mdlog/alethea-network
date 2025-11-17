// Example: Using Linera Client with Private Key Management
// Based on Linera's EIP-191 signing approach

use anyhow::Result;
use oracle_api_backend::{linera_client::LineraClient, wallet::Wallet};
use std::fs;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::init();

    // Create a test wallet file with private key
    create_test_wallet().await?;

    // Initialize Linera client
    let mut client = LineraClient::new(
        "371f1707095d36c155e513a9cf7030760acda20278a14828f5d176dd8fffecce".to_string(),
        "4399b6b80563056e65fb0ef10e7988952c609bd97c6f9fb171ae07899888fa15".to_string(),
        "/tmp/test_wallet.json".to_string(),
        "rocksdb:/tmp/test_storage".to_string(),
    ).await?;

    // Load private key from wallet
    client.load_key_pair().await?;

    // Get owner address
    let owner = client.get_owner()?;
    println!("Owner address: {}", owner);

    // Get public key
    let public_key = client.get_public_key()?;
    println!("Public key: {}", public_key);

    // Sign a test message
    let test_message = b"Hello, Linera!";
    let signature = client.sign_message(test_message)?;
    println!("Signature: {}", signature);

    // Register as voter (mock execution)
    let result = client.register_voter(
        "1000".to_string(),
        Some("Test Voter".to_string()),
        Some("https://example.com/metadata".to_string()),
    ).await?;
    
    println!("Registration result:\n{}", result);

    Ok(())
}

/// Create a test wallet file with a sample private key
async fn create_test_wallet() -> Result<()> {
    let wallet = Wallet::new("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef".to_string());
    let wallet_json = serde_json::to_string_pretty(&wallet)?;
    
    fs::write("/tmp/test_wallet.json", wallet_json)?;
    println!("Created test wallet at /tmp/test_wallet.json");

    Ok(())
}