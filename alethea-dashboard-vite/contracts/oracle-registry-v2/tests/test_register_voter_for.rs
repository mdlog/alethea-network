use oracle_registry_v2::*;
use linera_sdk::linera_base_types::{Amount, AccountOwner};

#[tokio::test]
async fn test_register_voter_for_operation() {
    // Test data
    let alice_address = "0xfb3d8fcd4e78e5e4cd755307374561e3436e2dd48420e051af86333bc75d7c82";
    let stake = Amount::from_tokens(100_000_000_000_000_000_000);
    
    // Create RegisterVoterFor operation
    let operation = Operation::RegisterVoterFor {
        voter_address: alice_address.to_string(),
        stake,
        name: Some("Alice".to_string()),
        metadata_url: None,
    };
    
    // Verify operation can be created
    match operation {
        Operation::RegisterVoterFor { ref voter_address, ref stake, ref name, .. } => {
            assert_eq!(voter_address, alice_address);
            assert_eq!(*stake, Amount::from_tokens(100_000_000_000_000_000_000));
            assert_eq!(name.as_ref().unwrap(), "Alice");
            println!("✅ RegisterVoterFor operation created successfully");
        }
        _ => panic!("Wrong operation type"),
    }
    
    // Verify address can be parsed
    let parsed_address = alice_address.parse::<AccountOwner>();
    assert!(parsed_address.is_ok(), "Address should be parseable");
    println!("✅ Address format is valid: {}", alice_address);
    
    // Test serialization
    let serialized = serde_json::to_string(&operation);
    assert!(serialized.is_ok(), "Operation should be serializable");
    println!("✅ Operation is serializable");
    
    println!("\n=== Test Summary ===");
    println!("Operation: RegisterVoterFor");
    println!("Voter Address: {}", alice_address);
    println!("Stake: {} tokens", stake);
    println!("Name: Alice");
    println!("✅ All validations passed!");
}
