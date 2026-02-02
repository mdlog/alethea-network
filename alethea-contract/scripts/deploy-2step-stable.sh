#!/bin/bash

# ============================================================
# Alethea Network - STABLE 2-Step Deployment Script
# 
# ✅ FIXED: Menggunakan 2-step approach untuk menghindari blob pruning
# 
# Root Cause Fix:
# - publish-and-create = shortcut yang rawan di testnet
# - Blob tidak dijamin durable, validator bisa prune
# - Solusi: publish-module dulu, baru create-application
#
# Usage:
#   ./deploy-2step-stable.sh
#
# Prerequisites:
#   - linera CLI installed
#   - Wallet configured for Conway testnet
# ============================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     ALETHEA NETWORK - STABLE 2-STEP DEPLOYMENT               ║${NC}"
echo -e "${CYAN}║     Fix: Blob Pruning Prevention                             ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

# Token parameters
TOKEN_NAME="Alethea"
TOKEN_SYMBOL="ALTH"
TOKEN_DECIMALS=18
INITIAL_SUPPLY="1000000000."

# Get default chain (with owner)
echo -e "${BLUE}[1/8] Getting default chain...${NC}"
WALLET_OUTPUT=$(linera wallet show 2>&1)

# Parse wallet output to find chain with owner
CHAIN_WITH_OWNER=""
OWNER=""
CURRENT_CHAIN=""

# Get all lines with chain IDs and their owners
while IFS= read -r line; do
    # Check if line contains a chain ID (64 hex chars at start after │)
    if [[ "$line" =~ ^│[[:space:]]*([a-f0-9]{64}) ]]; then
        CURRENT_CHAIN="${BASH_REMATCH[1]}"
    fi
    # Check if line contains AccountOwner with valid address (0x...)
    if [[ "$line" =~ AccountOwner:[[:space:]]*(0x[a-f0-9]+) ]]; then
        OWNER="${BASH_REMATCH[1]}"
        CHAIN_WITH_OWNER="$CURRENT_CHAIN"
        echo -e "${GREEN}  Found chain with owner:${NC}"
        echo "    Chain: $CHAIN_WITH_OWNER"
        echo "    Owner: $OWNER"
        break
    fi
done <<< "$WALLET_OUTPUT"

# Use the chain with owner as our deployment chain
if [ -n "$CHAIN_WITH_OWNER" ]; then
    DEFAULT_CHAIN="$CHAIN_WITH_OWNER"
else
    # Fallback to first chain
    DEFAULT_CHAIN=$(echo "$WALLET_OUTPUT" | grep -E "^│ [a-f0-9]{64}" | head -1 | awk '{print $2}')
    if [ -z "$DEFAULT_CHAIN" ]; then
        DEFAULT_CHAIN=$(echo "$WALLET_OUTPUT" | grep -oP '[a-f0-9]{64}' | head -1)
    fi
fi

if [ -z "$DEFAULT_CHAIN" ]; then
    echo -e "${RED}❌ Could not determine default chain${NC}"
    exit 1
fi

if [ -z "$OWNER" ] || [ "$OWNER" = "-" ]; then
    echo -e "${YELLOW}⚠ No valid owner found - using chain without owner${NC}"
fi

echo -e "${GREEN}  ✓ Using Chain: ${DEFAULT_CHAIN}${NC}"
echo ""

# ============================================================
# Step 1: Build Contracts
# ============================================================
echo -e "${BLUE}[2/8] Building contracts...${NC}"
cargo build --release --target wasm32-unknown-unknown 2>&1 | tail -5

if [ ! -f "target/wasm32-unknown-unknown/release/alethea-token-contract.wasm" ] || \
   [ ! -f "target/wasm32-unknown-unknown/release/oracle_registry_v2_contract.wasm" ]; then
    echo -e "${RED}❌ Build failed - WASM files not found${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Build successful${NC}"
echo ""

# ============================================================
# Step 2: Publish Token Module (STEP 1 of 2-step)
# ============================================================
echo -e "${BLUE}[3/8] Publishing Token Module (Step 1/2)...${NC}"
echo -e "${YELLOW}  ⚠ Using 2-step approach to prevent blob pruning${NC}"

set +e
TOKEN_PUBLISH_OUTPUT=$(linera publish-module \
    target/wasm32-unknown-unknown/release/alethea-token-contract.wasm \
    target/wasm32-unknown-unknown/release/alethea-token-service.wasm 2>&1)
TOKEN_PUBLISH_EXIT=$?
set -e

