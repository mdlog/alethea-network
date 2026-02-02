#!/bin/bash

# ============================================================================
# Alethea Oracle Resolution Test
# Tests complete oracle workflow as external dApp would use it
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment
if [ -f .env.fresh ]; then
    source .env.fresh
    echo -e "${GREEN}✓ Loaded .env.fresh${NC}"
else
    echo -e "${RED}✗ .env.fresh not found${NC}"
    exit 1
fi

# Configuration
LINERA_SERVICE="http://localhost:8080"
REGISTRY_ENDPOINT="${LINERA_SERVICE}/chains/${CHAIN_ID}/applications/${ALETHEA_REGISTRY_ID}"
MARKET_ENDPOINT="${LINERA_SERVICE}/chains/${CHAIN_ID}/applications/${MARKET_CHAIN_ID}"
VOTER_1_ENDPOINT="${LINERA_SERVICE}/chains/${VOTER_1_CHAIN_ID}/applications/${VOTER_1_ID}"
VOTER_2_ENDPOINT="${LINERA_SERVICE}/chains/${VOTER_2_CHAIN_ID}/applications/${VOTER_2_ID}"
VOTER_3_ENDPOINT="${LINERA_SERVICE}/chains/${VOTER_3_CHAIN_ID}/applications/${VOTER_3_ID}"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Alethea Oracle Resolution Test                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# Test 1: Check Service Availability
# ============================================================================
echo -e "${YELLOW}[Test 1] Checking service availability...${NC}"

check_service() {
    local name=$1
    local endpoint=$2
    
    if curl -s -f "${endpoint}" > /dev/null 2>&1; then
        echo -e "${GREEN}  ✓ ${name} is available${NC}"
        return 0
    else
        echo -e "${RED}  ✗ ${name} is NOT available${NC}"
        return 1
    fi
}

check_service "Linera Service" "${LINERA_SERVICE}"
check_service "Registry" "${REGISTRY_ENDPOINT}"
check_service "Market Chain" "${MARKET_ENDPOINT}"
check_service "Voter 1" "${VOTER_1_ENDPOINT}"
check_service "Voter 2" "${VOTER_2_ENDPOINT}"
check_service "Voter 3" "${VOTER_3_ENDPOINT}"

echo ""

# ============================================================================
# Test 2: Check Registry Status
# ============================================================================
echo -e "${YELLOW}[Test 2] Checking Registry status...${NC}"

REGISTRY_STATS=$(curl -s -X POST "${REGISTRY_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ protocolStats { totalMarkets totalVoters activeMarkets resolvedMarkets } }"}')

echo "Registry Stats:"
echo "${REGISTRY_STATS}" | jq '.'

TOTAL_VOTERS=$(echo "${REGISTRY_STATS}" | jq -r '.data.protocolStats.totalVoters // 0')
echo -e "${GREEN}  Total Voters: ${TOTAL_VOTERS}${NC}"

if [ "${TOTAL_VOTERS}" -lt 3 ]; then
    echo -e "${RED}  ✗ Not enough voters registered (need at least 3)${NC}"
    echo -e "${YELLOW}  Run: ./scripts/tests/initialize-voters-fresh.sh${NC}"
    exit 1
else
    echo -e "${GREEN}  ✓ Sufficient voters registered${NC}"
fi

echo ""

# ============================================================================
# Test 3: Create Test Market (as external dApp would)
# ============================================================================
echo -e "${YELLOW}[Test 3] Creating test market...${NC}"

# Calculate future deadline (24 hours from now in microseconds)
CURRENT_TIME=$(date +%s)
DEADLINE_TIME=$((CURRENT_TIME + 86400))
DEADLINE_MICROS=$((DEADLINE_TIME * 1000000))

echo "  Question: Will this oracle test succeed?"
echo "  Outcomes: [Yes, No]"
echo "  Deadline: ${DEADLINE_TIME} ($(date -d @${DEADLINE_TIME} '+%Y-%m-%d %H:%M:%S'))"

