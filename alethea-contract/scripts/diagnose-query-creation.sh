#!/bin/bash

# Comprehensive diagnostic script for query creation from Market
# Checks: Market status, message sending, Registry inbox, query creation, dashboard visibility

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

MARKET_ID="${1:-1}"
MARKET_APP_ID="${2:-afa5023760441e2fd5768f42b010f42f7fab98317612e915e51537a29d7f33d1}"
MARKET_CHAIN_ID="${3:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"
REGISTRY_APP_ID="${REGISTRY_APP_ID:-f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990}"
REGISTRY_CHAIN_ID="${REGISTRY_CHAIN_ID:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"
SERVICE_URL="${VITE_SERVICE_URL:-http://localhost:8080}"

MARKET_URL="${SERVICE_URL}/chains/${MARKET_CHAIN_ID}/applications/${MARKET_APP_ID}"
REGISTRY_URL="${SERVICE_URL}/chains/${REGISTRY_CHAIN_ID}/applications/${REGISTRY_APP_ID}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Query Creation Diagnostic Tool${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}Configuration:${NC}"
echo "  Market ID: $MARKET_ID"
echo "  Market Chain: ${MARKET_CHAIN_ID:0:16}..."
echo "  Registry Chain: ${REGISTRY_CHAIN_ID:0:16}..."
echo ""

