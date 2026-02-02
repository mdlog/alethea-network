#!/bin/bash

# Create all queries for past real events (Crypto & Sports)
# Run this after ensuring linera service is running

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
echo -e "${BLUE}║     CREATE ALL PAST EVENT QUERIES                           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Endpoint: ${ENDPOINT}${NC}"
echo ""

# Function to create query
create_query() {
    local title="$1"
    local description="$2"
    local outcomes="$3"
    local deadline="$4"
    
    echo -e "${BLUE}Creating: ${title}${NC}"
    
    local mutation="{
  \"query\": \"mutation { createQuery(description: \\\"${description}\\\", outcomes: ${outcomes}, strategy: \\\"WeightedByStake\\\", minVotes: 3, rewardAmount: \\\"50000000000000000000\\\", deadline: \\\"${deadline}\\\", durationSecs: 300) }\"\n}"
    
    local response=$(curl -s -X POST "${ENDPOINT}" \
        -H "Content-Type: application/json" \
        -d "${mutation}")
    
    if echo "${response}" | grep -q '"data"'; then
        local op_hash=$(echo "${response}" | jq -r '.data' 2>/dev/null)
        echo -e "${GREEN}✓ Created - Operation Hash: ${op_hash}${NC}"
    else
        echo -e "${RED}✗ Failed: ${response}${NC}"
    fi
    echo ""
}

# ==================== CRYPTO QUERIES ====================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}CRYPTO QUERIES${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Query 1: Bitcoin Halving 2024 (April 20, 2024)
create_query \
    "Bitcoin Halving 2024" \
    "Did Bitcoin halving occur on or before April 20, 2024? (Halving reduces block reward from 6.25 BTC to 3.125 BTC at block 840,000)" \
    '["Yes", "No"]' \
    "1713571200000000"

# Query 2: Ethereum Merge (September 15, 2022)
create_query \
    "Ethereum Merge" \
    "Was Ethereum Merge (transition to Proof-of-Stake) completed successfully on September 15, 2022 at block 15,537,393?" \
    '["Yes", "No"]' \
    "1663200000000000"

# Query 3: Bitcoin ATH 2024 (March 2024)
create_query \
    "Bitcoin All-Time High 2024" \
    "Did Bitcoin reach a new all-time high price above $73,000 USD in March 2024?" \
    '["Yes", "No"]' \
    "1711929600000000"

# ==================== SPORTS QUERIES ====================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}SPORTS QUERIES${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Query 4: FIFA World Cup 2022 (December 18, 2022)
create_query \
    "FIFA World Cup 2022" \
    "Who won the FIFA World Cup 2022 final match on December 18, 2022?" \
    '["Argentina", "France"]' \
    "1671321600000000"

# Query 5: Super Bowl LVIII (February 11, 2024)
create_query \
    "Super Bowl LVIII" \
    "Who won Super Bowl LVIII played on February 11, 2024 at Allegiant Stadium?" \
    '["Kansas City Chiefs", "San Francisco 49ers"]' \
    "1707609600000000"

# Query 6: UEFA Champions League 2023 (June 10, 2023)
create_query \
    "UEFA Champions League 2023" \
    "Which team won the UEFA Champions League 2022-23 final on June 10, 2023?" \
    '["Manchester City", "Inter Milan"]' \
    "1686355200000000"

echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ALL QUERIES CREATED                              ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Operations are scheduled but not yet processed${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Sync and process inbox:"
echo "   ${YELLOW}linera sync && linera process-inbox${NC}"
echo ""
echo "2. Verify queries were created:"
echo "   ${YELLOW}curl -X POST ${ENDPOINT} \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"query\": \"{ queries { id description status outcomes } }\"}'${NC}"
echo ""
echo "3. Vote on queries via dashboard or GraphQL"
echo "4. Resolve queries after voting period ends"
echo ""
