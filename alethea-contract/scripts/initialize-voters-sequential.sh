#!/bin/bash
# Initialize Voters Sequentially with Delay
# To avoid "out of order" message errors

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Load environment from .env.fresh
if [ -f .env.fresh ]; then
    set -a
    source <(grep '^export' .env.fresh 2>/dev/null || true)
    set +a
else
    echo "Error: .env.fresh not found"
    exit 1
fi

echo "=========================================="
echo "Initialize Voters Sequentially"
echo "=========================================="
echo ""
echo "Registry ID: $ALETHEA_REGISTRY_ID"
echo "Voters: $VOTER_1_ID, $VOTER_2_ID, $VOTER_3_ID"
echo ""

GRAPHQL_URL="http://localhost:8080"
INITIAL_STAKE="1000"
DELAY_BETWEEN_VOTERS=5  # 5 seconds delay between each voter

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Initialize a single voter
initialize_voter() {
    local voter_id=$1
    local voter_num=$2
    local voter_endpoint="$GRAPHQL_URL/chains/$CHAIN_ID/applications/$voter_id"
    
    echo -e "${YELLOW}Initializing Voter $voter_num...${NC}"
    echo "Voter ID: ${voter_id:0:16}..."
    
    # Initialize voter
    INIT_RESULT=$(curl -s -X POST "$voter_endpoint" \
        -H "Content-Type: application/json" \
        -d "{
            \"query\": \"mutation { initialize(registryId: \\\"$ALETHEA_REGISTRY_ID\\\", initialStake: \\\"$INITIAL_STAKE\\\") }\"
        }" | jq .)
    
    if echo "$INIT_RESULT" | jq -e '.errors' > /dev/null; then
        echo -e "${RED}❌ Failed to initialize voter${NC}"
        echo "$INIT_RESULT" | jq .
        return 1
    fi
    
    echo -e "${GREEN}✅ Voter initialized${NC}"
    
    # Wait and verify
    sleep 2
    VERIFY_STATUS=$(curl -s -X POST "$voter_endpoint" \
        -H "Content-Type: application/json" \
        -d '{"query": "{ status { stake reputation totalVotes } }"}' | jq .)
    
    echo "Status:"
    echo "$VERIFY_STATUS" | jq '.data.status'
    echo ""
    
    return 0
}

# Initialize voters one by one with delay
SUCCESS_COUNT=0
FAIL_COUNT=0

for i in 1 2 3; do
    VOTER_VAR="VOTER_${i}_ID"
    VOTER_ID="${!VOTER_VAR}"
    
    if initialize_voter "$VOTER_ID" "$i"; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    
    # Delay before next voter (except after last one)
    if [ $i -lt 3 ]; then
        echo -e "${YELLOW}Waiting ${DELAY_BETWEEN_VOTERS} seconds before next voter...${NC}"
        sleep $DELAY_BETWEEN_VOTERS
    fi
done

# Summary
echo "=========================================="
echo "Initialization Summary"
echo "=========================================="
echo "Success: $SUCCESS_COUNT/3"
echo "Failed: $FAIL_COUNT/3"
echo ""

if [ $SUCCESS_COUNT -eq 3 ]; then
    echo -e "${GREEN}✅ All voters initialized successfully!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some voters failed to initialize${NC}"
    exit 1
fi
