#!/bin/bash
# Auto-test voter registration dengan fix same-chain communication
# Script ini akan wait untuk service ready, lalu test voter initialization

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🧪 Auto-Test Voter Registration${NC}\n"

source .env.conway

REGISTRY_ENDPOINT="http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID"

# Step 1: Wait for service to be ready
echo -e "${YELLOW}Step 1: Waiting for service to be ready...${NC}"
MAX_WAIT=300  # 5 minutes
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$REGISTRY_ENDPOINT" -H "Content-Type: application/json" -d '{"query": "{ __typename }"}' 2>&1 || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ Service ready! (HTTP $HTTP_CODE)${NC}\n"
        break
    fi
    echo "  Waiting... ($WAITED/$MAX_WAIT seconds) - HTTP $HTTP_CODE"
    sleep 10
    WAITED=$((WAITED + 10))
done

if [ $WAITED -ge $MAX_WAIT ]; then
    echo -e "${RED}❌ Service not ready after $MAX_WAIT seconds${NC}"
    exit 1
fi

# Step 2: Get initial stats
echo -e "${YELLOW}Step 2: Getting initial stats...${NC}"
INITIAL_STATS=$(curl -s --max-time 20 "$REGISTRY_ENDPOINT" -H "Content-Type: application/json" -d '{"query": "{ protocolStats { totalVoters activeVoters } }"}')
INITIAL_TOTAL=$(echo "$INITIAL_STATS" | jq -r '.data.protocolStats.totalVoters // 0' 2>/dev/null || echo "0")
echo "  Initial Total Voters: $INITIAL_TOTAL"
echo ""

# Step 3: Initialize voters
echo -e "${YELLOW}Step 3: Initializing Voters...${NC}"
for i in 1 2 3; do
    VOTER_ID_VAR="VOTER_${i}_ID"
    VOTER_ID="${!VOTER_ID_VAR}"
    STAKE=$((1000 * i))
    
    echo -e "${BLUE}=== Voter $i (Stake: $STAKE) ===${NC}"
    VOTER_ENDPOINT="http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_ID"
    
    RESULT=$(curl -s --max-time 30 "$VOTER_ENDPOINT" -H "Content-Type: application/json" \
        -d "{\"query\": \"mutation { initialize(registryId: \\\"$ALETHEA_REGISTRY_ID\\\", initialStake: \\\"$STAKE\\\") }\"}" 2>&1)
    
    if echo "$RESULT" | jq -e '.data' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Success${NC}"
        echo "$RESULT" | jq -c '.data' 2>/dev/null
    elif echo "$RESULT" | jq -e '.errors' > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Error:${NC}"
        echo "$RESULT" | jq '.errors[0].message' 2>/dev/null
    else
        echo "Response: ${RESULT:0:100}..."
    fi
    echo ""
    sleep 4
done

# Step 4: Wait for registration
echo -e "${YELLOW}Step 4: Waiting 25 seconds for registration to process...${NC}"
sleep 25
echo ""

# Step 5: Check results
echo -e "${YELLOW}Step 5: Checking Results...${NC}"
FINAL_STATS=$(curl -s --max-time 30 "$REGISTRY_ENDPOINT" -H "Content-Type: application/json" \
    -d '{"query": "{ protocolStats { totalVoters activeVoters } voterLeaderboard(limit: 10) { voterApp reputationScore totalVotes } }"}')

FINAL_TOTAL=$(echo "$FINAL_STATS" | jq -r '.data.protocolStats.totalVoters // 0' 2>/dev/null || echo "0")
FINAL_ACTIVE=$(echo "$FINAL_STATS" | jq -r '.data.protocolStats.activeVoters // 0' 2>/dev/null || echo "0")

echo "Protocol Stats:"
echo "$FINAL_STATS" | jq '.data.protocolStats' 2>/dev/null
echo ""
echo "Voter Leaderboard:"
echo "$FINAL_STATS" | jq '.data.voterLeaderboard' 2>/dev/null
echo ""

# Step 6: Analysis
echo -e "${YELLOW}Step 6: Analysis...${NC}"
echo "  Initial Voters: $INITIAL_TOTAL"
echo "  Final Voters: $FINAL_TOTAL"
echo "  Active Voters: $FINAL_ACTIVE"
echo ""

if [ "$FINAL_TOTAL" -ge "3" ]; then
    echo -e "${GREEN}✅ SUCCESS! Fix bekerja - Multiple voters registered${NC}"
    echo ""
    echo "Registered Voters:"
    echo "$FINAL_STATS" | jq -r '.data.voterLeaderboard[]?.voterApp' 2>/dev/null | while read voter_app; do
        if [ -n "$voter_app" ]; then
            if echo "$voter_app" | grep -q "$ALETHEA_REGISTRY_ID"; then
                echo "  ⚠️  $voter_app (Registry itself)"
            else
                echo "  ✅ $voter_app"
            fi
        fi
    done
elif [ "$FINAL_TOTAL" = "1" ]; then
    echo -e "${YELLOW}⚠️  Only 1 voter registered (likely Registry itself)${NC}"
    echo "  Registry perlu redeploy dengan fix"
elif [ "$FINAL_TOTAL" = "0" ]; then
    echo -e "${RED}❌ No voters registered${NC}"
    echo "  Perlu investigasi lebih lanjut"
else
    echo -e "${YELLOW}⚠️  Unexpected: $FINAL_TOTAL voters${NC}"
fi

echo ""
echo -e "${BLUE}✅ Test Complete!${NC}"

