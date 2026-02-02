#!/bin/bash

# Script to get the latest market ID and details
# Usage: ./get-latest-market.sh [market_app_id] [chain_id]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

MARKET_APP_ID="${1:-afa5023760441e2fd5768f42b010f42f7fab98317612e915e51537a29d7f33d1}"
MARKET_CHAIN_ID="${2:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"
SERVICE_URL="${VITE_SERVICE_URL:-http://localhost:8080}"

MARKET_URL="${SERVICE_URL}/chains/${MARKET_CHAIN_ID}/applications/${MARKET_APP_ID}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Get Latest Market${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}Configuration:${NC}"
echo "  Market App ID: ${MARKET_APP_ID:0:16}..."
echo "  Market Chain: ${MARKET_CHAIN_ID:0:16}..."
echo ""

# Get all markets
MARKETS_QUERY="{ markets { id question status queryId createdAt endTime } statistics { totalMarkets } }"

MARKETS_RESPONSE=$(curl -s -X POST "$MARKET_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg query "$MARKETS_QUERY" '{query: $query}')" 2>&1)

if echo "$MARKETS_RESPONSE" | jq -e '.errors' > /dev/null 2>&1; then
    echo -e "${RED}❌ Error querying markets:${NC}"
    echo "$MARKETS_RESPONSE" | jq '.errors'
    exit 1
fi

TOTAL_MARKETS=$(echo "$MARKETS_RESPONSE" | jq -r '.data.statistics.totalMarkets' 2>/dev/null || echo "0")
MARKETS_COUNT=$(echo "$MARKETS_RESPONSE" | jq -r '.data.markets | length' 2>/dev/null || echo "0")

echo -e "${GREEN}✅ Found $MARKETS_COUNT markets (Total: $TOTAL_MARKETS)${NC}"
echo ""

if [ "$MARKETS_COUNT" = "0" ]; then
    echo -e "${YELLOW}⚠️  No markets found${NC}"
    echo "  Create a market first from alethea-market frontend"
    exit 0
fi

# Get latest market (highest ID)
LATEST_MARKET=$(echo "$MARKETS_RESPONSE" | jq -r '.data.markets | sort_by(.id) | .[-1]' 2>/dev/null)

if [ -z "$LATEST_MARKET" ] || [ "$LATEST_MARKET" = "null" ]; then
    echo -e "${YELLOW}⚠️  Could not get latest market${NC}"
    exit 1
fi

LATEST_MARKET_ID=$(echo "$LATEST_MARKET" | jq -r '.id' 2>/dev/null)
LATEST_QUESTION=$(echo "$LATEST_MARKET" | jq -r '.question' 2>/dev/null)
LATEST_STATUS=$(echo "$LATEST_MARKET" | jq -r '.status' 2>/dev/null)
LATEST_QUERY_ID=$(echo "$LATEST_MARKET" | jq -r '.queryId' 2>/dev/null)

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Latest Market${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}Market ID:${NC} $LATEST_MARKET_ID"
echo -e "${GREEN}Question:${NC} $LATEST_QUESTION"
echo -e "${GREEN}Status:${NC} $LATEST_STATUS"
echo -e "${GREEN}Query ID:${NC} ${LATEST_QUERY_ID:-None}"
echo ""

# Show all markets
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}All Markets${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "$MARKETS_RESPONSE" | jq -r '.data.markets | sort_by(.id) | .[] | "  Market #\(.id): \(.question) | Status: \(.status) | Query ID: \(.queryId // "None")"' 2>/dev/null
echo ""

# Recommendations
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Next Steps${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$LATEST_STATUS" = "Open" ]; then
    echo -e "${CYAN}Market is still Open - ready for resolution request${NC}"
    echo ""
    echo -e "${YELLOW}To request resolution:${NC}"
    echo "  1. Go to alethea-market frontend"
    echo "  2. Click 'Request Resolution' for Market #$LATEST_MARKET_ID"
    echo "  3. Wait for status to change to 'Voting'"
    echo "  4. Run investigation script:"
    echo "     ./scripts/investigate-market-query-detailed.sh $LATEST_MARKET_ID"
elif [ "$LATEST_STATUS" = "Voting" ]; then
    echo -e "${CYAN}Market is already in Voting status${NC}"
    echo ""
    echo -e "${YELLOW}To check if query was created:${NC}"
    echo "  ./scripts/investigate-market-query-detailed.sh $LATEST_MARKET_ID"
elif [ "$LATEST_STATUS" = "Resolved" ]; then
    echo -e "${CYAN}Market is already Resolved${NC}"
    echo ""
    echo -e "${GREEN}Query ID:${NC} ${LATEST_QUERY_ID:-Not linked}"
    if [ -n "$LATEST_QUERY_ID" ] && [ "$LATEST_QUERY_ID" != "null" ]; then
        echo "  Query should be visible in dashboard"
    fi
fi

echo ""
