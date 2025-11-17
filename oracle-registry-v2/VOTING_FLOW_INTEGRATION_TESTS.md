# Voting Flow Integration Tests

## Overview

This document describes the comprehensive integration tests for the complete voting flow in the Account-Based Oracle Registry. These tests validate the entire lifecycle of a query from creation to resolution and reward distribution.

## Test Coverage

### 1. Complete Voting Flow with Majority Strategy

**Test:** `test_complete_voting_flow_majority_strategy`

**Scenario:**
- 5 voters register with minimum stake
- A query is created requiring 3 votes
- 5 voters submit votes (3 vote "Yes", 2 vote "No")
- Query is resolved with majority result ("Yes")
- Reputations are updated based on correctness
- Rewards are distributed to correct voters

**Validates:**
- Voter registration process
- Query creation and activation
- Vote submission and tracking
- Query resolution with majority strategy
- Reputation updates for correct/incorrect voters
- Reward distribution to winners

**Expected Results:**
- All 5 voters successfully registered
- Query created and marked as active
- All 5 votes recorded correctly
- Query resolved with "Yes" as the result
- Correct voters (3) have reputation >= 90
- Incorrect voters (2) have reputation <= 10
- Correct voters receive rewards
- Incorrect voters receive no rewards

### 2. Complete Voting Flow with Weighted by Stake Strategy

**Test:** `test_complete_voting_flow_weighted_by_stake`

**Scenario:**
- 3 voters register with different stake amounts:
  - Voter 1: 1000 tokens (high stake)
  - Voter 2: 500 tokens (medium stake)
  - Voter 3: 100 tokens (minimum stake)
- Query created with WeightedByStake strategy
- All voters submit votes
- Query resolved based on weighted votes
- Reputations updated

**Validates:**
- Voters can register with varying stake amounts
- Weighted voting strategy considers stake amounts
- Higher stake voters have more influence
- Reputation updates reflect voting accuracy

**Expected Results:**
- All voters registered with different stakes
- Query resolved based on weighted votes
- Correct voters have higher reputation than incorrect voters
- Stake amounts properly tracked

### 3. Minimum Votes Not Met

**Test:** `test_complete_voting_flow_with_minimum_votes_not_met`

**Scenario:**
- 2 voters register
- Query created requiring 5 votes
- Only 2 votes submitted
- Query remains active (cannot be resolved)

**Validates:**
- Query cannot be resolved without minimum votes
- Query remains in active state
- Vote count tracking is accurate

**Expected Results:**
- Query stays in Active status
- Vote count is 2 (less than required 5)
- Query cannot be resolved

### 4. Query Expiration

**Test:** `test_complete_voting_flow_with_query_expiration`

**Scenario:**
- 1 voter registers
- Query created with short deadline
- 1 vote submitted (less than minimum required)
- Deadline passes
- Query marked as expired

**Validates:**
- Queries can expire when deadline passes
- Expired queries are removed from active list
- Expired queries have no result

**Expected Results:**
- Query marked as Expired
- Query removed from active queries
- No result set for expired query
- Votes submitted before expiration are recorded

### 5. Multiple Queries

**Test:** `test_complete_voting_flow_multiple_queries`

**Scenario:**
- 3 voters register
- 3 queries created
- Each voter votes on all 3 queries
- Total of 9 votes submitted

**Validates:**
- Multiple queries can be active simultaneously
- Voters can participate in multiple queries
- Vote tracking across multiple queries
- Statistics are accurate across queries

**Expected Results:**
- All 3 queries created successfully
- Each query has 3 votes
- Each voter has 3 total votes
- Total votes submitted: 9
- All vote counts accurate

### 6. Confidence Scores

**Test:** `test_complete_voting_flow_with_confidence_scores`

**Scenario:**
- 3 voters register
- Query created
- Voters submit votes with different confidence levels:
  - Voter 1: 100% confidence
  - Voter 2: 70% confidence
  - Voter 3: 50% confidence

**Validates:**
- Confidence scores are properly stored
- Votes can include optional confidence levels
- Confidence data is retrievable

**Expected Results:**
- All votes recorded with correct confidence scores
- Confidence scores match submitted values
- Votes without confidence work correctly

## Running the Tests

### Run All Voting Flow Integration Tests

```bash
./run_voting_flow_tests.sh
```

Or directly with cargo:

```bash
cargo test --lib voting_flow_integration_tests -- --test-threads=1
```

### Run Individual Tests

```bash
# Test majority strategy
cargo test --lib test_complete_voting_flow_majority_strategy

# Test weighted by stake
cargo test --lib test_complete_voting_flow_weighted_by_stake

# Test minimum votes not met
cargo test --lib test_complete_voting_flow_with_minimum_votes_not_met

# Test query expiration
cargo test --lib test_complete_voting_flow_with_query_expiration

# Test multiple queries
cargo test --lib test_complete_voting_flow_multiple_queries

# Test confidence scores
cargo test --lib test_complete_voting_flow_with_confidence_scores
```

## Test Architecture

### Helper Functions

The tests use several helper functions to reduce code duplication:

1. **`setup_test_state()`** - Creates a fresh test state with initialized parameters
2. **`create_test_voter(id)`** - Creates a test voter account with unique ID
3. **`register_voter()`** - Registers a voter with specified parameters
4. **`create_query()`** - Creates a query with specified parameters
5. **`submit_vote()`** - Submits a vote for a query

### Test Data

- Test voters use deterministic account addresses based on ID
- Timestamps are in microseconds
- Amounts are in tokens (1 token = 1,000,000 microunits)
- Default parameters from `ProtocolParameters::default()`

## Integration with Contract Logic

These integration tests validate the state management layer. They should be complemented with:

1. **Contract tests** - Testing the contract operations
2. **Service tests** - Testing GraphQL queries and mutations
3. **End-to-end tests** - Testing the full application flow

## Success Criteria

All tests must pass with:
- ✅ No panics or errors
- ✅ All assertions passing
- ✅ Correct state transitions
- ✅ Accurate vote counting
- ✅ Proper reputation updates
- ✅ Correct reward distribution

## Future Enhancements

Potential additions to the test suite:

1. **Concurrent voting** - Test race conditions
2. **Large-scale tests** - Test with 100+ voters
3. **Edge cases** - Test boundary conditions
4. **Performance tests** - Measure operation times
5. **Slashing tests** - Test penalty mechanisms
6. **Stake locking** - Test locked stake during active votes

## Related Documentation

- [Requirements](requirements.md)
- [Design](design.md)
- [Tasks](tasks.md)
- [Reputation System](REPUTATION_SYSTEM.md)
- [Reward Distribution](REWARD_DISTRIBUTION_SUMMARY.md)

## Maintenance

These tests should be updated when:
- State structure changes
- New voting strategies are added
- Reputation calculation changes
- Reward distribution logic changes
- New query statuses are added
