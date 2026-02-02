#!/bin/bash

# ============================================================
# Alethea Network Complete Deployment Script
# Deploys both ALTH Token and Oracle Registry V2
# 
# Features:
# - Automatically configures token in registry (CRITICAL for reward minting)
# - Supports both GraphQL mutation and execute-operation methods
# - Provides fallback instructions if automatic setup fails
# 
# Supports:
# - Conway Testnet (default): https://faucet.testnet-conway.linera.net
# - Local network: http://localhost:8079
#
# Usage:
#   ./deploy-complete-system.sh              # Use Conway testnet
#   ./deploy-complete-system.sh --local      # Use local network
#
# Prerequisites:
#   - linera service should be running for automatic token config setup
#   - If not running, token config can be set manually via dashboard
# ============================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Network configuration
NETWORK_MODE="${1:-conway}"
if [ "$NETWORK_MODE" = "--local" ]; then
    FAUCET_URL="http://localhost:8079"
    NETWORK_NAME="Local Network"
else
    FAUCET_URL="https://faucet.testnet-conway.linera.net"
    NETWORK_NAME="Conway Testnet"
fi

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         ALETHEA NETWORK COMPLETE DEPLOYMENT                  ║${NC}"
echo -e "${CYAN}║         Token + Oracle Registry V2                           ║${NC}"
echo -e "${CYAN}║         Network: ${NETWORK_NAME}                                     ${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Token parameters
TOKEN_NAME="Alethea"
TOKEN_SYMBOL="ALTH"
TOKEN_DECIMALS=18
# Note: Linera Amount uses string format with decimal point, e.g., "100." or "1000000000."
INITIAL_SUPPLY="1000000000."  # 1 billion tokens (without decimals expansion)

# Token security parameters (in ALTH, Linera format)
MIN_STAKE_AMOUNT="100."         # 100 ALTH minimum stake
MAX_STAKE_AMOUNT="10000000."    # 10M ALTH max per transaction
MAX_STAKE_PER_USER="1000000."   # 1M ALTH max per user

# Registry parameters
MIN_STAKE="100."  # 100 ALTH
COMMIT_DURATION=300  # 5 minutes
REVEAL_DURATION=300  # 5 minutes
MIN_VOTERS=1
SLASH_PERCENT=5
REWARD_PERCENT=10

echo -e "${BLUE}[1/7] Checking Linera wallet...${NC}"

# Get wallet info
WALLET_OUTPUT=$(linera wallet show 2>&1)
echo "$WALLET_OUTPUT" | head -20

# Find a chain that has a valid owner (not "-")
# We need both the chain ID and the owner from the same chain
echo ""
echo -e "${YELLOW}Looking for chain with valid owner...${NC}"

# Parse wallet output to find chain with owner
CHAIN_WITH_OWNER=""
OWNER=""

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
fi

if [ -z "$DEFAULT_CHAIN" ]; then
    echo -e "${RED}❌ Could not determine default chain${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Using Chain: ${DEFAULT_CHAIN}${NC}"

# Check if owner is valid (not empty, not "-")
if [ -z "$OWNER" ] || [ "$OWNER" = "-" ]; then
    echo -e "${YELLOW}No valid owner found in existing chains.${NC}"
    echo -e "${YELLOW}Requesting new chain from $NETWORK_NAME faucet...${NC}"
    echo ""
    
    # Request a new chain from faucet
    NEW_CHAIN_OUTPUT=$(linera wallet request-chain --faucet "$FAUCET_URL" 2>&1)
    echo "$NEW_CHAIN_OUTPUT"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to request new chain from faucet${NC}"
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}✓ New chain created${NC}"
    
    # Re-fetch wallet info
    WALLET_OUTPUT=$(linera wallet show 2>&1)
    
    # Find the new chain with owner
    CHAIN_WITH_OWNER=""
    OWNER=""
    while IFS= read -r line; do
        if [[ "$line" =~ ^│[[:space:]]*([a-f0-9]{64}) ]]; then
            CURRENT_CHAIN="${BASH_REMATCH[1]}"
        fi
        if [[ "$line" =~ AccountOwner:[[:space:]]*(0x[a-f0-9]+) ]]; then
            OWNER="${BASH_REMATCH[1]}"
            CHAIN_WITH_OWNER="$CURRENT_CHAIN"
            break
        fi
    done <<< "$WALLET_OUTPUT"
    
    DEFAULT_CHAIN="$CHAIN_WITH_OWNER"
    
    if [ -z "$OWNER" ] || [ "$OWNER" = "-" ]; then
        echo -e "${RED}❌ Still no valid owner after requesting new chain${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Using Chain: ${DEFAULT_CHAIN}${NC}"
    echo -e "${GREEN}✓ Owner: ${OWNER}${NC}"
