use anyhow::{Context, Result};
use linera_base::crypto::KeyPair;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct Wallet {
    pub private_key: String,
    pub address: Option<String>,
}

impl Wallet {
    pub fn new(private_key: String) -> Self {
        Self {
            private_key,
            address: None,
        }
    }

    pub fn from_file<P: AsRef<Path>>(path: P) -> Result<Self> {
        let content = std::fs::read_to_string(path)?;
        let wallet: Self = serde_json::from_str(&content)?;
        Ok(wallet)
    }

    pub fn to_key_pair(&self) -> Result<KeyPair> {
        let hex = self.private_key.strip_prefix("0x").unwrap_or(&self.private_key);
        let bytes = hex::decode(hex).context("Invalid hex format")?;
        
        if bytes.len() != 32 {
            return Err(anyhow::anyhow!("Private key must be 32 bytes"));
        }
        
        let mut key_bytes = [0u8; 32];
        key_bytes.copy_from_slice(&bytes);
        
        Ok(KeyPair::generate_from(&key_bytes))
    }

    pub fn generate() -> Result<Self> {
        let key_pair = KeyPair::generate();
        let private_key = hex::encode(key_pair.private().as_bytes());
        
        Ok(Self::new(format!("0x{}", private_key)))
    }
}