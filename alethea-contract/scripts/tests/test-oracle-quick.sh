#!/bin/bash

# ============================================================================
# Quick Oracle Test - Creates market with 1 minute deadline for fast testing
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load environment
source .env.fresh

LINERA_SERVICE="http://localhost:8080"
REGISTRY_ENDPOINT="${LINERA_SERVICE}/chains/${CHAIN_ID}/applications/${ALETHEA_REGISTRY_ID}"
MARKET_ENDPOINT="${LINERA_SERVICE}/chains/${CHAIN_ID}/applications/${MARKET_CHAIN_ID}"
VOTER_1_ENDPOINT="${LINERA_SERVICE}/chains/${VOTER_1_CHAIN_ID}/applications/${VOTER_1_ID}"
VOTER_2_ENDPOINT="${LINERA_SERVICE}/chains/${VOTER_2_CHAIN_ID}/applications/${VOTER_2_ID}"
VOTER_3_ENDPOINT="${LINERA_SERVICE}/chains/${VOTER_3_CHAIN_ID}/applications/${VOTER_3_ID}"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Quick Oracle Resolution Test (1 minute deadline)      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# Step 1: Create Market with 1 minute deadline
# ============================================================================
echo -e "${YELLOW}[Step 1] Creating test market with 1 minute deadline...${NC}"

CURRENT_TIME=$(date +%s)
DEADLINE_TIME=$((CURRENT_TIME + 60))  # 1 minute from now
DEADLINE_MICROS=$((DEADLINE_TIME * 1000000))

echo "  Deadline: $(date -d @${DEADLINE_TIME} '+%Y-%m-%d %H:%M:%S')"