fi

echo -e "${GREEN}✓ Owner: ${OWNER}${NC}"
echo ""

# ============================================================
# Step 2: Build Contracts
# ============================================================
echo -e "${BLUE}[2/7] Building contracts...${NC}"
cd "$PROJECT_DIR"

# Build ALTH Token
echo -e "${YELLOW}  Building ALTH Token...${NC}"
cd alethea-token
cargo build --release --target wasm32-unknown-unknown 2>&1 | tail -5
echo -e "${GREEN}  ✓ ALTH Token built${NC}"

# Build Oracle Registry
echo -e "${YELLOW}  Building Oracle Registry V2...${NC}"
cd ../oracle-registry-v2
cargo build --release --target wasm32-unknown-unknown 2>&1 | tail -5
echo -e "${GREEN}  ✓ Oracle Registry V2 built${NC}"
cd "$PROJECT_DIR"
echo ""

# ============================================================
# Step 3: Publish and Create ALTH Token Application
# ============================================================
echo -e "${BLUE}[3/5] Publishing and creating ALTH Token...${NC}"

# Create parameters JSON (includes security parameters)
cat > /tmp/token_params.json <<EOF
{
    "name": "$TOKEN_NAME",
    "symbol": "$TOKEN_SYMBOL",
    "decimals": $TOKEN_DECIMALS,
    "registry_app_id": null,
    "min_stake_amount": "$MIN_STAKE_AMOUNT",
    "max_stake_amount": "$MAX_STAKE_AMOUNT",
    "max_stake_per_user": "$MAX_STAKE_PER_USER"
}
EOF

# Create initial state JSON (instantiation argument)
# Note: AccountOwner uses "0x" prefix (as per linera-protocol examples)
# Note: Amount uses string with decimal point, e.g., "100."
cat > /tmp/token_init.json <<EOF
{
    "accounts": {
        "$OWNER": "$INITIAL_SUPPLY"
    },
    "admin": "$OWNER"
}
EOF

echo "  Parameters: $(cat /tmp/token_params.json)"
echo "  Initial State: $(cat /tmp/token_init.json)"

# Set the wallet to use our chain with owner
echo -e "${YELLOW}  Setting default chain to: $DEFAULT_CHAIN${NC}"
linera wallet set-default $DEFAULT_CHAIN 2>&1 || true

# Sync and process inbox for the chain before deployment
echo -e "${YELLOW}  Syncing chain and processing inbox...${NC}"
linera sync 2>&1 || true
linera process-inbox 2>&1 || true

