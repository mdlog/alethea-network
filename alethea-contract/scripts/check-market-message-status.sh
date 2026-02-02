#!/bin/bash

# Script to check if Market has sent cross-chain message to Registry
# Checks Market outbox and Registry inbox status

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

MARKET_CHAIN_ID="${1:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"
REGISTRY_CHAIN_ID="${2:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"
MARKET_ID="${3:-1}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Check Market Message Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}Configuration:${NC}"
echo "  Market Chain ID: ${MARKET_CHAIN_ID:0:16}..."
echo "  Registry Chain ID: ${REGISTRY_CHAIN_ID:0:16}..."
echo "  Market ID: $MARKET_ID"
echo ""

# Check if Market and Registry are on same chain
if [ "$MARKET_CHAIN_ID" = "$REGISTRY_CHAIN_ID" ]; then
    echo -e "${YELLOW}⚠️  Market and Registry are on the SAME chain${NC}"
    echo "  Cross-chain messaging may not be needed"
    echo "  Messages should be processed automatically via ChainListener"
    echo ""
    echo -e "${CYAN}Note:${NC}"
    echo "  If Market and Registry are on the same chain, messages are usually"
    echo "  processed automatically by Linera's ChainListener."
    echo "  If query still doesn't appear, check:"
    echo "  1. Market status is 'Voting'"
    echo "  2. Registry has voters registered"
    echo "  3. Linera service is running and processing messages"
    echo ""
else
    echo -e "${GREEN}✅ Market and Registry are on DIFFERENT chains${NC}"
    echo "  Cross-chain messaging is required"
    echo ""
fi

# Check Market status
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 1: Checking Market Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

MARKET_APP_ID="${MARKET_APP_ID:-afa5023760441e2fd5768f42b010f42f7fab98317612e915e51537a29d7f33d1}"
SERVICE_URL="${VITE_SERVICE_URL:-http://localhost:8080}"
MARKET_URL="${SERVICE_URL}/chains/${MARKET_CHAIN_ID}/applications/${MARKET_APP_ID}"

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

echo -e "${GREEN}✅ Market found${NC}"
echo "  Question: $MARKET_QUESTION"
echo "  Status: $MARKET_STATUS"
echo ""

# Check if Market has requested resolution
if [ "$MARKET_STATUS" != "Voting" ]; then
    echo -e "${YELLOW}⚠️  Market status is '$MARKET_STATUS', not 'Voting'${NC}"
    echo "  Market may not have requested resolution yet"
    echo ""
    echo -e "${CYAN}To request resolution:${NC}"
    echo "  1. Go to alethea-market frontend"
    echo "  2. Click 'Request Resolution' for market $MARKET_ID"
    echo ""
    exit 0
fi

echo -e "${GREEN}✅ Market has requested resolution (status: Voting)${NC}"
echo ""

# Check Registry queries
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 2: Checking Registry Queries${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

REGISTRY_APP_ID="${REGISTRY_APP_ID:-f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990}"
REGISTRY_URL="${SERVICE_URL}/chains/${REGISTRY_CHAIN_ID}/applications/${REGISTRY_APP_ID}"

QUERIES_QUERY="{ queries { id description status } }"

QUERIES_RESPONSE=$(curl -s -X POST "$REGISTRY_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg query "$QUERIES_QUERY" '{query: $query}')" 2>&1)

if echo "$QUERIES_RESPONSE" | jq -e '.data.queries' > /dev/null 2>&1; then
    MATCHING_QUERY=$(echo "$QUERIES_RESPONSE" | jq -r --arg q "$MARKET_QUESTION" '.data.queries[] | select(.description == $q) | .id' 2>/dev/null | head -1)
    
    if [ -n "$MATCHING_QUERY" ]; then
        echo -e "${GREEN}✅ Query found in Registry!${NC}"
        echo "  Query ID: $MATCHING_QUERY"
        echo "  Description matches market question"
        echo ""
        echo -e "${CYAN}Message was successfully processed!${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️  No matching query found in Registry${NC}"
        echo "  Market question: $MARKET_QUESTION"
        echo ""
    fi
else
    echo -e "${YELLOW}⚠️  Could not query Registry${NC}"
    echo ""
fi

# Summary and recommendations
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Summary & Recommendations${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$MARKET_CHAIN_ID" = "$REGISTRY_CHAIN_ID" ]; then
    echo -e "${CYAN}Same Chain Scenario:${NC}"
    echo "  Market and Registry are on the same chain"
    echo "  Messages should be processed automatically by ChainListener"
    echo ""
    echo -e "${YELLOW}If query doesn't appear:${NC}"
    echo "  1. Ensure linera service is running: linera service --port 8080"
    echo "  2. Wait a few seconds for automatic processing"
    echo "  3. Check linera service logs for errors"
    echo "  4. Verify Registry has voters registered"
else
    echo -e "${CYAN}Cross-Chain Scenario:${NC}"
    echo "  Market and Registry are on different chains"
    echo "  Cross-chain message needs to be processed"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Process Registry inbox: ./scripts/process-registry-inbox.sh"
    echo "  2. Wait a few seconds"
    echo "  3. Run this script again to verify"
fi

echo ""