if [ $TOKEN_PUBLISH_EXIT -ne 0 ]; then
    echo -e "${RED}❌ Token module publish failed${NC}"
    echo "$TOKEN_PUBLISH_OUTPUT"
    exit 1
fi

echo "$TOKEN_PUBLISH_OUTPUT"

# Extract Module ID (Module ID = ContractHash(64) + ServiceHash(64) + VM runtime(2) = 130 chars)
# Module ID appears as a standalone line of exactly 130 hex characters
# From output: appears after "find_received_certificates finished" as a single line

# Method 1: Find standalone line with exactly 130 hex chars (most reliable)
TOKEN_MODULE_ID=$(echo "$TOKEN_PUBLISH_OUTPUT" | grep -xE '^[a-f0-9]{130}$' | head -1)

# Method 2: Find line with exactly 130 hex chars (without ^$ anchors)
if [ -z "$TOKEN_MODULE_ID" ]; then
    TOKEN_MODULE_ID=$(echo "$TOKEN_PUBLISH_OUTPUT" | grep -xE '[a-f0-9]{130}' | head -1)
fi

# Method 3: Extract 130-char hex string from anywhere in output
if [ -z "$TOKEN_MODULE_ID" ]; then
    TOKEN_MODULE_ID=$(echo "$TOKEN_PUBLISH_OUTPUT" | grep -oE '[a-f0-9]{130}' | head -1)
fi

# Method 4: Fallback - try 128-130 range (in case format slightly different)
if [ -z "$TOKEN_MODULE_ID" ]; then
    TOKEN_MODULE_ID=$(echo "$TOKEN_PUBLISH_OUTPUT" | grep -oE '[a-f0-9]{128,130}' | head -1)
fi

if [ -z "$TOKEN_MODULE_ID" ]; then
    echo -e "${RED}❌ Failed to extract Token Module ID${NC}"
    echo "Debug: Full output:"
    echo "$TOKEN_PUBLISH_OUTPUT"
    echo ""
    echo "Debug: Looking for hex strings:"
    echo "$TOKEN_PUBLISH_OUTPUT" | grep -E '[a-f0-9]{64,}'
    exit 1
fi

echo -e "${GREEN}  ✓ Token Module ID: ${TOKEN_MODULE_ID}${NC}"
echo -e "${YELLOW}  ⏳ Waiting 10 seconds for blob replication...${NC}"
sleep 10
echo ""

# ============================================================
# Step 3: Create Token Application (STEP 2 of 2-step)
# ============================================================
echo -e "${BLUE}[4/8] Creating Token Application (Step 2/2)...${NC}"

# Prepare token init JSON (matching deploy-complete-system.sh format)
# accounts: BTreeMap<AccountOwner, Amount> - use object with owner as key
# admin: Option<AccountOwner> - use owner string directly
if [ -n "$OWNER" ] && [ "$OWNER" != "-" ]; then
    # Use owner address (0x...) for admin and accounts
    cat > /tmp/token_init.json <<EOF
{
    "accounts": {
        "$OWNER": "$INITIAL_SUPPLY"
    },
    "admin": "$OWNER"
}
EOF
else
    # Fallback: use Chain as admin (format: {"Chain": "..."})
    cat > /tmp/token_init.json <<EOF
{
    "accounts": {},
    "admin": {"Chain": "$DEFAULT_CHAIN"}
}
EOF
fi

# Prepare token params JSON (matching deploy-complete-system.sh format)
cat > /tmp/token_params.json <<EOF
{
    "name": "$TOKEN_NAME",
    "symbol": "$TOKEN_SYMBOL",
    "decimals": $TOKEN_DECIMALS,
    "registry_app_id": null,
    "min_stake_amount": "100.",
    "max_stake_amount": "10000000.",
    "max_stake_per_user": "1000000."
}
EOF

set +e
TOKEN_CREATE_OUTPUT=$(linera create-application \
    "$TOKEN_MODULE_ID" \
    --json-parameters "$(cat /tmp/token_params.json)" \
    --json-argument "$(cat /tmp/token_init.json)" 2>&1)
TOKEN_CREATE_EXIT=$?
set -e

if [ $TOKEN_CREATE_EXIT -ne 0 ]; then
    echo -e "${RED}❌ Token application creation failed${NC}"
    echo "$TOKEN_CREATE_OUTPUT"
    exit 1
fi

echo "$TOKEN_CREATE_OUTPUT"

# Extract Application ID
TOKEN_APP_ID=$(echo "$TOKEN_CREATE_OUTPUT" | grep -oP '[a-f0-9]{64}' | tail -1)

