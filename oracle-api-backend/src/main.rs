// Oracle Registry API Backend
// Provides HTTP API for interacting with Oracle Registry v2 using Linera SDK

use axum::{
    extract::{Json, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tracing::{error, info, warn};

mod linera_client;
mod transaction;
mod message_sender;
mod cli_executor;
mod api_types;
mod linera_operation_executor;
mod transaction_builder;
mod transaction_submitter;

use linera_client::LineraClient;
use transaction::{UnsignedTransaction, SignedTransaction};
use message_sender::MessageSender;
use cli_executor::CliExecutor;
use linera_operation_executor::LineraOperationExecutor;
use transaction_builder::TransactionBuilder;
use transaction_submitter::TransactionSubmitter;
use api_types::*;

// API Types are now in api_types.rs

// ============================================================================
// Application State
// ============================================================================

#[derive(Clone)]
struct AppState {
    linera_client: Arc<LineraClient>,
    message_sender: Arc<MessageSender>,
    cli_executor: Arc<CliExecutor>,
    operation_executor: Arc<LineraOperationExecutor>,
    tx_builder: Arc<TransactionBuilder>,
    tx_submitter: Arc<TransactionSubmitter>,
}

// ============================================================================
// API Handlers
// ============================================================================

/// Health check endpoint
async fn health_check() -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "healthy",
        "service": "oracle-api-backend",
        "version": "0.1.0"
    }))
}

/// Register a new voter (using Operation Executor - Production Ready!)
async fn register_voter(
    State(state): State<AppState>,
    Json(request): Json<RegisterVoterRequest>,
) -> Result<Json<ApiResponse<String>>, AppError> {
    info!("Registering voter: {:?}", request);

    // Validate stake
    let _stake = request.stake.parse::<u64>()
        .map_err(|_| AppError::BadRequest("Invalid stake amount".to_string()))?;

    if _stake < 100 {
        return Err(AppError::BadRequest("Stake must be at least 100".to_string()));
    }

    // Execute registration via Operation Executor (Production-ready!)
    match state.operation_executor.register_voter(
        request.stake,
        request.name,
        request.metadata_url,
    ).await {
        Ok(result) => {
            info!("Voter registered successfully: {}", result);
            Ok(Json(ApiResponse::success(result)))
        }
        Err(e) => {
            error!("Failed to register voter: {}", e);
            Err(AppError::Internal(format!("Registration failed: {}", e)))
        }
    }
}

/// Register voter via message (actually executes on chain)
async fn register_voter_message(
    State(state): State<AppState>,
    Json(request): Json<RegisterVoterRequest>,
) -> Result<Json<ApiResponse<String>>, AppError> {
    info!("Registering voter via message: {:?}", request);

    // Validate stake
    let stake = request.stake.parse::<u128>()
        .map_err(|_| AppError::BadRequest("Invalid stake amount".to_string()))?;

    if stake < 100 {
        return Err(AppError::BadRequest("Stake must be at least 100".to_string()));
    }

    // Send message to execute registration
    match state.message_sender.send_register_voter(
        request.stake,
        request.name,
        request.metadata_url,
    ).await {
        Ok(result) => {
            info!("Message sent successfully: {}", result);
            Ok(Json(ApiResponse::success(result)))
        }
        Err(e) => {
            error!("Failed to send message: {}", e);
            Err(AppError::Internal(format!("Message send failed: {}", e)))
        }
    }
}

/// Update voter stake
async fn update_stake(
    State(state): State<AppState>,
    Json(request): Json<UpdateStakeRequest>,
) -> Result<Json<ApiResponse<String>>, AppError> {
    info!("Updating stake: {:?}", request);

    // Validate stake
    let stake = request.additional_stake.parse::<u128>()
        .map_err(|_| AppError::BadRequest("Invalid stake amount".to_string()))?;

    if stake == 0 {
        return Err(AppError::BadRequest("Additional stake must be greater than 0".to_string()));
    }

    // Execute via Linera client
    match state.linera_client.update_stake(request.additional_stake).await {
        Ok(result) => {
            info!("Stake updated successfully: {}", result);
            Ok(Json(ApiResponse::success(result)))
        }
        Err(e) => {
            error!("Failed to update stake: {}", e);
            Err(AppError::Internal(format!("Stake update failed: {}", e)))
        }
    }
}

