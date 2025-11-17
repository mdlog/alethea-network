// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Tests for migration functionality

#[cfg(test)]
mod tests {
    use crate::test_utils::test_helpers::*;
    use crate::migration::*;
    use linera_sdk::linera_base_types::Timestamp;
    
    #[test]
    fn test_parse_export_json() {
        let json = r#"{
            "metadata": {
                "exported_at": 1700000000000000,
                "registry_chain_id": "chain123",
                "registry_app_id": "app456",
                "version": "1.0.0",
                "total_voters": 5,
                "total_active_markets": 2,
                "notes": "Test export"
            },
            "voters": [],
            "active_markets": [],
            "statistics": {
                "totalMarketsCreated": 10,
                "totalMarketsResolved": 8
            },
            "parameters": {
                "minStake": "1000",
                "minVotersPerMarket": 3,
                "maxVotersPerMarket": 50
            }
        }"#;
        
        let export = RegistryExport::from_json(json).unwrap();
        assert_eq!(export.metadata.version, "1.0.0");
        assert_eq!(export.metadata.total_voters, 5);
        assert_eq!(export.metadata.total_active_markets, 2);
    }
    
    #[test]
    fn test_validate_export() {
        let export = RegistryExport {
            metadata: ExportMetadata {
                exported_at: 0,
                registry_chain_id: "chain1".to_string(),
                registry_app_id: "app1".to_string(),
                version: "1.0.0".to_string(),
                total_voters: 0,
                total_active_markets: 0,
                notes: "test".to_string(),
            },
            voters: vec![],
            active_markets: vec![],
            statistics: ExportStatistics {
                total_markets_created: Some(0),
                total_markets_resolved: Some(0),
                total_fees_collected: Some("0".to_string()),
                total_stake: Some("0".to_string()),
                total_locked_stake: Some("0".to_string()),
                total_rewards_distributed: Some("0".to_string()),
            },
            parameters: ExportParameters {
                min_stake: Some("100".to_string()),
                min_voters_per_market: Some(3),
                max_voters_per_market: Some(50),
            },
        };
        
        assert!(export.validate().is_some());
    }
    
    #[test]
    fn test_get_migratable_queries_safe_mode() {
        let current_time = Timestamp::from(1700000000000000u64);
        let future_deadline = 1700100000000000u64;
        let past_deadline = 1699900000000000u64;
        
        let export = RegistryExport {
            metadata: ExportMetadata {
                exported_at: 0,
                registry_chain_id: "chain1".to_string(),
                registry_app_id: "app1".to_string(),
                version: "1.0.0".to_string(),
                total_voters: 0,
                total_active_markets: 2,
                notes: "test".to_string(),
            },
            voters: vec![],
            active_markets: vec![
                OldMarketData {
                    id: 1,
                    requester_app: Some("app1".to_string()),
                    requester_chain: Some("chain1".to_string()),
                    question: Some("Question 1?".to_string()),
                    description: None,
                    outcomes: vec!["Yes".to_string(), "No".to_string()],
                    created_at: 1699000000000000,
                    deadline: future_deadline,
                    fee_paid: Some("1000".to_string()),
                    reward_amount: None,
                    status: "Active".to_string(),
                    votes: None,
                    selected_voters: None,
                },
                OldMarketData {
                    id: 2,
                    requester_app: Some("app1".to_string()),
                    requester_chain: Some("chain1".to_string()),
                    question: Some("Question 2?".to_string()),
                    description: None,
                    outcomes: vec!["Yes".to_string(), "No".to_string()],
                    created_at: 1699000000000000,
                    deadline: past_deadline,
                    fee_paid: Some("1000".to_string()),
                    reward_amount: None,
                    status: "Active".to_string(),
                    votes: None,
                    selected_voters: None,
                },
            ],
            statistics: ExportStatistics {
                total_markets_created: Some(2),
                total_markets_resolved: Some(0),
                total_fees_collected: Some("2000".to_string()),
                total_stake: Some("0".to_string()),
                total_locked_stake: Some("0".to_string()),
                total_rewards_distributed: Some("0".to_string()),
            },
            parameters: ExportParameters {
                min_stake: Some("100".to_string()),
                min_voters_per_market: Some(3),
                max_voters_per_market: Some(50),
            },
        };
        
        let options = MigrationOptions {
            safe_mode: true,
            skip_existing: true,
            validate_data: true,
            current_time,
        };
        
        let migratable = export.get_migratable_queries(&options);
        
        // Only the query with future deadline should be migratable
        assert_eq!(migratable.len(), 1);
        assert_eq!(migratable[0].id, 1);
    }
    
    #[test]
    fn test_get_migratable_queries_full_mode() {
        let current_time = Timestamp::from(1700000000000000u64);
        let future_deadline = 1700100000000000u64;
        let past_deadline = 1699900000000000u64;
        
        let export = RegistryExport {
            metadata: ExportMetadata {
                exported_at: 0,
                registry_chain_id: "chain1".to_string(),
                registry_app_id: "app1".to_string(),
                version: "1.0.0".to_string(),
                total_voters: 0,
                total_active_markets: 2,
                notes: "test".to_string(),
            },
            voters: vec![],
            active_markets: vec![
                OldMarketData {
                    id: 1,
                    requester_app: Some("app1".to_string()),
                    requester_chain: Some("chain1".to_string()),
                    question: Some("Question 1?".to_string()),
                    description: None,
                    outcomes: vec!["Yes".to_string(), "No".to_string()],
                    created_at: 1699000000000000,
                    deadline: future_deadline,
                    fee_paid: Some("1000".to_string()),
                    reward_amount: None,
                    status: "Active".to_string(),
                    votes: None,
                    selected_voters: None,
                },
                OldMarketData {
                    id: 2,
                    requester_app: Some("app1".to_string()),
                    requester_chain: Some("chain1".to_string()),
                    question: Some("Question 2?".to_string()),
                    description: None,
                    outcomes: vec!["Yes".to_string(), "No".to_string()],
                    created_at: 1699000000000000,
                    deadline: past_deadline,
                    fee_paid: Some("1000".to_string()),
                    reward_amount: None,
                    status: "Active".to_string(),
                    votes: None,
                    selected_voters: None,
                },
            ],
            statistics: ExportStatistics {
                total_markets_created: Some(2),
                total_markets_resolved: Some(0),
                total_fees_collected: Some("2000".to_string()),
                total_stake: Some("0".to_string()),
                total_locked_stake: Some("0".to_string()),
                total_rewards_distributed: Some("0".to_string()),
            },
            parameters: ExportParameters {
                min_stake: Some("100".to_string()),
                min_voters_per_market: Some(3),
                max_voters_per_market: Some(50),
            },
        };
        
        let options = MigrationOptions {
            safe_mode: false, // Full mode
            skip_existing: true,
            validate_data: true,
            current_time,
        };
        
        let migratable = export.get_migratable_queries(&options);
        
        // Both queries should be migratable in full mode
        assert_eq!(migratable.len(), 2);
    }
    
    #[test]
    fn test_voter_mapping() {
        let mut mapping = VoterMapping::new();
        
        mapping.add("app1".to_string(), "owner1".to_string());
        mapping.add("app2".to_string(), "owner2".to_string());
        
        assert_eq!(mapping.get("app1"), Some(&"owner1".to_string()));
        assert_eq!(mapping.get("app2"), Some(&"owner2".to_string()));
        assert_eq!(mapping.get("app3"), None);
        
        // Test JSON serialization
        let json = mapping.to_json().unwrap();
        let loaded = VoterMapping::from_json(&json).unwrap();
        
        assert_eq!(loaded.get("app1"), Some(&"owner1".to_string()));
        assert_eq!(loaded.get("app2"), Some(&"owner2".to_string()));
    }
    
    #[test]
    fn test_migration_status() {
        let result = QueryMigrationResult {
            old_id: 1,
            new_id: Some(10),
            status: MigrationStatus::Success,
            error: None,
        };
        
        assert_eq!(result.status, MigrationStatus::Success);
        assert_eq!(result.new_id, Some(10));
        
        let failed_result = QueryMigrationResult {
            old_id: 2,
            new_id: None,
            status: MigrationStatus::Failed,
            error: Some("Invalid data".to_string()),
        };
        
        assert_eq!(failed_result.status, MigrationStatus::Failed);
        assert!(failed_result.error.is_some());
    }
    
    #[test]
    fn test_get_transferable_balances_safe_mode() {
        let export = create_test_export_with_balances();
        let options = BalanceTransferOptions {
            skip_zero_balances: true,
            active_voters_only: true,
            validate_voter_exists: false,
        };
        
        let transferable = export.get_transferable_balances(&options);
        
        // Should only include active voters with non-zero balances
        assert_eq!(transferable.len(), 2, "Should have 2 active voters with balances");
        
        for voter in transferable {
            assert!(voter.is_active, "All voters should be active");
            let rewards: u128 = voter.pending_rewards.parse().unwrap();
            assert!(rewards > 0, "All voters should have non-zero rewards");
        }
    }
    
    #[test]
    fn test_get_transferable_balances_full_mode() {
        let export = create_test_export_with_balances();
        let options = BalanceTransferOptions {
            skip_zero_balances: true,
            active_voters_only: false,
            validate_voter_exists: false,
        };
        
        let transferable = export.get_transferable_balances(&options);
        
        // Should include all voters with non-zero balances (active and inactive)
        assert_eq!(transferable.len(), 3, "Should have 3 voters with balances");
    }
    
    #[test]
    fn test_calculate_total_pending_rewards() {
        let export = create_test_export_with_balances();
        let total = export.calculate_total_pending_rewards().unwrap();
        
        // Total should be 1000 + 500 + 250 = 1750
        let total_value: u128 = total.into();
        assert_eq!(total_value, 1750, "Total pending rewards should be 1750");
    }
    
    #[test]
    fn test_get_balance_statistics() {
        let export = create_test_export_with_balances();
        let stats = export.get_balance_statistics();
        
        assert_eq!(stats.total_voters, 4, "Should have 4 total voters");
        assert_eq!(stats.voters_with_rewards, 3, "Should have 3 voters with rewards");
        assert_eq!(stats.active_voters_with_rewards, 2, "Should have 2 active voters with rewards");
        assert_eq!(stats.total_pending_rewards, "1750", "Total should be 1750");
        assert_eq!(stats.max_balance, "1000", "Max balance should be 1000");
        assert_eq!(stats.min_balance, "250", "Min balance should be 250");
    }
    
    #[test]
    fn test_voter_has_pending_rewards() {
        let voter_with_rewards = OldVoterData {
            app_id: "app1".to_string(),
            chain_id: "chain1".to_string(),
            owner: "owner1".to_string(),
            stake: "1000".to_string(),
            locked_stake: "0".to_string(),
            registered_at: 0,
            last_active: 0,
            is_active: true,
            reputation: OldReputationData {
                score: 80,
                total_votes: 10,
                correct_votes: 8,
                incorrect_votes: 2,
                correct_streak: 3,
                last_updated: 0,
            },
            pending_rewards: "500".to_string(),
        };
        
        let voter_without_rewards = OldVoterData {
            app_id: "app2".to_string(),
            chain_id: "chain1".to_string(),
            owner: "owner2".to_string(),
            stake: "1000".to_string(),
            locked_stake: "0".to_string(),
            registered_at: 0,
            last_active: 0,
            is_active: true,
            reputation: OldReputationData {
                score: 80,
                total_votes: 10,
                correct_votes: 8,
                incorrect_votes: 2,
                correct_streak: 3,
                last_updated: 0,
            },
            pending_rewards: "0".to_string(),
        };
        
        assert!(voter_with_rewards.has_pending_rewards(), "Should have pending rewards");
        assert!(!voter_without_rewards.has_pending_rewards(), "Should not have pending rewards");
    }
    
    #[test]
    fn test_voter_get_pending_rewards() {
        let voter = OldVoterData {
            app_id: "app1".to_string(),
            chain_id: "chain1".to_string(),
            owner: "owner1".to_string(),
            stake: "1000".to_string(),
            locked_stake: "0".to_string(),
            registered_at: 0,
            last_active: 0,
            is_active: true,
            reputation: OldReputationData {
                score: 80,
                total_votes: 10,
                correct_votes: 8,
                incorrect_votes: 2,
                correct_streak: 3,
                last_updated: 0,
            },
            pending_rewards: "1234".to_string(),
        };
        
        let rewards = voter.get_pending_rewards().unwrap();
        let rewards_value: u128 = rewards.into();
        assert_eq!(rewards_value, 1234, "Should parse pending rewards correctly");
    }
    
    #[test]
    fn test_balance_transfer_options_default() {
        let options = BalanceTransferOptions::default();
        assert!(options.skip_zero_balances, "Should skip zero balances by default");
        assert!(options.active_voters_only, "Should only transfer for active voters by default");
        assert!(options.validate_voter_exists, "Should validate voter exists by default");
    }
    
    // Helper function to create test export with various balance scenarios
    fn create_test_export_with_balances() -> RegistryExport {
        RegistryExport {
            metadata: ExportMetadata {
                exported_at: 0,
                registry_chain_id: "chain1".to_string(),
                registry_app_id: "app1".to_string(),
                version: "1.0.0".to_string(),
                total_voters: 4,
                total_active_markets: 0,
                notes: "Test export".to_string(),
            },
            voters: vec![
                // Active voter with rewards
                OldVoterData {
                    app_id: "app1".to_string(),
                    chain_id: "chain1".to_string(),
                    owner: "owner1".to_string(),
                    stake: "1000".to_string(),
                    locked_stake: "0".to_string(),
                    registered_at: 0,
                    last_active: 0,
                    is_active: true,
                    reputation: OldReputationData {
                        score: 80,
                        total_votes: 10,
                        correct_votes: 8,
                        incorrect_votes: 2,
                        correct_streak: 3,
                        last_updated: 0,
                    },
                    pending_rewards: "1000".to_string(),
                },
                // Active voter with rewards
                OldVoterData {
                    app_id: "app2".to_string(),
                    chain_id: "chain1".to_string(),
                    owner: "owner2".to_string(),
                    stake: "1000".to_string(),
                    locked_stake: "0".to_string(),
                    registered_at: 0,
                    last_active: 0,
                    is_active: true,
                    reputation: OldReputationData {
                        score: 70,
                        total_votes: 10,
                        correct_votes: 7,
                        incorrect_votes: 3,
                        correct_streak: 2,
                        last_updated: 0,
                    },
                    pending_rewards: "500".to_string(),
                },
                // Inactive voter with rewards
                OldVoterData {
                    app_id: "app3".to_string(),
                    chain_id: "chain1".to_string(),
                    owner: "owner3".to_string(),
                    stake: "1000".to_string(),
                    locked_stake: "0".to_string(),
                    registered_at: 0,
                    last_active: 0,
                    is_active: false,
                    reputation: OldReputationData {
                        score: 60,
                        total_votes: 5,
                        correct_votes: 3,
                        incorrect_votes: 2,
                        correct_streak: 1,
                        last_updated: 0,
                    },
                    pending_rewards: "250".to_string(),
                },
                // Active voter with no rewards
                OldVoterData {
                    app_id: "app4".to_string(),
                    chain_id: "chain1".to_string(),
                    owner: "owner4".to_string(),
                    stake: "1000".to_string(),
                    locked_stake: "0".to_string(),
                    registered_at: 0,
                    last_active: 0,
                    is_active: true,
                    reputation: OldReputationData {
                        score: 50,
                        total_votes: 2,
                        correct_votes: 1,
                        incorrect_votes: 1,
                        correct_streak: 0,
                        last_updated: 0,
                    },
                    pending_rewards: "0".to_string(),
                },
            ],
            active_markets: vec![],
            statistics: ExportStatistics {
                total_markets_created: Some(0),
                total_markets_resolved: Some(0),
                total_fees_collected: Some("0".to_string()),
                total_stake: Some("4000".to_string()),
                total_locked_stake: Some("0".to_string()),
                total_rewards_distributed: Some("0".to_string()),
            },
            parameters: ExportParameters {
                min_stake: Some("100".to_string()),
                min_voters_per_market: Some(3),
                max_voters_per_market: Some(50),
            },
        }
    }
}
