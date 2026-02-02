#!/bin/bash

# Script to check if a query was created for a market after requestResolution
# Usage: ./check-market-query.sh [market_id]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Check Market Query Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Load environment variables
if [ -f "../alethea-market/.env.local" ]; then
    while IFS= read -r line; do
        # Skip comments and empty lines
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        [[ -z "${line// }" ]] && continue
        
        # Only export KEY=VALUE lines
        if [[ "$line" =~ ^[[:space:]]*([^=]+)=(.*)$ ]]; then
            export "$line"
        fi
    done < "../alethea-market/.env.local"
fi

# Configuration
MARKET_CHAIN_ID="${VITE_CHAIN_ID:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"
MARKET_APP_ID="${VITE_MARKET_APP_ID:-866ebfa2c3293cb9ae7dd9adc0b3538d17c3931d0600555c20ce20ce64c8ccd3}"
REGISTRY_CHAIN_ID="${VITE_REGISTRY_CHAIN_ID:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"
REGISTRY_APP_ID="${VITE_REGISTRY_APP_ID:-f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990}"
SERVICE_URL="${VITE_SERVICE_URL:-http://localhost:8080}"

MARKET_URL="${SERVICE_URL}/chains/${MARKET_CHAIN_ID}/applications/${MARKET_APP_ID}"
REGISTRY_URL="${SERVICE_URL}/chains/${REGISTRY_CHAIN_ID}/applications/${REGISTRY_APP_ID}"

echo -e "${BLUE}Configuration:${NC}"
echo "  Market Chain ID: ${MARKET_CHAIN_ID:0:16}..."
echo "  Market App ID: ${MARKET_APP_ID:0:16}..."
echo "  Registry Chain ID: ${REGISTRY_CHAIN_ID:0:16}..."
echo "  Registry App ID: ${REGISTRY_APP_ID:0:16}..."
echo ""

# Function to check query for a specific market
check_market_query() {
    local MARKET_ID="$1"
    
    echo -e "${BLUE}Market ID: ${MARKET_ID}${NC}"
    
    # Get market details
    MARKET_QUERY="{ market(id: \"${MARKET_ID}\") { id question status queryId endTime } }"
    
    MARKET_RESPONSE=$(curl -s -X POST "$MARKET_URL" \
        -H "Content-Type: application/json" \
        -d "$(jq -n --arg query "$MARKET_QUERY" '{query: $query}')")
    
    if echo "$MARKET_RESPONSE" | jq -e '.errors' > /dev/null 2>&1; then
        echo -e "${RED}❌ Error fetching market:${NC}"
        echo "$MARKET_RESPONSE" | jq '.errors'
        return 1
    fi
    
    MARKET_DATA=$(echo "$MARKET_RESPONSE" | jq -r '.data.market')
    
    if [ "$MARKET_DATA" = "null" ]; then
        echo -e "${RED}❌ Market not found${NC}"
        return 1
    fi
    
    MARKET_STATUS=$(echo "$MARKET_DATA" | jq -r '.status' | sed 's/MarketStatus:://' | tr -d '"')
    QUERY_ID=$(echo "$MARKET_DATA" | jq -r '.queryId // empty')
    QUESTION=$(echo "$MARKET_DATA" | jq -r '.question')
    
    echo "  Question: ${QUESTION}"
    echo "  Status: ${MARKET_STATUS}"
    
    if [ -n "$QUERY_ID" ] && [ "$QUERY_ID" != "null" ]; then
        echo -e "${GREEN}  ✅ Query ID: ${QUERY_ID}${NC}"
        
        # Check query in Registry
        echo ""
        echo -e "${BLUE}Checking query in Oracle Registry...${NC}"
        
        QUERY_QUERY="{ query(id: ${QUERY_ID}) { id description status result resolvedAt createdAt } }"
        
        QUERY_RESPONSE=$(curl -s -X POST "$REGISTRY_URL" \
            -H "Content-Type: application/json" \
            -d "$(jq -n --arg query "$QUERY_QUERY" '{query: $query}')")
        
        if echo "$QUERY_RESPONSE" | jq -e '.errors' > /dev/null 2>&1; then
            echo -e "${YELLOW}  ⚠️  Error fetching query from Registry:${NC}"
            echo "$QUERY_RESPONSE" | jq '.errors'
        else
            QUERY_DATA=$(echo "$QUERY_RESPONSE" | jq -r '.data.query')
            
            if [ "$QUERY_DATA" != "null" ]; then
                QUERY_STATUS=$(echo "$QUERY_DATA" | jq -r '.status' | sed 's/QueryStatus:://' | tr -d '"')
                QUERY_RESULT=$(echo "$QUERY_DATA" | jq -r '.result // "Not resolved"')
                
                echo -e "${GREEN}  ✅ Query found in Registry${NC}"
                echo "    Status: ${QUERY_STATUS}"
                echo "    Result: ${QUERY_RESULT}"
                echo ""
                echo -e "${BLUE}  View in Oracle Dashboard:${NC}"
                echo "    http://localhost:4002/queries/${QUERY_ID}"
            else
                echo -e "${YELLOW}  ⚠️  Query not found in Registry (may still be processing)${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}  ⚠️  No Query ID yet${NC}"
        
        if [ "$MARKET_STATUS" = "Open" ]; then
            echo "    Market is still open. Wait for expiration and click 'Request Resolution'."
        elif [ "$MARKET_STATUS" = "Voting" ]; then
            echo "    Market status is 'Voting' but no Query ID. Query may still be creating..."
            echo ""
            echo -e "${YELLOW}  Possible reasons:${NC}"
            echo "    1. Cross-chain message belum diproses (check Linera service logs)"
            echo "    2. QueryCreated callback belum diterima (check market inbox)"
            echo "    3. Query sudah dibuat tapi callback belum ter-link"
            echo ""
            echo -e "${BLUE}  Check Oracle Dashboard for new queries:${NC}"
            echo "    http://localhost:4002"
            echo ""
            echo -e "${BLUE}  Check recent queries in Registry:${NC}"
            RECENT_QUERIES_QUERY='{ queries(limit: 5) { id description status createdAt } }'
            RECENT_RESPONSE=$(curl -s -X POST "$REGISTRY_URL" \
                -H "Content-Type: application/json" \
                -d "$(jq -n --arg query "$RECENT_QUERIES_QUERY" '{query: $query}')")
            
            if echo "$RECENT_RESPONSE" | jq -e '.data.queries' > /dev/null 2>&1; then
                RECENT_COUNT=$(echo "$RECENT_RESPONSE" | jq -r '.data.queries | length')
                if [ "$RECENT_COUNT" -gt 0 ]; then
                    echo "    Recent queries in Registry:"
                    echo "$RECENT_RESPONSE" | jq -r '.data.queries[] | "      Query #\(.id): \(.description) | Status: \(.status)"'
                else
                    echo "    No queries found in Registry"
                fi
            fi
        fi
    fi
}