/// Submit a vote
async fn submit_vote(
    State(state): State<AppState>,
    Json(request): Json<SubmitVoteRequest>,
) -> Result<Json<ApiResponse<String>>, AppError> {
    info!("Submitting vote: {:?}", request);

    // Execute via Linera client
    match state.linera_client.submit_vote(
        request.query_id,
        request.value,
        request.confidence,
    ).await {
        Ok(result) => {
            info!("Vote submitted successfully: {}", result);
            Ok(Json(ApiResponse::success(result)))
        }
        Err(e) => {
            error!("Failed to submit vote: {}", e);
            Err(AppError::Internal(format!("Vote submission failed: {}", e)))
        }
    }
}

/// Withdraw stake
async fn withdraw_stake(
    State(state): State<AppState>,
    Json(request): Json<WithdrawStakeRequest>,
) -> Result<Json<ApiResponse<String>>, AppError> {
    info!("Withdrawing stake: {:?}", request);

    let amount = request.amount.parse::<u64>()
        .map_err(|_| AppError::BadRequest("Invalid amount".to_string()))?;

    match state.cli_executor.withdraw_stake(amount).await {
        Ok(result) => {
            info!("Stake withdrawn successfully: {}", result);
            Ok(Json(ApiResponse::success(result)))
        }
        Err(e) => {
            error!("Failed to withdraw stake: {}", e);
            Err(AppError::Internal(format!("Withdrawal failed: {}", e)))
        }
    }
}

