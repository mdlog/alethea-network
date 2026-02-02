#!/bin/bash

# Script to verify market resolution flow and diagnose issues
# Usage: ./verify-market-resolution.sh [market_id]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

MARKET_ID="${1:-1}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Verify Market Resolution Flow${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Load environment variables
if [ -f "../alethea-market/.env.local" ]; then
    while IFS= read -r line; do
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        [[ -z "${line// }" ]] && continue
        if [[ "$line" =~ ^[[:space:]]*([^=]+)=(.*)$ ]]; then
            export "$line"
        fi
    done < "../alethea-market/.env.local"
fi

MARKET_CHAIN_ID="${VITE_CHAIN_ID:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"
MARKET_APP_ID="${VITE_MARKET_APP_ID:-866ebfa2c3293cb9ae7dd9adc0b3538d17c3931d0600555c20ce20ce64c8ccd3}"
REGISTRY_CHAIN_ID="${VITE_REGISTRY_CHAIN_ID:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"
REGISTRY_APP_ID="${VITE_REGISTRY_APP_ID:-f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990}"
SERVICE_URL="${VITE_SERVICE_URL:-http://localhost:8080}"

MARKET_URL="${SERVICE_URL}/chains/${MARKET_CHAIN_ID}/applications/${MARKET_APP_ID}"
REGISTRY_URL="${SERVICE_URL}/chains/${REGISTRY_CHAIN_ID}/applications/${REGISTRY_APP_ID}"

echo -e "${BLUE}Step 1: Check Market Status${NC}"
MARKET_QUERY="{ market(id: \"${MARKET_ID}\") { id question status queryId endTime } }"
MARKET_RESPONSE=$(curl -s -X POST "$MARKET_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg query "$MARKET_QUERY" '{query: $query}')")

if echo "$MARKET_RESPONSE" | jq -e '.errors' > /dev/null 2>&1; then
    echo -e "${RED}❌ Error fetching market:${NC}"
    echo "$MARKET_RESPONSE" | jq '.errors'
    exit 1
fi

MARKET_DATA=$(echo "$MARKET_RESPONSE" | jq -r '.data.market')
if [ "$MARKET_DATA" = "null" ]; then
    echo -e "${RED}❌ Market not found${NC}"
    exit 1
fi

MARKET_STATUS=$(echo "$MARKET_DATA" | jq -r '.status' | sed 's/MarketStatus:://' | tr -d '"')
QUERY_ID=$(echo "$MARKET_DATA" | jq -r '.queryId // empty')
QUESTION=$(echo "$MARKET_DATA" | jq -r '.question')

echo "  Market ID: ${MARKET_ID}"
echo "  Question: ${QUESTION}"
echo "  Status: ${MARKET_STATUS}"
echo "  Query ID: ${QUERY_ID:-None}"
echo ""

if [ -n "$QUERY_ID" ] && [ "$QUERY_ID" != "null" ]; then
    echo -e "${GREEN}✅ Query ID found!${NC}"
    echo ""
    echo -e "${BLUE}Step 2: Check Query in Registry${NC}"
    QUERY_QUERY="{ query(id: ${QUERY_ID}) { id description status result } }"
    QUERY_RESPONSE=$(curl -s -X POST "$REGISTRY_URL" \
        -H "Content-Type: application/json" \
        -d "$(jq -n --arg query "$QUERY_QUERY" '{query: $query}')")
    
    QUERY_DATA=$(echo "$QUERY_RESPONSE" | jq -r '.data.query')
    if [ "$QUERY_DATA" != "null" ]; then
        QUERY_STATUS=$(echo "$QUERY_DATA" | jq -r '.status' | sed 's/QueryStatus:://' | tr -d '"')
        echo -e "${GREEN}  ✅ Query found in Registry${NC}"
        echo "    Status: ${QUERY_STATUS}"
        echo "    View: http://localhost:4002/queries/${QUERY_ID}"
    else
        echo -e "${YELLOW}  ⚠️  Query not found in Registry${NC}"
    fi
    exit 0
fi

# No Query ID - check if query exists with matching description
echo -e "${BLUE}Step 2: Search for Query with Matching Description${NC}"
ALL_QUERIES_QUERY="{ queries { id description status createdAt } }"
ALL_QUERIES_RESPONSE=$(curl -s -X POST "$REGISTRY_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg query "$ALL_QUERIES_QUERY" '{query: $query}')")

MATCHING_QUERY=$(echo "$ALL_QUERIES_RESPONSE" | jq -r --arg q "$QUESTION" '.data.queries[] | select(.description == $q) | .id' | head -1)

if [ -n "$MATCHING_QUERY" ]; then
    echo -e "${YELLOW}  ⚠️  Found query with matching description but not linked to market${NC}"
    echo "    Query ID: ${MATCHING_QUERY}"
    echo "    This means query was created but callback was not received"
    echo ""
    echo -e "${BLUE}  Possible solutions:${NC}"
    echo "    1. Wait a few more seconds for callback to arrive"
    echo "    2. Check Linera service logs for callback errors"
    echo "    3. Redeploy Simple Market with use_local_instance: true"
else
    echo -e "${RED}  ❌ No query found with matching description${NC}"
    echo ""
    echo -e "${BLUE}  Diagnosis:${NC}"
    
    if [ "$MARKET_STATUS" = "Voting" ]; then
        echo "    - Market status is 'Voting' (requestResolution was called)"
        echo "    - But no query was created in Registry"
        echo ""
        echo -e "${YELLOW}  Possible causes:${NC}"
        echo "    1. Cross-chain message not sent (check contract logs)"
        echo "    2. Cross-chain message not processed (wait or restart service)"
        echo "    3. Registry rejected the request (check Registry logs)"
        echo ""
        echo -e "${BLUE}  Recommended solution:${NC}"
        echo "    Redeploy Simple Market with use_local_instance: true"
        echo "    This uses call_application() instead of cross-chain messaging"
        echo "    More reliable for same-chain communication"
    elif [ "$MARKET_STATUS" = "Open" ]; then
        echo "    - Market is still 'Open'"
        echo "    - Need to click 'Request Resolution' first"
    fi
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
