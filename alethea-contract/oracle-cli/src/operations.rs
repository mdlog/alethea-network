// Operation builders for Oracle CLI

use serde_json::{json, Value};

/// Build RegisterVoter operation
pub fn build_register_voter(
    stake: u64,
    name: Option<String>,
    metadata_url: Option<String>,
) -> Value {
    let mut op = json!({
        "RegisterVoter": {
            "stake": format!("{}", stake),
        }
    });
    
    if let Some(n) = name {
        op["RegisterVoter"]["name"] = json!(n);
    }
    
    if let Some(url) = metadata_url {
        op["RegisterVoter"]["metadata_url"] = json!(url);
    }
    
    op
}

/// Build CreateQuery operation
pub fn build_create_query(
    description: String,
    outcomes: Vec<String>,
    strategy: String,
    min_votes: Option<usize>,
    reward: u64,
) -> Value {
    let mut op = json!({
        "CreateQuery": {
            "description": description,
            "outcomes": outcomes,
            "strategy": strategy,
            "reward_amount": format!("{}", reward),
            "deadline": null,
        }
    });
    
    if let Some(mv) = min_votes {
        op["CreateQuery"]["min_votes"] = json!(mv);
    }
    
    op
}

/// Build SubmitVote operation
pub fn build_submit_vote(
    query_id: u64,
    value: String,
    confidence: Option<u8>,
) -> Value {
    let mut op = json!({
        "SubmitVote": {
            "query_id": query_id,
            "value": value,
        }
    });
    
    if let Some(c) = confidence {
        op["SubmitVote"]["confidence"] = json!(c);
    }
    
    op
}

/// Build ResolveQuery operation
pub fn build_resolve_query(query_id: u64) -> Value {
    json!({
        "ResolveQuery": {
            "query_id": query_id,
        }
    })
}

/// Build UpdateStake operation
pub fn build_update_stake(amount: u64) -> Value {
    json!({
        "UpdateStake": {
            "additional_stake": format!("{}", amount),
        }
    })
}

/// Build WithdrawStake operation
pub fn build_withdraw_stake(amount: u64) -> Value {
    json!({
        "WithdrawStake": {
            "amount": format!("{}", amount),
        }
    })
}

/// Build ClaimRewards operation
pub fn build_claim_rewards() -> Value {
    json!("ClaimRewards")
}

/// Build GraphQL query for voters
pub fn build_voters_query(limit: i32, active_only: bool) -> String {
    format!(
        r#"{{
            voters(limit: {}, activeOnly: {}) {{
                address
                name
                stake
                lockedStake
                availableStake
                reputation
                reputationTier
                totalVotes
                correctVotes
                accuracyPercentage
                isActive
            }}
        }}"#,
        limit, active_only
    )
}

/// Build GraphQL query for queries
pub fn build_queries_query(active_only: bool) -> String {
    let status_filter = if active_only {
        r#", status: "Active""#
    } else {
        ""
    };
    
    format!(
        r#"{{
            queries{} {{
                id
                description
                outcomes
                strategy
                minVotes
                rewardAmount
                creator
                createdAt
                deadline
                status
                result
                voteCount
                timeRemaining
            }}
        }}"#,
        status_filter
    )
}

/// Build GraphQL query for single voter
pub fn build_voter_query(address: &str) -> String {
    format!(
        r#"{{
            voter(address: "{}") {{
                address
                name
                stake
                lockedStake
                availableStake
                reputation
                reputationTier
                reputationWeight
                totalVotes
                correctVotes
                accuracyPercentage
                registeredAt
                isActive
                metadataUrl
            }}
        }}"#,
        address
    )
}

/// Build GraphQL query for single query
pub fn build_query_query(query_id: u64) -> String {
    format!(
        r#"{{
            query(id: {}) {{
                id
                description
                outcomes
                strategy
                minVotes
                rewardAmount
                creator
                createdAt
                deadline
                status
                result
                resolvedAt
                voteCount
                timeRemaining
            }}
        }}"#,
        query_id
    )
}

/// Build GraphQL query for statistics
pub fn build_stats_query() -> String {
    r#"{
        statistics {
            totalVoters
            activeVoters
            totalStake
            totalLockedStake
            averageStake
            totalQueriesCreated
            totalQueriesResolved
            activeQueriesCount
            totalVotesSubmitted
            averageVotesPerQuery
            totalRewardsDistributed
            rewardPoolBalance
            protocolTreasury
            averageReputation
            protocolStatus
            resolutionRate
        }
    }"#.to_string()
}


/// Build RegisterVoterFor operation (admin operation)
pub fn build_register_voter_for(
    voter_address: String,
    stake: u64,
    name: Option<String>,
    metadata_url: Option<String>,
) -> Value {
    let mut op = json!({
        "RegisterVoterFor": {
            "voter_address": voter_address,
            "stake": format!("{}", stake),
        }
    });
    
    if let Some(n) = name {
        op["RegisterVoterFor"]["name"] = json!(n);
    }
    
    if let Some(url) = metadata_url {
        op["RegisterVoterFor"]["metadata_url"] = json!(url);
    }
    
    op
}
