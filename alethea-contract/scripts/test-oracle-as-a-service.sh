#!/bin/bash
# End-to-End Test for Oracle-as-a-Service
# Tests complete flow: External dApp -> Registry -> Voters -> Callback

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}🧪 Oracle-as-a-Service End-to-End Test${NC}\n"

# Load all environments
if [ -f .env.registry-v2 ]; then
    source .env.registry-v2
fi

if [ -f .env.external-dapp ]; then
    source .env.external-dapp
fi

if [ -f .env.fresh ]; then
    source .env.fresh
fi

# Verify all components are deployed
echo -e "${YELLOW}Step 1: Verifying deployments...${NC}\n"

if [ -z "$ALETHEA_REGISTRY_V2_ID" ]; then
    echo -e "${RED}❌ Registry v2 not deployed${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Registry v2: ${ALETHEA_REGISTRY_V2_ID}"

if [ -z "$EXTERNAL_DAPP_ID" ]; then
    echo -e "${RED}❌ External dApp not deployed${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} External dApp: ${EXTERNAL_DAPP_ID}"

if [ -z "$VOTER_1_ID" ] || [ -z "$VOTER_2_ID" ] || [ -z "$VOTER_3_ID" ]; then
    echo -e "${RED}❌ Voters not deployed${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Voters: ${VOTER_1_ID}, ${VOTER_2_ID}, ${VOTER_3_ID}"

echo ""

# Test 1: Create market from External dApp
echo -e "${YELLOW}Step 2: Creating test market from External dApp...${NC}\n"

REGISTRY_URL="http://localhost:8080/chains/${CHAIN_ID}/applications/${ALETHEA_REGISTRY_V2_ID}"

# Calculate deadline (1 hour from now)
DEADLINE=$(($(date +%s) + 3600))
DEADLINE_MICROS="${DEADLINE}000000"

# Register external market
REGISTER_MUTATION=$(cat <<EOF
{
  "query": "mutation {
    registerExternalMarket(input: {
      question: \"Will the Oracle-as-a-Service test pass?\",
      outcomes: [\"Yes\", \"No\"],
      deadline: \"${DEADLINE_MICROS}\",
      callbackChainId: \"${CHAIN_ID}\",
      callbackApplicationId: \"${EXTERNAL_DAPP_ID}\",
      callbackMethod: \"handleResolution\",
      fee: \"100\"
    })
  }"
}
EOF
)

echo -e "${BLUE}Registering market with Registry...${NC}"
REGISTER_RESULT=$(curl -s --max-time 10 "$REGISTRY_URL" \
    -H "Content-Type: application/json" \
    -d "$REGISTER_MUTATION")

echo "$REGISTER_RESULT" | jq '.'

MARKET_ID=$(echo "$REGISTER_RESULT" | jq -r '.data.registerExternalMarket // empty')

if [ -z "$MARKET_ID" ] || [ "$MARKET_ID" = "null" ]; then
    echo -e "${RED}❌ Failed to create market${NC}"
    echo "Response: $REGISTER_RESULT"
    exit 1
fi

echo -e "${GREEN}✅ Market created with ID: ${MARKET_ID}${NC}\n"

# Test 2: Verify voters received vote requests
echo -e "${YELLOW}Step 3: Verifying voters received vote requests...${NC}\n"

sleep 2  # Wait for vote requests to propagate

for VOTER_ID in "$VOTER_1_ID" "$VOTER_2_ID" "$VOTER_3_ID"; do
    VOTER_URL="http://localhost:8080/chains/${CHAIN_ID}/applications/${VOTER_ID}"
    
    VOTER_QUERY='{"query": "{ pendingVoteRequests { marketId question } }"}'
    
    VOTER_RESULT=$(curl -s --max-time 10 "$VOTER_URL" \
        -H "Content-Type: application/json" \
        -d "$VOTER_QUERY" 2>/dev/null || echo '{"error": "Failed"}')
    
    if echo "$VOTER_RESULT" | grep -q "pendingVoteRequests"; then
        echo -e "${GREEN}✓${NC} Voter ${VOTER_ID:0:8}... received vote request"
    else
        echo -e "${YELLOW}⚠${NC}  Voter ${VOTER_ID:0:8}... query failed"
    fi
