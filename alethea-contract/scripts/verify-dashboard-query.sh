#!/bin/bash

# Script to verify if query created via dashboard is successful

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
echo -e "${BLUE}║     VERIFY QUERIES CREATED VIA DASHBOARD                     ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Registry: ${REGISTRY_APP_ID}${NC}"
echo -e "${YELLOW}Chain: ${CHAIN_ID}${NC}"
echo ""

# Check if linera service is running
if ! curl -s "${SERVICE_URL}" > /dev/null 2>&1; then
    echo -e "${RED}❌ Linera service is not running at ${SERVICE_URL}${NC}"
    echo -e "${YELLOW}Please start it: linera service${NC}"
    exit 1
fi

# Query all queries
echo -e "${BLUE}Fetching queries...${NC}"
echo ""

QUERY='{
  "query": "{ queries { id description status outcomes rewardAmount deadline voteCount } }"
}'

RESPONSE=$(curl -s -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d "${QUERY}")

echo "Response:"
echo "${RESPONSE}" | jq '.' 2>/dev/null || echo "${RESPONSE}"
echo ""

# Parse response
QUERY_COUNT=$(echo "${RESPONSE}" | jq '.data.queries | length' 2>/dev/null || echo "0")

if [ "$QUERY_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Found ${QUERY_COUNT} query/queries${NC}"
    echo ""
    echo -e "${BLUE}Query Details:${NC}"
    echo "${RESPONSE}" | jq '.data.queries[] | {id, description, status, outcomes, voteCount}' 2>/dev/null || echo "${RESPONSE}"
else
    echo -e "${YELLOW}⚠️  No queries found${NC}"
    echo ""
    echo -e "${BLUE}Possible reasons:${NC}"
    echo "1. Query belum dibuat via dashboard"
    echo "2. Message belum diproses (perlu sync & process-inbox)"
    echo ""
    echo -e "${YELLOW}To process pending messages:${NC}"
    echo "1. Stop linera service: pkill -f 'linera service'"
    echo "2. Sync: linera sync"
    echo "3. Process inbox: linera process-inbox"
    echo "4. Restart service: linera service &"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}How to create query via dashboard:${NC}"
echo "1. Open: http://localhost:5173/queries"
echo "2. Click tab 'Create Query'"
echo "3. Fill in question, outcomes, and duration"
echo "4. Click 'Create Query' button"
echo "5. Run this script again to verify"
echo ""
