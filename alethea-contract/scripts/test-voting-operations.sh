#!/bin/bash

# 🗳️ Test Voting via Operations (Direct HTTP POST)
# Test voting workflow using operations directly via HTTP POST
# Operations are executed in contract layer and send messages to Registry

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}🗳️ Test Voting via Operations${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}\n"

# Load environment
if [ -f .env.conway ]; then
    set -a
    source <(grep '^export' .env.conway 2>/dev/null || true)
    set +a
fi

CHAIN_ID="${CHAIN_ID:-a2c0349ae6add80c92e26bb383aca8d98f9f3441c3097fec99111199c7f1e221}"
REGISTRY_ID="${ALETHEA_REGISTRY_ID:-948a0e49dc424b3cfb0a997d7c7ef05b048c5f4184a2a4d546d6d7abae823261}"
VOTER_ID="${VOTER_1_ID:-0e36707a88a3822ba3d835e081f73abceb0610c711ecc278cc4a8a11312099bd}"
MARKET_ID="${1:-0}"

VOTER_URL="http://localhost:8080/chains/${CHAIN_ID}/applications/${VOTER_ID}"
VOTER_OPERATIONS_URL="${VOTER_URL}/operations"
REGISTRY_URL="http://localhost:8080/chains/${CHAIN_ID}/applications/${REGISTRY_ID}"

echo -e "${BLUE}📋 Configuration:${NC}"
echo -e "   Chain ID: ${CHAIN_ID}"
echo -e "   Registry ID: ${REGISTRY_ID}"
echo -e "   Voter ID: ${VOTER_ID}"
echo -e "   Market ID: ${MARKET_ID}\n"

# Step 1: Check voter status
echo -e "${CYAN}Step 1: Check Voter Status${NC}\n"

STATUS_RESPONSE=$(curl -s -X POST "${VOTER_URL}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ status { stake reputation totalVotes correctVotes accuracyRate autoVoteEnabled } }"}')

echo "$STATUS_RESPONSE" | jq '.' || echo "$STATUS_RESPONSE"
echo ""

STAKE=$(echo "$STATUS_RESPONSE" | jq -r '.data.status.stake' 2>/dev/null || echo "0")

# Step 2: Initialize voter if stake is 0
if [ "$STAKE" = "0" ] || [ "$STAKE" = "0." ] || [ -z "$STAKE" ]; then
    echo -e "${CYAN}Step 2: Initialize Voter via Operation${NC}\n"
    
    INITIAL_STAKE="1000000000" # 1 LINERA token (assuming 9 decimals)
    
    echo -e "${BLUE}Initializing voter with:${NC}"
    echo -e "   Registry ID: ${REGISTRY_ID}"
    echo -e "   Initial Stake: ${INITIAL_STAKE}\n"
    
    # Create operation JSON
    INIT_OPERATION=$(cat <<EOF
{
  "Initialize": {
    "registry_id": "${REGISTRY_ID}",
    "initial_stake": "${INITIAL_STAKE}"
  }
}
EOF
)
    
    echo -e "${YELLOW}Operation:${NC}"
    echo "$INIT_OPERATION" | jq '.'
    echo ""
    
    INIT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${VOTER_OPERATIONS_URL}" \
      -H "Content-Type: application/json" \
      -d "${INIT_OPERATION}")
    
    HTTP_CODE=$(echo "$INIT_RESPONSE" | tail -n1)
    BODY=$(echo "$INIT_RESPONSE" | sed '$d')
    
    echo -e "${BLUE}HTTP Status: ${HTTP_CODE}${NC}"
    echo -e "${BLUE}Response:${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    echo ""
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        echo -e "${GREEN}✅ Voter initialized!${NC}"
        echo -e "${YELLOW}💡 Voter Template will send VoterRegistration message to Registry${NC}"
    else
        echo -e "${RED}❌ Initialize failed (HTTP ${HTTP_CODE})${NC}"
        exit 1
    fi
    
    # Wait a bit for state to update
    sleep 2
else
    echo -e "${GREEN}✅ Voter already initialized (stake: ${STAKE})${NC}\n"
fi

# Step 3: Submit vote via operation
echo -e "\n${CYAN}Step 3: Submit Vote via Operation${NC}\n"

OUTCOME_INDEX="${2:-0}"
CONFIDENCE="${3:-80}"

echo -e "${BLUE}Submitting vote:${NC}"
echo -e "   Market ID: ${MARKET_ID}"
echo -e "   Outcome Index: ${OUTCOME_INDEX}"
echo -e "   Confidence: ${CONFIDENCE}%\n"

# Create operation JSON
VOTE_OPERATION=$(cat <<EOF
{
  "SubmitVote": {
    "market_id": ${MARKET_ID},
    "outcome_index": ${OUTCOME_INDEX},
    "confidence": ${CONFIDENCE}
  }
}
EOF
)

echo -e "${YELLOW}Operation:${NC}"
echo "$VOTE_OPERATION" | jq '.'
echo ""

VOTE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${VOTER_OPERATIONS_URL}" \
  -H "Content-Type: application/json" \
  -d "${VOTE_OPERATION}")

HTTP_CODE=$(echo "$VOTE_RESPONSE" | tail -n1)
BODY=$(echo "$VOTE_RESPONSE" | sed '$d')

echo -e "${BLUE}HTTP Status: ${HTTP_CODE}${NC}"
echo -e "${BLUE}Response:${NC}"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo -e "${GREEN}✅ Vote submitted!${NC}"
    echo -e "${YELLOW}💡 Voter Template will send VoteCommitment and VoteReveal messages to Registry${NC}"
    echo -e "${BLUE}   Messages are sent via cross-chain messages (runtime.send_message())${NC}"
else
    echo -e "${RED}❌ Submit vote failed (HTTP ${HTTP_CODE})${NC}"
    exit 1
fi

# Step 4: Check voter status again
echo -e "\n${CYAN}Step 4: Check Voter Status After Vote${NC}\n"

sleep 2

STATUS_RESPONSE=$(curl -s -X POST "${VOTER_URL}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ status { stake reputation totalVotes correctVotes accuracyRate autoVoteEnabled } }"}')

echo "$STATUS_RESPONSE" | jq '.' || echo "$STATUS_RESPONSE"
echo ""

echo -e "${GREEN}✅ Voting test completed!${NC}"
echo -e "${YELLOW}💡 Note: Messages (VoteCommitment/VoteReveal) are sent to Registry via cross-chain messages${NC}"
echo -e "${YELLOW}💡 Registry will process these messages in execute_message() method${NC}"

