# Integration Tests for Alethea Oracle-as-a-Service

This directory contains integration tests for the Oracle-as-a-Service refactoring. These tests verify the complete flow of external market registration, voting, resolution, and callbacks.

## Test Structure

```
tests/
├── integration_tests.rs          # Main test entry point
└── integration/
    ├── mod.rs                     # Module definitions
    ├── helpers.rs                 # Test utilities and setup functions
    ├── external_market_flow.rs    # External dApp integration tests
    └── market_chain_integration.rs # Market Chain integration tests
```

## Test Coverage

### External Market Flow Tests (`external_market_flow.rs`)

1. **Complete External Market Flow**
   - External dApp registers market with Registry
   - Voters receive vote requests
   - Voters submit votes
   - Registry aggregates and resolves market
   - External dApp receives callback
   - Market status is updated to RESOLVED

2. **Error Handling**
   - Insufficient registration fee rejection
   - Invalid outcomes validation (< 2 or > 10)
   - Callback retry mechanism

### Market Chain Integration Tests (`market_chain_integration.rs`)

1. **Market Chain Uses Registry**
   - Market Chain creates internal market
   - Market Chain requests resolution from Registry (like external dApp)
   - Resolution callback is received
   - Winnings are distributed correctly

2. **Registry Independence**
   - Registry continues functioning without Market Chain
   - External markets work independently

3. **Concurrent Markets**
   - Multiple markets can be processed simultaneously
   - Each market resolves independently

4. **Error Handling**
   - Market Chain handles Registry unavailability
   - Callback source verification

## Running Tests

### Run All Integration Tests

```bash
cargo test --test integration_tests
```

### Run Specific Test Module

```bash
# External market flow tests
cargo test --test integration_tests external_market_flow

# Market Chain integration tests
cargo test --test integration_tests market_chain_integration
```

### Run Specific Test

```bash
cargo test --test integration_tests test_external_market_complete_flow
```

### Run with Output

```bash
cargo test --test integration_tests -- --nocapture
```

## Test Environment Setup

The integration tests use a mock test environment that simulates:

- **Oracle Registry**: Core oracle service
- **Market Chain**: Optional showcase application
- **Voter Contracts**: 3 voter instances
- **External dApp**: Example external application

The `helpers.rs` module provides utilities for:

- Deploying mock contracts
- Creating test chain IDs and application IDs
- Simulating GraphQL API calls
- Waiting for callbacks with timeout
- Creating test data (timestamps, amounts, markets)

## Implementation Notes

### Current State

These integration tests are currently **simulation-based** and use mock functions to represent contract interactions. They test the logical flow and error handling without requiring actual contract deployment.

### Future Enhancements

To make these full end-to-end integration tests, the following would need to be implemented:

1. **Actual Contract Deployment**
   - Deploy real contracts to a test Linera network
   - Use `linera` CLI or SDK to deploy bytecode
   - Initialize contracts with proper parameters

2. **Real GraphQL Interactions**
   - Replace mock GraphQL calls with actual HTTP requests
   - Use the Registry's GraphQL service endpoint
   - Parse real responses

3. **Cross-Chain Message Verification**
   - Verify actual cross-chain messages are sent
   - Check message delivery and processing
   - Validate callback data

4. **State Verification**
   - Query actual contract state
   - Verify storage updates
   - Check event emissions

## Requirements Verification

These tests verify the following requirements from the spec:

- **Requirement 3.5**: Market Chain can be removed without breaking Registry
- **Requirement 8.1**: External dApp successfully registers market with Registry
- **Requirement 8.2**: External dApp receives resolution callback
- **Requirement 10.1**: Market Chain uses Registry like external dApps
- **Requirement 10.2**: Market Chain receives callbacks and distributes winnings

## Adding New Tests

To add new integration tests:

1. Create a new test module in `tests/integration/`
2. Add the module to `tests/integration/mod.rs`
3. Implement test functions with `#[tokio::test]` attribute
4. Use helper functions from `helpers.rs` for setup
5. Document the test purpose and requirements coverage

Example:

```rust
#[tokio::test]
async fn test_new_feature() {
    let env = setup_test_environment().await;
    
    // Test implementation
    
    assert!(condition, "Assertion message");
}
```

## Troubleshooting

### Tests Fail to Compile

- Ensure all dependencies are in `Cargo.toml`
- Check that `linera-sdk` version matches workspace
- Verify all imports are correct

### Tests Timeout

- Increase timeout values in `wait_for_callback`
- Check that async operations are properly awaited
- Verify tokio runtime is configured correctly

### Mock Data Issues

- Ensure test data is valid (timestamps in future, valid amounts)
- Check that chain IDs and application IDs are unique
- Verify outcome counts are within valid range (2-10)

## Contributing

When adding new integration tests:

1. Follow the existing test structure and naming conventions
2. Add comprehensive assertions to verify behavior
3. Include both success and error cases
4. Document requirements being tested
5. Update this README with new test descriptions
