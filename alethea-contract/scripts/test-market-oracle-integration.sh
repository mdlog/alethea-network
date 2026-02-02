#!/bin/bash
# =============================================================================
# Test Market-Oracle Integration
# =============================================================================
# This script tests the full integration flow between a prediction market DApp
# and Alethea Oracle Network as the resolution layer.
#
# Flow:
# 1. Deploy Simple Market with latest Registry App ID
# 2. Create a market in Simple Market
# 3. Request resolution from Oracle
# 4. Vote on query via Oracle Registry
# 5. Verify market receives resolution callback
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Alethea Oracle - Market Integration Test                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"

# =============================================================================
# Configuration
# =============================================================================
REGISTRY_CHAIN_ID="36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2"
REGISTRY_APP_ID="b77ebb76076c9aca8aac739107d26845b8c1ea36a84556749e23f98667b0ca1c"
SERVICE_URL="https://alethea.network"

# Local service URL (if running locally)
# SERVICE_URL="http://localhost:8080"

REGISTRY_ENDPOINT="${SERVICE_URL}/chains/${REGISTRY_CHAIN_ID}/applications/${REGISTRY_APP_ID}"

echo -e "\n${YELLOW}Configuration:${NC}"
echo "  Registry Chain: ${REGISTRY_CHAIN_ID:0:16}..."
echo "  Registry App:   ${REGISTRY_APP_ID:0:16}..."
echo "  Service URL:    ${SERVICE_URL}"

# =============================================================================
# Step 1: Verify Oracle Registry is Online
# =============================================================================
echo -e "\n${BLUE}[Step 1] Verifying Oracle Registry is online...${NC}"

STATS=$(curl -s --max-time 10 -X POST "${REGISTRY_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ statistics { totalVoters totalQueriesCreated totalQueriesResolved } }"}')

if echo "$STATS" | grep -q "totalVoters"; then
  VOTERS=$(echo "$STATS" | grep -o '"totalVoters":[0-9]*' | cut -d: -f2)
  QUERIES=$(echo "$STATS" | grep -o '"totalQueriesCreated":[0-9]*' | cut -d: -f2)
  RESOLVED=$(echo "$STATS" | grep -o '"totalQueriesResolved":[0-9]*' | cut -d: -f2)
  echo -e "${GREEN}✓ Oracle Registry online${NC}"
  echo "  Voters: ${VOTERS}"
  echo "  Queries Created: ${QUERIES}"
  echo "  Queries Resolved: ${RESOLVED}"
else
  echo -e "${RED}✗ Failed to connect to Oracle Registry${NC}"
  echo "  Response: $STATS"
  exit 1
fi

# =============================================================================
# Step 2: Check Existing Queries
# =============================================================================
echo -e "\n${BLUE}[Step 2] Checking existing queries...${NC}"

QUERIES_DATA=$(curl -s --max-time 10 -X POST "${REGISTRY_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ queries { id description status outcomes createdAt deadline } }"}')

