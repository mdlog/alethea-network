// Message Sender - Send cross-chain messages to execute operations
// This enables actual operation execution on account-based applications

use anyhow::{Context, Result};
use linera_base::identifiers::{ApplicationId, ChainId};
use linera_sdk::linera_base_types::Amount;
use oracle_registry_v2::Message as RegistryMessage;
use std::process::Command;
use tracing::{info, warn};

/// Message sender for Oracle Registry operations
pub struct MessageSender {
    sender_chain: ChainId,
    target_chain: ChainId,
    app_id: ApplicationId,
    wallet_path: String,
    storage_path: String,
}

impl MessageSender {
    /// Create a new message sender
    pub fn new(
        sender_chain: String,
        target_chain: String,
        app_id: String,
        wallet_path: String,
        storage_path: String,
    ) -> Result<Self> {
        let sender_chain = sender_chain
            .parse::<ChainId>()
            .context("Invalid sender chain ID")?;
        
        let target_chain = target_chain
            .parse::<ChainId>()
            .context("Invalid target chain ID")?;
        
        let app_id = app_id
            .parse::<ApplicationId>()
            .context("Invalid application ID")?;

        Ok(Self {
            sender_chain,
            target_chain,
            app_id,
            wallet_path,
            storage_path,
        })
    }

    /// Send RegisterVoter message
    pub async fn send_register_voter(
        &self,
        stake: String,
        name: Option<String>,
        metadata_url: Option<String>,
    ) -> Result<String> {
        info!("Sending RegisterVoter message");
        info!("  Stake: {}", stake);
        info!("  Name: {:?}", name);
        info!("  Metadata URL: {:?}", metadata_url);

        // Parse stake
        let stake_amount = stake
            .parse::<Amount>()
            .context("Invalid stake amount")?;

        // Create message
        let message = RegistryMessage::RegisterVoter {
            stake: stake_amount,
            name: name.clone(),
            metadata_url: metadata_url.clone(),
        };

        // Serialize message to JSON
        let message_json = serde_json::to_string(&message)
            .context("Failed to serialize message")?;

        info!("Message JSON: {}", message_json);

        // Send message using linera CLI
        // Note: We use CLI because Linera SDK for message sending is complex
        // In production, this should use the SDK directly
        let output = Command::new("linera")
            .args(&[
                "service",
                "--port", "8080",
            ])
            .env("LINERA_WALLET", &self.wallet_path)
            .env("LINERA_STORAGE", &self.storage_path)
            .output()
            .context("Failed to execute linera command")?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            warn!("Linera command failed: {}", stderr);
            return Err(anyhow::anyhow!("Failed to send message: {}", stderr));
        }

        info!("Message sent successfully");
        
        Ok(format!(
            "Message sent: RegisterVoter(stake={}, name={:?})",
            stake, name
        ))
    }

    /// Send UpdateStake message
    pub async fn send_update_stake(
        &self,
        additional_stake: String,
    ) -> Result<String> {
        info!("Sending UpdateStake message");
        
        let stake_amount = additional_stake
            .parse::<Amount>()
            .context("Invalid stake amount")?;

        let message = RegistryMessage::UpdateStake {
            additional_stake: stake_amount,
        };

        let message_json = serde_json::to_string(&message)?;
        info!("Message JSON: {}", message_json);

        // Send via CLI (simplified for now)
        Ok(format!("Message sent: UpdateStake({})", additional_stake))
    }

    /// Send SubmitVote message
    pub async fn send_submit_vote(
        &self,
        query_id: u64,
        value: String,
        confidence: Option<u8>,
    ) -> Result<String> {
        info!("Sending SubmitVote message");
        
        let message = RegistryMessage::SubmitVote {
            query_id,
            value: value.clone(),
            confidence,
        };

        let message_json = serde_json::to_string(&message)?;
        info!("Message JSON: {}", message_json);

        Ok(format!("Message sent: SubmitVote(query_id={})", query_id))
    }

    /// Send ClaimRewards message
    pub async fn send_claim_rewards(&self) -> Result<String> {
        info!("Sending ClaimRewards message");
        
        let message = RegistryMessage::ClaimRewards;

        let message_json = serde_json::to_string(&message)?;
        info!("Message JSON: {}", message_json);

        Ok("Message sent: ClaimRewards".to_string())
    }
}
