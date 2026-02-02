// Integration test for voter registration

use linera_sdk::linera_base_types::Amount;
use oracle_registry_v2::{Operation, OperationResponse};

#[tokio::test]
async fn test_register_voter_integration() {
    // This test demonstrates how voter registration would work
    // In a real Linera environment with proper chain contexts
    
    let stake = Amount::from_tokens(100);
    let name = Some("Test Voter 1".to_string());
    let metadata_url = Some("https://example.com/voter1".to_string());
    
    let operation = Operation::RegisterVoter {
        stake,
        name,
        metadata_url,
    };
    
    // Serialize the operation
    let serialized = serde_json::to_string(&operation).unwrap();
    println!("Operation to execute: {}", serialized);
    
    // In a real test with Linera test framework, this would be executed
    // and we would verify the response
    assert!(serialized.contains("RegisterVoter"));
    assert!(serialized.contains("Test Voter 1"));
}

#[test]
fn test_operation_response_creation() {
    let response = OperationResponse::success("Voter registered successfully");
    assert!(response.success);
    assert_eq!(response.message, "Voter registered successfully");
    assert!(response.data.is_none());
    
    let error_response = OperationResponse::error("Voter already registered");
    assert!(!error_response.success);
    assert_eq!(error_response.message, "Voter already registered");
}
