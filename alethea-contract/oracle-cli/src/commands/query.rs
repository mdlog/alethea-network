// Query command handlers

use anyhow::{Result, Context};
use colored::*;
use crate::config::Config;
use crate::operations;
use reqwest;
use serde_json::Value;

pub async fn handle_list_voters(
    config: &Config,
    limit: i32,
    active_only: bool,
) -> Result<()> {
    println!("{}", "Fetching voters...".bright_blue());
    println!();
    
    let query = operations::build_voters_query(limit, active_only);
    let result = execute_graphql_query(config, &query).await?;
    
    println!("{}", "Voters:".bright_green());
    println!("{}", serde_json::to_string_pretty(&result)?);
    println!();
    
    Ok(())
}

pub async fn handle_list_queries(
    config: &Config,
    active_only: bool,
) -> Result<()> {
    println!("{}", "Fetching queries...".bright_blue());
    println!();
    
    let query = operations::build_queries_query(active_only);
    let result = execute_graphql_query(config, &query).await?;
    
    println!("{}", "Queries:".bright_green());
    println!("{}", serde_json::to_string_pretty(&result)?);
    println!();
    
    Ok(())
}

pub async fn handle_get_voter(
    config: &Config,
    address: &str,
) -> Result<()> {
    println!("{}", format!("Fetching voter: {}...", address).bright_blue());
    println!();
    
    let query = operations::build_voter_query(address);
    let result = execute_graphql_query(config, &query).await?;
    
    println!("{}", "Voter Info:".bright_green());
    println!("{}", serde_json::to_string_pretty(&result)?);
    println!();
    
    Ok(())
}

pub async fn handle_get_query(
    config: &Config,
    query_id: u64,
) -> Result<()> {
    println!("{}", format!("Fetching query: {}...", query_id).bright_blue());
    println!();
    
    let query = operations::build_query_query(query_id);
    let result = execute_graphql_query(config, &query).await?;
    
    println!("{}", "Query Info:".bright_green());
    println!("{}", serde_json::to_string_pretty(&result)?);
    println!();
    
    Ok(())
}

pub async fn handle_stats(
    config: &Config,
) -> Result<()> {
    println!("{}", "Fetching protocol statistics...".bright_blue());
    println!();
    
    let query = operations::build_stats_query();
    let result = execute_graphql_query(config, &query).await?;
    
    println!("{}", "Protocol Statistics:".bright_green());
    println!("{}", serde_json::to_string_pretty(&result)?);
    println!();
    
    Ok(())
}

async fn execute_graphql_query(config: &Config, query: &str) -> Result<Value> {
    let client = reqwest::Client::new();
    
    let response = client
        .post(&config.graphql_url())
        .json(&serde_json::json!({ "query": query }))
        .send()
        .await
        .context("Failed to send GraphQL request")?;
    
    let result: Value = response
        .json()
        .await
        .context("Failed to parse GraphQL response")?;
    
    if let Some(errors) = result.get("errors") {
        anyhow::bail!("GraphQL errors: {}", serde_json::to_string_pretty(errors)?);
    }
    
    Ok(result["data"].clone())
}
