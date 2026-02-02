#!/bin/bash
# Deploy Oracle Registry v2 with Hybrid Model
# This deploys the updated Registry with:
# - Bond mechanism for market creators
# - Inflation-based voter rewards
# - Dispute mechanism
# - Query metadata support

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Alethea Network Hybrid Model Deploy${NC}"
echo -e "${CYAN}========================================${NC}\n"

# Navigate to contract directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTRACT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$CONTRACT_DIR"

echo -e "${BLUE}Working directory: ${CONTRACT_DIR}${NC}\n"

# Step 1: Build the Registry contract
echo -e "${YELLOW}Step 1: Building Registry contract with Hybrid Model...${NC}"

cargo build --release --target wasm32-unknown-unknown --package oracle-registry-v2 2>&1 | while read line; do
    if echo "$line" | grep -qE "(Compiling|Finished|error|warning:)"; then
        echo "  $line"
    fi
done

BUILD_DIR="target/wasm32-unknown-unknown/release"
CONTRACT_WASM="${BUILD_DIR}/oracle_registry_v2_contract.wasm"
SERVICE_WASM="${BUILD_DIR}/oracle_registry_v2_service.wasm"

if [ ! -f "$CONTRACT_WASM" ] || [ ! -f "$SERVICE_WASM" ]; then
    echo -e "${RED}❌ Build failed. WASM files not found.${NC}"
    echo "Expected:"
    echo "  - $CONTRACT_WASM"
    echo "  - $SERVICE_WASM"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"
echo -e "   Contract: $(du -h $CONTRACT_WASM | cut -f1)"
echo -e "   Service: $(du -h $SERVICE_WASM | cut -f1)\n"

# Step 2: Check for existing deployment and chain
echo -e "${YELLOW}Step 2: Checking environment...${NC}"

# Try to get chain ID from linera
CHAIN_ID=""
if command -v linera &> /dev/null; then
    # Get the default chain from wallet
    CHAIN_ID=$(linera wallet show 2>/dev/null | grep -oP 'Chain ID: \K[a-f0-9]{64}' | head -1 || true)
    
    if [ -z "$CHAIN_ID" ]; then
        echo -e "${YELLOW}⚠️  No default chain found in wallet${NC}"
        echo "Creating a new chain from faucet..."
        
        # Try to create a new chain from faucet
        FAUCET_URL="${FAUCET_URL:-https://faucet.testnet-conway.linera.net}"
        
        # Initialize wallet first if needed
        if [ ! -f "$HOME/.config/linera/wallet.json" ]; then
            echo "Initializing wallet..."
            linera wallet init 2>&1 || true
        fi
        
        # Request a chain from faucet
        echo "Requesting chain from faucet: $FAUCET_URL"
        linera faucet "$FAUCET_URL" 2>&1 || {
            echo -e "${RED}❌ Failed to get chain from faucet${NC}"
            echo ""
            echo "Please manually initialize your wallet and chain:"
            echo "  1. linera wallet init"
            echo "  2. linera faucet https://faucet.testnet-conway.linera.net"
            echo "  3. Re-run this script"
            exit 1
        }
        
        CHAIN_ID=$(linera wallet show 2>/dev/null | grep -oP 'Chain ID: \K[a-f0-9]{64}' | head -1)
    fi
else
    echo -e "${RED}❌ linera CLI not found. Please install Linera SDK.${NC}"
    exit 1
fi

if [ -z "$CHAIN_ID" ]; then
    echo -e "${RED}❌ Could not determine chain ID${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Using Chain ID: ${CHAIN_ID}${NC}\n"

# Step 3: Deploy Registry
echo -e "${YELLOW}Step 3: Publishing and deploying contract...${NC}\n"

DEPLOY_OUTPUT=$(linera publish-and-create \
    "$CONTRACT_WASM" \
    "$SERVICE_WASM" 2>&1)

echo "$DEPLOY_OUTPUT" | head -20

# Extract Application ID - try multiple patterns
REGISTRY_V2_ID=$(echo "$DEPLOY_OUTPUT" | grep -oP '(?:Application|Created application) (?:ID: )?([a-f0-9]{64})' | head -1 | grep -oP '[a-f0-9]{64}')

if [ -z "$REGISTRY_V2_ID" ]; then
    # Try another pattern
    REGISTRY_V2_ID=$(echo "$DEPLOY_OUTPUT" | grep -oP '[a-f0-9]{64}' | tail -1)
fi

if [ -z "$REGISTRY_V2_ID" ]; then
    echo -e "\n${RED}❌ Failed to extract Registry Application ID${NC}"
    echo "Full output:"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo -e "\n${GREEN}✅ Registry v2 deployed successfully!${NC}\n"
