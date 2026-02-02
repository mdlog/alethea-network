#!/bin/bash
# Deploy dengan retry mechanism untuk menangani testnet instability

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Retry configuration
MAX_RETRIES=5
RETRY_DELAY=30  # seconds

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     ALETHEA NETWORK - DEPLOYMENT WITH RETRY                  ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to retry command
retry_command() {
    local cmd="$1"
    local description="$2"
    local attempt=1
    
    while [ $attempt -le $MAX_RETRIES ]; do
        echo -e "${YELLOW}Attempt $attempt/$MAX_RETRIES: $description${NC}"
        
        if eval "$cmd"; then
            echo -e "${GREEN}✓ Success: $description${NC}"
            return 0
        else
            if [ $attempt -lt $MAX_RETRIES ]; then
                echo -e "${YELLOW}⚠ Failed, waiting ${RETRY_DELAY}s before retry...${NC}"
                sleep $RETRY_DELAY
                
                # Sync before retry
                echo -e "${BLUE}Syncing chain before retry...${NC}"
                pkill -f "linera service" 2>/dev/null || true
                sleep 2
                linera sync 2>&1 | tail -3 || true
            fi
        fi
        
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ Failed after $MAX_RETRIES attempts: $description${NC}"
    return 1
}

# Step 1: Build
echo -e "${BLUE}[1/8] Building contracts...${NC}"
cargo build --release --target wasm32-unknown-unknown 2>&1 | tail -5
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# Step 2: Get Chain & Owner
echo -e "${BLUE}[2/8] Getting default chain...${NC}"

# Use correct chain ID (from .env.local or override via CHAIN_ID env var)
if [ -n "$CHAIN_ID" ]; then
    DEFAULT_CHAIN="$CHAIN_ID"
    echo -e "${YELLOW}Using CHAIN_ID from environment: $DEFAULT_CHAIN${NC}"