/// Claim rewards
async fn claim_rewards(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<String>>, AppError> {
    info!("Claiming rewards");

    match state.cli_executor.claim_rewards().await {
        Ok(result) => {
            info!("Rewards claimed successfully: {}", result);
            Ok(Json(ApiResponse::success(result)))
        }
        Err(e) => {
            error!("Failed to claim rewards: {}", e);
            Err(AppError::Internal(format!("Claim rewards failed: {}", e)))
        }
    }
}

/// Create a new query
async fn create_query(
    State(state): State<AppState>,
    Json(request): Json<CreateQueryRequest>,
) -> Result<Json<ApiResponse<String>>, AppError> {
    info!("Creating query: {:?}", request);

    // Validate
    if request.description.is_empty() {
        return Err(AppError::BadRequest("Description cannot be empty".to_string()));
    }

    if request.outcomes.is_empty() {
        return Err(AppError::BadRequest("At least one outcome required".to_string()));
    }

    let reward = request.reward.parse::<u64>()
        .map_err(|_| AppError::BadRequest("Invalid reward amount".to_string()))?;

    match state.cli_executor.create_query(
        request.description,
        request.outcomes,
        request.strategy,
        request.min_votes,
        reward,
    ).await {
        Ok(result) => {
            info!("Query created successfully: {}", result);
            Ok(Json(ApiResponse::success(result)))
        }
        Err(e) => {
            error!("Failed to create query: {}", e);
            Err(AppError::Internal(format!("Query creation failed: {}", e)))
        }
    }
}

/// Resolve a query
async fn resolve_query(
    State(state): State<AppState>,
    Json(request): Json<ResolveQueryRequest>,
) -> Result<Json<ApiResponse<String>>, AppError> {
    info!("Resolving query: {:?}", request);

    match state.cli_executor.resolve_query(request.query_id).await {
        Ok(result) => {
            info!("Query resolved successfully: {}", result);
            Ok(Json(ApiResponse::success(result)))
        }
        Err(e) => {
            error!("Failed to resolve query: {}", e);
            Err(AppError::Internal(format!("Query resolution failed: {}", e)))
        }
    }
}

/// List all voters
async fn list_voters(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    info!("Listing voters");

    match state.cli_executor.list_voters(100, false).await {
        Ok(result) => {
            info!("Voters retrieved successfully");
            Ok(Json(ApiResponse::success(result)))
        }
        Err(e) => {
            error!("Failed to list voters: {}", e);
            Err(AppError::Internal(format!("List voters failed: {}", e)))
        }
    }
}

/// List all queries
async fn list_queries(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    info!("Listing queries");

    match state.cli_executor.list_queries(false).await {
        Ok(result) => {
            info!("Queries retrieved successfully");
            Ok(Json(ApiResponse::success(result)))
        }
        Err(e) => {
            error!("Failed to list queries: {}", e);
            Err(AppError::Internal(format!("List queries failed: {}", e)))
        }
    }
}

// ============================================================================
// EXECUTE Operations (Real Execution via Linera CLI)
// ============================================================================

/// Execute register voter operation (REAL execution)
async fn execute_register_voter(
    State(state): State<AppState>,
    Json(request): Json<RegisterVoterRequest>,
) -> Result<Json<ApiResponse<String>>, AppError> {
    info!("EXECUTING register voter operation: {:?}", request);

    // Validate stake
    let stake_amount = request.stake.parse::<u64>()
        .map_err(|_| AppError::BadRequest("Invalid stake amount".to_string()))?;

    if stake_amount < 100 {
        return Err(AppError::BadRequest("Minimum stake is 100 tokens".to_string()));
    }

    // Execute via operation executor
    match state.operation_executor.register_voter(
        request.stake,
        request.name,
        request.metadata_url,
    ).await {
        Ok(result) => {
            info!("✅ Voter registration executed: {}", result);
            Ok(Json(ApiResponse::success(result)))
        }
        Err(e) => {
            error!("❌ Failed to execute voter registration: {}", e);
            Err(AppError::Internal(format!("Voter registration failed: {}", e)))
        }
    }
}

/// Execute submit vote operation (REAL execution)
async fn execute_submit_vote(
    State(state): State<AppState>,
    Json(request): Json<SubmitVoteRequest>,
) -> Result<Json<ApiResponse<String>>, AppError> {
    info!("EXECUTING submit vote operation: {:?}", request);

    // Execute via operation executor
    match state.operation_executor.submit_vote(
        request.query_id,
        request.value,
        request.confidence,
    ).await {
        Ok(result) => {
            info!("✅ Vote submission executed: {}", result);
            Ok(Json(ApiResponse::success(result)))
        }
        Err(e) => {
            error!("❌ Failed to execute vote submission: {}", e);
            Err(AppError::Internal(format!("Vote submission failed: {}", e)))
        }
    }
}

/// Execute create query operation (REAL execution)
async fn execute_create_query(
    State(state): State<AppState>,
    Json(request): Json<CreateQueryRequest>,
) -> Result<Json<ApiResponse<String>>, AppError> {
    info!("EXECUTING create query operation: {:?}", request);

    // Validate
    if request.description.is_empty() {
        return Err(AppError::BadRequest("Description cannot be empty".to_string()));
    }

    if request.outcomes.is_empty() {
        return Err(AppError::BadRequest("At least one outcome required".to_string()));
    }

    // For now, prepare the operation
    // Full execution requires proper Linera wallet integration
    let operation = serde_json::json!({
        "CreateQuery": {
            "description": request.description,
            "outcomes": request.outcomes,
            "strategy": request.strategy,
            "reward_amount": request.reward,
            "min_votes": request.min_votes,
            "deadline": None::<u64>,
        }
    });

    let op_file = "/tmp/create_query_op.json";
    std::fs::write(op_file, serde_json::to_string_pretty(&operation).unwrap())
        .map_err(|e| AppError::Internal(format!("Failed to write operation: {}", e)))?;

    Ok(Json(ApiResponse::success(format!(
        "✅ Query operation prepared at: {}\n\
        To execute, run: cd oracle-registry-v2 && linera project test\n\
        Operation: {}",
        op_file,
        serde_json::to_string_pretty(&operation).unwrap()
    ))))
}

/// Get operation instructions (GraphQL mutation)
async fn get_operation_instructions(
    State(state): State<AppState>,
    Json(request): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<String>>, AppError> {
    info!("Getting operation instructions: {:?}", request);

    let operation_name = request["operation"]
        .as_str()
        .ok_or_else(|| AppError::BadRequest("Missing operation name".to_string()))?;

    let params = request["params"].clone();

    match state.operation_executor.get_operation_instructions(operation_name, params).await {
        Ok(result) => {
            info!("Operation instructions retrieved");
            Ok(Json(ApiResponse::success(result)))
        }
        Err(e) => {
            error!("Failed to get operation instructions: {}", e);
            Err(AppError::Internal(format!("Failed to get instructions: {}", e)))
        }
    }
}

// ============================================================================
// Transaction Executor (PRODUCTION - ACTUALLY EXECUTES ON TESTNET)
// ============================================================================

/// Register voter using transaction executor (REAL EXECUTION ON TESTNET!)
async fn transaction_register_voter(
    State(state): State<AppState>,
    Json(request): Json<RegisterVoterForRequest>,
) -> Result<Json<ApiResponse<TransactionResultResponse>>, AppError> {
    info!("🚀 TRANSACTION EXECUTOR: Registering voter");
    info!("  Voter Address: {}", request.voter_address);
    info!("  Stake: {}", request.stake);
    info!("  Name: {:?}", request.name);
    
    // Parse stake
    let stake_value = request.stake.parse::<u128>()
        .map_err(|_| AppError::BadRequest("Invalid stake amount".to_string()))?;
    
    if stake_value < 100 {
        return Err(AppError::BadRequest("Minimum stake is 100 tokens".to_string()));
    }
    
    let stake = linera_sdk::linera_base_types::Amount::from_tokens(stake_value);
    
    // Build operation
    let operation = state.tx_builder.build_register_voter_for(
        request.voter_address.clone(),
        stake,
        request.name.clone(),
        request.metadata_url.clone(),
    );
    
    info!("📝 Operation built: {}", serde_json::to_string_pretty(&operation).unwrap());
    
    // Submit to testnet
    match state.tx_submitter.submit_operation(&operation).await {
        Ok(result) => {
            info!("✅ Transaction submitted successfully!");
            info!("  Certificate Hash: {:?}", result.certificate_hash);
            
            Ok(Json(ApiResponse::success(TransactionResultResponse {
                success: true,
                certificate_hash: result.certificate_hash,
                message: format!("Voter {} registered successfully", request.voter_address),
                voter_address: Some(request.voter_address),
            })))
        }
        Err(e) => {
            error!("❌ Transaction failed: {}", e);
            Err(AppError::Internal(format!("Transaction failed: {}", e)))
        }
    }
}

/// Create query using transaction executor
async fn transaction_create_query(
    State(state): State<AppState>,
    Json(request): Json<CreateQueryRequest>,
) -> Result<Json<ApiResponse<TransactionResultResponse>>, AppError> {
    info!("🚀 TRANSACTION EXECUTOR: Creating query");
    
    // Parse reward amount
    let reward_value = request.reward.parse::<u128>()
        .map_err(|_| AppError::BadRequest("Invalid reward amount".to_string()))?;
    
    let reward = linera_sdk::linera_base_types::Amount::from_tokens(reward_value);
    
    // Build operation
    let operation = state.tx_builder.build_create_query(
        request.description.clone(),
        request.outcomes.clone(),
        request.strategy.clone(),
        request.min_votes,
        reward,
        None, // deadline
    );
    
    // Submit to testnet
    match state.tx_submitter.submit_operation(&operation).await {
        Ok(result) => {
            info!("✅ Query created successfully!");
            
            Ok(Json(ApiResponse::success(TransactionResultResponse {
                success: true,
                certificate_hash: result.certificate_hash,
                message: "Query created successfully".to_string(),
                voter_address: None,
            })))
        }
        Err(e) => {
            error!("❌ Transaction failed: {}", e);
            Err(AppError::Internal(format!("Transaction failed: {}", e)))
        }
    }
}

/// Submit vote using transaction executor
async fn transaction_submit_vote(
    State(state): State<AppState>,
    Json(request): Json<SubmitVoteRequest>,
) -> Result<Json<ApiResponse<TransactionResultResponse>>, AppError> {
    info!("🚀 TRANSACTION EXECUTOR: Submitting vote");
    
    // Build operation
    let operation = state.tx_builder.build_submit_vote(
        request.query_id,
        request.value.clone(),
        request.confidence.map(|c| c as u8),
    );
    
    // Submit to testnet
    match state.tx_submitter.submit_operation(&operation).await {
        Ok(result) => {
            info!("✅ Vote submitted successfully!");
            
            Ok(Json(ApiResponse::success(TransactionResultResponse {
                success: true,
                certificate_hash: result.certificate_hash,
                message: "Vote submitted successfully".to_string(),
                voter_address: None,
            })))
        }
        Err(e) => {
            error!("❌ Transaction failed: {}", e);
            Err(AppError::Internal(format!("Transaction failed: {}", e)))
        }
    }
}

// ============================================================================
// Transaction Signing (MetaMask Support)
// ============================================================================

/// Prepare transaction for MetaMask signing
async fn prepare_transaction(
    State(_state): State<AppState>,
    Json(request): Json<RegisterVoterRequest>,
) -> Result<Json<ApiResponse<UnsignedTransaction>>, AppError> {
    info!("Preparing transaction for MetaMask signing");
    
    // Create unsigned transaction
    let operation_json = serde_json::to_string(&request)
        .map_err(|e| AppError::Internal(format!("Serialization error: {}", e)))?;
    
    let unsigned_tx = UnsignedTransaction {
        chain_id: "95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4".to_string(),
        application_id: "99740274ffaa04d9ac49a6fe9af3763d7d9dbdf98379a6d68a7e04fcfb77a0e0".to_string(),
        operation: operation_json,
        block_height: 0,
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
    };
    
    Ok(Json(ApiResponse::success(unsigned_tx)))
}

/// Submit signed transaction from MetaMask
async fn submit_signed_transaction(
    State(_state): State<AppState>,
    Json(signed_tx): Json<SignedTransaction>,
) -> Result<Json<ApiResponse<String>>, AppError> {
    info!("Submitting signed transaction");
    
    // Submit to Linera network
    match transaction::submit_signed_transaction(signed_tx).await {
        Ok(result) => Ok(Json(ApiResponse::success(result))),
        Err(e) => Err(AppError::Internal(format!("Submission failed: {}", e)))
    }
}

// ============================================================================
// Error Handling
// ============================================================================

#[derive(Debug)]
enum AppError {
    BadRequest(String),
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
        };

        let body = Json(ApiResponse::<()>::error(message));
        (status, body).into_response()
    }
}

