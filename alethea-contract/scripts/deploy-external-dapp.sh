#!/bin/bash
# Deploy Example External dApp
# This demonstrates how external dApps integrate with Alethea Oracle

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}🚀 Deploying Example External dApp${NC}\n"

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

# Step 2: Build External dApp
echo -e "${YELLOW}Step 1: Building External dApp contract...${NC}"

cd examples/external-market-dapp

cargo build --release --target wasm32-unknown-unknown 2>&1 | grep -E "(Compiling|Finished|error)" || true

BUILD_DIR="../../target/wasm32-unknown-unknown/release"
CONTRACT_WASM="${BUILD_DIR}/external_market_dapp_contract.wasm"
SERVICE_WASM="${BUILD_DIR}/external_market_dapp_service.wasm"

if [ ! -f "$CONTRACT_WASM" ] || [ ! -f "$SERVICE_WASM" ]; then
    echo -e "${RED}❌ Build failed. WASM files not found.${NC}"
    cd ../..
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"
echo -e "   Contract: $(du -h $CONTRACT_WASM | cut -f1)"
echo -e "   Service: $(du -h $SERVICE_WASM | cut -f1)\n"

cd ../..

# Step 3: Deploy External dApp
echo -e "${YELLOW}Step 2: Deploying External dApp to testnet...${NC}\n"

# External dApp parameters - includes Registry v2 ID
PARAMS="{
  \"oracle_registry_id\": \"${ALETHEA_REGISTRY_V2_ID}\",
  \"oracle_chain_id\": \"${CHAIN_ID}\"
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
EXTERNAL_DAPP_ID=$(echo "$DEPLOY_OUTPUT" | grep -oP 'Application ID: \K[a-f0-9]{64}' | head -1)

if [ -z "$EXTERNAL_DAPP_ID" ]; then
    echo -e "\n${RED}❌ Failed to extract External dApp Application ID${NC}"
    exit 1
fi

echo -e "\n${GREEN}✅ External dApp deployed successfully!${NC}\n"
echo -e "${GREEN}📋 External dApp Application ID:${NC} ${EXTERNAL_DAPP_ID}\n"

# Step 4: Save deployment info
DEPLOYMENT_FILE=".env.external-dapp"
cat > "$DEPLOYMENT_FILE" << EOF
# Example External dApp
# Deployed: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

export EXTERNAL_DAPP_ID="${EXTERNAL_DAPP_ID}"
export CHAIN_ID="${CHAIN_ID}"
export ALETHEA_REGISTRY_V2_ID="${ALETHEA_REGISTRY_V2_ID}"
export EXTERNAL_DAPP_URL="http://localhost:8080/chains/${CHAIN_ID}/applications/${EXTERNAL_DAPP_ID}"

# For SDK usage
export ORACLE_REGISTRY_ID="${ALETHEA_REGISTRY_V2_ID}"
export ORACLE_CHAIN_ID="${CHAIN_ID}"
export ORACLE_ENDPOINT="http://localhost:8080/graphql"
export CALLBACK_CHAIN_ID="${CHAIN_ID}"
export CALLBACK_APP_ID="${EXTERNAL_DAPP_ID}"
EOF

echo -e "${GREEN}✅ Deployment info saved to ${DEPLOYMENT_FILE}${NC}\n"

# Step 5: Update SDK example .env
echo -e "${YELLOW}Step 3: Updating SDK example configuration...${NC}\n"

cat > "examples/external-market-dapp/.env" << EOF
# Oracle Registry Configuration
ORACLE_REGISTRY_ID=${ALETHEA_REGISTRY_V2_ID}
ORACLE_CHAIN_ID=${CHAIN_ID}
ORACLE_ENDPOINT=http://localhost:8080/graphql

# Callback Configuration
CALLBACK_CHAIN_ID=${CHAIN_ID}
CALLBACK_APP_ID=${EXTERNAL_DAPP_ID}
EOF

echo -e "${GREEN}✅ SDK example .env updated${NC}\n"

# Step 6: Test External dApp
echo -e "${YELLOW}Step 4: Testing External dApp...${NC}\n"

EXTERNAL_DAPP_URL="http://localhost:8080/chains/${CHAIN_ID}/applications/${EXTERNAL_DAPP_ID}"

# Wait for service to be ready
sleep 3

# Test query
TEST_QUERY='{"query": "{ markets { id question status oracleMarketId } }"}'

echo -e "${BLUE}Testing External dApp endpoint...${NC}"
TEST_RESULT=$(curl -s --max-time 10 "$EXTERNAL_DAPP_URL" \
    -H "Content-Type: application/json" \
    -d "$TEST_QUERY" 2>/dev/null || echo '{"error": "Connection failed"}')

if echo "$TEST_RESULT" | grep -q "markets"; then
    echo -e "${GREEN}✅ External dApp is responding!${NC}"
    echo "$TEST_RESULT" | jq '.data.markets' 2>/dev/null || echo "$TEST_RESULT"
else
    echo -e "${YELLOW}⚠️  External dApp test query failed${NC}"
    echo "Response: $TEST_RESULT"
fi

echo ""

# Step 7: Display summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  External dApp Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}External dApp Application ID:${NC}"
echo -e "${GREEN}${EXTERNAL_DAPP_ID}${NC}"
echo ""
echo -e "${BLUE}GraphQL Endpoint:${NC}"
echo -e "${CYAN}${EXTERNAL_DAPP_URL}${NC}"
echo ""
echo -e "${BLUE}Configuration:${NC}"
echo "  Oracle Registry ID: ${ALETHEA_REGISTRY_V2_ID}"
echo "  Chain ID: ${CHAIN_ID}"
echo ""
echo -e "${BLUE}Features Demonstrated:${NC}"
echo "  ✓ Market creation with Oracle registration"
echo "  ✓ SDK integration (@alethea/oracle-sdk)"
echo "  ✓ Resolution callback handling"
echo "  ✓ Automatic winnings distribution"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Source the environment: ${YELLOW}source ${DEPLOYMENT_FILE}${NC}"
echo "  2. Test SDK integration: ${YELLOW}cd examples/external-market-dapp && npm start${NC}"
echo "  3. Run end-to-end tests: ${YELLOW}bash scripts/test-oracle-as-a-service.sh${NC}"
echo ""
echo -e "${BLUE}SDK Example:${NC}"
echo "  cd examples/external-market-dapp"
echo "  npm install"
echo "  npm start"
echo ""

exit 0
