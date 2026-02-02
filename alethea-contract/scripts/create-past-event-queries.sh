#!/bin/bash

# Script to create queries for past real events via GraphQL mutation
# These queries can be immediately resolved since events already happened

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load config
if [ -f "../../alethea-dashboard-vite/.env.local" ]; then
    source ../../alethea-dashboard-vite/.env.local
    REGISTRY_APP_ID="${VITE_REGISTRY_APP_ID}"
    CHAIN_ID="${VITE_CHAIN_ID}"
else
    REGISTRY_APP_ID="bee143d1a76cb7e0b8985002d70aca3b6807345b111a5b1f03248c3fe156a5ae"
    CHAIN_ID="9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec"
fi

SERVICE_URL="http://localhost:8080"
ENDPOINT="${SERVICE_URL}/chains/${CHAIN_ID}/applications/${REGISTRY_APP_ID}"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     CREATING QUERIES FOR PAST REAL EVENTS                  ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Endpoint: ${ENDPOINT}${NC}"
echo ""

# Function to create query via GraphQL mutation
create_query_mutation() {
    local description="$1"
    local outcomes="$2"
    local reward_amount="$3"
    local title="$4"
    
    echo -e "${BLUE}Creating: ${title}${NC}"
    
    # Calculate deadline (past date - 1 day ago in microseconds)
    local deadline=$(($(date -d "1 day ago" +%s) * 1000000))
    
    local mutation=$(cat <<EOF
{
  "query": "mutation { createQuery(description: \"${description}\", outcomes: ${outcomes}, strategy: \"WeightedByStake\", minVotes: 3, rewardAmount: \"${reward_amount}\", deadline: \"${deadline}\", durationSecs: 300) { success message } }"
}
EOF
)
    
    local response=$(curl -s -X POST "${ENDPOINT}" \
        -H "Content-Type: application/json" \
        -d "${mutation}" 2>&1)
    
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ Query created successfully${NC}"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
    else
        echo -e "${RED}✗ Failed to create query${NC}"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
    fi
    echo ""
}

# ==================== CRYPTO QUERIES ====================

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}CRYPTO QUERIES${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Query 1: Bitcoin Halving 2024 (April 20, 2024)
create_query_mutation \
    "Did Bitcoin halving occur on or before April 20, 2024? (Halving reduces block reward from 6.25 BTC to 3.125 BTC at block 840,000)" \
    '["Yes", "No"]' \
    "50000000000000000000" \
    "Bitcoin Halving 2024"

# Query 2: Ethereum Merge (September 15, 2022)
create_query_mutation \
    "Was Ethereum Merge (transition to Proof-of-Stake) completed successfully on September 15, 2022 at block 15,537,393?" \
    '["Yes", "No"]' \
    "50000000000000000000" \
    "Ethereum Merge Completion"

# Query 3: Bitcoin ATH 2024 (March 2024)
create_query_mutation \
    "Did Bitcoin reach a new all-time high price above $73,000 USD in March 2024?" \
    '["Yes", "No"]' \
    "50000000000000000000" \
    "Bitcoin All-Time High 2024"

# ==================== SPORTS QUERIES ====================

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}SPORTS QUERIES${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Query 4: World Cup 2022 (December 18, 2022)
create_query_mutation \
    "Who won the FIFA World Cup 2022 final match on December 18, 2022?" \
    '["Argentina", "France"]' \
    "50000000000000000000" \
    "FIFA World Cup 2022 Winner"

# Query 5: Super Bowl LVIII (February 11, 2024)
create_query_mutation \
    "Who won Super Bowl LVIII played on February 11, 2024 at Allegiant Stadium?" \
    '["Kansas City Chiefs", "San Francisco 49ers"]' \
    "50000000000000000000" \
    "Super Bowl LVIII Winner 2024"

# Query 6: Champions League 2023 (June 10, 2023)
create_query_mutation \
    "Which team won the UEFA Champions League 2022-23 final on June 10, 2023?" \
    '["Manchester City", "Inter Milan"]' \
    "50000000000000000000" \
    "UEFA Champions League 2023 Winner"

echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              QUERIES CREATION COMPLETE                      ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Check queries: curl -X POST ${ENDPOINT} -H 'Content-Type: application/json' -d '{\"query\": \"{ queries { id description status } }\"}'"
echo "2. Vote on queries using the dashboard"
echo "3. Resolve queries after voting period ends"
echo ""
