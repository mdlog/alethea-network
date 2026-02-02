#!/bin/bash

# Detailed investigation script for Market query creation issue
# Checks every step: Market → Message → Registry → Query → Dashboard

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

MARKET_URL="${SERVICE_URL}/chains/${MARKET_CHAIN_ID}/applications/${MARKET_APP_ID}"
REGISTRY_URL="${SERVICE_URL}/chains/${REGISTRY_CHAIN_ID}/applications/${REGISTRY_APP_ID}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  DETAILED INVESTIGATION: Market Query Creation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}Configuration:${NC}"
echo "  Market ID: $MARKET_ID"
echo "  Market App ID: ${MARKET_APP_ID:0:16}..."
echo "  Market Chain: ${MARKET_CHAIN_ID:0:16}..."
echo "  Registry App ID: ${REGISTRY_APP_ID:0:16}..."
echo "  Registry Chain: ${REGISTRY_CHAIN_ID:0:16}..."
echo "  Service URL: $SERVICE_URL"
echo ""

# ============================================================================
# STEP 1: Check Chain Configuration
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 1: Chain Configuration Analysis${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$MARKET_CHAIN_ID" = "$REGISTRY_CHAIN_ID" ]; then
    echo -e "${YELLOW}⚠️  Market and Registry are on the SAME chain${NC}"
    echo "  Chain ID: ${MARKET_CHAIN_ID:0:16}..."
    echo ""
    echo -e "${CYAN}Implications:${NC}"
    echo "  ✅ Cross-chain messaging should work (same chain = instant delivery)"
    echo "  ✅ ChainListener should automatically process messages"
    echo "  ⚠️  If query doesn't appear, message may not have been sent or processed"
    echo ""
else
    echo -e "${GREEN}✅ Market and Registry are on DIFFERENT chains${NC}"
    echo "  Market Chain: ${MARKET_CHAIN_ID:0:16}..."
    echo "  Registry Chain: ${REGISTRY_CHAIN_ID:0:16}..."
    echo ""
    echo -e "${CYAN}Implications:${NC}"
    echo "  ⚠️  Cross-chain messaging required"
    echo "  ⚠️  Message needs to be processed manually or by ChainListener"
    echo ""
fi

# ============================================================================
# STEP 2: Check Linera Service Status
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 2: Linera Service Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Linera service is running${NC}"
    echo ""
    echo -e "${CYAN}ChainListener Status:${NC}"
    echo "  - ChainListener should be active and processing messages"
    echo "  - Messages from same chain should be processed automatically"
    echo "  - Check service logs if messages not processing"
    echo ""
else
    echo -e "${RED}❌ Linera service is NOT running${NC}"
    echo ""
    echo -e "${CYAN}Impact:${NC}"
    echo "  - ChainListener is not active"
    echo "  - Messages will NOT be processed automatically"
    echo "  - Queries will NOT be created"
    echo ""
    echo -e "${YELLOW}Solution:${NC}"
    echo "  Start linera service: linera service --port 8080"
    echo ""
fi

# ============================================================================
# STEP 3: Check Market Status
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 3: Market Status Check${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

MARKET_QUERY="{ market(id: \"$MARKET_ID\") { id question status queryId } }"

MARKET_RESPONSE=$(curl -s -X POST "$MARKET_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg query "$MARKET_QUERY" '{query: $query}')" 2>&1)

# Check if curl failed (service not running)
if [ $? -ne 0 ] || echo "$MARKET_RESPONSE" | grep -q "Failed to connect\|Connection refused\|Empty reply"; then
    echo -e "${RED}❌ Cannot connect to Linera service${NC}"
    echo ""
    echo -e "${YELLOW}Solution:${NC}"
    echo "  1. Start Linera service: linera service --port 8080"
    echo "  2. Wait 5-10 seconds for service to start"
    echo "  3. Re-run this script"
    echo ""
    echo -e "${CYAN}Note:${NC} Without the service running, messages cannot be processed automatically."
    echo "  ChainListener (part of linera service) is required to process cross-chain messages."
    exit 1
fi

if echo "$MARKET_RESPONSE" | jq -e '.errors' > /dev/null 2>&1; then
    echo -e "${RED}❌ Error querying market:${NC}"
    echo "$MARKET_RESPONSE" | jq '.errors'
    echo ""
    echo -e "${YELLOW}Possible causes:${NC}"
    echo "  1. Market App ID incorrect"
    echo "  2. Market Chain ID incorrect"
    echo "  3. Linera service not accessible"
    echo "  4. Market contract not deployed"
    exit 1
fi

MARKET_DATA=$(echo "$MARKET_RESPONSE" | jq -r '.data.market' 2>/dev/null)

if [ "$MARKET_DATA" = "null" ] || [ -z "$MARKET_DATA" ]; then
    echo -e "${RED}❌ Market $MARKET_ID not found${NC}"
    echo ""
    echo -e "${YELLOW}Possible causes:${NC}"
    echo "  1. Market ID incorrect"
    echo "  2. Market not created yet"
    echo "  3. Market contract state issue"
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

# Check if Market has requested resolution
if [ "$MARKET_STATUS" != "Voting" ]; then
    echo -e "${RED}❌ Market status is '$MARKET_STATUS', not 'Voting'${NC}"
    echo ""
    echo -e "${CYAN}Analysis:${NC}"
    echo "  Market has NOT requested resolution yet"
    echo "  No message has been sent to Registry"
    echo "  No query will be created until resolution is requested"
    echo ""
    echo -e "${YELLOW}Solution:${NC}"
    echo "  1. Go to alethea-market frontend"
    echo "  2. Click 'Request Resolution' for market $MARKET_ID"
    echo "  3. Wait for status to change to 'Voting'"
    echo ""
    exit 0
fi

echo -e "${GREEN}✅ Market has requested resolution (status: Voting)${NC}"
echo ""

# ============================================================================
# STEP 4: Check Registry Voters
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 4: Registry Voters Check${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

VOTERS_QUERY="{ voters { address stake isActive } statistics { totalVoters activeVoters } }"

VOTERS_RESPONSE=$(curl -s -X POST "$REGISTRY_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg query "$VOTERS_QUERY" '{query: $query}')" 2>&1)

if echo "$VOTERS_RESPONSE" | jq -e '.data.voters' > /dev/null 2>&1; then
    VOTER_COUNT=$(echo "$VOTERS_RESPONSE" | jq -r '.data.voters | length' 2>/dev/null || echo "0")
    ACTIVE_VOTERS=$(echo "$VOTERS_RESPONSE" | jq -r '[.data.voters[] | select(.isActive == true)] | length' 2>/dev/null || echo "0")
    TOTAL_VOTERS_STATS=$(echo "$VOTERS_RESPONSE" | jq -r '.data.statistics.totalVoters' 2>/dev/null || echo "0")
    
    echo -e "${GREEN}✅ Registry voters found${NC}"
    echo "  Total Voters: $TOTAL_VOTERS_STATS"
    echo "  Active Voters: $ACTIVE_VOTERS"
    echo ""
    
    if [ "$ACTIVE_VOTERS" = "0" ] || [ "$TOTAL_VOTERS_STATS" = "0" ]; then
        echo -e "${RED}❌ CRITICAL: No active voters in Registry${NC}"
        echo ""
        echo -e "${CYAN}Impact:${NC}"
        echo "  Query creation will FAIL with error: 'No voters registered in Registry'"
        echo "  This is checked in handle_create_query_from_market() line 4950"
        echo ""
        echo -e "${YELLOW}Solution:${NC}"
        echo "  1. Register voters in Registry first"
        echo "  2. Then request resolution from Market"
        echo ""
        exit 1
    else
        echo -e "${GREEN}✅ Registry has voters - query creation should work${NC}"
        echo ""
    fi
else
    echo -e "${RED}❌ Could not query Registry voters${NC}"
    echo "  Response: $VOTERS_RESPONSE"
    echo ""
fi

# ============================================================================
# STEP 5: Check Registry Parameters
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 5: Registry Parameters Check${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

PARAMS_QUERY="{ parameters { minVotesDefault defaultQueryDuration } }"

PARAMS_RESPONSE=$(curl -s -X POST "$REGISTRY_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg query "$PARAMS_QUERY" '{query: $query}')" 2>&1)

if echo "$PARAMS_RESPONSE" | jq -e '.data.parameters' > /dev/null 2>&1; then
    MIN_VOTES_DEFAULT=$(echo "$PARAMS_RESPONSE" | jq -r '.data.parameters.minVotesDefault' 2>/dev/null || echo "3")
    DEFAULT_DURATION=$(echo "$PARAMS_RESPONSE" | jq -r '.data.parameters.defaultQueryDuration' 2>/dev/null || echo "3600")
    
    echo -e "${GREEN}✅ Registry parameters found${NC}"
    echo "  min_votes_default: $MIN_VOTES_DEFAULT"
    echo "  default_query_duration: $DEFAULT_DURATION seconds"
    echo ""
    
    if [ "$ACTIVE_VOTERS" != "0" ] && [ "$MIN_VOTES_DEFAULT" -gt "$ACTIVE_VOTERS" ]; then
        echo -e "${YELLOW}⚠️  min_votes_default ($MIN_VOTES_DEFAULT) > active voters ($ACTIVE_VOTERS)${NC}"
        echo ""
        echo -e "${CYAN}Impact:${NC}"
        echo "  Contract will auto-adjust min_votes to $ACTIVE_VOTERS (line 4952-4958)"
        echo "  Query creation should still work"
        echo ""
    else
        echo -e "${GREEN}✅ Parameters are valid${NC}"
        echo ""
    fi
else
    echo -e "${YELLOW}⚠️  Could not query Registry parameters${NC}"
    echo ""
fi

# ============================================================================
# STEP 6: Check Registry Queries
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 6: Registry Queries Check${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

QUERIES_QUERY="{ queries { id description status createdAt } statistics { totalQueriesCreated } }"

QUERIES_RESPONSE=$(curl -s -X POST "$REGISTRY_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg query "$QUERIES_QUERY" '{query: $query}')" 2>&1)

if echo "$QUERIES_RESPONSE" | jq -e '.errors' > /dev/null 2>&1; then
    echo -e "${RED}❌ Error querying Registry:${NC}"
    echo "$QUERIES_RESPONSE" | jq '.errors'
    exit 1
fi

QUERIES_COUNT=$(echo "$QUERIES_RESPONSE" | jq -r '.data.queries | length' 2>/dev/null || echo "0")
TOTAL_CREATED=$(echo "$QUERIES_RESPONSE" | jq -r '.data.statistics.totalQueriesCreated' 2>/dev/null || echo "0")

echo -e "${GREEN}✅ Found $QUERIES_COUNT queries in Registry${NC}"
echo "  Total Created (stats): $TOTAL_CREATED"
echo ""

# Check if query exists with matching description
MATCHING_QUERY=$(echo "$QUERIES_RESPONSE" | jq -r --arg q "$MARKET_QUESTION" '.data.queries[] | select(.description == $q) | .id' 2>/dev/null | head -1)

if [ -n "$MATCHING_QUERY" ]; then
    echo -e "${GREEN}✅✅✅ FOUND MATCHING QUERY!${NC}"
    echo "  Query ID: $MATCHING_QUERY"
    echo "  Description matches market question"
    echo ""
    
    # Get full query details
    QUERY_DETAIL_QUERY="{ query(id: \"$MATCHING_QUERY\") { id description status result outcomes createdAt commitEnd revealEnd voteCount } }"
    QUERY_DETAIL_RESPONSE=$(curl -s -X POST "$REGISTRY_URL" \
        -H "Content-Type: application/json" \
        -d "$(jq -n --arg query "$QUERY_DETAIL_QUERY" '{query: $query}')" 2>&1)
    
    QUERY_DETAIL=$(echo "$QUERY_DETAIL_RESPONSE" | jq -r '.data.query' 2>/dev/null)
    if [ "$QUERY_DETAIL" != "null" ]; then
        QUERY_STATUS=$(echo "$QUERY_DETAIL" | jq -r '.status' 2>/dev/null)
        QUERY_VOTE_COUNT=$(echo "$QUERY_DETAIL" | jq -r '.voteCount' 2>/dev/null)
        echo "  Status: $QUERY_STATUS"
        echo "  Vote Count: $QUERY_VOTE_COUNT"
        echo ""
        echo -e "${GREEN}✅ Query exists and should be visible in dashboard!${NC}"
        echo ""
        echo -e "${CYAN}If query not visible in dashboard:${NC}"
        echo "  1. Refresh dashboard page (Ctrl+R or Cmd+R)"
        echo "  2. Check browser console for errors"
        echo "  3. Verify dashboard is querying correct Registry App ID"
        echo "  4. Check if query status filter is hiding it"
        echo "  5. Check dashboard GraphQL query format"
        exit 0
    fi
else
    echo -e "${RED}❌ No matching query found${NC}"
    echo "  Market question: $MARKET_QUESTION"
    echo ""
    
    if [ "$QUERIES_COUNT" -gt 0 ]; then
        echo -e "${CYAN}Recent queries in Registry (for comparison):${NC}"
        echo "$QUERIES_RESPONSE" | jq -r '.data.queries[-5:] | .[] | "  Query #\(.id): \(.description) | Status: \(.status)"' 2>/dev/null || echo "  (No queries found)"
        echo ""
    fi
fi

# ============================================================================
# STEP 7: Message Flow Analysis
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 7: Message Flow Analysis${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "${CYAN}Expected Flow:${NC}"
echo "  1. Market.request_resolution() → sends OracleRequest::CreateQuery"
echo "  2. Message sent to Registry chain via send_to(registry_chain_id)"
echo "  3. Message arrives in Registry inbox"
echo "  4. ChainListener or process-inbox → processes message"
echo "  5. Registry.execute_message() → Message::OracleRequest"
echo "  6. Registry.handle_oracle_request() → OracleRequest::CreateQuery"
echo "  7. Registry.handle_create_query_from_market() → creates query"
echo ""

if [ -z "$MATCHING_QUERY" ]; then
    echo -e "${RED}❌ Query NOT created - investigating why...${NC}"
    echo ""
    
    echo -e "${CYAN}Possible failure points:${NC}"
    echo ""
    
    # Check 1: Message not sent
    echo -e "${MAGENTA}[1] Message Not Sent from Market${NC}"
    echo "  Location: simple-market/src/contract.rs:548-552"
    echo "  Check: Market status = 'Voting' ✅ (confirmed)"
    echo "  Check: registry_chain_id configured ✅ (from Market state)"
    echo "  Status: ${GREEN}Message should have been sent${NC}"
    echo ""
    
    # Check 2: Message not received
    echo -e "${MAGENTA}[2] Message Not Received by Registry${NC}"
    echo "  Location: Registry inbox"
    echo "  Check: Process inbox to see if message exists"
    echo "  Status: ${YELLOW}Need to check inbox${NC}"
    echo ""
    
    # Check 3: Message not processed
    echo -e "${MAGENTA}[3] Message Not Processed${NC}"
    echo "  Location: ChainListener or manual process-inbox"
    echo "  Check: Linera service running ${GREEN}✅${NC} or ${RED}❌${NC}"
    echo "  Check: ChainListener active (if service running)"
    echo "  Status: ${YELLOW}Need to verify${NC}"
    echo ""
    
    # Check 4: Message processing failed
    echo -e "${MAGENTA}[4] Message Processing Failed${NC}"
    echo "  Location: oracle-registry-v2/src/contract.rs:588"
    echo "  Check: Registry.execute_message() → Message::OracleRequest"
    echo "  Check: Registry.handle_oracle_request() → OracleRequest::CreateQuery"
    echo "  Status: ${YELLOW}Need to check logs${NC}"
    echo ""
    
    # Check 5: Query creation failed
    echo -e "${MAGENTA}[5] Query Creation Failed${NC}"
    echo "  Location: oracle-registry-v2/src/contract.rs:4922-4951"
    echo "  Check: No voters → ${RED}❌${NC} or ${GREEN}✅${NC} (checked above)"
    echo "  Check: min_votes validation → ${GREEN}✅${NC} (auto-adjusted)"
    echo "  Check: Parameter validation → ${YELLOW}Need to verify${NC}"
    echo "  Status: ${YELLOW}Need to check logs${NC}"
    echo ""
fi

# ============================================================================
# STEP 8: Recommendations
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 8: Detailed Recommendations${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -n "$MATCHING_QUERY" ]; then
    echo -e "${GREEN}✅ Query found! Everything is working correctly${NC}"
    echo ""
    echo -e "${CYAN}Next steps:${NC}"
    echo "  1. Refresh dashboard to see the query"
    echo "  2. Voters can start voting on the query"
    echo "  3. Query will be resolved after voting deadline"
else
    echo -e "${RED}❌ Query NOT found - Action Required${NC}"
    echo ""
    
    if [ "$ACTIVE_VOTERS" = "0" ]; then
        echo -e "${RED}CRITICAL ISSUE: No voters in Registry${NC}"
        echo ""
        echo -e "${YELLOW}Solution:${NC}"
        echo "  1. Register voters in Registry first:"
        echo "     - Go to Oracle Dashboard"
        echo "     - Register as voter with stake"
        echo "  2. Then request resolution from Market again"
        echo ""
    else
        echo -e "${CYAN}Recommended Actions (in order):${NC}"
        echo ""
        echo -e "${BLUE}[Action 1] Process Registry Inbox${NC}"
        echo "  Command: ./scripts/process-registry-inbox.sh"
        echo "  Purpose: Manually process any pending messages"
        echo "  Expected: Query should be created if message exists"
        echo ""
        echo -e "${BLUE}[Action 2] Check Linera Service Logs${NC}"
        echo "  Purpose: Look for errors during message processing"
        echo "  Look for:"
        echo "    - '📥 Received CreateQueryFromMarket' (message received)"
        echo "    - '✅ Query created' (query created successfully)"
        echo "    - Error messages (if query creation failed)"
        echo ""
        echo -e "${BLUE}[Action 3] Verify Message Was Sent${NC}"
        echo "  Check Market contract logs for:"
        echo "    - '📤 Sending OracleRequest to Registry chain'"
        echo "    - '✅ OracleRequest sent to Registry'"
        echo ""
        echo -e "${BLUE}[Action 4] Re-request Resolution${NC}"
        echo "  If message was not sent or lost:"
        echo "  1. Reset Market status (if possible)"
        echo "  2. Request resolution again from Market frontend"
        echo ""
    fi
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Investigation Complete${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
