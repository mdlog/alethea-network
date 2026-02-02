#!/bin/bash
# Deploy Account-Based Oracle Registry v2
# Simplified registry where voters register with their account address

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}🚀 Deploying Account-Based Oracle Registry v2${NC}\n"

# Step 1: Build the Registry contract
echo -e "${YELLOW}Step 1: Building Account-Based Registry contract...${NC}"
cargo build --release --target wasm32-unknown-unknown --package oracle-registry-v2 2>&1 | grep -E "(Compiling|Finished|error)" || true

BUILD_DIR="target/wasm32-unknown-unknown/release"
CONTRACT_WASM="${BUILD_DIR}/oracle_registry_v2_contract.wasm"
SERVICE_WASM="${BUILD_DIR}/oracle_registry_v2_service.wasm"

if [ ! -f "$CONTRACT_WASM" ] || [ ! -f "$SERVICE_WASM" ]; then
    echo -e "${RED}❌ Build failed. WASM files not found.${NC}"
    echo -e "${RED}   Expected: $CONTRACT_WASM${NC}"
    echo -e "${RED}   Expected: $SERVICE_WASM${NC}"
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
    echo -e "${YELLOW}⚠️  .env.fresh not found, using default chain${NC}\n"
fi

# Step 3: Deploy Registry
echo -e "${YELLOW}Step 2: Deploying Account-Based Registry to chain...${NC}\n"

# Registry parameters for account-based voting
# These are simplified compared to the old registry
PARAMS='{
  "min_stake": "1000",
  "min_voters_per_query": 3,
  "base_reward": "100",
  "reputation_multiplier": 10,
  "slash_percentage": 10,
  "min_reputation": 0
}'

echo -e "${BLUE}Parameters:${NC}"
echo "$PARAMS" | jq '.' 2>/dev/null || echo "$PARAMS"
echo ""

echo -e "${BLUE}Deploying contract...${NC}"
DEPLOY_OUTPUT=$(linera publish-and-create \
    "$CONTRACT_WASM" \
    "$SERVICE_WASM" \
    --json-parameters "$PARAMS" 2>&1)

echo "$DEPLOY_OUTPUT"

# Extract Application ID
REGISTRY_V2_ID=$(echo "$DEPLOY_OUTPUT" | grep -oP 'Application ID: \K[a-f0-9]{64}' | head -1)

if [ -z "$REGISTRY_V2_ID" ]; then
    echo -e "\n${RED}❌ Failed to extract Registry Application ID${NC}"
    echo -e "${YELLOW}Trying alternative extraction method...${NC}"
    REGISTRY_V2_ID=$(echo "$DEPLOY_OUTPUT" | grep -oP '[a-f0-9]{64}' | head -1)
fi

if [ -z "$REGISTRY_V2_ID" ]; then
    echo -e "${RED}❌ Could not extract Application ID from deployment output${NC}"
    exit 1
fi

echo -e "\n${GREEN}✅ Account-Based Registry deployed successfully!${NC}\n"
echo -e "${GREEN}📋 Registry Application ID:${NC} ${REGISTRY_V2_ID}\n"

# Step 4: Save deployment info
DEPLOYMENT_FILE=".env.account-based-registry"
cat > "$DEPLOYMENT_FILE" << EOF
# Account-Based Oracle Registry v2
# Deployed: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

export ACCOUNT_BASED_REGISTRY_ID="${REGISTRY_V2_ID}"
export CHAIN_ID="${CHAIN_ID:-default}"
export REGISTRY_V2_URL="http://localhost:8080/chains/\${CHAIN_ID}/applications/${REGISTRY_V2_ID}"

# Deployment Parameters
export MIN_STAKE="1000"
export MIN_VOTERS_PER_QUERY="3"
export BASE_REWARD="100"
export REPUTATION_MULTIPLIER="10"
export SLASH_PERCENTAGE="10"
EOF

echo -e "${GREEN}✅ Deployment info saved to ${DEPLOYMENT_FILE}${NC}\n"

# Step 5: Test registry endpoint
echo -e "${YELLOW}Step 3: Testing Registry endpoint...${NC}\n"

if [ -n "$CHAIN_ID" ]; then
    REGISTRY_URL="http://localhost:8080/chains/${CHAIN_ID}/applications/${REGISTRY_V2_ID}"
    
    # Wait for service to be ready
    echo -e "${BLUE}Waiting for service to initialize...${NC}"
    sleep 3
    
    # Test query to check if Registry is responding
    TEST_QUERY='{"query": "{ statistics { totalVoters totalQueries } }"}'
    
    echo -e "${BLUE}Testing Registry GraphQL endpoint...${NC}"
    TEST_RESULT=$(curl -s --max-time 10 "$REGISTRY_URL" \
        -H "Content-Type: application/json" \
        -d "$TEST_QUERY" 2>/dev/null || echo '{"error": "Connection failed"}')
    
    if echo "$TEST_RESULT" | grep -q "statistics\|totalVoters"; then
        echo -e "${GREEN}✅ Registry is responding!${NC}"
        echo "$TEST_RESULT" | jq '.' 2>/dev/null || echo "$TEST_RESULT"
    else
        echo -e "${YELLOW}⚠️  Registry test query returned unexpected response${NC}"
        echo "Response: $TEST_RESULT"
        echo -e "${BLUE}Note: Service may still be initializing${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  CHAIN_ID not set, skipping endpoint test${NC}"
fi

echo ""

# Step 6: Display summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Registry Application ID:${NC}"
echo -e "${GREEN}${REGISTRY_V2_ID}${NC}"
echo ""

if [ -n "$CHAIN_ID" ]; then
    echo -e "${BLUE}GraphQL Endpoint:${NC}"
    echo -e "${CYAN}http://localhost:8080/chains/${CHAIN_ID}/applications/${REGISTRY_V2_ID}${NC}"
    echo ""
fi

echo -e "${BLUE}Key Features:${NC}"
echo "  ✓ Account-based voter registration (no separate apps)"
echo "  ✓ Direct voting on registry chain"
echo "  ✓ Simplified stake management"
echo "  ✓ Automatic reward distribution"
echo "  ✓ Reputation tracking"
echo "  ✓ Multiple decision strategies (Majority, Weighted, Consensus)"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Source the environment: ${YELLOW}source ${DEPLOYMENT_FILE}${NC}"
echo "  2. Register as a voter:"
echo "     ${CYAN}linera request-application \${ACCOUNT_BASED_REGISTRY_ID} \\${NC}"
echo "     ${CYAN}  --operation '{\"RegisterVoter\": {\"stake\": \"1000\", \"name\": \"Alice\"}}'${NC}"
echo "  3. Create a query:"
echo "     ${CYAN}linera request-application \${ACCOUNT_BASED_REGISTRY_ID} \\${NC}"
echo "     ${CYAN}  --operation '{\"CreateQuery\": {...}}'${NC}"
echo "  4. Submit votes and test the workflow"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "  - Spec: .kiro/specs/account-based-registry/spec.md"
echo "  - Tasks: .kiro/specs/account-based-registry/tasks.md"
echo ""

exit 0
