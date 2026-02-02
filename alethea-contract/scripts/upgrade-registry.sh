#!/bin/bash
# Upgrade Oracle Registry V2 with Token Integration Fix
# This deploys a new registry instance with the withdraw stake fix

set -e

echo "🔄 Upgrading Oracle Registry V2"
echo "================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get current chain
CURRENT_CHAIN=$(linera wallet show 2>&1 | grep "Default Chain" | awk '{print $NF}')
echo -e "${BLUE}Current Chain: $CURRENT_CHAIN${NC}"

# Token config from .env.local
TOKEN_APP_ID="0d024bdc17d9f4a3fb65793b40d3e6da9722d5b56af2d14ac6773079e870a2e0"
TOKEN_CHAIN_ID="36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2"

echo ""
echo -e "${YELLOW}Step 1: Deploy new Registry as Hub${NC}"
echo "-----------------------------------"

# Deploy new registry
DEPLOY_RESULT=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/oracle_registry_v2_contract.wasm \
  target/wasm32-unknown-unknown/release/oracle_registry_v2_service.wasm \
  --json-argument '"Hub"' 2>&1)

echo "$DEPLOY_RESULT"

# Extract new App ID
NEW_APP_ID=$(echo "$DEPLOY_RESULT" | grep -oE '[a-f0-9]{64}' | tail -1)

if [ -z "$NEW_APP_ID" ]; then
    echo -e "${RED}Failed to extract App ID from deployment${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ New Registry deployed!${NC}"
echo "   New App ID: $NEW_APP_ID"
echo "   Chain ID: $CURRENT_CHAIN"

# Step 2: Set token config
echo ""
echo -e "${YELLOW}Step 2: Set Token Config${NC}"
echo "-------------------------"

SERVICE_URL="http://localhost:8080"
REGISTRY_URL="$SERVICE_URL/chains/$CURRENT_CHAIN/applications/$NEW_APP_ID"

echo "Setting token config..."
SET_TOKEN_RESULT=$(curl -s "$REGISTRY_URL" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"mutation { setTokenConfig(tokenAppId: \\\"$TOKEN_APP_ID\\\", tokenChainId: \\\"$TOKEN_CHAIN_ID\\\") }\"}")

echo "$SET_TOKEN_RESULT"

if echo "$SET_TOKEN_RESULT" | grep -q "true"; then
    echo -e "${GREEN}✅ Token config set successfully!${NC}"
else
    echo -e "${YELLOW}⚠ Token config may need manual setup${NC}"
fi

# Step 3: Save new config
echo ""
echo -e "${YELLOW}Step 3: Save Configuration${NC}"
echo "---------------------------"

# Update .env.local
ENV_FILE="../alethea-dashboard-vite/.env.local"
if [ -f "$ENV_FILE" ]; then
    # Backup old config
    cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Update VITE_REGISTRY_APP_ID
    sed -i "s/VITE_REGISTRY_APP_ID=.*/VITE_REGISTRY_APP_ID=$NEW_APP_ID/" "$ENV_FILE"
    
    echo -e "${GREEN}✅ Updated $ENV_FILE${NC}"
    echo "   Old config backed up"
else
    echo -e "${YELLOW}⚠ $ENV_FILE not found. Please update manually.${NC}"
fi

# Summary
echo ""
echo "==========================================="
echo -e "${GREEN}🎉 Upgrade Complete!${NC}"
echo "==========================================="
echo ""
echo "New Registry Configuration:"
echo "  VITE_CHAIN_ID=$CURRENT_CHAIN"
echo "  VITE_REGISTRY_APP_ID=$NEW_APP_ID"
echo "  VITE_TOKEN_APP_ID=$TOKEN_APP_ID"
echo "  VITE_TOKEN_CHAIN_ID=$TOKEN_CHAIN_ID"
echo ""
echo "GraphQL URL: $REGISTRY_URL"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Restart dashboard: cd ../alethea-dashboard-vite && npm run dev"
echo "2. Re-register voters (old voters need to register again)"
echo "3. Test withdraw stake flow"
echo ""
