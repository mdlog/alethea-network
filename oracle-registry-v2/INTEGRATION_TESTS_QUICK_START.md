# Integration Tests Quick Start

## Running Voting Flow Integration Tests

### Quick Run

```bash
cd oracle-registry-v2
./run_voting_flow_tests.sh
```

### Manual Run

```bash
# Run all voting flow integration tests
cargo test --lib voting_flow_integration_tests

# Run with output
cargo test --lib voting_flow_integration_tests -- --nocapture

# Run single-threaded (recommended for integration tests)
cargo test --lib voting_flow_integration_tests -- --test-threads=1
```

### Run Individual Tests

```bash
# Test 1: Majority strategy
cargo test --lib test_complete_voting_flow_majority_strategy

# Test 2: Weighted by stake
cargo test --lib test_complete_voting_flow_weighted_by_stake

# Test 3: Minimum votes not met
cargo test --lib test_complete_voting_flow_with_minimum_votes_not_met

# Test 4: Query expiration
cargo test --lib test_complete_voting_flow_with_query_expiration

# Test 5: Multiple queries
cargo test --lib test_complete_voting_flow_multiple_queries

# Test 6: Confidence scores
cargo test --lib test_complete_voting_flow_with_confidence_scores
```

## Test Scenarios

| Test | Voters | Queries | Votes | Strategy | Focus |
|------|--------|---------|-------|----------|-------|
| 1. Majority | 5 | 1 | 5 | Majority | Complete flow |
| 2. Weighted | 3 | 1 | 3 | WeightedByStake | Stake weighting |
| 3. Min Votes | 2 | 1 | 2 | Majority | Insufficient votes |
| 4. Expiration | 1 | 1 | 1 | Majority | Deadline handling |
| 5. Multiple | 3 | 3 | 9 | Majority | Concurrent queries |
| 6. Confidence | 3 | 1 | 3 | Majority | Confidence scores |

## Expected Output

```
running 6 tests
test voting_flow_integration_tests::tests::test_complete_voting_flow_majority_strategy ... ok
test voting_flow_integration_tests::tests::test_complete_voting_flow_weighted_by_stake ... ok
test voting_flow_integration_tests::tests::test_complete_voting_flow_with_minimum_votes_not_met ... ok
test voting_flow_integration_tests::tests::test_complete_voting_flow_with_query_expiration ... ok
test voting_flow_integration_tests::tests::test_complete_voting_flow_multiple_queries ... ok
test voting_flow_integration_tests::tests::test_complete_voting_flow_with_confidence_scores ... ok

test result: ok. 6 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

## What's Tested

✅ **Voter Registration**
- Multiple voters with different stakes
- Voter metadata (name, URL)
- Stake tracking

✅ **Query Management**
- Query creation
- Active query tracking
- Query status transitions
- Query expiration

✅ **Voting**
- Vote submission
- Vote counting
- Confidence scores
- Multiple votes per voter

✅ **Resolution**
- Majority strategy
- Weighted by stake strategy
- Minimum votes requirement
- Result determination

✅ **Reputation**
- Initial reputation (50)
- Updates for correct votes
- Updates for incorrect votes
- Reputation calculation

✅ **Rewards**
- Distribution to correct voters
- No rewards for incorrect voters
- Pending rewards tracking

✅ **Statistics**
- Total queries created
- Total queries resolved
- Total votes submitted
- Voter counts

## Troubleshooting

### Tests Fail to Compile

```bash
# Check for compilation errors
cargo check --lib

# View detailed errors
cargo build --lib
```

### Tests Hang

```bash
# Run with timeout
timeout 60s cargo test --lib voting_flow_integration_tests

# Run single-threaded
cargo test --lib voting_flow_integration_tests -- --test-threads=1
```

### Need More Details

```bash
# Run with verbose output
cargo test --lib voting_flow_integration_tests -- --nocapture --test-threads=1

# Run specific test with output
cargo test --lib test_complete_voting_flow_majority_strategy -- --nocapture
```

## Documentation

- **Full Documentation:** [VOTING_FLOW_INTEGRATION_TESTS.md](VOTING_FLOW_INTEGRATION_TESTS.md)
- **Implementation Summary:** [.kiro/specs/account-based-registry/VOTING_FLOW_INTEGRATION_COMPLETE.md](../.kiro/specs/account-based-registry/VOTING_FLOW_INTEGRATION_COMPLETE.md)
- **Source Code:** [src/voting_flow_integration_tests.rs](src/voting_flow_integration_tests.rs)

## Next Steps

After running these tests successfully:

1. Review test output for any failures
2. Check test coverage with `cargo tarpaulin` (if installed)
3. Proceed to next task: "Test multiple voters" (already covered)
4. Continue with "Test different strategies" (partially covered)
5. Move to deployment and migration tasks

## Support

For issues or questions:
- Check the full documentation in `VOTING_FLOW_INTEGRATION_TESTS.md`
- Review the implementation in `src/voting_flow_integration_tests.rs`
- Consult the task list in `.kiro/specs/account-based-registry/tasks.md`