else
    # Try to get from .env.local first
    if [ -f "../alethea-dashboard-vite/.env.local" ]; then
        DEFAULT_CHAIN=$(grep "^VITE_CHAIN_ID=" ../alethea-dashboard-vite/.env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    fi
    
    # If not found, use the correct chain ID (from previous successful deployment)
    if [ -z "$DEFAULT_CHAIN" ] || [ "$DEFAULT_CHAIN" = "" ]; then
        DEFAULT_CHAIN="9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec"
        echo -e "${YELLOW}Using hardcoded chain ID: $DEFAULT_CHAIN${NC}"
    else
        echo -e "${YELLOW}Using chain ID from .env.local: $DEFAULT_CHAIN${NC}"
    fi
fi

# Get owner from wallet
WALLET_OUTPUT=$(linera wallet show 2>&1)
OWNER=$(echo "$WALLET_OUTPUT" | grep -oP 'AccountOwner:\s*\K0x[a-f0-9]+' | head -1)

# Set wallet to use correct chain
echo -e "${BLUE}Setting wallet default chain to: $DEFAULT_CHAIN${NC}"
linera wallet set-default "$DEFAULT_CHAIN" 2>&1 || true

echo -e "${GREEN}Chain: $DEFAULT_CHAIN${NC}"
echo -e "${GREEN}Owner: ${OWNER:-Not found}${NC}"
echo ""

# Step 3: Publish Token Module
echo -e "${BLUE}[3/8] Publishing Token Module...${NC}"
TOKEN_MODULE_ID=""
if retry_command \
    "TOKEN_MODULE_ID=\$(linera publish-module target/wasm32-unknown-unknown/release/alethea-token-contract.wasm target/wasm32-unknown-unknown/release/alethea-token-service.wasm 2>&1 | grep -oE '[a-f0-9]{130}' | head -1) && [ -n \"\$TOKEN_MODULE_ID\" ]" \
    "Publish Token Module"; then
    echo -e "${GREEN}Token Module ID: $TOKEN_MODULE_ID${NC}"
    sleep 10
else
    echo -e "${RED}Failed to publish Token Module${NC}"
    exit 1
fi
echo ""

# Step 4: Create Token Application
echo -e "${BLUE}[4/8] Creating Token Application...${NC}"
if [ -n "$OWNER" ] && [ "$OWNER" != "-" ]; then
    cat > /tmp/token_init.json <<EOF
{
    "accounts": {
        "$OWNER": "1000000000."
    },
    "admin": "$OWNER"
}
EOF
else
    cat > /tmp/token_init.json <<EOF
{
    "accounts": {},
    "admin": {"Chain": "$DEFAULT_CHAIN"}
}
EOF
fi

cat > /tmp/token_params.json <<EOF
{
    "name": "Alethea",
    "symbol": "ALTH",
    "decimals": 18,
    "registry_app_id": null,
    "min_stake_amount": "100.",
    "max_stake_amount": "10000000.",
    "max_stake_per_user": "1000000."
}
EOF

TOKEN_APP_ID=""
if retry_command \
    "TOKEN_APP_ID=\$(linera create-application \"$TOKEN_MODULE_ID\" --json-parameters \"\$(cat /tmp/token_params.json)\" --json-argument \"\$(cat /tmp/token_init.json)\" 2>&1 | grep -oP '[a-f0-9]{64}' | tail -1) && [ -n \"\$TOKEN_APP_ID\" ]" \
    "Create Token Application"; then
    echo -e "${GREEN}Token Application ID: $TOKEN_APP_ID${NC}"
else
    echo -e "${RED}Failed to create Token Application${NC}"
    exit 1
fi
echo ""

# Step 5: Publish Registry Module
echo -e "${BLUE}[5/8] Publishing Registry Module...${NC}"
REGISTRY_MODULE_ID=""
if retry_command \
    "REGISTRY_MODULE_ID=\$(linera publish-module target/wasm32-unknown-unknown/release/oracle_registry_v2_contract.wasm target/wasm32-unknown-unknown/release/oracle_registry_v2_service.wasm 2>&1 | grep -oE '[a-f0-9]{130}' | head -1) && [ -n \"\$REGISTRY_MODULE_ID\" ]" \
    "Publish Registry Module"; then
    echo -e "${GREEN}Registry Module ID: $REGISTRY_MODULE_ID${NC}"
    sleep 10
else
    echo -e "${RED}Failed to publish Registry Module${NC}"
    exit 1
fi
echo ""

# Step 6: Create Registry Application
echo -e "${BLUE}[6/8] Creating Registry Application...${NC}"
REGISTRY_APP_ID=""
if retry_command \
    "REGISTRY_APP_ID=\$(linera create-application \"$REGISTRY_MODULE_ID\" --json-argument '\"Hub\"' 2>&1 | grep -oP '[a-f0-9]{64}' | tail -1) && [ -n \"\$REGISTRY_APP_ID\" ]" \
    "Create Registry Application"; then
    echo -e "${GREEN}Registry Application ID: $REGISTRY_APP_ID${NC}"
else
    echo -e "${RED}Failed to create Registry Application${NC}"
    exit 1
fi
echo ""

# Step 7: Sync & Process Inbox
echo -e "${BLUE}[7/8] Syncing and processing inbox...${NC}"
pkill -f "linera service" 2>/dev/null || true
sleep 2
linera sync 2>&1 | tail -3
linera process-inbox 2>&1 | tail -3
echo -e "${GREEN}✓ Sync complete${NC}"
echo ""

# Step 8: Summary
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              DEPLOYMENT COMPLETE!                            ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Token Module ID:${NC} $TOKEN_MODULE_ID"
echo -e "${GREEN}Token Application ID:${NC} $TOKEN_APP_ID"
echo ""
echo -e "${GREEN}Registry Module ID:${NC} $REGISTRY_MODULE_ID"
echo -e "${GREEN}Registry Application ID:${NC} $REGISTRY_APP_ID"
echo ""
echo -e "${YELLOW}Update .env.local:${NC}"
echo "VITE_TOKEN_APP_ID=$TOKEN_APP_ID"
echo "VITE_REGISTRY_APP_ID=$REGISTRY_APP_ID"
echo "VITE_CHAIN_ID=$DEFAULT_CHAIN"
echo ""