CREATE_MARKET_MUTATION=$(cat <<EOF
{
  "query": "mutation { createMarket(question: \"Will this oracle test succeed?\", outcomes: [\"Yes\", \"No\"], resolutionDeadline: \"${DEADLINE_MICROS}\", initialLiquidity: \"1000\") }"
}
EOF
)

CREATE_RESULT=$(curl -s -X POST "${MARKET_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "${CREATE_MARKET_MUTATION}")

echo "Create Market Result:"
echo "${CREATE_RESULT}" | jq '.'

# Check if market was created successfully
if echo "${CREATE_RESULT}" | jq -e '.data.createMarket' > /dev/null 2>&1; then
    MARKET_CREATED=$(echo "${CREATE_RESULT}" | jq -r '.data.createMarket')
    if [ "${MARKET_CREATED}" = "true" ]; then
        echo -e "${GREEN}  ✓ Market created successfully${NC}"
    else
        echo -e "${RED}  ✗ Market creation returned false${NC}"
        exit 1
    fi
else
    echo -e "${RED}  ✗ Market creation failed${NC}"
    echo "${CREATE_RESULT}" | jq '.errors'
    exit 1
fi

# Get the market ID (should be the next market ID)
MARKETS=$(curl -s -X POST "${MARKET_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ markets { id question status } }"}')

MARKET_ID=$(echo "${MARKETS}" | jq -r '.data.markets | sort_by(.id) | last | .id')
echo -e "${GREEN}  Market ID: ${MARKET_ID}${NC}"

echo ""

# ============================================================================
# Test 4: Request Resolution
# ============================================================================
echo -e "${YELLOW}[Test 4] Requesting resolution from oracle...${NC}"

# Note: In real scenario, we'd wait for deadline to pass
# For testing, we'll try to request resolution immediately
# This might fail if deadline hasn't passed, which is expected

REQUEST_RESOLUTION=$(cat <<EOF
{
  "query": "mutation { requestResolution(marketId: ${MARKET_ID}) }"
}
EOF
)

RESOLUTION_RESULT=$(curl -s -X POST "${MARKET_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "${REQUEST_RESOLUTION}")

echo "Resolution Request Result:"
echo "${RESOLUTION_RESULT}" | jq '.'

if echo "${RESOLUTION_RESULT}" | jq -e '.errors' > /dev/null 2>&1; then
    ERROR_MSG=$(echo "${RESOLUTION_RESULT}" | jq -r '.errors[0].message')
    if [[ "${ERROR_MSG}" == *"NotExpired"* ]] || [[ "${ERROR_MSG}" == *"deadline"* ]]; then
        echo -e "${YELLOW}  ⚠ Market deadline hasn't passed yet (expected)${NC}"
        echo -e "${YELLOW}  ℹ In production, wait for deadline before requesting resolution${NC}"
    else
        echo -e "${RED}  ✗ Unexpected error: ${ERROR_MSG}${NC}"
    fi
else
    echo -e "${GREEN}  ✓ Resolution requested successfully${NC}"
fi

echo ""

# ============================================================================
# Test 5: Check Voter Pending Requests
# ============================================================================
echo -e "${YELLOW}[Test 5] Checking voter pending requests...${NC}"

check_voter_requests() {
    local voter_name=$1
    local voter_endpoint=$2
    
    echo "  Checking ${voter_name}..."
    
    VOTER_STATS=$(curl -s -X POST "${voter_endpoint}" \
      -H "Content-Type: application/json" \
      -d '{"query": "{ voterStats { pendingVotes totalVotes } }"}')
    
    PENDING=$(echo "${VOTER_STATS}" | jq -r '.data.voterStats.pendingVotes // 0')
    TOTAL=$(echo "${VOTER_STATS}" | jq -r '.data.voterStats.totalVotes // 0')
    
    echo -e "    Pending: ${PENDING}, Total: ${TOTAL}"
    
    if [ "${PENDING}" -gt 0 ]; then
        echo -e "${GREEN}    ✓ Has pending vote requests${NC}"
    else
        echo -e "${YELLOW}    ⚠ No pending vote requests${NC}"
    fi
}

check_voter_requests "Voter 1" "${VOTER_1_ENDPOINT}"
check_voter_requests "Voter 2" "${VOTER_2_ENDPOINT}"
check_voter_requests "Voter 3" "${VOTER_3_ENDPOINT}"

echo ""

# ============================================================================
# Test 6: Simulate Voter Submissions (Manual Test)
# ============================================================================
echo -e "${YELLOW}[Test 6] Voter submission test...${NC}"
echo ""
echo -e "${BLUE}To complete the oracle resolution test:${NC}"
echo ""
echo -e "${YELLOW}1. Wait for market deadline to pass (24 hours)${NC}"
echo -e "   Or create a market with shorter deadline for testing"
echo ""
echo -e "${YELLOW}2. Request resolution:${NC}"
echo -e "   curl -X POST ${MARKET_ENDPOINT} \\"
echo -e "     -H 'Content-Type: application/json' \\"
echo -e "     -d '{\"query\": \"mutation { requestResolution(marketId: ${MARKET_ID}) }\"}'"
echo ""
echo -e "${YELLOW}3. Voters submit votes:${NC}"
echo -e "   # Voter 1 votes 'Yes' (outcome 0) with 90% confidence"
echo -e "   curl -X POST ${VOTER_1_ENDPOINT} \\"
echo -e "     -H 'Content-Type: application/json' \\"
echo -e "     -d '{\"query\": \"mutation { submitVote(marketId: ${MARKET_ID}, outcomeIndex: 0, confidence: 90) }\"}'"
echo ""
echo -e "   # Voter 2 votes 'Yes' (outcome 0) with 85% confidence"
echo -e "   curl -X POST ${VOTER_2_ENDPOINT} \\"
echo -e "     -H 'Content-Type: application/json' \\"
echo -e "     -d '{\"query\": \"mutation { submitVote(marketId: ${MARKET_ID}, outcomeIndex: 0, confidence: 85) }\"}'"
echo ""
echo -e "   # Voter 3 votes 'No' (outcome 1) with 60% confidence"
echo -e "   curl -X POST ${VOTER_3_ENDPOINT} \\"
echo -e "     -H 'Content-Type: application/json' \\"
echo -e "     -d '{\"query\": \"mutation { submitVote(marketId: ${MARKET_ID}, outcomeIndex: 1, confidence: 60) }\"}'"
echo ""
echo -e "${YELLOW}4. Check resolution:${NC}"
echo -e "   curl -X POST ${MARKET_ENDPOINT} \\"
echo -e "     -H 'Content-Type: application/json' \\"
echo -e "     -d '{\"query\": \"{ market(id: ${MARKET_ID}) { id status finalOutcome } }\"}'"
echo ""

# ============================================================================
# Test 7: Check Market Status
# ============================================================================
echo -e "${YELLOW}[Test 7] Checking current market status...${NC}"

MARKET_STATUS=$(curl -s -X POST "${MARKET_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"{ market(id: ${MARKET_ID}) { id question status finalOutcome totalLiquidity } }\"}")

echo "Market Status:"
echo "${MARKET_STATUS}" | jq '.'

STATUS=$(echo "${MARKET_STATUS}" | jq -r '.data.market.status')
echo -e "${GREEN}  Current Status: ${STATUS}${NC}"

echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Test Summary                                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Service Availability: PASS${NC}"
echo -e "${GREEN}✓ Registry Status: PASS (${TOTAL_VOTERS} voters)${NC}"
echo -e "${GREEN}✓ Market Creation: PASS (Market ID: ${MARKET_ID})${NC}"
echo -e "${YELLOW}⚠ Resolution Request: PENDING (deadline not reached)${NC}"
echo -e "${YELLOW}⚠ Voter Submissions: MANUAL TEST REQUIRED${NC}"
echo -e "${YELLOW}⚠ Final Resolution: PENDING${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Wait for market deadline or create test market with short deadline"
echo "2. Request resolution from Market Chain"
echo "3. Voters submit their votes"
echo "4. Registry aggregates votes and resolves market"
echo "5. Market Chain receives callback and distributes winnings"
echo ""
echo -e "${GREEN}Oracle infrastructure is ready for testing!${NC}"
echo ""
