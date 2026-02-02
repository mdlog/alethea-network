// Configuration management for Oracle CLI

use anyhow::{Result, Context, bail};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub chain_id: String,
    pub app_id: String,
    pub service_url: String,
}

impl Config {
    /// Load config from file or create from parameters
    pub fn load_or_create(
        chain_id: Option<String>,
        app_id: Option<String>,
        service_url: String,
    ) -> Result<Self> {
        // Try to load from file first
        if let Ok(config) = Self::load_from_file() {
            // Override with CLI parameters if provided
            return Ok(Self {
                chain_id: chain_id.unwrap_or(config.chain_id),
                app_id: app_id.unwrap_or(config.app_id),
                service_url,
            });
        }
        
        // If no file, require CLI parameters
        let chain_id = chain_id.context(
            "Chain ID not provided. Use --chain-id or run 'oracle-cli init'"
        )?;
        let app_id = app_id.context(
            "App ID not provided. Use --app-id or run 'oracle-cli init'"
        )?;
        
        Ok(Self {
            chain_id,
            app_id,
            service_url,
        })
    }
    
    /// Load config from file
    pub fn load_from_file() -> Result<Self> {
        let path = Self::config_path()?;
        let content = fs::read_to_string(&path)
            .context("Failed to read config file")?;
        let config: Config = serde_json::from_str(&content)
            .context("Failed to parse config file")?;
        Ok(config)
    }
    
    /// Save config to file
    pub fn save_to_file(&self) -> Result<()> {
        let path = Self::config_path()?;
        
        // Create parent directory if it doesn't exist
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)
                .context("Failed to create config directory")?;
        }
        
        let content = serde_json::to_string_pretty(self)
            .context("Failed to serialize config")?;
        fs::write(&path, content)
            .context("Failed to write config file")?;
        
        Ok(())
    }
    
    /// Get config file path
    fn config_path() -> Result<PathBuf> {
        let home = dirs::home_dir()
            .context("Failed to get home directory")?;
        Ok(home.join(".oracle-cli").join("config.json"))
    }
    
    /// Get GraphQL endpoint URL
    pub fn graphql_url(&self) -> String {
        format!(
            "{}/chains/{}/applications/{}",
            self.service_url, self.chain_id, self.app_id
        )
    }
}
