#!/bin/bash
# Deploy Hub-and-Spoke Architecture for Alethea Oracle
# 
# This script deploys:
# 1. Registry as HUB on Alethea chain
# 2. Registry as INSTANCE on developer chain (via request-application)
# 3. Simple Market on developer chain (uses call_application to Instance)

set -e

echo "🏛️ Alethea Oracle Hub-and-Spoke Deployment"
echo "==========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if linera is available
if ! command -v linera &> /dev/null; then
    echo -e "${RED}Error: linera CLI not found${NC}"
    exit 1
fi

# Get current wallet info
echo ""
echo "📋 Current Wallet Info:"
WALLET_INFO=$(linera wallet show 2>&1)
echo "$WALLET_INFO"

# Extract default chain
DEFAULT_CHAIN=$(echo "$WALLET_INFO" | grep "Default Chain" | awk '{print $NF}')
echo ""
echo -e "${GREEN}Default Chain: $DEFAULT_CHAIN${NC}"

# Step 1: Deploy Registry as HUB
echo ""
echo "==========================================="
echo "Step 1: Deploy Registry as HUB"
echo "==========================================="

# Build contracts
echo "Building contracts..."
cargo build --release --target wasm32-unknown-unknown -p oracle-registry-v2

# Deploy Registry as Hub
echo ""
echo "Deploying Registry as HUB..."
HUB_RESULT=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/oracle_registry_v2_contract.wasm \
  target/wasm32-unknown-unknown/release/oracle_registry_v2_service.wasm \
  --json-argument '"Hub"' 2>&1)

echo "$HUB_RESULT"

# Extract Hub App ID
HUB_APP_ID=$(echo "$HUB_RESULT" | grep -oE '[a-f0-9]{64}' | tail -1)
HUB_CHAIN_ID=$DEFAULT_CHAIN

echo ""
echo -e "${GREEN}✅ Hub deployed!${NC}"
echo "   Hub App ID: $HUB_APP_ID"
echo "   Hub Chain ID: $HUB_CHAIN_ID"

# Step 2: Create a new chain for developer (simulating external developer)
echo ""
echo "==========================================="
echo "Step 2: Create Developer Chain"
echo "==========================================="

echo "Creating new chain for developer..."
DEV_CHAIN_RESULT=$(linera open-chain 2>&1)
echo "$DEV_CHAIN_RESULT"

DEV_CHAIN_ID=$(echo "$DEV_CHAIN_RESULT" | grep -oE '[a-f0-9]{64}' | head -1)

echo ""
echo -e "${GREEN}✅ Developer chain created!${NC}"
echo "   Developer Chain ID: $DEV_CHAIN_ID"

# Step 3: Request Registry Instance on Developer Chain
echo ""
echo "==========================================="
echo "Step 3: Request Registry Instance on Developer Chain"
echo "==========================================="

echo "Requesting Registry Instance..."
INSTANCE_RESULT=$(linera request-application $HUB_APP_ID --target-chain-id $DEV_CHAIN_ID 2>&1)
echo "$INSTANCE_RESULT"

# The Instance uses the same App ID but on different chain
INSTANCE_APP_ID=$HUB_APP_ID

echo ""
echo -e "${GREEN}✅ Registry Instance created on developer chain!${NC}"
echo "   Instance App ID: $INSTANCE_APP_ID"
echo "   Instance Chain ID: $DEV_CHAIN_ID"

# Step 4: Deploy Simple Market on Developer Chain
echo ""
echo "==========================================="
echo "Step 4: Deploy Simple Market on Developer Chain"
echo "==========================================="

# Build market
echo "Building Simple Market..."
cargo build --release --target wasm32-unknown-unknown -p simple-market

# Create instantiation argument
# Note: use_local_instance=true means use call_application() to local Instance
MARKET_ARG=$(cat <<EOF
{
  "registry_app_id": "$INSTANCE_APP_ID",
  "registry_chain_id": "$DEV_CHAIN_ID",
  "use_local_instance": true
}
EOF
)

echo "Deploying Simple Market with Hub-and-Spoke mode..."
echo "Instantiation argument: $MARKET_ARG"

# Switch to developer chain
linera wallet set-default $DEV_CHAIN_ID

MARKET_RESULT=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/simple_market_contract.wasm \
  target/wasm32-unknown-unknown/release/simple_market_service.wasm \
  --json-argument "$MARKET_ARG" 2>&1)

echo "$MARKET_RESULT"

MARKET_APP_ID=$(echo "$MARKET_RESULT" | grep -oE '[a-f0-9]{64}' | tail -1)

