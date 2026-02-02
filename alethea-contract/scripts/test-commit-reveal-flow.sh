#!/bin/bash

# Test Commit/Reveal Voting Flow
# This script tests the complete commit/reveal voting flow

set -e

# Configuration
CHAIN_ID="${CHAIN_ID:-8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef}"
REGISTRY_ID="${REGISTRY_ID:-9936172d5d1f3fb3ae65ea2bb51391afc561d9f8b80927c9e8e32c1efe9380d2}"
LINERA_WALLET="${LINERA_WALLET:-$HOME/.config/linera/wallet.json}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================="
echo "Commit/Reveal Voting Flow Test"
echo "========================================="
echo ""

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to run test
run_test() {
    local test_name=$1
    local command=$2
    
    echo -e "${BLUE}Testing: $test_name${NC}"
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Helper function to compute commit hash
compute_hash() {
    local value=$1
    local salt=$2
    echo -n "${value}${salt}" | sha256sum | awk '{print $1}'
}

echo "========================================="
echo "Phase 1: Setup"
echo "========================================="
echo ""

# Generate test data
TEST_QUERY_DESC="Test Query: Will this test pass?"
TEST_OUTCOMES='["Yes", "No"]'
TEST_VOTE_VALUE="Yes"
TEST_SALT=$(openssl rand -hex 32)
TEST_COMMIT_HASH=$(compute_hash "$TEST_VOTE_VALUE" "$TEST_SALT")

echo "Test Data:"
echo "  Query: $TEST_QUERY_DESC"
echo "  Outcomes: $TEST_OUTCOMES"
echo "  Vote Value: $TEST_VOTE_VALUE"
echo "  Salt: $TEST_SALT"
echo "  Commit Hash: $TEST_COMMIT_HASH"
echo ""

echo "========================================="
echo "Phase 2: Create Query"
echo "========================================="
echo ""

CREATE_QUERY_CMD="linera --wallet $LINERA_WALLET \
    --with-new-chain \
    --chain $CHAIN_ID \
    request-application $REGISTRY_ID \
    --operation '{\"CreateQuery\": {
        \"description\": \"$TEST_QUERY_DESC\",
        \"outcomes\": $TEST_OUTCOMES,
        \"strategy\": \"Majority\",
        \"min_votes\": 2,
        \"reward_amount\": \"100\",
        \"deadline\": null
    }}'"

run_test "Create Query" "$CREATE_QUERY_CMD"

# Get query ID (assume it's 1 for this test)
QUERY_ID=1
echo "Query ID: $QUERY_ID"
echo ""

echo "========================================="
echo "Phase 3: Commit Phase"
echo "========================================="
echo ""

# Test 1: Commit vote
COMMIT_CMD="linera --wallet $LINERA_WALLET \
    --with-new-chain \
    --chain $CHAIN_ID \
    request-application $REGISTRY_ID \
    --operation '{\"CommitVote\": {
        \"query_id\": $QUERY_ID,
        \"commit_hash\": \"$TEST_COMMIT_HASH\"
    }}'"

run_test "Commit Vote" "$COMMIT_CMD"

# Test 2: Try to commit again (should fail)
echo -e "${YELLOW}Testing: Double Commit (should fail)${NC}"
if eval "$COMMIT_CMD" > /dev/null 2>&1; then
    echo -e "${RED}✗ FAILED (should have been rejected)${NC}"
    ((TESTS_FAILED++))
else
    echo -e "${GREEN}✓ PASSED (correctly rejected)${NC}"
    ((TESTS_PASSED++))
fi

# Test 3: Try to reveal during commit phase (should fail)
REVEAL_CMD="linera --wallet $LINERA_WALLET \
    --with-new-chain \
    --chain $CHAIN_ID \
    request-application $REGISTRY_ID \
    --operation '{\"RevealVote\": {
        \"query_id\": $QUERY_ID,
        \"value\": \"$TEST_VOTE_VALUE\",
        \"salt\": \"$TEST_SALT\",
        \"confidence\": null
    }}'"

echo -e "${YELLOW}Testing: Reveal During Commit Phase (should fail)${NC}"
if eval "$REVEAL_CMD" > /dev/null 2>&1; then
    echo -e "${RED}✗ FAILED (should have been rejected)${NC}"
    ((TESTS_FAILED++))
else
    echo -e "${GREEN}✓ PASSED (correctly rejected)${NC}"
    ((TESTS_PASSED++))
fi

echo ""
echo "========================================="
echo "Phase 4: Wait for Reveal Phase"
echo "========================================="
echo ""

echo "Waiting for commit phase to end..."
echo "(In production, this would be 12 hours)"
echo "For testing, we'll simulate phase transition"
echo ""

# In a real test, you would wait for the actual time
# For now, we'll just note that the reveal phase should start

echo "========================================="
echo "Phase 5: Reveal Phase"
echo "========================================="
echo ""

# Test 4: Reveal vote with correct hash
run_test "Reveal Vote" "$REVEAL_CMD"

# Test 5: Try to reveal again (should fail)
echo -e "${YELLOW}Testing: Double Reveal (should fail)${NC}"
if eval "$REVEAL_CMD" > /dev/null 2>&1; then
    echo -e "${RED}✗ FAILED (should have been rejected)${NC}"
    ((TESTS_FAILED++))
else
    echo -e "${GREEN}✓ PASSED (correctly rejected)${NC}"
    ((TESTS_PASSED++))
fi

# Test 6: Try to reveal with wrong salt (should fail)
WRONG_SALT=$(openssl rand -hex 32)
WRONG_REVEAL_CMD="linera --wallet $LINERA_WALLET \
    --with-new-chain \
    --chain $CHAIN_ID \
    request-application $REGISTRY_ID \
    --operation '{\"RevealVote\": {
        \"query_id\": $QUERY_ID,
        \"value\": \"$TEST_VOTE_VALUE\",
        \"salt\": \"$WRONG_SALT\",
        \"confidence\": null
    }}'"

echo -e "${YELLOW}Testing: Reveal with Wrong Salt (should fail)${NC}"
if eval "$WRONG_REVEAL_CMD" > /dev/null 2>&1; then
    echo -e "${RED}✗ FAILED (should have been rejected)${NC}"
    ((TESTS_FAILED++))
else
    echo -e "${GREEN}✓ PASSED (correctly rejected)${NC}"
    ((TESTS_PASSED++))
fi

echo ""
echo "========================================="
echo "Phase 6: Resolution"
echo "========================================="
echo ""

# Test 7: Auto-resolve
AUTO_RESOLVE_CMD="linera --wallet $LINERA_WALLET \
    --with-new-chain \
    --chain $CHAIN_ID \
    request-application $REGISTRY_ID \
    --operation '{\"AutoResolveQueries\": {}}'"

run_test "Auto-Resolve Queries" "$AUTO_RESOLVE_CMD"

# Test 8: Check query status
QUERY_STATUS_CMD="linera --wallet $LINERA_WALLET \
    --chain $CHAIN_ID \
    query-application $REGISTRY_ID \
    --query '{\"query\": {\"id\": $QUERY_ID}}'"

echo -e "${BLUE}Testing: Query Status After Resolution${NC}"
if eval "$QUERY_STATUS_CMD" | grep -q "Resolved"; then
    echo -e "${GREEN}✓ PASSED (query resolved)${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED (query not resolved)${NC}"
    ((TESTS_FAILED++))
fi

echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo ""
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    exit 1
fi
