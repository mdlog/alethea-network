#!/bin/bash

# Script to create a query for a past real event
# Usage: ./create-past-query.sh [query_number]
# Query numbers: 1=Bitcoin Halving, 2=Ethereum Merge, 3=Bitcoin ATH, 4=World Cup, 5=Super Bowl, 6=Champions League

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
    echo -e "${RED}❌ .env.local not found at ${ENV_FILE}${NC}"
    exit 1
fi

SERVICE_URL="${VITE_SERVICE_URL:-http://localhost:8080}"
ENDPOINT="${SERVICE_URL}/chains/${CHAIN_ID}/applications/${REGISTRY_APP_ID}"

# Query definitions
declare -A QUERIES
QUERIES[1]='{"title":"Bitcoin Halving 2024","description":"Did Bitcoin halving occur on or before April 20, 2024? (Halving reduces block reward from 6.25 BTC to 3.125 BTC at block 840,000)","outcomes":["Yes","No"],"deadline":"1713571200000000","category":"Crypto"}'
QUERIES[2]='{"title":"Ethereum Merge","description":"Was Ethereum Merge (transition to Proof-of-Stake) completed successfully on September 15, 2022 at block 15,537,393?","outcomes":["Yes","No"],"deadline":"1663200000000000","category":"Crypto"}'
QUERIES[3]='{"title":"Bitcoin ATH 2024","description":"Did Bitcoin reach a new all-time high price above $73,000 USD in March 2024?","outcomes":["Yes","No"],"deadline":"1711929600000000","category":"Crypto"}'
QUERIES[4]='{"title":"FIFA World Cup 2022","description":"Who won the FIFA World Cup 2022 final match on December 18, 2022?","outcomes":["Argentina","France"],"deadline":"1671321600000000","category":"Sports"}'
QUERIES[5]='{"title":"Super Bowl LVIII","description":"Who won Super Bowl LVIII played on February 11, 2024 at Allegiant Stadium?","outcomes":["Kansas City Chiefs","San Francisco 49ers"],"deadline":"1707609600000000","category":"Sports"}'
QUERIES[6]='{"title":"UEFA Champions League 2023","description":"Which team won the UEFA Champions League 2022-23 final on June 10, 2023?","outcomes":["Manchester City","Inter Milan"],"deadline":"1686355200000000","category":"Sports"}'

# Get query number from argument or default to 1
QUERY_NUM=${1:-1}

if [ -z "${QUERIES[$QUERY_NUM]}" ]; then
    echo -e "${RED}❌ Invalid query number: ${QUERY_NUM}${NC}"
    echo "Available queries: 1-6"
    exit 1
fi

# Parse query JSON
QUERY_JSON="${QUERIES[$QUERY_NUM]}"
TITLE=$(echo "$QUERY_JSON" | jq -r '.title')
DESCRIPTION=$(echo "$QUERY_JSON" | jq -r '.description')
OUTCOMES=$(echo "$QUERY_JSON" | jq -c '.outcomes')
DEADLINE=$(echo "$QUERY_JSON" | jq -r '.deadline')
CATEGORY=$(echo "$QUERY_JSON" | jq -r '.category')

# Reward amount: 50 ALTH = 50000000000000000000 attos
REWARD_AMOUNT="50000000000000000000"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     CREATE QUERY: ${TITLE}${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Registry: ${REGISTRY_APP_ID}${NC}"
echo -e "${YELLOW}Chain: ${CHAIN_ID}${NC}"
echo -e "${YELLOW}Category: ${CATEGORY}${NC}"
echo ""
echo -e "${BLUE}Query Details:${NC}"
echo "  Description: ${DESCRIPTION}"
echo "  Outcomes: $(echo "$OUTCOMES" | jq -r '.[]' | tr '\n' ', ' | sed 's/,$//')"
echo "  Deadline: ${DEADLINE}"
echo "  Reward: ${REWARD_AMOUNT} attos (50 ALTH)"
echo ""

# Build operation JSON
OPERATION_JSON=$(cat <<EOF
{
  "CreateQuery": {
    "description": "${DESCRIPTION}",
    "outcomes": ${OUTCOMES},
    "strategy": "WeightedByStake",
    "min_votes": 3,
    "reward_amount": "${REWARD_AMOUNT}",
    "deadline": ${DEADLINE},
    "duration_secs": 300
  }
}
EOF
)

echo -e "${YELLOW}Operation JSON:${NC}"
echo "$OPERATION_JSON" | jq '.'
echo ""

# Check if linera service is running
if ! curl -s "${SERVICE_URL}" > /dev/null 2>&1; then
    echo -e "${RED}❌ Linera service is not running at ${SERVICE_URL}${NC}"
    echo -e "${YELLOW}Please start it with: linera service${NC}"
    exit 1
fi

# Method 1: Try via GraphQL mutation (if available)
echo -e "${BLUE}Method 1: Trying GraphQL mutation...${NC}"
MUTATION=$(cat <<EOF
{
  "query": "mutation { createQuery(description: \"${DESCRIPTION}\", outcomes: ${OUTCOMES}, strategy: \"WeightedByStake\", minVotes: 3, rewardAmount: \"${REWARD_AMOUNT}\", deadline: \"${DEADLINE}\", durationSecs: 300) { success message } }"
}
EOF
)

RESPONSE=$(curl -s -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d "${MUTATION}" 2>&1)

if echo "${RESPONSE}" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Query created successfully via GraphQL!${NC}"
    echo "${RESPONSE}" | jq '.'
    exit 0
elif echo "${RESPONSE}" | grep -q "operation"; then
    echo -e "${YELLOW}⚠️  GraphQL returned operation info, need to execute operation${NC}"
    echo "${RESPONSE}" | jq '.'
else
    echo -e "${YELLOW}⚠️  GraphQL mutation not available, trying operation method...${NC}"
fi

# Method 2: Use Dashboard (Recommended)
echo ""
echo -e "${BLUE}Method 2: Use Dashboard (Recommended)${NC}"
echo ""
echo -e "${YELLOW}To create query via dashboard:${NC}"
echo "1. Open dashboard: http://localhost:5173"
echo "2. Go to 'Create Query' page"
echo "3. Fill in the form with these details:"
echo ""
echo "   Description: ${DESCRIPTION}"
echo "   Outcomes: $(echo "$OUTCOMES" | jq -r '.[]' | tr '\n' ', ' | sed 's/,$//')"
echo "   Strategy: WeightedByStake"
echo "   Min Votes: 3"
echo "   Reward Amount: 50 ALTH"
echo "   Deadline: ${DEADLINE}"
echo "   Duration: 300 seconds"
echo ""

# Save operation JSON for reference
TEMP_OP_FILE="/tmp/create_query_${QUERY_NUM}.json"
echo "$OPERATION_JSON" > "${TEMP_OP_FILE}"

echo -e "${BLUE}Operation JSON saved to: ${TEMP_OP_FILE}${NC}"
echo "You can use this JSON if dashboard supports direct JSON import."
echo ""
echo -e "${YELLOW}After creating query:${NC}"
echo "1. Sync and process: linera sync && linera process-inbox"
echo "2. Check query: curl -X POST ${ENDPOINT} -H 'Content-Type: application/json' -d '{\"query\": \"{ queries { id description status } }\"}'"
