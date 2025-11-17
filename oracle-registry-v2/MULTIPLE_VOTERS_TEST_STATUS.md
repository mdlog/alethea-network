# Multiple Voters Test Implementation Status

## Task: Test Multiple Voters

### Current Status: BLOCKED

The task to implement integration tests for multiple voters scenarios is currently blocked due to compilation errors in the oracle-registry-v2 project.

### Issues Discovered

1. **All Integration Tests Failing to Compile**
   - 91 compilation errors across all test files
   - Main issues:
     - `linera_views::memory::MemoryContext` import errors
     - `AccountOwner::from([u8; 32])` trait not implemented
     - Various type mismatches

2. **Contract Binary Not Compiling**
   - The `oracle-registry-v2-contract` binary has 14 compilation errors
   - The `oracle-registry-v2-service` binary likely has similar issues

3. **Root Cause**
   - The project appears to be in a transitional state
   - Possible version mismatch between linera-sdk (0.15.5) and the code
   - The integration test infrastructure needs to be updated

### Work Completed

Created `oracle-registry-v2/src/multiple_voters_tests.rs` with comprehensive test scenarios:

1. **test_large_number_of_voters** - Tests scalability with 50 voters
2. **test_voters_with_varying_stakes** - Tests weighted by stake strategy
3. **test_voters_with_varying_reputations** - Tests weighted by reputation strategy
4. **test_concurrent_voting_on_multiple_queries** - Tests 10 voters on 5 queries
5. **test_voter_churn_registration_and_deregistration** - Tests voter lifecycle
6. **test_reward_distribution_across_many_voters** - Tests reward distribution to 20 voters
7. **test_reputation_evolution_over_multiple_queries** - Tests reputation changes over 10 queries
8. **test_mixed_strategies_with_multiple_voters** - Tests all decision strategies
9. **test_voters_joining_mid_query** - Tests dynamic voter registration

### Test Coverage

The test file covers:
- ✅ Large scale voter management (50+ voters)
- ✅ Different stake levels and their impact
- ✅ Reputation-based weighting
- ✅ Concurrent operations across multiple queries
- ✅ Voter registration/deregistration dynamics
- ✅ Reward distribution fairness
- ✅ Reputation evolution over time
- ✅ All decision strategies (Majority, WeightedByStake, WeightedByReputation)
- ✅ Edge cases (voters joining mid-query, varying confidence levels)

### Next Steps

To unblock this task, one of the following approaches is needed:

1. **Fix Integration Test Infrastructure** (Recommended)
   - Update all test files to use correct imports for linera-sdk 0.15.5
   - Fix MemoryContext usage or find alternative test context
   - Ensure AccountOwner creation works correctly
   - Fix type mismatches (u8 vs u32 for reputation, etc.)

2. **Update linera-sdk Version**
   - Check if a newer version of linera-sdk fixes these issues
   - Update workspace dependencies
   - Test compatibility

3. **Alternative Testing Approach**
   - Create unit tests that don't require full integration test infrastructure
   - Mock the state layer
   - Test logic in isolation

### Files Created

- `oracle-registry-v2/src/multiple_voters_tests.rs` - Comprehensive multi-voter test suite (cannot compile yet)
- `oracle-registry-v2/run_multiple_voters_tests.sh` - Test execution script
- `oracle-registry-v2/MULTIPLE_VOTERS_TEST_STATUS.md` - This status document

### Recommendation

Before proceeding with this task, the oracle-registry-v2 project needs to be brought to a compilable state. This likely requires:

1. Reviewing and fixing all integration test files
2. Ensuring the contract and service binaries compile
3. Verifying compatibility with linera-sdk 0.15.5

Once the project compiles, the multiple voters tests can be executed and verified.

## Test Implementation Details

The test file follows the same pattern as existing integration tests:

```rust
// Helper functions
- setup_test_state() - Creates test context and initializes state
- create_test_voter(id) - Creates test voter accounts
- register_voter() - Registers a voter with stake and reputation
- create_query() - Creates a test query
- submit_vote() - Submits a vote for a query

// Test scenarios cover:
- Scalability (50 voters)
- Stake-based weighting
- Reputation-based weighting
- Concurrent operations
- Voter lifecycle management
- Reward distribution
- Reputation evolution
- Mixed strategies
- Dynamic scenarios
```

All tests follow the same structure as the existing `voting_flow_integration_tests.rs` file and should work once the compilation issues are resolved.
