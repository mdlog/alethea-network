#!/bin/bash

# Script to check market resolution status and verify query creation
# Usage: ./check-market-resolution-status.sh [market_id] [market_app_id] [chain_id]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
echo -e "${BLUE}  Check Market Resolution Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Configuration:${NC}"
echo "  Market ID: $MARKET_ID"
echo "  Market App ID: ${MARKET_APP_ID:0:16}..."
echo "  Registry App ID: ${REGISTRY_APP_ID:0:16}..."
echo ""

# Step 1: Check market status
echo -e "${BLUE}Step 1: Checking market status...${NC}"
MARKET_QUERY="{ market(id: \"$MARKET_ID\") { id question status queryId winningOutcome resolvedAt } }"

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

# Step 2: Check if query exists in Registry
if [ "$QUERY_ID" != "null" ] && [ -n "$QUERY_ID" ]; then
    echo -e "${BLUE}Step 2: Checking query in Registry...${NC}"
    QUERY_QUERY="{ query(id: \"$QUERY_ID\") { id description status result outcomes } }"
    
    QUERY_RESPONSE=$(curl -s -X POST "$REGISTRY_URL" \
        -H "Content-Type: application/json" \
        -d "$(jq -n --arg query "$QUERY_QUERY" '{query: $query}')" 2>&1)
    
    if echo "$QUERY_RESPONSE" | jq -e '.errors' > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Error querying query (may not exist yet):${NC}"
        echo "$QUERY_RESPONSE" | jq '.errors' 2>/dev/null || echo "$QUERY_RESPONSE"
    else
        QUERY_DATA=$(echo "$QUERY_RESPONSE" | jq -r '.data.query' 2>/dev/null)
        if [ "$QUERY_DATA" != "null" ] && [ -n "$QUERY_DATA" ]; then
            QUERY_STATUS=$(echo "$QUERY_DATA" | jq -r '.status' 2>/dev/null)
            QUERY_DESC=$(echo "$QUERY_DATA" | jq -r '.description' 2>/dev/null)
            echo -e "${GREEN}✅ Query found in Registry${NC}"
            echo "  Query ID: $QUERY_ID"
            echo "  Description: $QUERY_DESC"
            echo "  Status: $QUERY_STATUS"
        else
            echo -e "${YELLOW}⚠️  Query $QUERY_ID not found in Registry yet${NC}"
            echo "  This may mean cross-chain message is still being processed"
        fi
    fi
    echo ""
else
    echo -e "${BLUE}Step 2: Checking recent queries in Registry...${NC}"
    echo -e "${YELLOW}Market doesn't have Query ID yet. Checking if query was created...${NC}"
    
    # List recent queries
    QUERIES_QUERY="{ queries { id description status createdAt } }"
    
    QUERIES_RESPONSE=$(curl -s -X POST "$REGISTRY_URL" \
        -H "Content-Type: application/json" \
        -d "$(jq -n --arg query "$QUERIES_QUERY" '{query: $query}')" 2>&1)
    
    if echo "$QUERIES_RESPONSE" | jq -e '.data.queries' > /dev/null 2>&1; then
        QUERIES_COUNT=$(echo "$QUERIES_RESPONSE" | jq -r '.data.queries | length' 2>/dev/null)
        echo "  Found $QUERIES_COUNT queries in Registry"
        
        if [ "$QUERIES_COUNT" -gt 0 ]; then
            echo ""
            echo -e "${BLUE}Recent queries:${NC}"
            echo "$QUERIES_RESPONSE" | jq -r '.data.queries[-5:] | .[] | "  Query #\(.id): \(.description) | Status: \(.status)"' 2>/dev/null
            
            # Check if any query matches market question
            MATCHING_QUERY=$(echo "$QUERIES_RESPONSE" | jq -r --arg q "$MARKET_QUESTION" '.data.queries[] | select(.description == $q) | .id' 2>/dev/null | head -1)
            
            if [ -n "$MATCHING_QUERY" ]; then
                echo ""
                echo -e "${GREEN}✅ Found matching query for this market!${NC}"
                echo "  Query ID: $MATCHING_QUERY"
                echo "  Description matches market question"
            else
                echo ""
                echo -e "${YELLOW}⚠️  No matching query found yet${NC}"
                echo "  Cross-chain message may still be processing"
                echo "  Wait a few seconds and check again"
            fi
        fi
    fi
    echo ""
fi

# Step 3: Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Summary:${NC}"
echo "  Market Status: $MARKET_STATUS"
if [ "$MARKET_STATUS" = "Voting" ]; then
    echo -e "${GREEN}  ✅ Market status updated to Voting (requestResolution worked!)${NC}"
else
    echo -e "${YELLOW}  ⚠️  Market status is still: $MARKET_STATUS${NC}"
fi

if [ "$QUERY_ID" != "null" ] && [ -n "$QUERY_ID" ]; then
    echo -e "${GREEN}  ✅ Query ID linked: $QUERY_ID${NC}"
else
    echo -e "${YELLOW}  ⚠️  Query ID not linked yet${NC}"
    echo "     Cross-chain message may still be processing"
    echo "     Wait a few seconds and run this script again"
fi
echo ""