echo ""
echo -e "${GREEN}✅ Simple Market deployed!${NC}"
echo "   Market App ID: $MARKET_APP_ID"
echo "   Market Chain ID: $DEV_CHAIN_ID"

# Step 5: Save configuration
echo ""
echo "==========================================="
echo "Step 5: Save Configuration"
echo "==========================================="

CONFIG_FILE=".env.hub-and-spoke"
cat > $CONFIG_FILE <<EOF
# Hub-and-Spoke Architecture Deployment
# Deployed: $(date -Iseconds)

# ==================== HUB (Alethea Chain) ====================
export HUB_CHAIN_ID="$HUB_CHAIN_ID"
export HUB_APP_ID="$HUB_APP_ID"
export HUB_URL="http://localhost:8080/chains/$HUB_CHAIN_ID/applications/$HUB_APP_ID"

# ==================== INSTANCE (Developer Chain) ====================
export INSTANCE_CHAIN_ID="$DEV_CHAIN_ID"
export INSTANCE_APP_ID="$INSTANCE_APP_ID"
export INSTANCE_URL="http://localhost:8080/chains/$DEV_CHAIN_ID/applications/$INSTANCE_APP_ID"

# ==================== MARKET (Developer Chain) ====================
export MARKET_CHAIN_ID="$DEV_CHAIN_ID"
export MARKET_APP_ID="$MARKET_APP_ID"
export MARKET_URL="http://localhost:8080/chains/$DEV_CHAIN_ID/applications/$MARKET_APP_ID"

# ==================== ARCHITECTURE ====================
# Hub: Master registry on Alethea chain (voters, voting, resolution)
# Instance: Local proxy on developer chain (forwards to Hub)
# Market: Consumer app on developer chain (calls Instance via call_application)
#
# Flow:
# Market --call_application()--> Instance --cross-chain--> Hub
#                                                           |
#                                                      Voters vote
#                                                           |
# Market <--call_application()-- Instance <--cross-chain-- Hub (resolution)
EOF

echo -e "${GREEN}✅ Configuration saved to $CONFIG_FILE${NC}"

# Summary
echo ""
echo "==========================================="
echo "🎉 Hub-and-Spoke Deployment Complete!"
echo "==========================================="
echo ""
echo "Architecture:"
echo "┌─────────────────────────────────────────────────────────┐"
echo "│                    HUB CHAIN                            │"
echo "│                 ($HUB_CHAIN_ID)                         │"
echo "│                                                         │"
echo "│  ┌─────────────────────────────────────────────────┐   │"
echo "│  │   Registry (HUB MODE)                           │   │"
echo "│  │   - Global voter registry                       │   │"
echo "│  │   - Voting happens HERE                         │   │"
echo "│  │   - Resolution authority                        │   │"
echo "│  └─────────────────────────────────────────────────┘   │"
echo "└───────────────────────────┬─────────────────────────────┘"
echo "                            │"
echo "           Cross-chain messaging (SAME APP)"
echo "                            │"
echo "                            ▼"
echo "┌─────────────────────────────────────────────────────────┐"
echo "│                 DEVELOPER CHAIN                         │"
echo "│                 ($DEV_CHAIN_ID)                         │"
echo "│                                                         │"
echo "│  ┌─────────────────────────────────────────────────┐   │"
echo "│  │   Registry (INSTANCE MODE)                      │   │"
echo "│  │   - Forwards queries to Hub                     │   │"
echo "│  │   - Receives resolution callbacks               │   │"
echo "│  └──────────────────────┬──────────────────────────┘   │"
echo "│                         │                               │"
echo "│              call_application()                         │"
echo "│                         │                               │"
echo "│                         ▼                               │"
echo "│  ┌─────────────────────────────────────────────────┐   │"
echo "│  │   Simple Market                                 │   │"
echo "│  │   - Creates prediction markets                  │   │"
echo "│  │   - Requests oracle resolution                  │   │"
echo "│  └─────────────────────────────────────────────────┘   │"
echo "└─────────────────────────────────────────────────────────┘"
echo ""
echo "URLs:"
echo "  Hub:      $HUB_URL"
echo "  Instance: $INSTANCE_URL"
echo "  Market:   $MARKET_URL"
echo ""
echo "To test:"
echo "  source $CONFIG_FILE"
echo "  # Create market"
echo "  curl -s \$MARKET_URL -H 'Content-Type: application/json' \\"
echo "    -d '{\"query\":\"mutation { createMarket(question: \\\"Test?\\\", endTime: 1767225600000000) }\"}'"
echo ""