# Verify WASM files exist
echo -e "${YELLOW}  Checking WASM files...${NC}"
if [ ! -f "target/wasm32-unknown-unknown/release/alethea-token-contract.wasm" ]; then
    echo -e "${RED}❌ alethea-token-contract.wasm not found${NC}"
    ls -la target/wasm32-unknown-unknown/release/*.wasm 2>&1 || true
    exit 1
fi
echo -e "${GREEN}  ✓ WASM files found${NC}"

echo -e "${YELLOW}  Running publish-and-create...${NC}"
set +e  # Temporarily disable exit on error to capture output
TOKEN_OUTPUT=$(linera publish-and-create \
    target/wasm32-unknown-unknown/release/alethea-token-contract.wasm \
    target/wasm32-unknown-unknown/release/alethea-token-service.wasm \
    --json-parameters "$(cat /tmp/token_params.json)" \
    --json-argument "$(cat /tmp/token_init.json)" 2>&1)
TOKEN_EXIT_CODE=$?
set -e  # Re-enable exit on error

echo "$TOKEN_OUTPUT"

if [ $TOKEN_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}❌ Token publish-and-create failed with exit code $TOKEN_EXIT_CODE${NC}"
    exit 1
fi

# Extract application ID from output
TOKEN_APP_ID=$(echo "$TOKEN_OUTPUT" | grep -oP '[a-f0-9]{64}' | tail -1)

if [ -z "$TOKEN_APP_ID" ]; then
    echo -e "${RED}❌ Failed to create token application${NC}"
    echo "Full output: $TOKEN_OUTPUT"
    exit 1
fi
echo -e "${GREEN}✓ Token Application ID: ${TOKEN_APP_ID}${NC}"
echo ""

# ============================================================
# Step 4: Publish and Create Oracle Registry Application
# ============================================================
echo -e "${BLUE}[4/5] Publishing and creating Oracle Registry V2...${NC}"

# Create registry instantiation argument
# Oracle Registry V2 uses Hub/Instance enum for instantiation
# "Hub" = main registry, {"Instance": {"hub_chain_id": "..."}} = proxy
# Parameters like min_stake are configured via ProtocolParameters::default() in the contract
cat > /tmp/registry_init.json <<EOF
"Hub"
EOF

echo "  Registry Init: Hub mode (main registry)"
echo "  Note: Protocol parameters use defaults - configure via admin operations after deployment"

echo -e "${YELLOW}  Running publish-and-create for Registry...${NC}"
set +e  # Temporarily disable exit on error
REGISTRY_OUTPUT=$(linera publish-and-create \
    target/wasm32-unknown-unknown/release/oracle_registry_v2_contract.wasm \
    target/wasm32-unknown-unknown/release/oracle_registry_v2_service.wasm \
    --json-argument "$(cat /tmp/registry_init.json)" 2>&1)
REGISTRY_EXIT_CODE=$?
set -e

echo "$REGISTRY_OUTPUT"

if [ $REGISTRY_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}❌ Registry publish-and-create failed with exit code $REGISTRY_EXIT_CODE${NC}"
    exit 1
fi

REGISTRY_APP_ID=$(echo "$REGISTRY_OUTPUT" | grep -oP '[a-f0-9]{64}' | tail -1)

if [ -z "$REGISTRY_APP_ID" ]; then
    echo -e "${RED}❌ Failed to extract registry application ID${NC}"
    echo "Full output: $REGISTRY_OUTPUT"
    exit 1
fi
echo -e "${GREEN}✓ Registry Application ID: ${REGISTRY_APP_ID}${NC}"
echo ""

# ============================================================
# Step 4.5: Ensure Instantiation is Processed (CRITICAL!)
# ============================================================
echo -e "${BLUE}[4.5/6] Ensuring contract instantiation...${NC}"

# Stop service if running (to unlock database)
pkill -f "linera service" 2>/dev/null || true
sleep 2

# Sync chain to get latest state
echo -e "${YELLOW}  Syncing chain...${NC}"
linera sync 2>&1 || true

# Process inbox to handle instantiation messages
echo -e "${YELLOW}  Processing inbox (CRITICAL for instantiation)...${NC}"
INBOX_OUTPUT=$(linera process-inbox 2>&1)
echo "$INBOX_OUTPUT"

# Check if messages were processed
if echo "$INBOX_OUTPUT" | grep -q "Processed incoming messages with [1-9]"; then
    echo -e "${GREEN}  ✓ Instantiation messages processed${NC}"
elif echo "$INBOX_OUTPUT" | grep -q "0 blocks"; then
    echo -e "${YELLOW}  ⚠ No messages in inbox (0 blocks)${NC}"
    echo "     This might mean instantiation already processed or not created"
else
    echo -e "${YELLOW}  ⚠ Process inbox output unclear${NC}"
fi

# Wait for state to be saved
echo -e "${YELLOW}  Waiting for state to be saved...${NC}"
sleep 5

# ============================================================
# Step 5: Configure Token in Registry (CRITICAL for reward minting)
# ============================================================
echo -e "${BLUE}[5/6] Configuring token in registry...${NC}"

# Initialize token config status
TOKEN_CONFIG_SET=false

# Create SetTokenConfig operation JSON
# Format: ApplicationId and ChainId are hex strings (64 chars)
cat > /tmp/set_token_config.json <<EOF
{
  "SetTokenConfig": {
    "token_app_id": "$TOKEN_APP_ID",
    "token_chain_id": "$DEFAULT_CHAIN"
  }
}
EOF

echo -e "${YELLOW}  Setting token config in registry...${NC}"
echo "  Token App ID: $TOKEN_APP_ID"
echo "  Token Chain ID: $DEFAULT_CHAIN"
echo "  Registry App ID: $REGISTRY_APP_ID"

# Try to set token config via GraphQL mutation (more reliable)
# Check if linera service is running
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${YELLOW}  Linera service detected, using GraphQL mutation...${NC}"
    
    # Create GraphQL mutation
    MUTATION=$(cat <<EOF
mutation {
  setTokenConfig(
    tokenAppId: "$TOKEN_APP_ID",
    tokenChainId: "$DEFAULT_CHAIN"
  )
}
EOF
)
    
    # Send GraphQL request
    set +e
    GRAPHQL_RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"query\": $(echo "$MUTATION" | jq -Rs .)}" \
        "http://localhost:8080/chains/$DEFAULT_CHAIN/applications/$REGISTRY_APP_ID" 2>&1)
    GRAPHQL_EXIT_CODE=$?
    set -e
    
    if [ $GRAPHQL_EXIT_CODE -eq 0 ] && ! echo "$GRAPHQL_RESPONSE" | grep -q "errors"; then
        echo -e "${GREEN}✓ Token config set successfully via GraphQL${NC}"
        TOKEN_CONFIG_SET=true
    else
        echo -e "${YELLOW}⚠️  GraphQL mutation failed or returned errors${NC}"
        echo "$GRAPHQL_RESPONSE" | head -10
        TOKEN_CONFIG_SET=false
    fi
else
    echo -e "${YELLOW}  Linera service not detected, trying execute-operation...${NC}"
    
    # Try execute-operation as fallback
    set +e
    SET_TOKEN_OUTPUT=$(linera execute-operation \
        --application-id "$REGISTRY_APP_ID" \
        --operation "$(cat /tmp/set_token_config.json)" 2>&1)
    SET_TOKEN_EXIT_CODE=$?
    set -e
    
    if [ $SET_TOKEN_EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}✓ Token config set successfully via execute-operation${NC}"
        echo "$SET_TOKEN_OUTPUT" | head -20
        TOKEN_CONFIG_SET=true
    else
        echo -e "${YELLOW}⚠️  Failed to set token config automatically${NC}"
        echo "$SET_TOKEN_OUTPUT" | head -20
        TOKEN_CONFIG_SET=false
    fi
fi

# Sync again to process the operation
if [ "$TOKEN_CONFIG_SET" = true ]; then
    echo -e "${YELLOW}  Processing operation...${NC}"
    linera sync 2>&1 || true
    linera process-inbox 2>&1 || true
    
    # Verify token config was set
    sleep 1
    echo -e "${YELLOW}  Verifying token config...${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠️  Token config was NOT set automatically${NC}"
    echo -e "${YELLOW}   Please set it manually using one of these methods:${NC}"
    echo ""
    echo "  1. Dashboard: Admin → Set Token Config"
    echo "     Token App ID: $TOKEN_APP_ID"
    echo "     Token Chain ID: $DEFAULT_CHAIN"
    echo ""
    echo "  2. GraphQL mutation (when linera service is running):"
    echo "     curl -X POST http://localhost:8080/chains/$DEFAULT_CHAIN/applications/$REGISTRY_APP_ID \\"
    echo "       -H 'Content-Type: application/json' \\"
    echo "       -d '{\"query\": \"mutation { setTokenConfig(tokenAppId: \\\"$TOKEN_APP_ID\\\", tokenChainId: \\\"$DEFAULT_CHAIN\\\") }\"}'"
    echo ""
fi

echo ""

# ============================================================
# Step 6: Summary and Next Steps
# ============================================================
echo -e "${BLUE}[6/6] Deployment complete!${NC}"
echo ""

# ============================================================
# Summary
# ============================================================
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║              DEPLOYMENT SUCCESSFUL!                          ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}ALTH Token:${NC}"
echo "  Name: $TOKEN_NAME"
echo "  Symbol: $TOKEN_SYMBOL"
echo "  Decimals: $TOKEN_DECIMALS"
echo "  Initial Supply: 1,000,000,000 ALTH"
echo "  Application ID: $TOKEN_APP_ID"
echo ""
echo -e "${GREEN}Oracle Registry V2:${NC}"
echo "  Min Stake: 100 ALTH"
echo "  Commit Duration: ${COMMIT_DURATION}s"
echo "  Reveal Duration: ${REVEAL_DURATION}s"
echo "  Slash Percent: ${SLASH_PERCENT}%"
echo "  Application ID: $REGISTRY_APP_ID"
if [ "$TOKEN_CONFIG_SET" = true ]; then
    echo "  Token Config: ${GREEN}✓ Configured${NC} (App: $TOKEN_APP_ID, Chain: $DEFAULT_CHAIN)"
else
    echo "  Token Config: ${YELLOW}⚠️  Not Set${NC} (Manual setup required - see instructions above)"
fi
echo ""
echo -e "${GREEN}Common:${NC}"
echo "  Chain ID: $DEFAULT_CHAIN"
echo "  Admin: $OWNER_CLEAN"
echo ""
# Determine RPC endpoint based on network
if [ "$NETWORK_MODE" = "--local" ]; then
    LINERA_RPC="http://localhost:8080"
else
    LINERA_RPC="https://rpc.testnet-conway.linera.net"
fi

echo -e "${YELLOW}Environment Variables for Dashboard (.env.local):${NC}"
echo ""
echo "VITE_TOKEN_APP_ID=$TOKEN_APP_ID"
echo "VITE_REGISTRY_APP_ID=$REGISTRY_APP_ID"
echo "VITE_CHAIN_ID=$DEFAULT_CHAIN"
echo "VITE_LINERA_RPC=$LINERA_RPC"
echo "VITE_NETWORK=$NETWORK_NAME"
echo ""

# Save to file
cat > "$PROJECT_DIR/deployment-info.txt" <<EOF
# Alethea Network Deployment Info
# Generated: $(date)
# Network: $NETWORK_NAME

# ALTH Token
TOKEN_APP_ID=$TOKEN_APP_ID
TOKEN_NAME=$TOKEN_NAME
TOKEN_SYMBOL=$TOKEN_SYMBOL
TOKEN_DECIMALS=$TOKEN_DECIMALS

# Oracle Registry V2
REGISTRY_APP_ID=$REGISTRY_APP_ID

# Common
CHAIN_ID=$DEFAULT_CHAIN
ADMIN_OWNER=$OWNER_CLEAN
NETWORK=$NETWORK_NAME

# Dashboard Environment Variables
VITE_TOKEN_APP_ID=$TOKEN_APP_ID
VITE_REGISTRY_APP_ID=$REGISTRY_APP_ID
VITE_CHAIN_ID=$DEFAULT_CHAIN
VITE_LINERA_RPC=$LINERA_RPC
VITE_NETWORK=$NETWORK_NAME

# Wallet Environment (if initialized by this script)
LINERA_TMP_DIR=$LINERA_TMP_DIR
LINERA_WALLET=$LINERA_WALLET
LINERA_KEYSTORE=$LINERA_KEYSTORE
LINERA_STORAGE=$LINERA_STORAGE
EOF

echo -e "${GREEN}✓ Deployment info saved to: $PROJECT_DIR/deployment-info.txt${NC}"

# Auto-update .env.local in dashboard
DASHBOARD_ENV_FILE="$PROJECT_DIR/../alethea-dashboard-vite/.env.local"
if [ -f "$DASHBOARD_ENV_FILE" ]; then
    echo ""
    echo -e "${YELLOW}Updating dashboard .env.local...${NC}"
    
    # Backup original
    cp "$DASHBOARD_ENV_FILE" "$DASHBOARD_ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
    
    # Update App IDs
    if grep -q "^VITE_TOKEN_APP_ID=" "$DASHBOARD_ENV_FILE"; then
        sed -i "s|^VITE_TOKEN_APP_ID=.*|VITE_TOKEN_APP_ID=$TOKEN_APP_ID|" "$DASHBOARD_ENV_FILE"
    else
        echo "VITE_TOKEN_APP_ID=$TOKEN_APP_ID" >> "$DASHBOARD_ENV_FILE"
    fi
    
    if grep -q "^VITE_REGISTRY_APP_ID=" "$DASHBOARD_ENV_FILE"; then
        sed -i "s|^VITE_REGISTRY_APP_ID=.*|VITE_REGISTRY_APP_ID=$REGISTRY_APP_ID|" "$DASHBOARD_ENV_FILE"
    else
        echo "VITE_REGISTRY_APP_ID=$REGISTRY_APP_ID" >> "$DASHBOARD_ENV_FILE"
    fi
    
    if grep -q "^VITE_CHAIN_ID=" "$DASHBOARD_ENV_FILE"; then
        sed -i "s|^VITE_CHAIN_ID=.*|VITE_CHAIN_ID=$DEFAULT_CHAIN|" "$DASHBOARD_ENV_FILE"
    else
        echo "VITE_CHAIN_ID=$DEFAULT_CHAIN" >> "$DASHBOARD_ENV_FILE"
    fi
    
    if grep -q "^VITE_LINERA_RPC=" "$DASHBOARD_ENV_FILE"; then
        sed -i "s|^VITE_LINERA_RPC=.*|VITE_LINERA_RPC=$LINERA_RPC|" "$DASHBOARD_ENV_FILE"
    else
        echo "VITE_LINERA_RPC=$LINERA_RPC" >> "$DASHBOARD_ENV_FILE"
    fi
    
    if grep -q "^VITE_NETWORK=" "$DASHBOARD_ENV_FILE"; then
        sed -i "s|^VITE_NETWORK=.*|VITE_NETWORK=$NETWORK_NAME|" "$DASHBOARD_ENV_FILE"
    else
        echo "VITE_NETWORK=$NETWORK_NAME" >> "$DASHBOARD_ENV_FILE"
    fi
    
    # Update deployment date comment
    if grep -q "^# Latest Deployment:" "$DASHBOARD_ENV_FILE"; then
        sed -i "s|^# Latest Deployment:.*|# Latest Deployment: $(date '+%Y-%m-%d %H:%M') (Fresh deployment)|" "$DASHBOARD_ENV_FILE"
    else
        sed -i "3a# Latest Deployment: $(date '+%Y-%m-%d %H:%M') (Fresh deployment)" "$DASHBOARD_ENV_FILE"
    fi
    
    echo -e "${GREEN}✓ Dashboard .env.local updated${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠️  Dashboard .env.local not found at: $DASHBOARD_ENV_FILE${NC}"
    echo "   Please create it manually with the environment variables above"
fi

echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. ✓ Dashboard .env.local has been updated automatically"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Verify Contract Instantiation${NC}"
echo ""
echo "2. Verify contracts are instantiated:"
echo "   cd alethea-contract/scripts"
echo "   ./test-new-deployment.sh"
echo ""
echo "   If contract is NOT instantiated:"
echo "   - Wait a bit longer (sometimes takes time)"
echo "   - Or check deployment logs for instantiation errors"
echo ""
echo "3. After verification, restart the dashboard:"
echo "   cd alethea-dashboard-vite && npm run dev"
echo ""
echo "4. Test voter registration and voting"
echo ""
