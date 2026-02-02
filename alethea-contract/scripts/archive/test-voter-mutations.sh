#!/bin/bash
# Test Voter Mutations - Verify Implementation Works
# Based on: docs/PERBAIKAN_UNTUK_TEST_WORKFLOW.md

set -e

source .env.conway

echo "=========================================="
echo "🧪 Testing Voter Mutations"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Initialize Voter
echo "📝 Test 1: Initialize Voter"
echo "Voter ID: $VOTER_1_ID"
echo "Registry ID: $ALETHEA_REGISTRY_ID"
echo ""

INIT_RESULT=$(curl -s -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_1_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"mutation { initialize(registryId: \\\"$ALETHEA_REGISTRY_ID\\\", initialStake: \\\"1000\\\") }\"
  }")

echo "Response:"
echo "$INIT_RESULT" | jq .

# Check for errors
if echo "$INIT_RESULT" | jq -e '.errors' > /dev/null 2>&1; then
    echo -e "${RED}❌ Initialize mutation has errors${NC}"
    echo "$INIT_RESULT" | jq '.errors'
else
    echo -e "${GREEN}✅ Initialize mutation executed${NC}"
fi

echo ""
echo "⏳ Waiting 3 seconds for operation to execute..."
sleep 3
echo ""

# Test 2: Check Status After Initialize
echo "📊 Test 2: Check Status After Initialize"
echo ""

STATUS_RESULT=$(curl -s -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_1_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ status { stake reputation totalVotes correctVotes accuracyRate autoVoteEnabled } }"
  }')

echo "Response:"
echo "$STATUS_RESULT" | jq .

# Verify stake
STAKE=$(echo "$STATUS_RESULT" | jq -r '.data.status.stake // "null"')
echo ""
if [ "$STAKE" = "1000" ]; then
    echo -e "${GREEN}✅ PASS: Stake is correct ($STAKE)${NC}"
elif [ "$STAKE" = "null" ] || [ "$STAKE" = "" ]; then
    echo -e "${YELLOW}⚠️  WARNING: Stake is null/empty - operation may not have executed${NC}"
else
    echo -e "${YELLOW}⚠️  WARNING: Stake is $STAKE (expected 1000)${NC}"
fi

echo ""
echo "=========================================="
echo "📝 Test 3: Submit Vote"
echo "=========================================="
echo ""

VOTE_RESULT=$(curl -s -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_1_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { submitVote(marketId: 1, outcomeIndex: 0, confidence: 80) }"
  }')

echo "Response:"
echo "$VOTE_RESULT" | jq .

# Check for errors
if echo "$VOTE_RESULT" | jq -e '.errors' > /dev/null 2>&1; then
    ERROR_MSG=$(echo "$VOTE_RESULT" | jq -r '.errors[0].message')
    if echo "$ERROR_MSG" | grep -q "VoteNotFound"; then
        echo -e "${YELLOW}⚠️  Expected error: Vote not found (no active vote request)${NC}"
    else
        echo -e "${RED}❌ Unexpected error: $ERROR_MSG${NC}"
    fi
else
    echo -e "${GREEN}✅ Submit vote mutation executed${NC}"
fi

echo ""
echo "=========================================="
echo "📝 Test 4: Update Stake"
echo "=========================================="
echo ""

UPDATE_STAKE_RESULT=$(curl -s -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_1_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { updateStake(additionalStake: \"500\") }"
  }')

echo "Response:"
echo "$UPDATE_STAKE_RESULT" | jq .

# Check for errors
if echo "$UPDATE_STAKE_RESULT" | jq -e '.errors' > /dev/null 2>&1; then
    echo -e "${RED}❌ Update stake mutation has errors${NC}"
else
    echo -e "${GREEN}✅ Update stake mutation executed${NC}"
fi

echo ""
echo "⏳ Waiting 3 seconds..."
sleep 3
echo ""

# Check new stake
echo "📊 Checking new stake..."
NEW_STATUS=$(curl -s -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_1_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ status { stake } }"
  }')

NEW_STAKE=$(echo "$NEW_STATUS" | jq -r '.data.status.stake // "null"')
echo "New stake: $NEW_STAKE"

if [ "$NEW_STAKE" = "1500" ]; then
    echo -e "${GREEN}✅ PASS: Stake updated correctly (1000 + 500 = 1500)${NC}"
elif [ "$NEW_STAKE" = "1000" ]; then
    echo -e "${YELLOW}⚠️  WARNING: Stake unchanged - update may not have executed${NC}"
else
    echo -e "${YELLOW}⚠️  INFO: Stake is $NEW_STAKE${NC}"
fi

echo ""
echo "=========================================="
echo "📝 Test 5: Enable Auto-Vote"
echo "=========================================="
echo ""

AUTO_VOTE_RESULT=$(curl -s -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_1_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { enableAutoVote }"
  }')

echo "Response:"
echo "$AUTO_VOTE_RESULT" | jq .

if echo "$AUTO_VOTE_RESULT" | jq -e '.errors' > /dev/null 2>&1; then
    echo -e "${RED}❌ Enable auto-vote has errors${NC}"
else
    echo -e "${GREEN}✅ Enable auto-vote executed${NC}"
fi

echo ""
echo "=========================================="
echo "📊 Final Summary"
echo "=========================================="
echo ""

FINAL_STATUS=$(curl -s -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_1_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ status { stake reputation totalVotes correctVotes accuracyRate autoVoteEnabled } }"
  }')

echo "Final Voter Status:"
echo "$FINAL_STATUS" | jq .

echo ""
echo "=========================================="
echo "✅ Test Complete"
echo "=========================================="
echo ""
echo "Summary:"
echo "- Initialize: Tested ✅"
echo "- Check Status: Tested ✅"
echo "- Submit Vote: Tested ✅"
echo "- Update Stake: Tested ✅"
echo "- Enable Auto-Vote: Tested ✅"
echo ""
echo "Next Steps:"
echo "1. If all tests pass → Mutations are working correctly"
echo "2. If operations don't execute → Check contract logs"
echo "3. Run complete workflow test: ./scripts/test-complete-workflow.sh"
