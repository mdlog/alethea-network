#!/bin/bash

# Comprehensive diagnostic script for market resolution issues
# Checks: market status, cross-chain message, inbox processing, query creation, dashboard visibility

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
echo -e "${BLUE}  Market Resolution Diagnostic Tool${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}Configuration:${NC}"
echo "  Market ID: $MARKET_ID"
echo "  Market Chain: ${MARKET_CHAIN_ID:0:16}..."
echo "  Registry Chain: ${REGISTRY_CHAIN_ID:0:16}..."
echo "  Service URL: $SERVICE_URL"
echo ""

# Step 1: Check market status
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 1: Checking Market Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

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

# Step 2: Check Registry queries
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 2: Checking Registry Queries${NC}"
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
    
    # Get full query details
    QUERY_DETAIL_QUERY="{ query(id: \"$MATCHING_QUERY\") { id description status result outcomes createdAt commitEnd revealEnd } }"
    QUERY_DETAIL_RESPONSE=$(curl -s -X POST "$REGISTRY_URL" \
        -H "Content-Type: application/json" \
        -d "$(jq -n --arg query "$QUERY_DETAIL_QUERY" '{query: $query}')" 2>&1)
    
    QUERY_DETAIL=$(echo "$QUERY_DETAIL_RESPONSE" | jq -r '.data.query' 2>/dev/null)
    if [ "$QUERY_DETAIL" != "null" ]; then
        QUERY_STATUS=$(echo "$QUERY_DETAIL" | jq -r '.status' 2>/dev/null)
        echo "  Status: $QUERY_STATUS"
    fi
else
    echo -e "${YELLOW}⚠️  No matching query found${NC}"
    echo "  Market question: $MARKET_QUESTION"
    echo ""
    echo -e "${CYAN}Recent queries in Registry:${NC}"
    echo "$QUERIES_RESPONSE" | jq -r '.data.queries[-5:] | .[] | "  Query #\(.id): \(.description) | Status: \(.status)"' 2>/dev/null || echo "  (No queries found)"
fi
echo ""

# Step 3: Check if cross-chain message needs processing
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 3: Cross-Chain Message Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$MARKET_STATUS" = "Voting" ] && [ -z "$MATCHING_QUERY" ]; then
    echo -e "${YELLOW}⚠️  Market status is 'Voting' but no query found in Registry${NC}"
    echo "  This suggests cross-chain message may not have been processed yet"
    echo ""
    echo -e "${CYAN}Possible causes:${NC}"
    echo "  1. Cross-chain message stuck in Registry inbox"
    echo "  2. Message not yet delivered to Registry chain"
    echo "  3. Message processing failed"
    echo ""
    echo -e "${BLUE}Solution: Process Registry inbox${NC}"
    echo "  Run: ./scripts/process-registry-inbox.sh $REGISTRY_CHAIN_ID"
    echo ""
    
    # Ask if user wants to process inbox
    read -p "Do you want to process Registry inbox now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo -e "${BLUE}Processing Registry inbox...${NC}"
        cd "$(dirname "$0")/.."
        ./scripts/process-registry-inbox.sh "$REGISTRY_CHAIN_ID" || {
            echo -e "${RED}❌ Failed to process inbox${NC}"
            echo ""
            echo -e "${YELLOW}Manual steps:${NC}"
            echo "  1. Stop linera service: pkill -f 'linera service'"
            echo "  2. Run: linera process-inbox $REGISTRY_CHAIN_ID"
            echo "  3. Restart linera service"
            echo "  4. Run this script again"
        }
    fi
elif [ "$MARKET_STATUS" = "Voting" ] && [ -n "$MATCHING_QUERY" ]; then
    echo -e "${GREEN}✅ Query found! Cross-chain message was processed successfully${NC}"
    echo "  Market Query ID: ${QUERY_ID:-Not linked yet}"
    echo "  Registry Query ID: $MATCHING_QUERY"
    
    if [ "$QUERY_ID" != "null" ] && [ -n "$QUERY_ID" ] && [ "$QUERY_ID" = "$MATCHING_QUERY" ]; then
        echo -e "${GREEN}✅ Query IDs match - everything is linked correctly${NC}"
    elif [ "$QUERY_ID" = "null" ] || [ -z "$QUERY_ID" ]; then
        echo -e "${YELLOW}⚠️  Market doesn't have Query ID linked yet${NC}"
        echo "  This is normal - the callback will link it when query is created"
    else
        echo -e "${YELLOW}⚠️  Query IDs don't match${NC}"
        echo "  Market Query ID: $QUERY_ID"
        echo "  Registry Query ID: $MATCHING_QUERY"
    fi
elif [ "$MARKET_STATUS" != "Voting" ]; then
    echo -e "${YELLOW}⚠️  Market status is '$MARKET_STATUS', not 'Voting'${NC}"
    echo "  Market may not have requested resolution yet"
    echo "  Or resolution may have already completed"
fi
echo ""

# Step 4: Check Registry statistics
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 4: Registry Statistics${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

STATS_QUERY="{ statistics { totalQueriesCreated totalQueriesResolved } }"

STATS_RESPONSE=$(curl -s -X POST "$REGISTRY_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg query "$STATS_QUERY" '{query: $query}')" 2>&1)

if echo "$STATS_RESPONSE" | jq -e '.data.statistics' > /dev/null 2>&1; then
    TOTAL_CREATED=$(echo "$STATS_RESPONSE" | jq -r '.data.statistics.totalQueriesCreated' 2>/dev/null)
    TOTAL_RESOLVED=$(echo "$STATS_RESPONSE" | jq -r '.data.statistics.totalQueriesResolved' 2>/dev/null)
    echo "  Total Queries Created: $TOTAL_CREATED"
    echo "  Total Queries Resolved: $TOTAL_RESOLVED"
    echo "  Current Queries Count: $QUERIES_COUNT"
else
    echo -e "${YELLOW}⚠️  Could not fetch statistics${NC}"
fi
echo ""

# Step 5: Summary and recommendations
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Summary & Recommendations${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -n "$MATCHING_QUERY" ]; then
    echo -e "${GREEN}✅ Query exists in Registry${NC}"
    echo "  Query should be visible in dashboard"
    echo ""
    echo -e "${CYAN}If query not visible in dashboard:${NC}"
    echo "  1. Refresh dashboard page"
    echo "  2. Check browser console for errors"
    echo "  3. Verify dashboard is querying correct Registry App ID"
    echo "  4. Check if query status filter is hiding it"
else
    echo -e "${YELLOW}⚠️  Query not found in Registry${NC}"
    echo ""
    echo -e "${CYAN}Next steps:${NC}"
    echo "  1. Process Registry inbox: ./scripts/process-registry-inbox.sh"
    echo "  2. Wait a few seconds for message processing"
    echo "  3. Run this script again to verify"
    echo "  4. Check Linera service logs for errors"
fi
echo ""
