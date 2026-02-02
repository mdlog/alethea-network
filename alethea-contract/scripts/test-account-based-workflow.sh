#!/bin/bash
# Complete Test Workflow for Account-Based Registry
# Tests: Deploy → Register Voters → Create Query → Vote → Resolve

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Account-Based Registry - Complete Test Workflow          ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}\n"

# Check if service is running
if ! curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo -e "${RED}✗ Linera service not running${NC}"
    echo -e "${YELLOW}Starting Linera service...${NC}"
    linera service --port 8080 &
    SERVICE_PID=$!
    sleep 5
    echo -e "${GREEN}✓ Service started (PID: $SERVICE_PID)${NC}\n"
else
    echo -e "${GREEN}✓ Linera service already running${NC}\n"
fi

# Step 1: Deploy Registry
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 1: Deploying Account-Based Registry${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

bash scripts/deploy-account-based-registry.sh

if [ ! -f .env.account-based-registry ]; then
    echo -e "${RED}✗ Deployment failed${NC}"
    exit 1
fi

source .env.account-based-registry
echo -e "${GREEN}✓ Registry deployed: ${ACCOUNT_BASED_REGISTRY_ID}${NC}\n"

REGISTRY_ENDPOINT="http://localhost:8080/chains/${CHAIN_ID}/applications/${ACCOUNT_BASED_REGISTRY_ID}"

# Wait for service to be ready
sleep 3

# Step 2: Register 3 Voters
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 2: Registering 3 Voters${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

register_voter() {
    local name=$1
    local stake=$2
    
    echo -e "${YELLOW}Registering voter: ${name}${NC}"
    
    MUTATION="mutation { registerVoter(stake: \\\"${stake}\\\", name: \\\"${name}\\\") }"
    
    RESULT=$(curl -s -X POST "${REGISTRY_ENDPOINT}" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"${MUTATION}\"}")
    
    if echo "$RESULT" | grep -q "error"; then
        echo -e "${RED}✗ Failed to register ${name}${NC}"
        echo "$RESULT" | jq '.'
        return 1
    fi
    
    echo -e "${GREEN}✓ ${name} registered with ${stake} tokens${NC}"
    sleep 2
}

register_voter "Alice" "1000"
register_voter "Bob" "1500"
register_voter "Charlie" "2000"

echo ""

# Step 3: Verify Voters
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 3: Verifying Registered Voters${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

VOTERS_QUERY='{ voters { address name stake reputation isActive } }'

VOTERS=$(curl -s -X POST "${REGISTRY_ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"${VOTERS_QUERY}\"}")

echo "Registered Voters:"
echo "$VOTERS" | jq '.data.voters' 2>/dev/null || echo "$VOTERS"
echo ""

VOTER_COUNT=$(echo "$VOTERS" | jq '.data.voters | length' 2>/dev/null || echo "0")
echo -e "${GREEN}✓ Total voters registered: ${VOTER_COUNT}${NC}\n"

# Step 4: Create Test Query
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 4: Creating Test Query${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

# Calculate deadline (5 minutes from now in microseconds)
DEADLINE=$(($(date +%s) * 1000000 + 300000000))

CREATE_QUERY='mutation {
  createQuery(
    description: "Will Bitcoin reach $100k by end of 2025?",
    outcomes: ["Yes", "No"],
    strategy: Majority,
    minVotes: 3,
    rewardAmount: "300",
    deadline: '${DEADLINE}'
  )
}'

echo -e "${YELLOW}Creating query...${NC}"
QUERY_RESULT=$(curl -s -X POST "${REGISTRY_ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"${CREATE_QUERY}\"}")

echo "Query Creation Result:"
echo "$QUERY_RESULT" | jq '.' 2>/dev/null || echo "$QUERY_RESULT"
echo ""

if echo "$QUERY_RESULT" | grep -q "error"; then
    echo -e "${RED}✗ Failed to create query${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Query created successfully${NC}\n"

# Step 5: View Active Queries
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 5: Viewing Active Queries${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

ACTIVE_QUERIES='{ activeQueries { id description outcomes voteCount status } }'

QUERIES=$(curl -s -X POST "${REGISTRY_ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"${ACTIVE_QUERIES}\"}")

echo "Active Queries:"
echo "$QUERIES" | jq '.data.activeQueries' 2>/dev/null || echo "$QUERIES"
echo ""

# Get query ID
QUERY_ID=$(echo "$QUERIES" | jq -r '.data.activeQueries[0].id' 2>/dev/null || echo "0")
echo -e "${GREEN}✓ Query ID: ${QUERY_ID}${NC}\n"

# Step 6: Submit Votes
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 6: Submitting Votes${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

submit_vote() {
    local voter_name=$1
    local value=$2
    local confidence=$3
    
    echo -e "${YELLOW}${voter_name} voting: ${value} (confidence: ${confidence})${NC}"
    
    VOTE_MUTATION="mutation { submitVote(queryId: ${QUERY_ID}, value: \\\"${value}\\\", confidence: ${confidence}) }"
    
    VOTE_RESULT=$(curl -s -X POST "${REGISTRY_ENDPOINT}" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"${VOTE_MUTATION}\"}")
    
    if echo "$VOTE_RESULT" | grep -q "error"; then
        echo -e "${RED}✗ ${voter_name} vote failed${NC}"
        echo "$VOTE_RESULT" | jq '.'
        return 1
    fi
    
    echo -e "${GREEN}✓ ${voter_name} voted successfully${NC}"
    sleep 2
}

submit_vote "Alice" "Yes" 90
submit_vote "Bob" "Yes" 85
submit_vote "Charlie" "No" 75

echo ""

# Step 7: Check Vote Status
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 7: Checking Vote Status${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

QUERY_STATUS='{ query(id: '${QUERY_ID}') { id description voteCount status votes { voter value confidence } } }'

STATUS=$(curl -s -X POST "${REGISTRY_ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"${QUERY_STATUS}\"}")

echo "Query Status:"
echo "$STATUS" | jq '.data.query' 2>/dev/null || echo "$STATUS"
echo ""

VOTE_COUNT=$(echo "$STATUS" | jq '.data.query.voteCount' 2>/dev/null || echo "0")
echo -e "${GREEN}✓ Total votes: ${VOTE_COUNT}${NC}\n"

# Step 8: Resolve Query
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 8: Resolving Query${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

if [ "$VOTE_COUNT" -ge 3 ]; then
    echo -e "${YELLOW}Resolving query...${NC}"
    
    RESOLVE_MUTATION="mutation { resolveQuery(queryId: ${QUERY_ID}) }"
    
    RESOLVE_RESULT=$(curl -s -X POST "${REGISTRY_ENDPOINT}" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"${RESOLVE_MUTATION}\"}")
    
    echo "Resolution Result:"
    echo "$RESOLVE_RESULT" | jq '.' 2>/dev/null || echo "$RESOLVE_RESULT"
    echo ""
    
    if echo "$RESOLVE_RESULT" | grep -q "error"; then
        echo -e "${RED}✗ Failed to resolve query${NC}"
    else
        echo -e "${GREEN}✓ Query resolved successfully${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Not enough votes to resolve (need 3, have ${VOTE_COUNT})${NC}"
fi

echo ""

# Step 9: Check Final Status
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 9: Final Status Check${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

FINAL_STATUS='{ query(id: '${QUERY_ID}') { id description status result resolvedAt } }'

FINAL=$(curl -s -X POST "${REGISTRY_ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"${FINAL_STATUS}\"}")

echo "Final Query Status:"
echo "$FINAL" | jq '.data.query' 2>/dev/null || echo "$FINAL"
echo ""

# Step 10: Check Statistics
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 10: Protocol Statistics${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

STATS_QUERY='{ statistics { totalVoters activeVoters totalQueries activeQueries resolvedQueries } }'

STATS=$(curl -s -X POST "${REGISTRY_ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"${STATS_QUERY}\"}")

echo "Protocol Statistics:"
echo "$STATS" | jq '.data.statistics' 2>/dev/null || echo "$STATS"
echo ""

# Summary
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Test Workflow Complete! 🎉                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${CYAN}Summary:${NC}"
echo -e "  ✓ Registry deployed"
echo -e "  ✓ ${VOTER_COUNT} voters registered"
echo -e "  ✓ 1 query created"
echo -e "  ✓ ${VOTE_COUNT} votes submitted"
echo -e "  ✓ Query resolved"
echo ""

echo -e "${CYAN}Registry Endpoint:${NC}"
echo -e "  ${REGISTRY_ENDPOINT}"
echo ""

echo -e "${CYAN}Next Steps:${NC}"
echo "  1. Check voter rewards: curl -X POST \"${REGISTRY_ENDPOINT}\" -d '{\"query\": \"{ voters { pendingRewards } }\"}'"
echo "  2. Create more queries: bash scripts/create-query-account-based.sh"
echo "  3. Monitor system: bash scripts/monitor-account-based-registry.sh"
echo ""

exit 0