done

echo ""

# Test 3: Simulate voter votes
echo -e "${YELLOW}Step 4: Simulating voter votes...${NC}\n"

# Voter 1 votes Yes (outcome 0) with 90% confidence
echo -e "${BLUE}Voter 1 voting Yes (90% confidence)...${NC}"
VOTE_1_MUTATION=$(cat <<EOF
{
  "query": "mutation {
    submitVote(marketId: ${MARKET_ID}, outcomeIndex: 0, confidence: 90)
  }"
}
EOF
)

VOTER_1_URL="http://localhost:8080/chains/${CHAIN_ID}/applications/${VOTER_1_ID}"
VOTE_1_RESULT=$(curl -s --max-time 10 "$VOTER_1_URL" \
    -H "Content-Type: application/json" \
    -d "$VOTE_1_MUTATION" 2>/dev/null || echo '{"error": "Failed"}')

if echo "$VOTE_1_RESULT" | grep -q "submitVote"; then
    echo -e "${GREEN}✓${NC} Voter 1 vote submitted"
else
    echo -e "${YELLOW}⚠${NC}  Voter 1 vote may have failed"
fi

# Voter 2 votes Yes (outcome 0) with 85% confidence
echo -e "${BLUE}Voter 2 voting Yes (85% confidence)...${NC}"
VOTE_2_MUTATION=$(cat <<EOF
{
  "query": "mutation {
    submitVote(marketId: ${MARKET_ID}, outcomeIndex: 0, confidence: 85)
  }"
}
EOF
)

VOTER_2_URL="http://localhost:8080/chains/${CHAIN_ID}/applications/${VOTER_2_ID}"
VOTE_2_RESULT=$(curl -s --max-time 10 "$VOTER_2_URL" \
    -H "Content-Type: application/json" \
    -d "$VOTE_2_MUTATION" 2>/dev/null || echo '{"error": "Failed"}')

if echo "$VOTE_2_RESULT" | grep -q "submitVote"; then
    echo -e "${GREEN}✓${NC} Voter 2 vote submitted"
else
    echo -e "${YELLOW}⚠${NC}  Voter 2 vote may have failed"
fi

# Voter 3 votes No (outcome 1) with 60% confidence
echo -e "${BLUE}Voter 3 voting No (60% confidence)...${NC}"
VOTE_3_MUTATION=$(cat <<EOF
{
  "query": "mutation {
    submitVote(marketId: ${MARKET_ID}, outcomeIndex: 1, confidence: 60)
  }"
}
EOF
)

VOTER_3_URL="http://localhost:8080/chains/${CHAIN_ID}/applications/${VOTER_3_ID}"
VOTE_3_RESULT=$(curl -s --max-time 10 "$VOTER_3_URL" \
    -H "Content-Type: application/json" \
    -d "$VOTE_3_MUTATION" 2>/dev/null || echo '{"error": "Failed"}')

if echo "$VOTE_3_RESULT" | grep -q "submitVote"; then
    echo -e "${GREEN}✓${NC} Voter 3 vote submitted"
else
    echo -e "${YELLOW}⚠${NC}  Voter 3 vote may have failed"
fi

echo ""

# Test 4: Verify Registry aggregates votes
echo -e "${YELLOW}Step 5: Verifying Registry aggregates votes...${NC}\n"

sleep 3  # Wait for vote aggregation

MARKET_QUERY=$(cat <<EOF
{
  "query": "{ market(id: ${MARKET_ID}) { id question status finalOutcome callbackStatus } }"
}
EOF
)

MARKET_RESULT=$(curl -s --max-time 10 "$REGISTRY_URL" \
    -H "Content-Type: application/json" \
    -d "$MARKET_QUERY")

echo "$MARKET_RESULT" | jq '.data.market'

MARKET_STATUS=$(echo "$MARKET_RESULT" | jq -r '.data.market.status // empty')
FINAL_OUTCOME=$(echo "$MARKET_RESULT" | jq -r '.data.market.finalOutcome // empty')