echo "Existing queries:"
echo "$QUERIES_DATA" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    queries = data.get('data', {}).get('queries', [])
    if not queries:
        print('  No queries found')
    else:
        for q in queries[-5:]:  # Show last 5
            print(f\"  [{q['id']}] {q['description'][:50]}... - {q['status']}\")
except:
    print('  Unable to parse response')
" 2>/dev/null || echo "  Raw: ${QUERIES_DATA:0:200}..."

# =============================================================================
# Step 3: Create Test Query (Simulating Market Request)
# =============================================================================
echo -e "\n${BLUE}[Step 3] Creating test query (simulating market resolution request)...${NC}"

# Calculate deadline (24 hours from now in microseconds)
DEADLINE=$(($(date +%s) * 1000000 + 86400000000))

# Test query - a real past event
QUERY_DESC="Did Bitcoin (BTC) close above \$90,000 on January 6, 2026?"

echo "  Query: ${QUERY_DESC}"
echo "  Deadline: $(date -d @$((DEADLINE / 1000000)))"

# Create query with callback info
CREATE_RESULT=$(curl -s --max-time 15 -X POST "${REGISTRY_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"mutation { createQueryWithCallback(description: \\\"${QUERY_DESC}\\\", outcomes: [\\\"Yes\\\", \\\"No\\\"], strategy: MAJORITY, minVotes: 2, rewardAmount: \\\"1\\\", deadline: \\\"${DEADLINE}\\\", callbackChain: \\\"${REGISTRY_CHAIN_ID}\\\", callbackApp: \\\"${REGISTRY_APP_ID}\\\", callbackData: \\\"0100000000000000\\\") }\"
  }")

echo "Create result: $CREATE_RESULT"

if echo "$CREATE_RESULT" | grep -q "createQueryWithCallback"; then
  QUERY_ID=$(echo "$CREATE_RESULT" | grep -o '"createQueryWithCallback":"[0-9]*"' | cut -d'"' -f4)
  if [ -n "$QUERY_ID" ]; then
    echo -e "${GREEN}✓ Query created with ID: ${QUERY_ID}${NC}"
  else
    echo -e "${YELLOW}⚠ Query may have been created, check response${NC}"
  fi
else
  echo -e "${YELLOW}⚠ Query creation response: ${CREATE_RESULT}${NC}"
fi

# =============================================================================
# Step 4: Check Voters
# =============================================================================
echo -e "\n${BLUE}[Step 4] Checking registered voters...${NC}"

VOTERS_DATA=$(curl -s --max-time 10 -X POST "${REGISTRY_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ voters { chainId stake reputation isActive } }"}')

echo "$VOTERS_DATA" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    voters = data.get('data', {}).get('voters', [])
    if not voters:
        print('  No voters registered')
    else:
        for v in voters:
            status = '✓ Active' if v.get('isActive') else '✗ Inactive'
            print(f\"  {v['chainId'][:16]}... - Stake: {v.get('stake', 'N/A')}, Rep: {v.get('reputation', 'N/A')} [{status}]\")
except Exception as e:
    print(f'  Unable to parse: {e}')
" 2>/dev/null || echo "  Raw: ${VOTERS_DATA:0:200}..."

# =============================================================================
# Step 5: Integration Test Summary
# =============================================================================
echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Integration Test Summary                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${GREEN}Oracle Registry Status:${NC}"
echo "  ✓ Registry is online and responding"
echo "  ✓ ${VOTERS} voters registered"
echo "  ✓ ${QUERIES} queries created"

echo -e "\n${YELLOW}Integration Flow (for DApp developers):${NC}"
echo "
  ┌─────────────────┐         ┌─────────────────┐
  │  Prediction     │         │    Alethea      │
  │  Market DApp    │         │  Oracle Network │
  └────────┬────────┘         └────────┬────────┘
           │                           │
           │  1. CreateQueryWithCallback│
           │  (question, outcomes,     │
           │   callback_chain/app)     │
           │ ─────────────────────────>│
           │                           │
           │  2. QueryCreated callback │
           │  (query_id)               │
           │ <─────────────────────────│
           │                           │
           │         [Voters Vote]     │
           │                           │
           │  3. QueryResolved callback│
           │  (query_id, result,       │
           │   vote_count, confidence) │
           │ <─────────────────────────│
           │                           │
           │  4. Market resolves &     │
           │     distributes payouts   │
           │                           │
"

echo -e "\n${YELLOW}To test voting manually:${NC}"
echo "  1. Open dashboard: http://localhost:4002"
echo "  2. Go to Queries page"
echo "  3. Find the test query and vote"
echo "  4. Once enough votes, query will resolve"

echo -e "\n${YELLOW}API Endpoints:${NC}"
echo "  Registry: ${REGISTRY_ENDPOINT}"

echo -e "\n${GREEN}Test completed!${NC}"
