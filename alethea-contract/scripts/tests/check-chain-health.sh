#!/bin/bash

# ============================================================================
# Check Chain Health - Detect stuck messages and other issues
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

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Chain Health Check                                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}Current Chain ID:${NC} ${CHAIN_ID}"
echo ""

# ============================================================================
# Check 1: Service Status
# ============================================================================
echo -e "${YELLOW}[Check 1] Linera Service Status...${NC}"

if pgrep -f "linera service" > /dev/null; then
    echo -e "${GREEN}  ✓ Linera service is running${NC}"
    SERVICE_PID=$(pgrep -f "linera service")
    echo -e "    PID: ${SERVICE_PID}"
else
    echo -e "${RED}  ✗ Linera service is NOT running${NC}"
    echo -e "${YELLOW}    Start with: linera service --port 8080${NC}"
    exit 1
fi

echo ""

# ============================================================================
# Check 2: Chain Sync Status
# ============================================================================
echo -e "${YELLOW}[Check 2] Chain Sync Status...${NC}"

SYNC_OUTPUT=$(linera sync ${CHAIN_ID} 2>&1 || true)
echo "${SYNC_OUTPUT}"

if echo "${SYNC_OUTPUT}" | grep -q "error"; then
    echo -e "${RED}  ✗ Chain sync has errors${NC}"
else
    echo -e "${GREEN}  ✓ Chain sync completed${NC}"
fi

echo ""

# ============================================================================
# Check 3: Pending Messages
# ============================================================================
echo -e "${YELLOW}[Check 3] Checking for pending messages...${NC}"

INBOX_OUTPUT=$(linera process-inbox ${CHAIN_ID} 2>&1 || true)
echo "${INBOX_OUTPUT}"

if echo "${INBOX_OUTPUT}" | grep -q "Processed 0 blocks"; then
    echo -e "${GREEN}  ✓ No pending messages to process${NC}"
elif echo "${INBOX_OUTPUT}" | grep -q "out of order"; then
    echo -e "${RED}  ✗ STUCK MESSAGES DETECTED!${NC}"
    echo -e "${RED}    Chain has message ordering issues${NC}"
    echo ""
    echo -e "${YELLOW}    This chain cannot process new operations!${NC}"
    echo -e "${YELLOW}    Recommendation: Deploy to a fresh chain${NC}"
    echo ""
    CHAIN_HEALTHY=false
else
    echo -e "${GREEN}  ✓ Messages processed successfully${NC}"
fi

echo ""

# ============================================================================
# Check 4: Test GraphQL Query
# ============================================================================
echo -e "${YELLOW}[Check 4] Testing GraphQL endpoint...${NC}"

REGISTRY_ENDPOINT="http://localhost:8080/chains/${CHAIN_ID}/applications/${ALETHEA_REGISTRY_ID}"

QUERY_RESULT=$(curl -s -X POST "${REGISTRY_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ protocolStats { totalMarkets totalVoters } }"}' 2>&1 || true)

if echo "${QUERY_RESULT}" | jq -e '.data' > /dev/null 2>&1; then
    echo -e "${GREEN}  ✓ GraphQL queries working${NC}"
    echo "    $(echo ${QUERY_RESULT} | jq -c '.data.protocolStats')"
else
    echo -e "${RED}  ✗ GraphQL queries failing${NC}"
    echo "${QUERY_RESULT}"
fi

echo ""

# ============================================================================
# Check 5: Test Mutation
# ============================================================================
echo -e "${YELLOW}[Check 5] Testing mutations (create test market)...${NC}"

MARKET_ENDPOINT="http://localhost:8080/chains/${CHAIN_ID}/applications/${MARKET_CHAIN_ID}"

CURRENT_TIME=$(date +%s)
DEADLINE_TIME=$((CURRENT_TIME + 3600))
DEADLINE_MICROS=$((DEADLINE_TIME * 1000000))

MUTATION_RESULT=$(curl -s -X POST "${MARKET_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"mutation { createMarket(question: \\\"Health check test?\\\", outcomes: [\\\"Yes\\\", \\\"No\\\"], resolutionDeadline: \\\"${DEADLINE_MICROS}\\\", initialLiquidity: \\\"1000\\\") }\"}" 2>&1 || true)

if echo "${MUTATION_RESULT}" | jq -e '.data.createMarket' > /dev/null 2>&1; then
    echo -e "${GREEN}  ✓ Mutations working${NC}"
    CHAIN_HEALTHY=true
elif echo "${MUTATION_RESULT}" | jq -e '.errors' > /dev/null 2>&1; then
    ERROR_MSG=$(echo "${MUTATION_RESULT}" | jq -r '.errors[0].message')
    echo -e "${RED}  ✗ Mutation failed: ${ERROR_MSG}${NC}"
    
    if echo "${ERROR_MSG}" | grep -q "out of order"; then
        echo -e "${RED}    STUCK MESSAGES CONFIRMED!${NC}"
        CHAIN_HEALTHY=false
    fi
else
    echo -e "${YELLOW}  ⚠ Unexpected response${NC}"
    echo "${MUTATION_RESULT}"
fi

echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Health Check Summary                                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "${CHAIN_HEALTHY}" = "false" ]; then
    echo -e "${RED}❌ CHAIN IS UNHEALTHY - STUCK MESSAGES DETECTED${NC}"
    echo ""
    echo -e "${YELLOW}Problem:${NC}"
    echo "  The chain has stuck messages that block all new operations."
    echo "  This is a known issue with message ordering in Linera."
    echo ""
    echo -e "${YELLOW}Impact:${NC}"
    echo "  ❌ Cannot create new markets"
    echo "  ❌ Cannot request resolution"
    echo "  ❌ Cannot submit votes"
    echo "  ❌ Cannot perform any mutations"
    echo ""
    echo -e "${YELLOW}Solution:${NC}"
    echo "  Deploy to a fresh chain without stuck messages:"
    echo ""
    echo -e "${GREEN}  ./scripts/deploy-to-fresh-chain.sh${NC}"
    echo ""
    echo "  This will:"
    echo "  1. Create a new chain"
    echo "  2. Deploy all applications"
    echo "  3. Register voters"
    echo "  4. Test complete workflow"
    echo ""
    echo "  Estimated time: 15 minutes"
    echo ""
else
    echo -e "${GREEN}✅ CHAIN IS HEALTHY${NC}"
    echo ""
    echo "All checks passed! You can proceed with testing:"
    echo ""
    echo -e "${GREEN}  ./scripts/tests/test-oracle-quick.sh${NC}"
    echo ""
fi

echo ""