echo -e "${GREEN}📋 Registry v2 Application ID:${NC} ${REGISTRY_V2_ID}\n"

# Step 4: Save deployment info
DEPLOYMENT_FILE=".env.hybrid-model"
REGISTRY_URL="http://localhost:8080/chains/${CHAIN_ID}/applications/${REGISTRY_V2_ID}"

cat > "$DEPLOYMENT_FILE" << EOF
# Oracle Registry v2 with Hybrid Model
# Deployed: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# Features: Bond mechanism, Inflation rewards, Dispute system, Query metadata

export ALETHEA_REGISTRY_V2_ID="${REGISTRY_V2_ID}"
export CHAIN_ID="${CHAIN_ID}"
export REGISTRY_V2_URL="${REGISTRY_URL}"

# Hybrid Model Parameters (defaults)
export MIN_BOND="100000000000000000000"  # 100 ALTH (in attos)
export INFLATION_RATE_BPS="500"          # 5% annual
export DISPUTE_WINDOW_SECS="3600"        # 1 hour
EOF

echo -e "${GREEN}✅ Deployment info saved to ${DEPLOYMENT_FILE}${NC}\n"

# Also update .env.fresh with the new registry
if [ -f ".env.fresh" ]; then
    echo -e "${BLUE}Updating .env.fresh with new registry ID...${NC}"
    # Append the new registry info
    cat >> ".env.fresh" << EOF

# Oracle Registry v2 with Hybrid Model (Updated: $(date -u +"%Y-%m-%dT%H:%M:%SZ"))
export ALETHEA_REGISTRY_V2_ID="${REGISTRY_V2_ID}"
export REGISTRY_V2_URL="${REGISTRY_URL}"
EOF
fi

# Step 5: Wait for service and test
echo -e "${YELLOW}Step 4: Testing deployment...${NC}\n"

sleep 3

# Test hybrid model stats query
TEST_QUERY='{"query": "{ hybridModelStats { inflationPool bondPool } statistics { totalVoters totalQueriesCreated } }"}'

echo -e "${BLUE}Testing Hybrid Model endpoint...${NC}"
TEST_RESULT=$(curl -s --max-time 10 "$REGISTRY_URL" \
    -H "Content-Type: application/json" \
    -d "$TEST_QUERY" 2>/dev/null || echo '{"error": "Connection failed"}')

if echo "$TEST_RESULT" | grep -q "hybridModelStats"; then
    echo -e "${GREEN}✅ Registry with Hybrid Model is responding!${NC}"
    echo "$TEST_RESULT" | jq '.' 2>/dev/null || echo "$TEST_RESULT"
else
    echo -e "${YELLOW}⚠️  Test query needs service to be running${NC}"
    echo "Response: $TEST_RESULT"
    echo ""
    echo -e "${BLUE}Make sure linera service is running:${NC}"
    echo "  linera service --port 8080"
fi

echo ""

# Step 6: Display summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Hybrid Model Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Registry v2 Application ID:${NC}"
echo -e "${CYAN}${REGISTRY_V2_ID}${NC}"
echo ""
echo -e "${BLUE}Chain ID:${NC}"
echo -e "${CYAN}${CHAIN_ID}${NC}"
echo ""
echo -e "${BLUE}GraphQL Endpoint:${NC}"
echo -e "${CYAN}${REGISTRY_URL}${NC}"
echo ""
echo -e "${BLUE}New Hybrid Model Features:${NC}"
echo "  ✓ Bond mechanism for market creators (refundable)"
echo "  ✓ Inflation-based voter rewards"
echo "  ✓ Dispute mechanism for resolution challenges"
echo "  ✓ Priority fees for faster resolution"
echo "  ✓ Rich query metadata support"
echo "  ✓ Bond pool and inflation pool tracking"
echo ""
echo -e "${BLUE}Quick Test Commands:${NC}"
echo ""
echo "  # Check hybrid model stats"
echo "  curl -s '$REGISTRY_URL' \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"query\": \"{ hybridModelStats { inflationPool bondPool } }\"}'"
echo ""
echo "  # Create query with bond"
echo "  curl -s '$REGISTRY_URL' \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"query\": \"mutation { createQueryWithBond(description: \\\"Test\\\" outcomes: [\\\"Yes\\\", \\\"No\\\"] bondAmount: \\\"100.\\\") }\"}'"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Source the environment: ${YELLOW}source ${DEPLOYMENT_FILE}${NC}"
echo "  2. Start inflation scheduler: ${YELLOW}node ../alethea-dashboard-vite/server/inflation-scheduler.js${NC}"
echo "  3. Update dashboard config with new registry URL"
echo "  4. Run integration tests"
echo ""

exit 0