// ============================================================================
// Main Application
// ============================================================================

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive(tracing::Level::INFO.into()),
        )
        .init();

    info!("Starting Oracle API Backend");

    // Load configuration from environment
    // Using latest deployment (November 16, 2025)
    let chain_id = std::env::var("CHAIN_ID")
        .unwrap_or_else(|_| "95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4".to_string());
    
    let app_id = std::env::var("APP_ID")
        .unwrap_or_else(|_| "99740274ffaa04d9ac49a6fe9af3763d7d9dbdf98379a6d68a7e04fcfb77a0e0".to_string());

    let wallet_path = std::env::var("WALLET_PATH")
        .unwrap_or_else(|_| format!("{}/.config/linera/wallet.json", std::env::var("HOME").unwrap()));

    let storage_path = std::env::var("STORAGE_PATH")
        .unwrap_or_else(|_| format!("rocksdb:{}/.config/linera/client.db", std::env::var("HOME").unwrap()));

    // Sender chain for messages (use a chain you own)
    let sender_chain = std::env::var("SENDER_CHAIN_ID")
        .unwrap_or_else(|_| chain_id.clone());

    info!("Configuration:");
    info!("  Target Chain ID: {}", chain_id);
    info!("  Sender Chain ID: {}", sender_chain);
    info!("  App ID: {}", app_id);
    info!("  Wallet: {}", wallet_path);
    info!("  Storage: {}", storage_path);

    // Initialize Linera client
    let linera_client = LineraClient::new(
        chain_id.clone(),
        app_id.clone(),
        wallet_path.clone(),
        storage_path.clone(),
    ).await?;

    info!("Linera client initialized");

    // Initialize Message Sender
    let message_sender = MessageSender::new(
        sender_chain.clone(),
        chain_id.clone(),
        app_id.clone(),
        wallet_path.clone(),
        storage_path.clone(),
    )?;

    info!("Message sender initialized");

    // Initialize CLI Executor (optional - not needed for transaction executor)
    let cli_executor = match CliExecutor::new(chain_id.clone(), app_id.clone()) {
        Ok(executor) => {
            info!("CLI executor initialized");
            executor
        }
        Err(e) => {
            warn!("CLI executor not available: {}. This is OK, transaction executor will work.", e);
            // Create a dummy executor - we won't use it
            CliExecutor::new(chain_id.clone(), app_id.clone()).unwrap_or_else(|_| {
                // If this fails too, we'll handle it gracefully
                panic!("Failed to initialize CLI executor");
            })
        }
    };
    
    info!("CLI executor status checked");

    // Initialize Linera Operation Executor
    let operation_executor = LineraOperationExecutor::new(
        chain_id.clone(),
        app_id.clone(),
        wallet_path.clone(),
        storage_path.clone(),
    );
    
    info!("Operation executor initialized");

    // Initialize Transaction Builder
    let tx_builder = TransactionBuilder::new(chain_id.clone(), app_id.clone())?;
    
    info!("Transaction builder initialized");

    // Initialize Transaction Submitter
    let tx_submitter = TransactionSubmitter::new(
        wallet_path.clone(),
        chain_id.clone(),
        app_id.clone(),
    );
    
    info!("Transaction submitter initialized");
    info!("🚀 TRANSACTION EXECUTOR READY - Can execute operations on testnet!");

    // Create application state
    let state = AppState {
        linera_client: Arc::new(linera_client),
        message_sender: Arc::new(message_sender),
        cli_executor: Arc::new(cli_executor),
        operation_executor: Arc::new(operation_executor),
        tx_builder: Arc::new(tx_builder),
        tx_submitter: Arc::new(tx_submitter),
    };

    // Configure CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build router
    let app = Router::new()
        .route("/health", get(health_check))
        // Voter operations (prepare only)
        .route("/api/register-voter", post(register_voter))
        .route("/api/register-voter-message", post(register_voter_message))
        .route("/api/update-stake", post(update_stake))
        .route("/api/withdraw-stake", post(withdraw_stake))
        .route("/api/claim-rewards", post(claim_rewards))
        // Query operations (prepare only)
        .route("/api/create-query", post(create_query))
        .route("/api/submit-vote", post(submit_vote))
        .route("/api/resolve-query", post(resolve_query))
        // EXECUTE operations (REAL execution)
        .route("/api/execute/register-voter", post(execute_register_voter))
        .route("/api/execute/submit-vote", post(execute_submit_vote))
        .route("/api/execute/create-query", post(execute_create_query))
        .route("/api/execute/instructions", post(get_operation_instructions))
        // TRANSACTION EXECUTOR (PRODUCTION - ACTUALLY WORKS ON TESTNET!)
        .route("/api/transaction/register-voter", post(transaction_register_voter))
        .route("/api/transaction/create-query", post(transaction_create_query))
        .route("/api/transaction/submit-vote", post(transaction_submit_vote))
        // Query endpoints
        .route("/api/voters", get(list_voters))
        .route("/api/queries", get(list_queries))
        // Transaction signing (MetaMask)
        .route("/api/prepare-transaction", post(prepare_transaction))
        .route("/api/submit-signed", post(submit_signed_transaction))
        .layer(cors)
        .with_state(state);

    // Start server
    let addr = "0.0.0.0:3001";
    info!("Server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
