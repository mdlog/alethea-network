// Copyright (c) MDLabs
// Oracle Contract Implementation

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use oracle::{OracleAbi, OracleOperation, OracleResponse};
use linera_sdk::{
    linera_base_types::WithContractAbi,
    views::{RootView, View},
    Contract, ContractRuntime,
};
use sha2::{Sha256, Digest};

use self::state::{OracleState, Query, Vote};

pub struct OracleContract {
    state: OracleState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(OracleContract);

impl WithContractAbi for OracleContract {
    type Abi = OracleAbi;
}

impl Contract for OracleContract {
    type Message = ();
    type InstantiationArgument = ();
    type Parameters = ();
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = OracleState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        OracleContract { state, runtime }
    }

    async fn instantiate(&mut self, _argument: ()) {
        // Initialize with query ID 0
        self.state.next_query_id.set(0);
    }

    async fn execute_operation(&mut self, operation: OracleOperation) -> OracleResponse {
        match operation {
            OracleOperation::CreateQuery { question, outcomes, deadline } => {
                self.create_query(question, outcomes, deadline).await
            }
            OracleOperation::CommitVote { query_id, commit_hash } => {
                self.commit_vote(query_id, commit_hash).await
            }
            OracleOperation::RevealVote { query_id, value, salt } => {
                self.reveal_vote(query_id, value, salt).await
            }
            OracleOperation::ResolveQuery { query_id } => {
                self.resolve_query(query_id).await
            }
        }
    }

    async fn execute_message(&mut self, _message: ()) {
        panic!("Oracle application doesn't support cross-chain messages yet");
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

impl OracleContract {
    async fn create_query(
        &mut self,
        question: String,
        outcomes: Vec<String>,
        deadline: u64,
    ) -> OracleResponse {
        let query_id = *self.state.next_query_id.get();
        self.state.next_query_id.set(query_id + 1);

        let commit_end = deadline + (24 * 60 * 60 * 1000); // 24 hours after deadline
        let reveal_end = commit_end + (24 * 60 * 60 * 1000); // 24 hours after commit

        let query = Query {
            id: query_id,
            question: question.clone(),
            outcomes,
            deadline,
            commit_end,
            reveal_end,
            status: "Active".to_string(),
            resolved_outcome: None,
        };

        self.state.queries.insert(&query_id, query).expect("Failed to insert query");

        OracleResponse {
            success: true,
            message: format!("Query {} created: {}", query_id, question),
        }
    }

    async fn commit_vote(
        &mut self,
        query_id: u64,
        commit_hash: String,
    ) -> OracleResponse {
        // Get query
        let query = match self.state.queries.get(&query_id).await {
            Ok(Some(q)) => q,
            Ok(None) => return OracleResponse {
                success: false,
                message: "Query not found".to_string(),
            },
            Err(_) => return OracleResponse {
                success: false,
                message: "Failed to load query".to_string(),
            },
        };

        // Check phase
        let now = self.runtime.system_time().micros();
        if now < query.deadline || now >= query.commit_end {
            return OracleResponse {
                success: false,
                message: "Not in commit phase".to_string(),
            };
        }

        // Get voter (chain ID)
        let voter = self.runtime.chain_id().to_string();

        // Check if already committed
        if let Ok(Some(_)) = self.state.commits.get(&(query_id, voter.clone())).await {
            return OracleResponse {
                success: false,
                message: "Already committed".to_string(),
            };
        }

        // Store commit
        self.state.commits
            .insert(&(query_id, voter.clone()), commit_hash.clone())
            .expect("Failed to insert commit");

        OracleResponse {
            success: true,
            message: format!("Vote committed for query {}", query_id),
        }
    }

    async fn reveal_vote(
        &mut self,
        query_id: u64,
        value: String,
        salt: String,
    ) -> OracleResponse {
        // Get query
        let query = match self.state.queries.get(&query_id).await {
            Ok(Some(q)) => q,
            Ok(None) => return OracleResponse {
                success: false,
                message: "Query not found".to_string(),
            },
            Err(_) => return OracleResponse {
                success: false,
                message: "Failed to load query".to_string(),
            },
        };

        // Check phase
        let now = self.runtime.system_time().micros();
        if now < query.commit_end || now >= query.reveal_end {
            return OracleResponse {
                success: false,
                message: "Not in reveal phase".to_string(),
            };
        }

        // Get voter
        let voter = self.runtime.chain_id().to_string();

        // Get commit hash
        let commit_hash = match self.state.commits.get(&(query_id, voter.clone())).await {
            Ok(Some(hash)) => hash,
            Ok(None) => return OracleResponse {
                success: false,
                message: "No commit found".to_string(),
            },
            Err(_) => return OracleResponse {
                success: false,
                message: "Failed to load commit".to_string(),
            },
        };

        // Verify reveal
        let expected_hash = Self::compute_hash(&value, &salt);
        if expected_hash != commit_hash {
            return OracleResponse {
                success: false,
                message: "Invalid reveal: hash mismatch".to_string(),
            };
        }

        // Store vote
        let vote = Vote {
            voter: voter.clone(),
            value: value.clone(),
            timestamp: now,
        };
        self.state.votes
            .insert(&(query_id, voter), vote)
            .expect("Failed to insert vote");

        OracleResponse {
            success: true,
            message: format!("Vote revealed for query {}: {}", query_id, value),
        }
    }

    async fn resolve_query(&mut self, query_id: u64) -> OracleResponse {
        // Get query
        let mut query = match self.state.queries.get(&query_id).await {
            Ok(Some(q)) => q,
            Ok(None) => return OracleResponse {
                success: false,
                message: "Query not found".to_string(),
            },
            Err(_) => return OracleResponse {
                success: false,
                message: "Failed to load query".to_string(),
            },
        };

        // Check if reveal phase ended
        let now = self.runtime.system_time().micros();
        if now < query.reveal_end {
            return OracleResponse {
                success: false,
                message: "Reveal phase not ended yet".to_string(),
            };
        }

        // Count votes
        let mut vote_counts: std::collections::HashMap<String, u64> = std::collections::HashMap::new();
        
        // Iterate through all votes for this query
        // Note: This is simplified - in production you'd want to track votes per query
        for index in self.state.votes.indices().await.expect("Failed to get vote indices") {
            if let Ok(Some(vote)) = self.state.votes.get(&index).await {
                if index.0 == query_id {
                    *vote_counts.entry(vote.value.clone()).or_insert(0) += 1;
                }
            }
        }

        // Find winner (most votes)
        let winner = vote_counts.iter()
            .max_by_key(|(_, count)| *count)
            .map(|(outcome, _)| outcome.clone());

        // Update query
        query.status = "Resolved".to_string();
        query.resolved_outcome = winner.clone();
        self.state.queries
            .insert(&query_id, query)
            .expect("Failed to update query");

        OracleResponse {
            success: true,
            message: format!("Query {} resolved: {:?}", query_id, winner),
        }
    }

    fn compute_hash(value: &str, salt: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(value.as_bytes());
        hasher.update(salt.as_bytes());
        format!("{:x}", hasher.finalize())
    }
}