if [ -z "$TOKEN_APP_ID" ]; then
    echo -e "${RED}❌ Failed to extract Token Application ID${NC}"
    exit 1
fi

echo -e "${GREEN}  ✓ Token Application ID: ${TOKEN_APP_ID}${NC}"
echo ""

# ============================================================
# Step 4: Publish Registry Module (STEP 1 of 2-step)
# ============================================================
echo -e "${BLUE}[5/8] Publishing Registry Module (Step 1/2)...${NC}"

set +e
REGISTRY_PUBLISH_OUTPUT=$(linera publish-module \
    target/wasm32-unknown-unknown/release/oracle_registry_v2_contract.wasm \
    target/wasm32-unknown-unknown/release/oracle_registry_v2_service.wasm 2>&1)
REGISTRY_PUBLISH_EXIT=$?
set -e

if [ $REGISTRY_PUBLISH_EXIT -ne 0 ]; then
    echo -e "${RED}❌ Registry module publish failed${NC}"
    echo "$REGISTRY_PUBLISH_OUTPUT"
    exit 1
fi

echo "$REGISTRY_PUBLISH_OUTPUT"

# Extract Module ID (Module ID = ContractHash(64) + ServiceHash(64) + VM runtime(2) = 130 chars)
# Method 1: Find standalone line with exactly 130 hex chars (most reliable)
REGISTRY_MODULE_ID=$(echo "$REGISTRY_PUBLISH_OUTPUT" | grep -xE '^[a-f0-9]{130}$' | head -1)

# Method 2: Find line with exactly 130 hex chars (without ^$ anchors)
if [ -z "$REGISTRY_MODULE_ID" ]; then
    REGISTRY_MODULE_ID=$(echo "$REGISTRY_PUBLISH_OUTPUT" | grep -xE '[a-f0-9]{130}' | head -1)
fi

# Method 3: Extract 130-char hex string from anywhere in output
if [ -z "$REGISTRY_MODULE_ID" ]; then
    REGISTRY_MODULE_ID=$(echo "$REGISTRY_PUBLISH_OUTPUT" | grep -oE '[a-f0-9]{130}' | head -1)
fi

# Method 4: Fallback - try 128-130 range (in case format slightly different)
if [ -z "$REGISTRY_MODULE_ID" ]; then
    REGISTRY_MODULE_ID=$(echo "$REGISTRY_PUBLISH_OUTPUT" | grep -oE '[a-f0-9]{128,130}' | head -1)
fi

if [ -z "$REGISTRY_MODULE_ID" ]; then
    echo -e "${RED}❌ Failed to extract Registry Module ID${NC}"
    echo "Debug: Full output:"
    echo "$REGISTRY_PUBLISH_OUTPUT"
    echo ""
    echo "Debug: Looking for hex strings:"
    echo "$REGISTRY_PUBLISH_OUTPUT" | grep -E '[a-f0-9]{64,}'
    exit 1
fi

echo -e "${GREEN}  ✓ Registry Module ID: ${REGISTRY_MODULE_ID}${NC}"
echo -e "${YELLOW}  ⏳ Waiting 10 seconds for blob replication...${NC}"
sleep 10
echo ""

# ============================================================
# Step 5: Create Registry Application (STEP 2 of 2-step)
# ============================================================
echo -e "${BLUE}[6/8] Creating Registry Application (Step 2/2)...${NC}"

set +e
REGISTRY_CREATE_OUTPUT=$(linera create-application \
    "$REGISTRY_MODULE_ID" \
    --json-argument '"Hub"' 2>&1)
REGISTRY_CREATE_EXIT=$?
set -e

if [ $REGISTRY_CREATE_EXIT -ne 0 ]; then
    echo -e "${RED}❌ Registry application creation failed${NC}"
    echo "$REGISTRY_CREATE_OUTPUT"
    exit 1
fi

echo "$REGISTRY_CREATE_OUTPUT"

# Extract Application ID
REGISTRY_APP_ID=$(echo "$REGISTRY_CREATE_OUTPUT" | grep -oP '[a-f0-9]{64}' | tail -1)

if [ -z "$REGISTRY_APP_ID" ]; then
    echo -e "${RED}❌ Failed to extract Registry Application ID${NC}"
    exit 1
fi

echo -e "${GREEN}  ✓ Registry Application ID: ${REGISTRY_APP_ID}${NC}"
echo ""

# ============================================================
# Step 6: Sync and Process Inbox
# ============================================================
echo -e "${BLUE}[7/8] Syncing and processing inbox...${NC}"

# Stop service if running
pkill -f "linera service" 2>/dev/null || true
sleep 2

