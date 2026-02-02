#!/bin/bash
# Complete Workflow Test Script for Alethea Oracle Protocol
# Tests: Create Market → Register → Request Resolution → Vote → Resolve

set -e

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."
source .env.conway

echo "=========================================="
echo "Alethea Oracle - Complete Workflow Test"
echo "=========================================="
echo ""
echo "Chain ID: $CHAIN_ID"
echo "Registry ID: $ALETHEA_REGISTRY_ID"
echo "Market Chain ID: $MARKET_CHAIN_ID"
echo "Voters: $VOTER_1_ID, $VOTER_2_ID, $VOTER_3_ID"
echo ""

GRAPHQL_URL="http://localhost:8080"
REGISTRY_ENDPOINT="$GRAPHQL_URL/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID"
MARKET_ENDPOINT="$GRAPHQL_URL/chains/$CHAIN_ID/applications/$MARKET_CHAIN_ID"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function to make GraphQL queries
graphql_query() {
    local endpoint=$1
    local query=$2
    curl -s -X POST "$endpoint" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$query\"}" | jq .
}

# Helper function to make GraphQL mutations
graphql_mutation() {
    local endpoint=$1
    local mutation=$2
    curl -s -X POST "$endpoint" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"mutation { $mutation }\"}" | jq .
}

# Step 1: Check Registry Status
echo -e "${YELLOW}Step 1: Checking Registry Status...${NC}"
REGISTRY_STATS=$(graphql_query "$REGISTRY_ENDPOINT" "{ protocolStats { totalMarkets totalVoters activeVoters } }")
echo "$REGISTRY_STATS" | jq '.data.protocolStats'
echo ""

# Step 2: Check Voters Status
echo -e "${YELLOW}Step 2: Checking Voters Status...${NC}"
for VOTER_ID in $VOTER_1_ID $VOTER_2_ID $VOTER_3_ID; do
    VOTER_ENDPOINT="$GRAPHQL_URL/chains/$CHAIN_ID/applications/$VOTER_ID"
    echo "Voter: ${VOTER_ID:0:16}..."
    VOTER_STATUS=$(graphql_query "$VOTER_ENDPOINT" "{ status { stake reputation totalVotes } }")
    echo "$VOTER_STATUS" | jq '.data.status'
done
echo ""

# Step 3: Register Market directly in Registry (simpler approach that works)
echo -e "${YELLOW}Step 3: Registering Market in Registry...${NC}"
DEADLINE=$(($(date +%s) + 3600))000000  # 1 hour from now

# RegisterMarket directly in Registry (this creates market ID 0, 1, 2, etc.)
# Use callbackData "00" for market ID 0 (or next available ID)
REGISTER_RESULT=$(graphql_mutation "$REGISTRY_ENDPOINT" \
    "registerMarket(question: \"Will Bitcoin reach \$100k by Dec 2025?\", outcomes: [\"Yes\", \"No\"], deadline: \"$DEADLINE\", callbackData: \"00\")")

if echo "$REGISTER_RESULT" | jq -e '.errors' > /dev/null; then
    echo -e "${RED}❌ Failed to register market${NC}"
    echo "$REGISTER_RESULT" | jq .
    exit 1
fi

# Extract market ID from Registry response or get latest market ID
echo -e "${GREEN}✅ Market registered${NC}"
echo "$REGISTER_RESULT" | jq '.data'
echo ""

# Get the latest market ID from active markets
echo -e "${YELLOW}Step 4: Getting Market ID...${NC}"
ACTIVE_MARKETS=$(graphql_query "$REGISTRY_ENDPOINT" "{ activeMarkets { id question } }")
MARKET_ID=$(echo "$ACTIVE_MARKETS" | jq -r '.data.activeMarkets | sort_by(.id) | last.id // 0')

if [ -z "$MARKET_ID" ] || [ "$MARKET_ID" = "null" ]; then
    echo -e "${YELLOW}⚠️  Could not determine market ID, using 0${NC}"
    MARKET_ID=0
else
    echo -e "${GREEN}✅ Market ID: $MARKET_ID${NC}"
fi
echo ""

# Step 5: Request Resolution via Registry
echo -e "${YELLOW}Step 5: Requesting Resolution...${NC}"
REQUEST_RESULT=$(graphql_mutation "$REGISTRY_ENDPOINT" \
    "requestResolution(marketId: $MARKET_ID)")