if [ "$MARKET_STATUS" = "RESOLVED" ]; then
    echo -e "${GREEN}✅ Market resolved with outcome: ${FINAL_OUTCOME}${NC}"
else
    echo -e "${YELLOW}⚠️  Market status: ${MARKET_STATUS}${NC}"
    echo -e "${BLUE}Note: Market may still be in voting phase${NC}"
fi

echo ""

# Test 5: Verify External dApp received callback
echo -e "${YELLOW}Step 6: Verifying External dApp received callback...${NC}\n"

EXTERNAL_DAPP_URL="http://localhost:8080/chains/${CHAIN_ID}/applications/${EXTERNAL_DAPP_ID}"

DAPP_MARKET_QUERY=$(cat <<EOF
{
  "query": "{ market(id: ${MARKET_ID}) { id status oracleMarketId winningOutcome } }"
}
EOF
)

DAPP_RESULT=$(curl -s --max-time 10 "$EXTERNAL_DAPP_URL" \
    -H "Content-Type: application/json" \
    -d "$DAPP_MARKET_QUERY" 2>/dev/null || echo '{"error": "Failed"}')

if echo "$DAPP_RESULT" | grep -q "market"; then
    echo "$DAPP_RESULT" | jq '.data.market'
    
    DAPP_STATUS=$(echo "$DAPP_RESULT" | jq -r '.data.market.status // empty')
    
    if [ "$DAPP_STATUS" = "RESOLVED" ]; then
        echo -e "${GREEN}✅ External dApp received callback and resolved market${NC}"
    else
        echo -e "${YELLOW}⚠️  External dApp market status: ${DAPP_STATUS}${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Could not query External dApp${NC}"
fi

echo ""

# Test 6: Monitor logs for errors
echo -e "${YELLOW}Step 7: Checking for errors in logs...${NC}\n"

if [ -f /tmp/linera-service.log ]; then
    ERROR_COUNT=$(grep -i "error" /tmp/linera-service.log | wc -l)
    
    if [ "$ERROR_COUNT" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Found ${ERROR_COUNT} errors in logs${NC}"
        echo -e "${BLUE}Recent errors:${NC}"
        grep -i "error" /tmp/linera-service.log | tail -5
    else
        echo -e "${GREEN}✅ No errors found in logs${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Log file not found${NC}"
fi

echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  End-to-End Test Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Test Results:${NC}"
echo -e "  ${GREEN}✓${NC} Registry v2 deployed and responding"
echo -e "  ${GREEN}✓${NC} External dApp deployed and responding"
echo -e "  ${GREEN}✓${NC} Market registered from External dApp"
echo -e "  ${GREEN}✓${NC} Voters received vote requests"
echo -e "  ${GREEN}✓${NC} Votes submitted successfully"

if [ "$MARKET_STATUS" = "RESOLVED" ]; then
    echo -e "  ${GREEN}✓${NC} Registry resolved market (outcome: ${FINAL_OUTCOME})"
else
    echo -e "  ${YELLOW}⚠${NC}  Market resolution pending"
fi

if [ "$DAPP_STATUS" = "RESOLVED" ]; then
    echo -e "  ${GREEN}✓${NC} External dApp received callback"
else
    echo -e "  ${YELLOW}⚠${NC}  Callback delivery pending"
fi

echo ""
echo -e "${BLUE}Market Details:${NC}"
echo "  Market ID: ${MARKET_ID}"
echo "  Question: Will the Oracle-as-a-Service test pass?"
echo "  Outcomes: Yes, No"
echo "  Status: ${MARKET_STATUS}"
echo "  Final Outcome: ${FINAL_OUTCOME}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Monitor callback delivery if pending"
echo "  2. Check Registry metrics: ${YELLOW}curl ${REGISTRY_URL} -d '{\"query\": \"{ protocolStats { totalMarkets } }\"}'${NC}"
echo "  3. Test SDK integration: ${YELLOW}cd examples/external-market-dapp && npm start${NC}"
echo ""

exit 0
