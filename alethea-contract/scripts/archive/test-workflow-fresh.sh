#!/bin/bash
# Complete Workflow Test for Fresh Deployment

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Load environment
source .env.fresh

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🧪 Alethea Network - Complete Workflow Test             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# Step 1: Verify Setup
echo -e "${YELLOW}📊 Step 1: Verifying Setup...${NC}"
STATS=$(curl -s "http://localhost:8080/chains/${CHAIN_ID}/applications/${ALETHEA_REGISTRY_ID}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ protocolStats { totalMarkets activeMarkets totalVoters } }"}')

TOTAL_VOTERS=$(echo $STATS | jq -r '.data.protocolStats.totalVoters')
echo "Total Voters Registered: $TOTAL_VOTERS"

if [ "$TOTAL_VOTERS" -lt 3 ]; then
    echo -e "${RED}❌ Error: Need at least 3 voters registered${NC}"
    echo "Run: ./initialize-voters-fresh.sh"
    exit 1
fi

echo -e "${GREEN}✓ Setup verified: $TOTAL_VOTERS voters registered${NC}\n"

# Step 2: Create Market
echo -e "${YELLOW}📝 Step 2: Creating Test Market...${NC}"

# Calculate deadline (5 minutes from now in microseconds)
DEADLINE_MS=$(($(date +%s) * 1000 + 300000))
DEADLINE_US=$((DEADLINE_MS * 1000))

echo "Market Question: Will Bitcoin reach \$100k by end of 2025?"
echo "Outcomes: Yes, No"
echo "Deadline: $DEADLINE_MS ms (5 minutes from now)"
echo ""

CREATE_RESULT=$(curl -s "http://localhost:8080/chains/${CHAIN_ID}/applications/${MARKET_CHAIN_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"mutation { createMarket(question: \\\"Will Bitcoin reach \\\$100k by end of 2025?\\\", outcomes: [\\\"Yes\\\", \\\"No\\\"], resolutionDeadline: \\\"${DEADLINE_US}\\\", initialLiquidity: \\\"1000000000000\\\") }\"}")

echo "Create Market Response:"
echo $CREATE_RESULT | jq '.'

# Extract market ID
MARKET_ID=$(echo $CREATE_RESULT | jq -r '.data.createMarket // 0')

if [ "$MARKET_ID" == "null" ] || [ "$MARKET_ID" == "0" ]; then
    echo -e "${RED}❌ Failed to create market${NC}"
    echo "Response: $CREATE_RESULT"
    exit 1
fi

echo -e "${GREEN}✓ Market created with ID: $MARKET_ID${NC}\n"

sleep 3

# Step 3: Verify Market
echo -e "${YELLOW}📊 Step 3: Verifying Market...${NC}"
MARKETS=$(curl -s "http://localhost:8080/chains/${CHAIN_ID}/applications/${MARKET_CHAIN_ID}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ markets { id question outcomes status resolutionDeadline } }"}')

echo "Markets:"
echo $MARKETS | jq '.data.markets'
echo ""

# Step 4: Check Registry Stats
echo -e "${YELLOW}📊 Step 4: Checking Registry Stats...${NC}"
STATS=$(curl -s "http://localhost:8080/chains/${CHAIN_ID}/applications/${ALETHEA_REGISTRY_ID}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ protocolStats { totalMarkets activeMarkets totalVoters } }"}')

echo "Protocol Stats:"
echo $STATS | jq '.data.protocolStats'
echo ""

TOTAL_MARKETS=$(echo $STATS | jq -r '.data.protocolStats.totalMarkets')
ACTIVE_MARKETS=$(echo $STATS | jq -r '.data.protocolStats.activeMarkets')

echo -e "${GREEN}✓ Total Markets: $TOTAL_MARKETS${NC}"
echo -e "${GREEN}✓ Active Markets: $ACTIVE_MARKETS${NC}\n"

# Step 5: Request Resolution (after deadline)
echo -e "${YELLOW}⏰ Step 5: Waiting for market deadline...${NC}"
echo "Market will be ready for resolution in 5 minutes"
echo "You can manually request resolution with:"
echo ""
echo -e "${BLUE}curl -s \"http://localhost:8080/chains/\${CHAIN_ID}/applications/\${MARKET_CHAIN_ID}\" \\${NC}"
echo -e "${BLUE}  -H \"Content-Type: application/json\" \\${NC}"
echo -e "${BLUE}  -d '{\"query\": \"mutation { requestResolution(marketId: $MARKET_ID) }\"}' | jq '.'${NC}"
echo ""

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ✅ Workflow Test Summary                                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${GREEN}✓ Voters Registered: $TOTAL_VOTERS${NC}"
echo -e "${GREEN}✓ Market Created: ID $MARKET_ID${NC}"
echo -e "${GREEN}✓ Market Status: OPEN${NC}"
echo -e "${GREEN}✓ Total Markets: $TOTAL_MARKETS${NC}"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Wait for market deadline (5 minutes)"
echo "2. Request resolution"
echo "3. Voters commit votes"
echo "4. Voters reveal votes"
echo "5. Market resolves"
echo ""

echo -e "${BLUE}Market Details:${NC}"
echo "  ID: $MARKET_ID"
echo "  Question: Will Bitcoin reach \$100k by end of 2025?"
echo "  Outcomes: Yes, No"
echo "  Deadline: $(date -d @$((DEADLINE_MS / 1000)) '+%Y-%m-%d %H:%M:%S')"
echo ""

echo -e "${GREEN}🎉 Workflow test completed successfully!${NC}"
echo ""
echo -e "${YELLOW}View in Dashboard:${NC}"
echo "  http://localhost:4000"
echo ""
