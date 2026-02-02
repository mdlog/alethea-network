#!/bin/bash

# Script to verify Simple Market deployment
# Usage: ./verify-market-deployment.sh [market_app_id]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

MARKET_APP_ID="${1:-e2383fd4edcf635b8d29ab6f48b9706f5d8d329350f308a2c67de31eb5808a17}"
MARKET_CHAIN_ID="${VITE_CHAIN_ID:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"
SERVICE_URL="${VITE_SERVICE_URL:-http://localhost:8080}"

MARKET_URL="${SERVICE_URL}/chains/${MARKET_CHAIN_ID}/applications/${MARKET_APP_ID}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Verify Simple Market Deployment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${BLUE}Configuration:${NC}"
echo "  Market App ID: ${MARKET_APP_ID:0:16}..."
echo "  Market Chain ID: ${MARKET_CHAIN_ID:0:16}..."
echo "  Service URL: ${SERVICE_URL}"
echo ""

# Test 1: Check if application endpoint is accessible
echo -e "${BLUE}Test 1: Checking application endpoint...${NC}"
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$MARKET_URL" \
    -H "Content-Type: application/json" \
    -d '{"query": "{ __typename }"}')

if [ "$STATUS_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Application endpoint accessible (HTTP $STATUS_CODE)${NC}"
else
    echo -e "${RED}❌ Application endpoint not accessible (HTTP $STATUS_CODE)${NC}"
    echo "   This may mean:"
    echo "   1. Application not deployed"
    echo "   2. Wrong Application ID"
    echo "   3. Linera service not running"
    exit 1
fi

# Test 2: Query markets
echo ""
echo -e "${BLUE}Test 2: Querying markets...${NC}"
MARKETS_QUERY='{ markets { id question status } }'

MARKETS_RESPONSE=$(curl -s -X POST "$MARKET_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg query "$MARKETS_QUERY" '{query: $query}')")

if echo "$MARKETS_RESPONSE" | jq -e '.errors' > /dev/null 2>&1; then
    echo -e "${RED}❌ Error querying markets:${NC}"
    echo "$MARKETS_RESPONSE" | jq '.errors'
    exit 1
fi

MARKETS_COUNT=$(echo "$MARKETS_RESPONSE" | jq -r '.data.markets | length')
echo -e "${GREEN}✅ Markets query successful${NC}"
echo "  Found ${MARKETS_COUNT} markets"

if [ "$MARKETS_COUNT" -gt 0 ]; then
    echo ""
    echo -e "${BLUE}Markets:${NC}"
    echo "$MARKETS_RESPONSE" | jq -r '.data.markets[] | "  Market #\(.id): \(.question) | Status: \(.status)"'
fi

# Test 3: Query statistics
echo ""
echo -e "${BLUE}Test 3: Querying statistics...${NC}"
STATS_QUERY='{ statistics { totalMarkets totalBets totalVolume } }'

STATS_RESPONSE=$(curl -s -X POST "$MARKET_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg query "$STATS_QUERY" '{query: $query}')")

if echo "$STATS_RESPONSE" | jq -e '.errors' > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Error querying statistics:${NC}"
    echo "$STATS_RESPONSE" | jq '.errors'
else
    echo -e "${GREEN}✅ Statistics query successful${NC}"
    echo "$STATS_RESPONSE" | jq -r '.data.statistics | "  Total Markets: \(.totalMarkets) | Total Bets: \(.totalBets) | Total Volume: \(.totalVolume)"'
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deployment verification complete${NC}"
echo ""
echo -e "${BLUE}If markets are accessible via HTTP but not via Linera client:${NC}"
echo "  1. Check browser console for connection errors"
echo "  2. Ensure MARKET_APP_ID is correct in .env.local"
echo "  3. Try refreshing browser to reload environment variables"
echo "  4. Check if Linera service needs to sync"
echo ""