# Get market ID from argument or query all markets
if [ -n "$1" ]; then
    MARKET_ID="$1"
    echo -e "${BLUE}Checking Market ID: ${MARKET_ID}${NC}"
    check_market_query "$MARKET_ID"
else
    echo -e "${BLUE}Fetching all markets...${NC}"
    
    # Query all markets
    MARKETS_QUERY='{ markets { id question status queryId } }'
    
    MARKETS_RESPONSE=$(curl -s -X POST "$MARKET_URL" \
        -H "Content-Type: application/json" \
        -d "$(jq -n --arg query "$MARKETS_QUERY" '{query: $query}')")
    
    if echo "$MARKETS_RESPONSE" | jq -e '.errors' > /dev/null 2>&1; then
        echo -e "${RED}❌ Error fetching markets:${NC}"
        echo "$MARKETS_RESPONSE" | jq '.errors'
        exit 1
    fi
    
    MARKETS_COUNT=$(echo "$MARKETS_RESPONSE" | jq -r '.data.markets | length')
    echo -e "${GREEN}✅ Found ${MARKETS_COUNT} markets${NC}"
    echo ""
    
    if [ "$MARKETS_COUNT" -eq 0 ]; then
        echo -e "${YELLOW}⚠️  No markets found${NC}"
        exit 0
    fi
    
    # Display markets
    echo -e "${BLUE}Markets:${NC}"
    echo "$MARKETS_RESPONSE" | jq -r '.data.markets[] | "  Market #\(.id): \(.question) | Status: \(.status) | Query ID: \(.queryId // "None")"'
    echo ""
    
    # Check each market
    for MARKET_ID in $(echo "$MARKETS_RESPONSE" | jq -r '.data.markets[].id'); do
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        check_market_query "$MARKET_ID"
        echo ""
    done
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Check complete${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. If Query ID exists, check Oracle Dashboard: http://localhost:4002"
echo "  2. If no Query ID, wait a few seconds and run this script again"
echo "  3. Check Linera service logs for any errors"
echo ""
