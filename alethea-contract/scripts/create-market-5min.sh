#!/bin/bash

# Create Market dengan durasi 5 menit
# Script untuk membuat market baru di Market Chain dengan deadline 5 menit dari sekarang

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env.conway ]; then
    source .env.conway
else
    echo -e "${RED}❌ Error: .env.conway not found${NC}"
    exit 1
fi

# GraphQL endpoint
GRAPHQL_URL="http://localhost:8080"
MARKET_CHAIN_ENDPOINT="$GRAPHQL_URL/chains/$CHAIN_ID/applications/$MARKET_CHAIN_ID"

echo -e "${BLUE}=== Create Market dengan Durasi 5 Menit ===${NC}"
echo ""

# Check if Market Chain is accessible
echo -e "${YELLOW}Checking Market Chain accessibility...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$MARKET_CHAIN_ENDPOINT" \
    -H "Content-Type: application/json" \
    -d '{"query": "{ markets { id } }"}' 2>&1)

if [ "$HTTP_CODE" != "200" ]; then
    echo -e "${RED}❌ Market Chain not accessible (HTTP $HTTP_CODE)${NC}"
    echo "Please ensure linera service is running and synced"
    exit 1
fi

echo -e "${GREEN}✅ Market Chain accessible${NC}"
echo ""

# Calculate deadline (5 minutes from now in microseconds)
DEADLINE_SECONDS=$(date +%s)
DEADLINE_MICROS=$((DEADLINE_SECONDS + 300))000000  # 5 minutes = 300 seconds

QUESTION="Will Bitcoin reach 100k by Dec 2025"
DEADLINE_DISPLAY=$(date -d "@$((DEADLINE_SECONDS + 300))" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -r $((DEADLINE_SECONDS + 300)) '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "5 minutes from now")

echo -e "${YELLOW}Market Details:${NC}"
echo "  Question: $QUESTION"
echo "  Outcomes: Yes, No"
echo "  Deadline: $DEADLINE_DISPLAY (5 minutes from now)"
echo "  Initial Liquidity: 1000000 (1 token)"
echo ""

# Create market via GraphQL mutation
echo -e "${YELLOW}Creating market...${NC}"
QUESTION="Will Bitcoin reach 100k by Dec 2025"
RESULT=$(curl -s --max-time 30 "$MARKET_CHAIN_ENDPOINT" \
    -H "Content-Type: application/json" \
    -d "{
        \"query\": \"mutation { createMarket(question: \\\"$QUESTION\\\", outcomes: [\\\"Yes\\\", \\\"No\\\"], resolutionDeadline: \\\"$DEADLINE_MICROS\\\", initialLiquidity: \\\"1000000\\\") }\"
    }" 2>&1)

# Check for errors
if echo "$RESULT" | jq -e '.errors' > /dev/null 2>&1; then
    echo -e "${RED}❌ Failed to create market${NC}"
    echo "$RESULT" | jq .
    exit 1
fi

# Extract market ID from response or get latest market
echo -e "${GREEN}✅ Market created${NC}"
echo ""

# Get the latest market ID
echo -e "${YELLOW}Getting market ID...${NC}"
MARKETS=$(curl -s --max-time 15 "$MARKET_CHAIN_ENDPOINT" \
    -H "Content-Type: application/json" \
    -d '{"query": "{ markets { id question status resolutionDeadline } }"}' 2>&1)

if echo "$MARKETS" | jq -e '.errors' > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Could not fetch markets list${NC}"
    echo "$MARKETS" | jq .
else
    LATEST_MARKET=$(echo "$MARKETS" | jq -r '.data.markets | sort_by(.id) | last')
    MARKET_ID=$(echo "$LATEST_MARKET" | jq -r '.id')
    
    if [ "$MARKET_ID" != "null" ] && [ -n "$MARKET_ID" ]; then
        echo -e "${GREEN}✅ Market ID: $MARKET_ID${NC}"
        echo ""
        echo -e "${BLUE}Market Details:${NC}"
        echo "$LATEST_MARKET" | jq .
        echo ""
        echo -e "${GREEN}✅ Market created successfully!${NC}"
        echo ""
        echo -e "${YELLOW}Next steps:${NC}"
        echo "  1. Market will auto-request resolution when deadline expires (5 minutes)"
        echo "  2. Or manually request resolution via dashboard"
        echo "  3. View market at: http://localhost:4000"
    else
        echo -e "${YELLOW}⚠️  Market created but could not determine ID${NC}"
    fi
fi

echo ""
echo -e "${BLUE}=== Done ===${NC}"

