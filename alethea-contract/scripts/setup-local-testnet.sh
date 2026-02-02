#!/bin/bash
# Setup local testnet untuk testing saat Conway testnet bermasalah
# Script ini akan setup local network dan deploy ulang contracts

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🏠 Setting Up Local Testnet${NC}\n"

# Step 1: Stop any existing services
echo -e "${YELLOW}Step 1: Cleaning up existing processes...${NC}"
pkill -9 -f "linera" 2>/dev/null || echo "  No linera processes running"
sleep 2

# Step 2: Start local testnet
echo -e "${YELLOW}Step 2: Starting local testnet...${NC}"
rm -rf /tmp/.tmp* 2>/dev/null || true
linera net up --testing-prng-seed 37 &
NETWORK_PID=$!
echo "  Local network started with PID: $NETWORK_PID"
sleep 5

# Step 3: Initialize wallet for local testnet
echo -e "${YELLOW}Step 3: Initializing wallet for local testnet...${NC}"
export LINERA_WALLET="$HOME/.config/linera/wallet_local.json"
export LINERA_STORAGE="rocksdb:$HOME/.config/linera/client_local.db"

linera wallet init --with-new-chain
CHAIN_ID=$(linera wallet show | grep "Public Key" -A 1 | tail -1 | awk '{print $1}')
echo "  Chain ID: $CHAIN_ID"

# Step 4: Build contracts
echo -e "${YELLOW}Step 4: Building contracts...${NC}"
cargo build --release --target wasm32-unknown-unknown -p oracle-registry
cargo build --release --target wasm32-unknown-unknown -p voter-template

# Step 5: Deploy Oracle Registry
echo -e "${YELLOW}Step 5: Deploying Oracle Registry...${NC}"
REGISTRY_BYTECODE=$(linera publish-bytecode \
  target/wasm32-unknown-unknown/release/oracle_registry_contract.wasm \
  target/wasm32-unknown-unknown/release/oracle_registry_service.wasm)
echo "  Registry Bytecode: $REGISTRY_BYTECODE"

REGISTRY_APP=$(linera create-application $REGISTRY_BYTECODE \
  --json-parameters '{"min_voters": 3}' \
  --json-argument '{}')
echo "  Registry App: $REGISTRY_APP"

# Step 6: Deploy Voter Template
echo -e "${YELLOW}Step 6: Deploying Voter Template...${NC}"
VOTER_BYTECODE=$(linera publish-bytecode \
  target/wasm32-unknown-unknown/release/voter_template_contract.wasm \
  target/wasm32-unknown-unknown/release/voter_template_service.wasm)
echo "  Voter Bytecode: $VOTER_BYTECODE"

# Create 3 voters
VOTER_1=$(linera create-application $VOTER_BYTECODE \
  --json-parameters '{"min_stake": "100"}' \
  --json-argument '{"initial_stake": "1000"}')
echo "  Voter 1: $VOTER_1"

VOTER_2=$(linera create-application $VOTER_BYTECODE \
  --json-parameters '{"min_stake": "100"}' \
  --json-argument '{"initial_stake": "2000"}')
echo "  Voter 2: $VOTER_2"

VOTER_3=$(linera create-application $VOTER_BYTECODE \
  --json-parameters '{"min_stake": "100"}' \
  --json-argument '{"initial_stake": "3000"}')
echo "  Voter 3: $VOTER_3"

# Step 7: Create local environment file
echo -e "${YELLOW}Step 7: Creating local environment file...${NC}"
cat > .env.local << EOF
# Local Testnet Configuration
CHAIN_ID=$CHAIN_ID
ALETHEA_REGISTRY_ID=$REGISTRY_APP
VOTER_TEMPLATE_ID=$VOTER_BYTECODE
VOTER_1_ID=$VOTER_1
VOTER_2_ID=$VOTER_2
VOTER_3_ID=$VOTER_3

# Network
NETWORK=local
LINERA_WALLET=$LINERA_WALLET
LINERA_STORAGE=$LINERA_STORAGE
EOF

echo "  Environment saved to .env.local"

# Step 8: Start GraphQL service
echo -e "${YELLOW}Step 8: Starting GraphQL service...${NC}"
nohup linera service --port 8080 > /tmp/linera-service-local.log 2>&1 &
SERVICE_PID=$!
echo "  Service started with PID: $SERVICE_PID"

# Step 9: Wait for service to be ready
echo -e "${YELLOW}Step 9: Waiting for service to be ready...${NC}"
MAX_WAIT=60
WAITED=0
SERVICE_READY=false

while [ $WAITED -lt $MAX_WAIT ]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://localhost:8080" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ Service ready! (HTTP $HTTP_CODE)${NC}"
        SERVICE_READY=true
        break
    fi
    
    echo "  Waiting... ($WAITED/$MAX_WAIT seconds) - HTTP $HTTP_CODE"
    sleep 5
    WAITED=$((WAITED + 5))
done

# Step 10: Test deployment
echo -e "${YELLOW}Step 10: Testing deployment...${NC}"
if [ "$SERVICE_READY" = true ]; then
    REGISTRY_URL="http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_APP"
    
    TEST_RESULT=$(curl -s --max-time 10 "$REGISTRY_URL" -H "Content-Type: application/json" \
        -d '{"query": "{ protocolStats { totalMarkets totalVoters } }"}' 2>/dev/null || echo "")
    
    if echo "$TEST_RESULT" | grep -q "protocolStats"; then
        echo -e "${GREEN}✅ Registry working!${NC}"
        echo "$TEST_RESULT" | jq '.data.protocolStats' 2>/dev/null
    else
        echo -e "${YELLOW}⚠️  Registry test failed${NC}"
        echo "Response: $TEST_RESULT"
    fi
fi

# Step 11: Final status
echo -e "${YELLOW}Step 11: Final status...${NC}"
if [ "$SERVICE_READY" = true ]; then
    echo -e "${GREEN}✅ SUCCESS! Local testnet is ready${NC}"
    echo ""
    echo "Local Testnet Info:"
    echo "  Chain ID: $CHAIN_ID"
    echo "  Registry: $REGISTRY_APP"
    echo "  Voters: $VOTER_1, $VOTER_2, $VOTER_3"
    echo "  GraphiQL: http://localhost:8080"
    echo "  Registry URL: $REGISTRY_URL"
    echo ""
    echo "Environment:"
    echo "  export LINERA_WALLET=$LINERA_WALLET"
    echo "  export LINERA_STORAGE=$LINERA_STORAGE"
    echo "  source .env.local"
    echo ""
    echo -e "${BLUE}Ready to test!${NC}"
    echo "  bash scripts/test-voter-registration-local.sh"
else
    echo -e "${RED}❌ Local testnet setup failed${NC}"
    echo "Check logs: tail -f /tmp/linera-service-local.log"
fi

echo ""
echo -e "${BLUE}✅ Local testnet setup complete!${NC}"