# Step 1: Check if Market and Registry are on same chain
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 1: Chain Configuration${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$MARKET_CHAIN_ID" = "$REGISTRY_CHAIN_ID" ]; then
    echo -e "${YELLOW}⚠️  Market and Registry are on the SAME chain${NC}"
    echo "  Chain ID: ${MARKET_CHAIN_ID:0:16}..."
    echo ""
    echo -e "${CYAN}Implications:${NC}"
    echo "  - Cross-chain messaging may not be needed"
    echo "  - Messages should be processed automatically by ChainListener"
    echo "  - If query doesn't appear, check ChainListener is running"
    echo ""
else
    echo -e "${GREEN}✅ Market and Registry are on DIFFERENT chains${NC}"
    echo "  Market Chain: ${MARKET_CHAIN_ID:0:16}..."
    echo "  Registry Chain: ${REGISTRY_CHAIN_ID:0:16}..."
    echo ""
    echo -e "${CYAN}Implications:${NC}"
    echo "  - Cross-chain messaging is required"
    echo "  - Message needs to be processed manually or by ChainListener"
    echo ""
fi

# Step 2: Check Market status
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 2: Market Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

MARKET_QUERY="{ market(id: \"$MARKET_ID\") { id question status queryId } }"

MARKET_RESPONSE=$(curl -s -X POST "$MARKET_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg query "$MARKET_QUERY" '{query: $query}')" 2>&1)

if echo "$MARKET_RESPONSE" | jq -e '.errors' > /dev/null 2>&1; then
    echo -e "${RED}❌ Error querying market:${NC}"
    echo "$MARKET_RESPONSE" | jq '.errors'
    exit 1
fi

MARKET_DATA=$(echo "$MARKET_RESPONSE" | jq -r '.data.market' 2>/dev/null)

if [ "$MARKET_DATA" = "null" ] || [ -z "$MARKET_DATA" ]; then
    echo -e "${RED}❌ Market $MARKET_ID not found${NC}"
    exit 1
fi

MARKET_STATUS=$(echo "$MARKET_DATA" | jq -r '.status' 2>/dev/null)
MARKET_QUESTION=$(echo "$MARKET_DATA" | jq -r '.question' 2>/dev/null)
QUERY_ID=$(echo "$MARKET_DATA" | jq -r '.queryId' 2>/dev/null)

echo -e "${GREEN}✅ Market found${NC}"
echo "  Question: $MARKET_QUESTION"
echo "  Status: $MARKET_STATUS"
echo "  Query ID: ${QUERY_ID:-None}"
echo ""

if [ "$MARKET_STATUS" != "Voting" ]; then
    echo -e "${YELLOW}⚠️  Market status is '$MARKET_STATUS', not 'Voting'${NC}"
    echo "  Market may not have requested resolution yet"
    echo ""
    echo -e "${CYAN}Solution:${NC}"
    echo "  1. Go to alethea-market frontend"
    echo "  2. Click 'Request Resolution' for market $MARKET_ID"
    echo ""
    exit 0
fi

echo -e "${GREEN}✅ Market has requested resolution (status: Voting)${NC}"
echo ""

# Step 3: Check Registry queries
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 3: Registry Queries${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

QUERIES_QUERY="{ queries { id description status createdAt } }"

QUERIES_RESPONSE=$(curl -s -X POST "$REGISTRY_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg query "$QUERIES_QUERY" '{query: $query}')" 2>&1)

if echo "$QUERIES_RESPONSE" | jq -e '.errors' > /dev/null 2>&1; then
    echo -e "${RED}❌ Error querying Registry:${NC}"
    echo "$QUERIES_RESPONSE" | jq '.errors'
    exit 1
fi

QUERIES_COUNT=$(echo "$QUERIES_RESPONSE" | jq -r '.data.queries | length' 2>/dev/null || echo "0")
echo -e "${GREEN}✅ Found $QUERIES_COUNT queries in Registry${NC}"

# Check if query exists with matching description
MATCHING_QUERY=$(echo "$QUERIES_RESPONSE" | jq -r --arg q "$MARKET_QUESTION" '.data.queries[] | select(.description == $q) | .id' 2>/dev/null | head -1)

if [ -n "$MATCHING_QUERY" ]; then
    echo -e "${GREEN}✅ Found matching query!${NC}"
    echo "  Query ID: $MATCHING_QUERY"
    echo "  Description matches market question"
    echo ""
    
    # Get full query details
    QUERY_DETAIL_QUERY="{ query(id: \"$MATCHING_QUERY\") { id description status result outcomes createdAt commitEnd revealEnd } }"
    QUERY_DETAIL_RESPONSE=$(curl -s -X POST "$REGISTRY_URL" \
        -H "Content-Type: application/json" \
        -d "$(jq -n --arg query "$QUERY_DETAIL_QUERY" '{query: $query}')" 2>&1)
    
    QUERY_DETAIL=$(echo "$QUERY_DETAIL_RESPONSE" | jq -r '.data.query' 2>/dev/null)
    if [ "$QUERY_DETAIL" != "null" ]; then
        QUERY_STATUS=$(echo "$QUERY_DETAIL" | jq -r '.status' 2>/dev/null)
        echo "  Status: $QUERY_STATUS"
        echo ""
        echo -e "${GREEN}✅ Query exists and should be visible in dashboard!${NC}"
        echo ""
        echo -e "${CYAN}If query not visible in dashboard:${NC}"
        echo "  1. Refresh dashboard page"
        echo "  2. Check browser console for errors"
        echo "  3. Verify dashboard is querying correct Registry App ID"
        echo "  4. Check if query status filter is hiding it"
        exit 0
    fi
else
    echo -e "${YELLOW}⚠️  No matching query found${NC}"
    echo "  Market question: $MARKET_QUESTION"
    echo ""
    
    if [ "$QUERIES_COUNT" -gt 0 ]; then
        echo -e "${CYAN}Recent queries in Registry:${NC}"
        echo "$QUERIES_RESPONSE" | jq -r '.data.queries[-5:] | .[] | "  Query #\(.id): \(.description) | Status: \(.status)"' 2>/dev/null || echo "  (No queries found)"
        echo ""
    fi
fi

# Step 4: Check Linera service status
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 4: Linera Service Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Linera service is running${NC}"
    echo ""
    echo -e "${CYAN}ChainListener Behavior:${NC}"
    echo "  - ChainListener should automatically process cross-chain messages"
    echo "  - Messages are processed when NewIncomingBundle notification is received"
    echo "  - If message not processed, it may be stuck in inbox"
    echo ""
else
    echo -e "${YELLOW}⚠️  Linera service is not running${NC}"
    echo ""
    echo -e "${CYAN}Solution:${NC}"
    echo "  Start linera service: linera service --port 8080"
    echo "  ChainListener will automatically process messages"
    echo ""
fi

# Step 5: Recommendations
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 5: Recommendations${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -z "$MATCHING_QUERY" ]; then
    echo -e "${YELLOW}Query not found in Registry. Possible causes:${NC}"
    echo ""
    
    if [ "$MARKET_CHAIN_ID" = "$REGISTRY_CHAIN_ID" ]; then
        echo -e "${CYAN}Same Chain Scenario:${NC}"
        echo "  1. Message should be processed automatically by ChainListener"
        echo "  2. Wait a few seconds for automatic processing"
        echo "  3. Check linera service logs for errors"
        echo "  4. Verify Registry has voters registered"
        echo ""
        echo -e "${BLUE}If still not working:${NC}"
        echo "  - Try manual process inbox: ./scripts/process-registry-inbox.sh"
        echo "  - Check if message was actually sent from Market"
    else
        echo -e "${CYAN}Cross-Chain Scenario:${NC}"
        echo "  1. Message needs to be processed manually or by ChainListener"
        echo "  2. Process Registry inbox: ./scripts/process-registry-inbox.sh"
        echo "  3. Wait a few seconds after processing"
        echo "  4. Run this script again to verify"
        echo ""
        echo -e "${BLUE}Manual steps:${NC}"
        echo "  pkill -f 'linera service'"
        echo "  linera process-inbox $REGISTRY_CHAIN_ID"
        echo "  linera service --port 8080"
    fi
else
    echo -e "${GREEN}✅ Query found! Everything is working correctly${NC}"
    echo ""
    echo -e "${CYAN}Next steps:${NC}"
    echo "  1. Refresh dashboard to see the query"
    echo "  2. Voters can start voting on the query"
    echo "  3. Query will be resolved after voting deadline"
fi

echo ""
