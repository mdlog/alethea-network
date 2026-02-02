#!/bin/bash

# Script to verify created queries and create more queries for past events

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load config
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../../alethea-dashboard-vite/.env.local"

if [ -f "${ENV_FILE}" ]; then
    source "${ENV_FILE}"
    REGISTRY_APP_ID="${VITE_REGISTRY_APP_ID}"
    CHAIN_ID="${VITE_CHAIN_ID}"
else
    echo -e "${RED}❌ .env.local not found${NC}"
    exit 1
fi

SERVICE_URL="${VITE_SERVICE_URL:-http://localhost:8080}"
ENDPOINT="${SERVICE_URL}/chains/${CHAIN_ID}/applications/${REGISTRY_APP_ID}"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     VERIFY QUERIES & CREATE MORE PAST EVENT QUERIES         ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Sync and process inbox
echo -e "${YELLOW}Step 1: Syncing and processing inbox...${NC}"
echo "Running: linera sync && linera process-inbox"
echo ""

if command -v linera &> /dev/null; then
    linera sync 2>&1 | head -20
    echo ""
    linera process-inbox 2>&1 | head -20
    echo ""
    echo -e "${GREEN}✓ Sync and process completed${NC}"
else
    echo -e "${YELLOW}⚠️  linera CLI not found, skipping sync${NC}"
    echo "Please run manually: linera sync && linera process-inbox"
fi

echo ""
sleep 2

# Step 2: Verify queries
echo -e "${YELLOW}Step 2: Verifying created queries...${NC}"
echo ""

QUERIES_QUERY='{
  "query": "{ queries { id description status outcomes rewardAmount deadline } }"
}'

RESPONSE=$(curl -s -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d "${QUERIES_QUERY}")

echo "Queries Response:"
echo "${RESPONSE}" | jq '.' 2>/dev/null || echo "${RESPONSE}"
echo ""

# Step 3: Create more queries
echo -e "${YELLOW}Step 3: Creating more queries for past events...${NC}"
echo ""

# Query 2: Ethereum Merge
echo -e "${BLUE}Creating Query 2: Ethereum Merge${NC}"
MUTATION2='{
  "query": "mutation { createQuery(description: \"Was Ethereum Merge (transition to Proof-of-Stake) completed successfully on September 15, 2022 at block 15,537,393?\", outcomes: [\"Yes\", \"No\"], strategy: \"WeightedByStake\", minVotes: 3, rewardAmount: \"50000000000000000000\", deadline: \"1663200000000000\", durationSecs: 300) }"
}'

RESPONSE2=$(curl -s -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d "${MUTATION2}")

echo "Response: ${RESPONSE2}"
echo ""

# Query 3: FIFA World Cup 2022
echo -e "${BLUE}Creating Query 3: FIFA World Cup 2022${NC}"
MUTATION3='{
  "query": "mutation { createQuery(description: \"Who won the FIFA World Cup 2022 final match on December 18, 2022?\", outcomes: [\"Argentina\", \"France\"], strategy: \"WeightedByStake\", minVotes: 3, rewardAmount: \"50000000000000000000\", deadline: \"1671321600000000\", durationSecs: 300) }"
}'

RESPONSE3=$(curl -s -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d "${MUTATION3}")

echo "Response: ${RESPONSE3}"
echo ""

# Query 4: Super Bowl LVIII
echo -e "${BLUE}Creating Query 4: Super Bowl LVIII${NC}"
MUTATION4='{
  "query": "mutation { createQuery(description: \"Who won Super Bowl LVIII played on February 11, 2024 at Allegiant Stadium?\", outcomes: [\"Kansas City Chiefs\", \"San Francisco 49ers\"], strategy: \"WeightedByStake\", minVotes: 3, rewardAmount: \"50000000000000000000\", deadline: \"1707609600000000\", durationSecs: 300) }"
}'

RESPONSE4=$(curl -s -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d "${MUTATION4}")

echo "Response: ${RESPONSE4}"
echo ""

echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              QUERIES CREATION COMPLETE                      ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Sync and process again: linera sync && linera process-inbox"
echo "2. Check all queries: curl -X POST ${ENDPOINT} -H 'Content-Type: application/json' -d '{\"query\": \"{ queries { id description status } }\"}'"
echo "3. Vote on queries via dashboard or GraphQL"
echo "4. Resolve queries after voting period"
echo ""
