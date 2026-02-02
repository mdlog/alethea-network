#!/bin/bash

# Comprehensive diagnostic script for Market Query creation issue
# Checks all possible failure points and provides actionable solutions

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

MARKET_ID="${1:-1}"
MARKET_APP_ID="${2:-afa5023760441e2fd5768f42b010f42f7fab98317612e915e51537a29d7f33d1}"
MARKET_CHAIN_ID="${3:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"
REGISTRY_APP_ID="${REGISTRY_APP_ID:-f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990}"
REGISTRY_CHAIN_ID="${REGISTRY_CHAIN_ID:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"
SERVICE_URL="${VITE_SERVICE_URL:-http://localhost:8080}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  COMPREHENSIVE MARKET QUERY DIAGNOSTIC${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ============================================================================
# CHECK 1: Service Status
# ============================================================================
echo -e "${CYAN}[Check 1] Linera Service Status${NC}"
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${GREEN}  ✅ Service is running${NC}"
    SERVICE_RUNNING=true
else
    echo -e "${RED}  ❌ Service is NOT running${NC}"
    SERVICE_RUNNING=false
fi
echo ""

# ============================================================================
# CHECK 2: Market Status
# ============================================================================
echo -e "${CYAN}[Check 2] Market Status${NC}"
MARKET_URL="${SERVICE_URL}/chains/${MARKET_CHAIN_ID}/applications/${MARKET_APP_ID}"
MARKET_QUERY="{ market(id: \"$MARKET_ID\") { id question status queryId } }"

MARKET_RESPONSE=$(curl -s -X POST "$MARKET_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg query "$MARKET_QUERY" '{query: $query}')" 2>&1 || echo "{}")

if echo "$MARKET_RESPONSE" | jq -e '.data.market' > /dev/null 2>&1; then
    MARKET_STATUS=$(echo "$MARKET_RESPONSE" | jq -r '.data.market.status' 2>/dev/null)
    MARKET_QUESTION=$(echo "$MARKET_RESPONSE" | jq -r '.data.market.question' 2>/dev/null)
    QUERY_ID=$(echo "$MARKET_RESPONSE" | jq -r '.data.market.queryId' 2>/dev/null)
    
    echo -e "${GREEN}  ✅ Market found${NC}"
    echo "    Question: $MARKET_QUESTION"
    echo "    Status: $MARKET_STATUS"
    echo "    Query ID: ${QUERY_ID:-null}"
    
    if [ "$MARKET_STATUS" = "Voting" ] && [ "$QUERY_ID" = "null" ]; then
        echo -e "${YELLOW}  ⚠️  Market requested resolution but Query ID is null${NC}"
        echo "    This means message was sent but query not created yet"
    fi
else
    echo -e "${RED}  ❌ Cannot query market (service may be down)${NC}"
    MARKET_STATUS="Unknown"
fi
echo ""

# ============================================================================
# CHECK 3: Registry Queries
# ============================================================================
echo -e "${CYAN}[Check 3] Registry Queries${NC}"
REGISTRY_URL="${SERVICE_URL}/chains/${REGISTRY_CHAIN_ID}/applications/${REGISTRY_APP_ID}"
QUERIES_QUERY="{ queries { id description status } }"

QUERIES_RESPONSE=$(curl -s -X POST "$REGISTRY_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg query "$QUERIES_QUERY" '{query: $query}')" 2>&1 || echo "{}")

if echo "$QUERIES_RESPONSE" | jq -e '.data.queries' > /dev/null 2>&1; then
    QUERIES_COUNT=$(echo "$QUERIES_RESPONSE" | jq -r '.data.queries | length' 2>/dev/null || echo "0")
    echo -e "${GREEN}  ✅ Registry accessible${NC}"
    echo "    Total queries: $QUERIES_COUNT"
    
    if [ -n "$MARKET_QUESTION" ] && [ "$MARKET_QUESTION" != "null" ]; then
        MATCHING=$(echo "$QUERIES_RESPONSE" | jq -r --arg q "$MARKET_QUESTION" '.data.queries[] | select(.description == $q) | .id' 2>/dev/null | head -1)
        if [ -n "$MATCHING" ]; then
            echo -e "${GREEN}  ✅✅✅ MATCHING QUERY FOUND!${NC}"
            echo "    Query ID: $MATCHING"
        else
            echo -e "${RED}  ❌ No matching query found${NC}"
        fi
    fi
