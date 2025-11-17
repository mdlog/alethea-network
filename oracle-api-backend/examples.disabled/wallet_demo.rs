use anyhow::Result;
use oracle_api_backend::wallet::Wallet;

fn main() -> Result<()> {
    // Generate new wallet
    let wallet = Wallet::generate()?;
    println!("Generated wallet: {}", wallet.private_key);

    // Convert to key pair
    let key_pair = wallet.to_key_pair()?;
    println!("Public key: {}", key_pair.public());

    // Create from existing private key
    let existing_wallet = Wallet::new("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef".to_string());
    let existing_key_pair = existing_wallet.to_key_pair()?;
    println!("Existing public key: {}", existing_key_pair.public());

    Ok(())
}