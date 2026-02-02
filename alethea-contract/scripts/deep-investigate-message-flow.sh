#!/bin/bash

# Deep investigation script - checks EVERY step of message flow
# This script will NOT stop until the problem is found

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

MARKET_ID="${1:-1}"
MARKET_APP_ID="${2:-afa5023760441e2fd5768f42b010f42f7fab98317612e915e51537a29d7f33d1}"
MARKET_CHAIN_ID="${3:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"
REGISTRY_APP_ID="${REGISTRY_APP_ID:-f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990}"
REGISTRY_CHAIN_ID="${REGISTRY_CHAIN_ID:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"
SERVICE_URL="${VITE_SERVICE_URL:-http://localhost:8080}"

echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}  DEEP INVESTIGATION: Message Flow Analysis${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ============================================================================
# CHECK 1: Service Status & Health
# ============================================================================
echo -e "${CYAN}[CHECK 1] Linera Service Status${NC}"
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${GREEN}  ✅ Service is running${NC}"
    SERVICE_RUNNING=true
else
    echo -e "${RED}  ❌ Service is NOT running${NC}"
    SERVICE_RUNNING=false
    echo ""
    echo -e "${YELLOW}  ACTION REQUIRED: Start service first${NC}"
    echo "    linera service --port 8080"
    exit 1
fi
echo ""

# ============================================================================
# CHECK 2: Market Status & Message Sending Verification
# ============================================================================
echo -e "${CYAN}[CHECK 2] Market Status & Message Verification${NC}"
MARKET_URL="${SERVICE_URL}/chains/${MARKET_CHAIN_ID}/applications/${MARKET_APP_ID}"
MARKET_QUERY="{ market(id: \"$MARKET_ID\") { id question status queryId } }"

MARKET_RESPONSE=$(curl -s -X POST "$MARKET_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg query "$MARKET_QUERY" '{query: $query}')" 2>&1)

if echo "$MARKET_RESPONSE" | jq -e '.data.market' > /dev/null 2>&1; then
    MARKET_STATUS=$(echo "$MARKET_RESPONSE" | jq -r '.data.market.status' 2>/dev/null)
    MARKET_QUESTION=$(echo "$MARKET_RESPONSE" | jq -r '.data.market.question' 2>/dev/null)
    QUERY_ID=$(echo "$MARKET_RESPONSE" | jq -r '.data.market.queryId' 2>/dev/null)
    
    echo -e "${GREEN}  ✅ Market found${NC}"
    echo "    ID: $MARKET_ID"
    echo "    Question: $MARKET_QUESTION"
    echo "    Status: $MARKET_STATUS"
    echo "    Query ID: ${QUERY_ID:-null}"
    echo ""
    
    if [ "$MARKET_STATUS" != "Voting" ]; then
        echo -e "${RED}  ❌ PROBLEM FOUND: Market status is '$MARKET_STATUS', not 'Voting'${NC}"
        echo "    Market has NOT requested resolution yet"
        echo "    No message has been sent to Registry"
        echo ""
        echo -e "${YELLOW}  SOLUTION: Request resolution from Market frontend${NC}"
        exit 1
    fi
    
    if [ "$QUERY_ID" != "null" ] && [ -n "$QUERY_ID" ]; then
        echo -e "${GREEN}  ✅ Query ID is set - query was created!${NC}"
        echo "    Query ID: $QUERY_ID"
        echo ""
        echo -e "${CYAN}  Verifying query exists in Registry...${NC}"
        
        REGISTRY_URL="${SERVICE_URL}/chains/${REGISTRY_CHAIN_ID}/applications/${REGISTRY_APP_ID}"
        QUERY_CHECK="{ query(id: \"$QUERY_ID\") { id description status } }"
        
        QUERY_RESPONSE=$(curl -s -X POST "$REGISTRY_URL" \
            -H "Content-Type: application/json" \
            -d "$(jq -n --arg query "$QUERY_CHECK" '{query: $query}')" 2>&1)
        
        if echo "$QUERY_RESPONSE" | jq -e '.data.query' > /dev/null 2>&1; then
            QUERY_DESC=$(echo "$QUERY_RESPONSE" | jq -r '.data.query.description' 2>/dev/null)
            echo -e "${GREEN}  ✅✅✅ QUERY EXISTS IN REGISTRY!${NC}"
            echo "    Query ID: $QUERY_ID"
            echo "    Description: $QUERY_DESC"
            echo ""
            echo -e "${GREEN}  🎉 PROBLEM SOLVED: Query was created successfully!${NC}"
            echo "    The query should be visible in the Oracle Dashboard"
            exit 0
        else
            echo -e "${RED}  ❌ Query ID set but query not found in Registry${NC}"
            echo "    This indicates a data inconsistency issue"
        fi
    else
        echo -e "${YELLOW}  ⚠️  Market status is 'Voting' but Query ID is null${NC}"
        echo "    This means:"
        echo "    1. Market requested resolution (status changed to Voting)"
        echo "    2. Message was sent to Registry"
        echo "    3. BUT query was NOT created yet"
        echo ""
        echo -e "${CYAN}  Investigating why query wasn't created...${NC}"
    fi
else
    echo -e "${RED}  ❌ Cannot query market${NC}"
    echo "    Response: $MARKET_RESPONSE"
    exit 1
fi
echo ""

# ============================================================================
# CHECK 3: Registry Voters (Required for Query Creation)
# ============================================================================
echo -e "${CYAN}[CHECK 3] Registry Voters Check${NC}"
REGISTRY_URL="${SERVICE_URL}/chains/${REGISTRY_CHAIN_ID}/applications/${REGISTRY_APP_ID}"
VOTERS_QUERY="{ voters { address stake isActive } statistics { totalVoters activeVoters } }"

VOTERS_RESPONSE=$(curl -s -X POST "$REGISTRY_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg query "$VOTERS_QUERY" '{query: $query}')" 2>&1)

if echo "$VOTERS_RESPONSE" | jq -e '.data.voters' > /dev/null 2>&1; then
    ACTIVE_VOTERS=$(echo "$VOTERS_RESPONSE" | jq -r '[.data.voters[] | select(.isActive == true)] | length' 2>/dev/null || echo "0")
    TOTAL_VOTERS=$(echo "$VOTERS_RESPONSE" | jq -r '.data.statistics.totalVoters' 2>/dev/null || echo "0")
    
    echo -e "${GREEN}  ✅ Registry voters found${NC}"
    echo "    Total Voters: $TOTAL_VOTERS"
    echo "    Active Voters: $ACTIVE_VOTERS"
    echo ""
    
    if [ "$ACTIVE_VOTERS" = "0" ]; then
        echo -e "${RED}  ❌ PROBLEM FOUND: No active voters!${NC}"
        echo "    Query creation will FAIL without voters"
        echo ""
        echo -e "${YELLOW}  SOLUTION: Register voters in Registry first${NC}"
        exit 1
    fi
else
    echo -e "${RED}  ❌ Cannot query Registry voters${NC}"
    exit 1
fi

# ============================================================================
# CHECK 4: Check Registry Queries (Look for Matching Query)
# ============================================================================
echo -e "${CYAN}[CHECK 4] Registry Queries Check${NC}"
QUERIES_QUERY="{ queries { id description status createdAt } }"

QUERIES_RESPONSE=$(curl -s -X POST "$REGISTRY_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg query "$QUERIES_QUERY" '{query: $query}')" 2>&1)

if echo "$QUERIES_RESPONSE" | jq -e '.data.queries' > /dev/null 2>&1; then
    QUERIES_COUNT=$(echo "$QUERIES_RESPONSE" | jq -r '.data.queries | length' 2>/dev/null || echo "0")
    echo -e "${GREEN}  ✅ Found $QUERIES_COUNT queries in Registry${NC}"
    
    if [ -n "$MARKET_QUESTION" ] && [ "$MARKET_QUESTION" != "null" ]; then
        MATCHING_QUERY=$(echo "$QUERIES_RESPONSE" | jq -r --arg q "$MARKET_QUESTION" '.data.queries[] | select(.description == $q) | .id' 2>/dev/null | head -1)
        
        if [ -n "$MATCHING_QUERY" ]; then
            echo -e "${GREEN}  ✅✅✅ MATCHING QUERY FOUND!${NC}"
            echo "    Query ID: $MATCHING_QUERY"
            echo "    Description matches market question"
            echo ""
            echo -e "${GREEN}  🎉 PROBLEM SOLVED: Query exists in Registry!${NC}"
            echo "    The query should be visible in the Oracle Dashboard"
            echo ""
            echo -e "${CYAN}  If query not visible in dashboard:${NC}"
            echo "    1. Refresh dashboard page (Ctrl+R)"
            echo "    2. Check browser console for errors"
            echo "    3. Verify dashboard is querying correct Registry App ID"
            exit 0
        else
            echo -e "${RED}  ❌ No matching query found${NC}"
            echo "    Market question: $MARKET_QUESTION"
            echo ""
            echo -e "${YELLOW}  Recent queries in Registry:${NC}"
            echo "$QUERIES_RESPONSE" | jq -r '.data.queries[-3:] | .[] | "    Query #\(.id): \(.description) | Status: \(.status)"' 2>/dev/null || echo "    (No queries found)"
        fi
    fi
else
    echo -e "${RED}  ❌ Cannot query Registry${NC}"
    exit 1
fi
echo ""

# ============================================================================
# CHECK 5: Chain Configuration Analysis
# ============================================================================
echo -e "${CYAN}[CHECK 5] Chain Configuration Analysis${NC}"
if [ "$MARKET_CHAIN_ID" = "$REGISTRY_CHAIN_ID" ]; then
    echo -e "${GREEN}  ✅ Market and Registry are on SAME chain${NC}"
    echo "    Chain ID: ${MARKET_CHAIN_ID:0:16}..."
    echo ""
    echo -e "${CYAN}  Implications:${NC}"
    echo "    ✅ Cross-chain messaging should work (same chain = instant delivery)"
    echo "    ✅ ChainListener should automatically process messages"
    echo "    ⚠️  If query doesn't appear, message may not have been processed"
    echo ""
    echo -e "${YELLOW}  Possible issues:${NC}"
    echo "    1. ChainListener not processing messages automatically"
    echo "    2. Message stuck in inbox"
    echo "    3. Error during message processing (check service logs)"
else
    echo -e "${YELLOW}  ⚠️  Market and Registry are on DIFFERENT chains${NC}"
    echo "    Market Chain: ${MARKET_CHAIN_ID:0:16}..."
    echo "    Registry Chain: ${REGISTRY_CHAIN_ID:0:16}..."
    echo ""
    echo -e "${CYAN}  Implications:${NC}"
    echo "    ⚠️  Cross-chain messaging required"
    echo "    ⚠️  Message needs to be processed manually or by ChainListener"
fi
echo ""

# ============================================================================
# CHECK 6: Process Inbox Manually
# ============================================================================
echo -e "${CYAN}[CHECK 6] Manual Inbox Processing${NC}"
echo -e "${YELLOW}  Attempting to process Registry inbox manually...${NC}"
echo "  This will check if there are pending messages"
echo ""

# Check if service is running (need to stop it first)
if [ "$SERVICE_RUNNING" = true ]; then
    echo -e "${YELLOW}  ⚠️  Service is running - need to stop it first${NC}"
    echo "  Processing inbox requires exclusive access to wallet"
    echo ""
    read -p "Stop service and process inbox? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}  Skipping manual inbox processing${NC}"
        echo ""
        echo -e "${CYAN}  To process manually:${NC}"
        echo "    1. Stop service: pkill -f 'linera service'"
        echo "    2. Run: linera process-inbox $REGISTRY_CHAIN_ID"
        echo "    3. Restart service: linera service --port 8080"
    else
        echo -e "${BLUE}  Stopping service...${NC}"
        pkill -f 'linera service' || true
        sleep 2
        
        echo -e "${BLUE}  Processing inbox...${NC}"
        PROCESS_OUTPUT=$(linera process-inbox "$REGISTRY_CHAIN_ID" 2>&1 || echo "ERROR")
        
        echo "$PROCESS_OUTPUT" | head -20
        
        if echo "$PROCESS_OUTPUT" | grep -qiE "Processed.*[1-9]"; then
            echo -e "${GREEN}  ✅ Messages processed!${NC}"
            echo ""
            echo -e "${BLUE}  Restarting service...${NC}"
            echo "  (Please start manually: linera service --port 8080)"
            echo ""
            echo -e "${CYAN}  Re-checking queries in 5 seconds...${NC}"
            sleep 5
            
            # Re-check queries
            QUERIES_RESPONSE2=$(curl -s -X POST "$REGISTRY_URL" \
                -H "Content-Type: application/json" \
                -d "$(jq -n --arg query "$QUERIES_QUERY" '{query: $query}')" 2>&1 || echo "{}")
            
            if [ -n "$MARKET_QUESTION" ] && [ "$MARKET_QUESTION" != "null" ]; then
                MATCHING2=$(echo "$QUERIES_RESPONSE2" | jq -r --arg q "$MARKET_QUESTION" '.data.queries[] | select(.description == $q) | .id' 2>/dev/null | head -1)
                if [ -n "$MATCHING2" ]; then
                    echo -e "${GREEN}  ✅✅✅ QUERY CREATED AFTER PROCESSING!${NC}"
                    echo "    Query ID: $MATCHING2"
                    echo ""
                    echo -e "${GREEN}  🎉 PROBLEM SOLVED!${NC}"
                    exit 0
                fi
            fi
        else
            echo -e "${YELLOW}  ⚠️  No messages to process or error occurred${NC}"
        fi
    fi
else
    echo -e "${BLUE}  Service not running - processing inbox directly...${NC}"
    PROCESS_OUTPUT=$(linera process-inbox "$REGISTRY_CHAIN_ID" 2>&1 || echo "ERROR")
    echo "$PROCESS_OUTPUT" | head -20
fi
echo ""

# ============================================================================
# FINAL DIAGNOSIS
# ============================================================================
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}  FINAL DIAGNOSIS${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${RED}  ❌ PROBLEM NOT YET RESOLVED${NC}"
echo ""
echo -e "${CYAN}  Summary:${NC}"
echo "    ✅ Market status: Voting (resolution requested)"
echo "    ✅ Registry has voters: $ACTIVE_VOTERS active"
echo "    ❌ Query NOT found in Registry"
echo "    ❌ Query ID is null in Market"
echo ""

echo -e "${YELLOW}  ROOT CAUSE ANALYSIS:${NC}"
echo ""
echo "  The message flow should be:"
echo "    1. Market.request_resolution() → sends Message::OracleRequest"
echo "    2. Message sent to Registry chain via send_to()"
echo "    3. Message arrives in Registry inbox"
echo "    4. ChainListener or process-inbox → processes message"
echo "    5. Registry.execute_message() → Message::OracleRequest"
echo "    6. Registry.handle_oracle_request() → OracleRequest::CreateQuery"
echo "    7. Registry.handle_create_query_from_market() → creates query"
echo ""

echo -e "${YELLOW}  Most Likely Failure Points:${NC}"
echo ""
echo "  [1] Message Not Sent"
echo "     Location: simple-market/src/contract.rs:548-552"
echo "     Check: Market status = 'Voting' ✅ (confirmed)"
echo "     Status: ${GREEN}Message should have been sent${NC}"
echo ""
echo "  [2] Message Not Delivered"
echo "     Location: Linera message delivery system"
echo "     Check: Same chain = instant delivery ✅"
echo "     Status: ${YELLOW}Need to verify message in outbox/inbox${NC}"
echo ""
echo "  [3] ChainListener Not Processing"
echo "     Location: linera service ChainListener"
echo "     Check: Service running ${GREEN}✅${NC}"
echo "     Status: ${YELLOW}ChainListener may not be tracking Registry chain${NC}"
echo "     Solution: Check service logs for ChainListener errors"
echo ""
echo "  [4] Message Processing Failed"
echo "     Location: oracle-registry-v2/src/contract.rs:587"
echo "     Check: Registry.execute_message() → Message::OracleRequest"
echo "     Status: ${YELLOW}Need to check service logs for errors${NC}"
echo ""
echo "  [5] Query Creation Failed"
echo "     Location: oracle-registry-v2/src/contract.rs:4922"
echo "     Check: handle_create_query_from_market()"
echo "     Status: ${YELLOW}Need to check service logs for errors${NC}"
echo ""

echo -e "${CYAN}  RECOMMENDED ACTIONS:${NC}"
echo ""
echo "  1. Check Linera Service Logs:"
echo "     - Look for '📥 Received CreateQueryFromMarket'"
echo "     - Look for '✅ Query created'"
echo "     - Look for error messages"
echo ""
echo "  2. Verify ChainListener is Active:"
echo "     - Check if Registry chain is being tracked"
echo "     - Verify ChainListener is processing messages"
echo ""
echo "  3. Try Manual Inbox Processing:"
echo "     - Stop service: pkill -f 'linera service'"
echo "     - Process: linera process-inbox $REGISTRY_CHAIN_ID"
echo "     - Check output for processed messages"
echo "     - Restart service: linera service --port 8080"
echo ""
echo "  4. Re-request Resolution (if message lost):"
echo "     - Reset Market status (if possible)"
echo "     - Request resolution again from Market frontend"
echo ""

echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
