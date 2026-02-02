#!/bin/bash
# Deploy Market Chain v2 (Uses Registry as External Service)
# This deploys the refactored Market Chain that calls Registry for resolution

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}🚀 Deploying Market Chain v2 (Registry Consumer)${NC}\n"

# Step 1: Check for Registry v2
if [ -z "$ALETHEA_REGISTRY_V2_ID" ]; then
    if [ -f .env.registry-v2 ]; then
        source .env.registry-v2
        echo -e "${BLUE}📋 Loaded Registry v2 from .env.registry-v2${NC}"
    else
        echo -e "${RED}❌ Registry v2 not found. Please deploy Registry first:${NC}"
        echo -e "   ${YELLOW}bash scripts/deploy-registry-v2.sh${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}Using Registry v2: ${ALETHEA_REGISTRY_V2_ID}${NC}\n"

# Step 2: Build Market Chain
echo -e "${YELLOW}Step 1: Building Market Chain contract...${NC}"
cargo build --release --target wasm32-unknown-unknown -p alethea-market-chain 2>&1 | grep -E "(Compiling|Finished|error)" || true

BUILD_DIR="target/wasm32-unknown-unknown/release"
CONTRACT_WASM="${BUILD_DIR}/market-chain-contract.wasm"
SERVICE_WASM="${BUILD_DIR}/market-chain-service.wasm"

if [ ! -f "$CONTRACT_WASM" ] || [ ! -f "$SERVICE_WASM" ]; then
    echo -e "${RED}❌ Build failed. WASM files not found.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"
echo -e "   Contract: $(du -h $CONTRACT_WASM | cut -f1)"
echo -e "   Service: $(du -h $SERVICE_WASM | cut -f1)\n"

# Step 3: Deploy Market Chain
echo -e "${YELLOW}Step 2: Deploying Market Chain to testnet...${NC}\n"

# Market Chain parameters - includes Registry v2 ID
PARAMS="{
  \"registry_application_id\": \"${ALETHEA_REGISTRY_V2_ID}\",
  \"registry_chain_id\": \"${CHAIN_ID}\"
}"

echo -e "${BLUE}Parameters:${NC}"
echo "$PARAMS" | jq '.'
echo ""

DEPLOY_OUTPUT=$(linera publish-and-create \
    "$CONTRACT_WASM" \
    "$SERVICE_WASM" \
    --json-parameters "$PARAMS" 2>&1)

echo "$DEPLOY_OUTPUT"

# Extract Application ID
MARKET_CHAIN_V2_ID=$(echo "$DEPLOY_OUTPUT" | grep -oP 'Application ID: \K[a-f0-9]{64}' | head -1)

if [ -z "$MARKET_CHAIN_V2_ID" ]; then
    echo -e "\n${RED}❌ Failed to extract Market Chain Application ID${NC}"
    exit 1
fi

echo -e "\n${GREEN}✅ Market Chain v2 deployed successfully!${NC}\n"
echo -e "${GREEN}📋 Market Chain v2 Application ID:${NC} ${MARKET_CHAIN_V2_ID}\n"

# Step 4: Save deployment info
DEPLOYMENT_FILE=".env.market-chain-v2"
cat > "$DEPLOYMENT_FILE" << EOF
# Market Chain v2 (Registry Consumer)
# Deployed: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

export MARKET_CHAIN_V2_ID="${MARKET_CHAIN_V2_ID}"
export CHAIN_ID="${CHAIN_ID}"
export ALETHEA_REGISTRY_V2_ID="${ALETHEA_REGISTRY_V2_ID}"
export MARKET_CHAIN_V2_URL="http://localhost:8080/chains/${CHAIN_ID}/applications/${MARKET_CHAIN_V2_ID}"
EOF

echo -e "${GREEN}✅ Deployment info saved to ${DEPLOYMENT_FILE}${NC}\n"

# Step 5: Test Market Chain
echo -e "${YELLOW}Step 3: Testing Market Chain...${NC}\n"

MARKET_CHAIN_URL="http://localhost:8080/chains/${CHAIN_ID}/applications/${MARKET_CHAIN_V2_ID}"

# Wait for service to be ready
sleep 3

# Test query
TEST_QUERY='{"query": "{ markets { id question status } }"}'

echo -e "${BLUE}Testing Market Chain endpoint...${NC}"
TEST_RESULT=$(curl -s --max-time 10 "$MARKET_CHAIN_URL" \
    -H "Content-Type: application/json" \
    -d "$TEST_QUERY" 2>/dev/null || echo '{"error": "Connection failed"}')

if echo "$TEST_RESULT" | grep -q "markets"; then
    echo -e "${GREEN}✅ Market Chain is responding!${NC}"
    echo "$TEST_RESULT" | jq '.data.markets' 2>/dev/null || echo "$TEST_RESULT"
else
    echo -e "${YELLOW}⚠️  Market Chain test query failed${NC}"
    echo "Response: $TEST_RESULT"
fi

echo ""

# Step 6: Display summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Market Chain v2 Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Market Chain v2 Application ID:${NC}"
echo -e "${GREEN}${MARKET_CHAIN_V2_ID}${NC}"
echo ""
echo -e "${BLUE}GraphQL Endpoint:${NC}"
echo -e "${CYAN}${MARKET_CHAIN_URL}${NC}"
echo ""
echo -e "${BLUE}Configuration:${NC}"
echo "  Registry v2 ID: ${ALETHEA_REGISTRY_V2_ID}"
echo "  Chain ID: ${CHAIN_ID}"
echo ""
echo -e "${BLUE}Key Changes:${NC}"
echo "  ✓ Market Chain now calls Registry for resolution"
echo "  ✓ Receives resolution callbacks from Registry"
echo "  ✓ No longer has direct resolution logic"
echo "  ✓ Acts as external dApp consumer of Oracle service"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Source the environment: ${YELLOW}source ${DEPLOYMENT_FILE}${NC}"
echo "  2. Create a test market: ${YELLOW}bash scripts/test-market-chain-v2.sh${NC}"
echo "  3. Deploy example external dApp: ${YELLOW}bash scripts/deploy-external-dapp.sh${NC}"
echo ""

exit 0