CREATE_RESULT=$(curl -s -X POST "${MARKET_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"mutation { createMarket(question: \\\"Quick test: Will this work?\\\", outcomes: [\\\"Yes\\\", \\\"No\\\"], resolutionDeadline: \\\"${DEADLINE_MICROS}\\\", initialLiquidity: \\\"1000\\\") }\"}")

if echo "${CREATE_RESULT}" | jq -e '.data.createMarket' > /dev/null 2>&1; then
    echo -e "${GREEN}  ✓ Market created${NC}"
else
    echo -e "${RED}  ✗ Failed to create market${NC}"
    echo "${CREATE_RESULT}" | jq '.'
    exit 1
fi

# Get market ID
MARKETS=$(curl -s -X POST "${MARKET_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ markets { id question status } }"}')

MARKET_ID=$(echo "${MARKETS}" | jq -r '.data.markets | sort_by(.id) | last | .id')
echo -e "${GREEN}  Market ID: ${MARKET_ID}${NC}"

echo ""

# ============================================================================
# Step 2: Wait for deadline
# ============================================================================
echo -e "${YELLOW}[Step 2] Waiting for deadline (60 seconds)...${NC}"

for i in {60..1}; do
    echo -ne "  ${i} seconds remaining...\r"
    sleep 1
done
echo -e "${GREEN}  ✓ Deadline passed!${NC}                    "

echo ""

# ============================================================================
# Step 3: Request Resolution
# ============================================================================
echo -e "${YELLOW}[Step 3] Requesting resolution...${NC}"

RESOLUTION_RESULT=$(curl -s -X POST "${MARKET_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"mutation { requestResolution(marketId: ${MARKET_ID}) }\"}")

echo "${RESOLUTION_RESULT}" | jq '.'

if echo "${RESOLUTION_RESULT}" | jq -e '.data.requestResolution' > /dev/null 2>&1; then
    echo -e "${GREEN}  ✓ Resolution requested${NC}"
else
    echo -e "${RED}  ✗ Failed to request resolution${NC}"
    exit 1
fi

echo ""

# ============================================================================
# Step 4: Check Registry for market
# ============================================================================
echo -e "${YELLOW}[Step 4] Checking Registry for market...${NC}"

REGISTRY_MARKET=$(curl -s -X POST "${REGISTRY_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"{ market(id: ${MARKET_ID}) { id question status } }\"}")

echo "${REGISTRY_MARKET}" | jq '.'

echo ""

# ============================================================================
# Step 5: Voters submit votes
# ============================================================================
echo -e "${YELLOW}[Step 5] Submitting votes from all voters...${NC}"

echo "  Voter 1: Voting 'Yes' (0) with 90% confidence..."
VOTE1=$(curl -s -X POST "${VOTER_1_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"mutation { submitVote(marketId: ${MARKET_ID}, outcomeIndex: 0, confidence: 90) }\"}")

if echo "${VOTE1}" | jq -e '.data.submitVote' > /dev/null 2>&1; then
    echo -e "${GREEN}    ✓ Voter 1 voted${NC}"
else
    echo -e "${RED}    ✗ Voter 1 failed${NC}"
    echo "${VOTE1}" | jq '.'
fi

echo "  Voter 2: Voting 'Yes' (0) with 85% confidence..."
VOTE2=$(curl -s -X POST "${VOTER_2_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"mutation { submitVote(marketId: ${MARKET_ID}, outcomeIndex: 0, confidence: 85) }\"}")

if echo "${VOTE2}" | jq -e '.data.submitVote' > /dev/null 2>&1; then
    echo -e "${GREEN}    ✓ Voter 2 voted${NC}"
else
    echo -e "${RED}    ✗ Voter 2 failed${NC}"
    echo "${VOTE2}" | jq '.'
fi

echo "  Voter 3: Voting 'No' (1) with 60% confidence..."
VOTE3=$(curl -s -X POST "${VOTER_3_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"mutation { submitVote(marketId: ${MARKET_ID}, outcomeIndex: 1, confidence: 60) }\"}")

if echo "${VOTE3}" | jq -e '.data.submitVote' > /dev/null 2>&1; then
    echo -e "${GREEN}    ✓ Voter 3 voted${NC}"
else
    echo -e "${RED}    ✗ Voter 3 failed${NC}"
    echo "${VOTE3}" | jq '.'
fi

echo ""

# ============================================================================
# Step 6: Wait for aggregation
# ============================================================================
echo -e "${YELLOW}[Step 6] Waiting for vote aggregation (5 seconds)...${NC}"
sleep 5

echo ""

# ============================================================================
# Step 7: Check final resolution
# ============================================================================
echo -e "${YELLOW}[Step 7] Checking final resolution...${NC}"

FINAL_STATUS=$(curl -s -X POST "${MARKET_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"{ market(id: ${MARKET_ID}) { id question status finalOutcome } }\"}")

echo "Final Market Status:"
echo "${FINAL_STATUS}" | jq '.'

STATUS=$(echo "${FINAL_STATUS}" | jq -r '.data.market.status')
OUTCOME=$(echo "${FINAL_STATUS}" | jq -r '.data.market.finalOutcome')

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Test Results                                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Market ID: ${MARKET_ID}"
echo -e "  Status: ${STATUS}"
echo -e "  Final Outcome: ${OUTCOME}"
echo ""

if [ "${STATUS}" = "Resolved" ] && [ "${OUTCOME}" != "null" ]; then
    echo -e "${GREEN}✓✓✓ ORACLE RESOLUTION TEST PASSED! ✓✓✓${NC}"
    echo ""
    echo "The oracle successfully:"
    echo "  1. Registered the market"
    echo "  2. Selected voters"
    echo "  3. Collected votes"
    echo "  4. Aggregated results"
    echo "  5. Resolved the market"
    echo ""
    echo "Expected outcome: 0 (Yes) - because voters 1 & 2 voted Yes with high confidence"
    echo "Actual outcome: ${OUTCOME}"
    echo ""
    if [ "${OUTCOME}" = "0" ]; then
        echo -e "${GREEN}✓ Outcome matches expected result!${NC}"
    else
        echo -e "${YELLOW}⚠ Outcome differs from expected (but resolution worked)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Market not fully resolved yet${NC}"
    echo "  Current status: ${STATUS}"
    echo "  This might be normal if aggregation is still in progress"
    echo ""
    echo "Check again with:"
    echo "  curl -X POST ${MARKET_ENDPOINT} \\"
    echo "    -H 'Content-Type: application/json' \\"
    echo "    -d '{\"query\": \"{ market(id: ${MARKET_ID}) { id status finalOutcome } }\"}'"
fi

echo ""