echo -e "${YELLOW}  Syncing chain...${NC}"
linera sync 2>&1 | tail -3

echo -e "${YELLOW}  Processing inbox...${NC}"
linera process-inbox 2>&1 | tail -3

echo -e "${GREEN}  ✓ Sync complete${NC}"
echo ""

# ============================================================
# Step 7: Verify Deployment
# ============================================================
echo -e "${BLUE}[8/8] Verifying deployment...${NC}"

# Start service for verification
nohup linera service --port 8080 > /tmp/linera-service.log 2>&1 &
sleep 5

echo -e "${YELLOW}  Checking Token Application...${NC}"
TOKEN_INFO=$(linera application info "$TOKEN_APP_ID" 2>&1 || echo "ERROR")
if echo "$TOKEN_INFO" | grep -q "ERROR\|error\|not found"; then
    echo -e "${RED}  ⚠ Token application info check failed${NC}"
else
    echo -e "${GREEN}  ✓ Token application accessible${NC}"
fi

echo -e "${YELLOW}  Checking Registry Application...${NC}"
REGISTRY_INFO=$(linera application info "$REGISTRY_APP_ID" 2>&1 || echo "ERROR")
if echo "$REGISTRY_INFO" | grep -q "ERROR\|error\|not found"; then
    echo -e "${RED}  ⚠ Registry application info check failed${NC}"
else
    echo -e "${GREEN}  ✓ Registry application accessible${NC}"
fi

echo ""

# ============================================================
# Step 8: Update Token with Registry Reference (Cross-reference)
# ============================================================
echo -e "${BLUE}[BONUS] Updating Token with Registry reference...${NC}"
echo -e "${YELLOW}  This creates cross-reference to prevent blob pruning${NC}"

# Update token params with registry reference
cat > /tmp/token_params_updated.json <<EOF
{
  "name": "$TOKEN_NAME",
  "symbol": "$TOKEN_SYMBOL",
  "decimals": $TOKEN_DECIMALS,
  "registry_app_id": "$REGISTRY_APP_ID"
}
EOF

echo -e "${YELLOW}  Note: Token parameters update requires admin operation${NC}"
echo -e "${YELLOW}  You can update via dashboard or GraphQL mutation${NC}"
echo ""

# ============================================================
# Summary
# ============================================================
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║              DEPLOYMENT COMPLETE!                            ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}Token:${NC}"
echo "  Module ID:    $TOKEN_MODULE_ID"
echo "  Application ID: $TOKEN_APP_ID"
echo ""

echo -e "${GREEN}Registry:${NC}"
echo "  Module ID:    $REGISTRY_MODULE_ID"
echo "  Application ID: $REGISTRY_APP_ID"
echo ""

echo -e "${GREEN}Chain:${NC}"
echo "  Chain ID:    $DEFAULT_CHAIN"
echo ""

echo -e "${YELLOW}Environment Variables for Dashboard (.env.local):${NC}"
echo ""
echo "VITE_TOKEN_APP_ID=$TOKEN_APP_ID"
echo "VITE_REGISTRY_APP_ID=$REGISTRY_APP_ID"
echo "VITE_CHAIN_ID=$DEFAULT_CHAIN"
echo "VITE_LINERA_RPC=https://rpc.testnet-conway.linera.net"
echo "VITE_NETWORK=Conway Testnet"
echo ""

# Save to file
cat > "$PROJECT_DIR/deployment-info-2step.txt" <<EOF
# Alethea Network - 2-Step Stable Deployment
# Deployed: $(date)
# Method: publish-module + create-application (prevents blob pruning)

Token:
  Module ID: $TOKEN_MODULE_ID
  Application ID: $TOKEN_APP_ID

Registry:
  Module ID: $REGISTRY_MODULE_ID
  Application ID: $REGISTRY_APP_ID

Chain:
  Chain ID: $DEFAULT_CHAIN

Environment Variables:
VITE_TOKEN_APP_ID=$TOKEN_APP_ID
VITE_REGISTRY_APP_ID=$REGISTRY_APP_ID
VITE_CHAIN_ID=$DEFAULT_CHAIN
VITE_LINERA_RPC=https://rpc.testnet-conway.linera.net
VITE_NETWORK=Conway Testnet
EOF

echo -e "${GREEN}✓ Deployment info saved to: deployment-info-2step.txt${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Update .env.local with the Application IDs above"
echo "2. Restart dashboard: cd alethea-dashboard-vite && npm run dev"
echo "3. Verify with: linera application info <APP_ID>"
echo ""
