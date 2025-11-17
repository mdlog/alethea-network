use anyhow::Result;
use linera_base::{
    crypto::{CryptoHash, KeyPair, Signature},
    identifiers::Owner,
};

pub trait Signer {
    fn address(&self) -> String;
    fn sign(&self, owner: &str, value: &[u8]) -> Result<Signature>;
    fn get_public_key(&self, owner: &str) -> Result<String>;
    fn contains_key(&self, owner: &str) -> bool;
}

pub struct PrivateKeySigner {
    key_pair: KeyPair,
    owner: Owner,
}

impl PrivateKeySigner {
    pub fn new(key_pair: KeyPair) -> Self {
        let owner = Owner::from(key_pair.public());
        Self { key_pair, owner }
    }
}

impl Signer for PrivateKeySigner {
    fn address(&self) -> String {
        self.owner.to_string()
    }

    fn sign(&self, owner: &str, value: &[u8]) -> Result<Signature> {
        if self.owner.to_string() != owner {
            return Err(anyhow::anyhow!("Invalid owner address"));
        }
        
        let hash = CryptoHash::new(value);
        Ok(self.key_pair.sign(&hash))
    }

    fn get_public_key(&self, owner: &str) -> Result<String> {
        if self.owner.to_string() != owner {
            return Err(anyhow::anyhow!("Invalid owner address"));
        }
        
        Ok(self.key_pair.public().to_string())
    }

    fn contains_key(&self, owner: &str) -> bool {
        self.owner.to_string() == owner
    }
}