else
    echo -e "${RED}  ❌ Cannot query Registry (service may be down)${NC}"
fi
echo ""

# ============================================================================
# CHECK 4: Process Inbox (if service not running)
# ============================================================================
if [ "$SERVICE_RUNNING" = false ]; then
    echo -e "${CYAN}[Check 4] Processing Registry Inbox (service is down)${NC}"
    echo "  Running: linera process-inbox $REGISTRY_CHAIN_ID"
    
    PROCESS_OUTPUT=$(linera process-inbox "$REGISTRY_CHAIN_ID" 2>&1 || echo "ERROR")
    PROCESS_EXIT=$?
    
    echo "$PROCESS_OUTPUT" | head -20
    
    if [ $PROCESS_EXIT -eq 0 ]; then
        if echo "$PROCESS_OUTPUT" | grep -qiE "Processed.*[1-9]"; then
            echo -e "${GREEN}  ✅ Messages processed!${NC}"
            echo ""
            echo -e "${BLUE}  Re-checking queries in 3 seconds...${NC}"
            sleep 3
            
            # Re-check queries
            QUERIES_RESPONSE2=$(curl -s -X POST "$REGISTRY_URL" \
                -H "Content-Type: application/json" \
                -d "$(jq -n --arg query "$QUERIES_QUERY" '{query: $query}')" 2>&1 || echo "{}")
            
            if [ -n "$MARKET_QUESTION" ] && [ "$MARKET_QUESTION" != "null" ]; then
                MATCHING2=$(echo "$QUERIES_RESPONSE2" | jq -r --arg q "$MARKET_QUESTION" '.data.queries[] | select(.description == $q) | .id' 2>/dev/null | head -1)
                if [ -n "$MATCHING2" ]; then
                    echo -e "${GREEN}  ✅✅✅ QUERY CREATED AFTER PROCESSING!${NC}"
                    echo "    Query ID: $MATCHING2"
                fi
            fi
        else
            echo -e "${YELLOW}  ⚠️  No messages to process${NC}"
        fi
    else
        echo -e "${RED}  ❌ Failed to process inbox${NC}"
    fi
    echo ""
fi

# ============================================================================
# RECOMMENDATIONS
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  RECOMMENDATIONS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$SERVICE_RUNNING" = false ]; then
    echo -e "${YELLOW}[Action Required] Start Linera Service${NC}"
    echo "  1. Run: linera service --port 8080"
    echo "  2. Wait 10-30 seconds for ChainListener to initialize"
    echo "  3. ChainListener will automatically process messages"
    echo "  4. Re-run this script to verify query creation"
    echo ""
fi

if [ "$MARKET_STATUS" = "Voting" ] && [ "$QUERY_ID" = "null" ]; then
    echo -e "${YELLOW}[Possible Issue] Message Not Processed${NC}"
    echo "  Market status is 'Voting' but Query ID is null"
    echo ""
    echo "  Possible causes:"
    echo "  1. Message stuck in inbox (ChainListener not processing)"
    echo "  2. ChainListener not tracking Registry chain"
    echo "  3. Registry chain has no preferred owner in wallet"
    echo ""
    echo "  Solutions:"
    if [ "$SERVICE_RUNNING" = true ]; then
        echo "  A. Check service logs for ChainListener errors"
        echo "  B. Verify Registry chain is tracked: linera show-chain $REGISTRY_CHAIN_ID"
        echo "  C. Manually process inbox: ./scripts/process-registry-inbox.sh"
    else
        echo "  A. Start service: linera service --port 8080"
        echo "  B. If service doesn't process, manually run: linera process-inbox $REGISTRY_CHAIN_ID"
    fi
    echo ""
fi

echo -e "${CYAN}[Next Steps]${NC}"
echo "  1. Ensure Linera service is running"
echo "  2. Wait 30-60 seconds for ChainListener to process"
echo "  3. Re-run investigation: ./scripts/investigate-market-query-detailed.sh $MARKET_ID"
echo "  4. Check Oracle Dashboard for new queries"
echo ""