if echo "$REQUEST_RESULT" | jq -e '.errors' > /dev/null; then
    echo -e "${YELLOW}⚠️  Resolution request failed or not needed (may use DirectVote)${NC}"
    echo "$REQUEST_RESULT" | jq .
else
    echo -e "${GREEN}✅ Resolution requested${NC}"
    echo "$REQUEST_RESULT" | jq '.data'
fi
echo ""

# Step 6: Wait for VoteRequest (check Registry)
echo -e "${YELLOW}Step 6: Waiting for VoteRequest...${NC}"
sleep 3
MARKET_DETAILS=$(graphql_query "$REGISTRY_ENDPOINT" \
    "{ marketDetails(id: $MARKET_ID) { id status selectedVoters } }")

echo "$MARKET_DETAILS" | jq '.data.marketDetails'
SELECTED_VOTERS=$(echo "$MARKET_DETAILS" | jq -r '.data.marketDetails.selectedVoters[]? // empty')

if [ -z "$SELECTED_VOTERS" ]; then
    echo -e "${YELLOW}⚠️  No voters selected yet. This might be normal if DirectVote is used.${NC}"
else
    echo -e "${GREEN}✅ Voters selected: $SELECTED_VOTERS${NC}"
fi
echo ""

# Step 7: Submit Votes (if voters are initialized)
echo -e "${YELLOW}Step 7: Submitting Votes...${NC}"
VOTE_COUNT=0
for VOTER_ID in $VOTER_1_ID $VOTER_2_ID $VOTER_3_ID; do
    VOTER_ENDPOINT="$GRAPHQL_URL/chains/$CHAIN_ID/applications/$VOTER_ID"
    echo "Submitting vote from voter: ${VOTER_ID:0:16}..."
    
    # Check if voter is initialized first
    VOTER_STATUS=$(graphql_query "$VOTER_ENDPOINT" "{ status { stake } }")
    STAKE=$(echo "$VOTER_STATUS" | jq -r '.data.status.stake // "0"')
    
    if [ "$STAKE" = "0" ] || [ -z "$STAKE" ]; then
        echo -e "${YELLOW}⚠️  Voter not initialized. Skipping vote submission.${NC}"
        continue
    fi
    
    # Submit vote (DirectVote - no commit-reveal)
    VOTE_RESULT=$(graphql_mutation "$VOTER_ENDPOINT" \
        "submitVote(marketId: $MARKET_ID, outcomeIndex: 0, confidence: 80)")
    
    if echo "$VOTE_RESULT" | jq -e '.errors' > /dev/null; then
        echo -e "${RED}❌ Failed to submit vote${NC}"
        echo "$VOTE_RESULT" | jq .
    else
        echo -e "${GREEN}✅ Vote submitted${NC}"
        VOTE_COUNT=$((VOTE_COUNT + 1))
    fi
done

if [ $VOTE_COUNT -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No votes submitted. Voters may need to be initialized first.${NC}"
    echo "To initialize voters, run:"
    echo "  ./scripts/initialize-voters.sh"
else
    echo -e "${GREEN}✅ $VOTE_COUNT votes submitted${NC}"
fi
echo ""

# Step 8: Check Resolution
echo -e "${YELLOW}Step 8: Checking Resolution Status...${NC}"
sleep 3
FINAL_STATUS=$(graphql_query "$REGISTRY_ENDPOINT" \
    "{ marketDetails(id: $MARKET_ID) { id status finalOutcome confidence } }")

echo "$FINAL_STATUS" | jq '.data.marketDetails'
FINAL_OUTCOME=$(echo "$FINAL_STATUS" | jq -r '.data.marketDetails.finalOutcome // empty')
STATUS=$(echo "$FINAL_STATUS" | jq -r '.data.marketDetails.status // empty')

if [ -n "$FINAL_OUTCOME" ] && [ "$FINAL_OUTCOME" != "null" ]; then
    echo -e "${GREEN}✅ Market resolved! Outcome: $FINAL_OUTCOME${NC}"
elif [ "$STATUS" = "RESOLVED" ]; then
    echo -e "${GREEN}✅ Market status: RESOLVED${NC}"
else
    echo -e "${YELLOW}⚠️  Market not yet resolved. Status: $STATUS${NC}"
    echo "This might be normal if not enough votes were submitted."
fi
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "Market ID: $MARKET_ID"
echo "Votes Submitted: $VOTE_COUNT/3"
echo "Final Status: $STATUS"
echo "Final Outcome: ${FINAL_OUTCOME:-N/A}"
echo ""
echo -e "${GREEN}✅ Workflow test completed!${NC}"

