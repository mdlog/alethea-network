#!/bin/bash
# Deploy Oracle Registry v2 (Oracle-as-a-Service)
# This deploys the refactored Registry with external market support

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}🚀 Deploying Oracle Registry v2 (Oracle-as-a-Service)${NC}\n"

# Step 1: Build the Registry contract
echo -e "${YELLOW}Step 1: Building Registry contract...${NC}"
cargo build --release --target wasm32-unknown-unknown --package oracle-registry-v2 2>&1 | grep -E "(Compiling|Finished|error)" || true

BUILD_DIR="target/wasm32-unknown-unknown/release"
CONTRACT_WASM="${BUILD_DIR}/oracle_registry_v2_contract.wasm"
SERVICE_WASM="${BUILD_DIR}/oracle_registry_v2_service.wasm"

if [ ! -f "$CONTRACT_WASM" ] || [ ! -f "$SERVICE_WASM" ]; then
    echo -e "${RED}❌ Build failed. WASM files not found.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"
echo -e "   Contract: $(du -h $CONTRACT_WASM | cut -f1)"
echo -e "   Service: $(du -h $SERVICE_WASM | cut -f1)\n"

# Step 2: Load environment
if [ -f .env.fresh ]; then
    source .env.fresh
    echo -e "${BLUE}📋 Loaded environment from .env.fresh${NC}"
    echo -e "   Chain ID: ${CHAIN_ID}\n"
else
    echo -e "${RED}❌ .env.fresh not found${NC}"
    exit 1
fi

# Step 3: Deploy Registry
echo -e "${YELLOW}Step 2: Deploying Registry to testnet...${NC}\n"

# Oracle Registry v2 uses () for instantiation (no parameters)
# Admin is automatically set to the deploying chain
echo -e "${BLUE}Deploying with default parameters (admin = deploying chain)${NC}\n"

DEPLOY_OUTPUT=$(linera publish-and-create \
    "$CONTRACT_WASM" \
    "$SERVICE_WASM" 2>&1)

echo "$DEPLOY_OUTPUT"

# Extract Application ID
REGISTRY_V2_ID=$(echo "$DEPLOY_OUTPUT" | grep -oP 'Application ID: \K[a-f0-9]{64}' | head -1)

if [ -z "$REGISTRY_V2_ID" ]; then
    echo -e "\n${RED}❌ Failed to extract Registry Application ID${NC}"
    exit 1
fi

echo -e "\n${GREEN}✅ Registry v2 deployed successfully!${NC}\n"
echo -e "${GREEN}📋 Registry v2 Application ID:${NC} ${REGISTRY_V2_ID}\n"

# Step 4: Save deployment info
DEPLOYMENT_FILE=".env.registry-v2"
cat > "$DEPLOYMENT_FILE" << EOF
# Oracle Registry v2 (Oracle-as-a-Service)
# Deployed: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

export ALETHEA_REGISTRY_V2_ID="${REGISTRY_V2_ID}"
export CHAIN_ID="${CHAIN_ID}"
export REGISTRY_V2_URL="http://localhost:8080/chains/${CHAIN_ID}/applications/${REGISTRY_V2_ID}"
EOF

echo -e "${GREEN}✅ Deployment info saved to ${DEPLOYMENT_FILE}${NC}\n"

# Step 5: Test external market registration
echo -e "${YELLOW}Step 3: Testing external market registration via GraphQL...${NC}\n"

REGISTRY_URL="http://localhost:8080/chains/${CHAIN_ID}/applications/${REGISTRY_V2_ID}"

# Wait for service to be ready
sleep 3

# Test query to check if Registry is responding
TEST_QUERY='{"query": "{ protocolStats { totalMarkets totalVoters } }"}'

echo -e "${BLUE}Testing Registry endpoint...${NC}"
TEST_RESULT=$(curl -s --max-time 10 "$REGISTRY_URL" \
    -H "Content-Type: application/json" \
    -d "$TEST_QUERY" 2>/dev/null || echo '{"error": "Connection failed"}')

if echo "$TEST_RESULT" | grep -q "protocolStats"; then
    echo -e "${GREEN}✅ Registry is responding!${NC}"
    echo "$TEST_RESULT" | jq '.data.protocolStats' 2>/dev/null || echo "$TEST_RESULT"
else
    echo -e "${YELLOW}⚠️  Registry test query failed${NC}"
    echo "Response: $TEST_RESULT"
fi

echo ""

# Step 6: Display summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Registry v2 Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Registry v2 Application ID:${NC}"
echo -e "${GREEN}${REGISTRY_V2_ID}${NC}"
echo ""
echo -e "${BLUE}GraphQL Endpoint:${NC}"
echo -e "${CYAN}${REGISTRY_URL}${NC}"
echo ""
echo -e "${BLUE}New Features:${NC}"
echo "  ✓ External market registration"
echo "  ✓ Resolution callback mechanism"
echo "  ✓ Market source tracking (Internal/External)"
echo "  ✓ Fee management for external markets"
echo "  ✓ Callback retry logic with exponential backoff"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Source the environment: ${YELLOW}source ${DEPLOYMENT_FILE}${NC}"
echo "  2. Deploy Market Chain v2: ${YELLOW}bash scripts/deploy-market-chain-v2.sh${NC}"
echo "  3. Deploy example external dApp: ${YELLOW}bash scripts/deploy-external-dapp.sh${NC}"
echo "  4. Run end-to-end tests: ${YELLOW}bash scripts/test-oracle-as-a-service.sh${NC}"
echo ""

exit 0
