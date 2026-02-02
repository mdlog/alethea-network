#!/bin/bash

# Deploy Simple Market dengan Registry terbaru (v3.4.0)
# Registry: f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990
# Chain: 9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Deploy Simple Market dengan Registry Terbaru${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Configuration - Latest Registry (v3.4.0)
REGISTRY_APP_ID="f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990"
REGISTRY_CHAIN_ID="9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec"

echo -e "${BLUE}Configuration:${NC}"
echo "  Registry App ID: $REGISTRY_APP_ID"
echo "  Registry Chain ID: $REGISTRY_CHAIN_ID"
echo ""

# Step 1: Build
echo -e "${BLUE}Step 1: Building Simple Market...${NC}"
cd "$(dirname "$0")/.."
cargo build --release --target wasm32-unknown-unknown -p simple-market

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build complete${NC}"
echo ""

# Step 2: Check WASM files
WASM_DIR="target/wasm32-unknown-unknown/release"
CONTRACT_WASM="$WASM_DIR/simple_market_contract.wasm"
SERVICE_WASM="$WASM_DIR/simple_market_service.wasm"

if [ ! -f "$CONTRACT_WASM" ]; then
    echo -e "${RED}❌ Contract WASM not found: $CONTRACT_WASM${NC}"
    exit 1
fi

if [ ! -f "$SERVICE_WASM" ]; then
    echo -e "${RED}❌ Service WASM not found: $SERVICE_WASM${NC}"
    exit 1
fi

echo -e "${GREEN}✅ WASM files found${NC}"
echo "  Contract: $CONTRACT_WASM"
echo "  Service:  $SERVICE_WASM"
echo ""

# Step 3: Set default chain
echo -e "${BLUE}Step 3: Setting default chain...${NC}"
linera wallet set-default "$REGISTRY_CHAIN_ID"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to set default chain${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Default chain set to: $REGISTRY_CHAIN_ID${NC}"
echo ""

# Step 4: Prepare instantiation argument
# IMPORTANT: use_local_instance: true untuk same-chain communication yang lebih reliable
# Ini menggunakan call_application() instead of cross-chain messaging
INIT_ARG="{\"registry_app_id\":\"$REGISTRY_APP_ID\",\"registry_chain_id\":\"$REGISTRY_CHAIN_ID\",\"use_local_instance\":true}"

echo -e "${BLUE}Step 4: Instantiation argument:${NC}"
echo "  $INIT_ARG"
echo ""

# Step 5: Deploy
echo -e "${BLUE}Step 5: Deploying Simple Market...${NC}"
echo ""
echo -e "${YELLOW}Running deployment command...${NC}"
echo ""

DEPLOY_OUTPUT=$(linera publish-and-create \
  "$CONTRACT_WASM" \
  "$SERVICE_WASM" \
  --json-argument "$INIT_ARG" \
  --required-application-ids "$REGISTRY_APP_ID" 2>&1)

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed${NC}"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo "$DEPLOY_OUTPUT"
echo ""

# Extract Market App ID from output
MARKET_APP_ID=$(echo "$DEPLOY_OUTPUT" | grep -oE '[a-f0-9]{64}' | tail -1)

if [ -z "$MARKET_APP_ID" ]; then
    echo -e "${YELLOW}⚠️  Could not extract Market App ID from output${NC}"
    echo "Please check the output above and manually extract the Application ID"
    echo ""
    echo "Then update alethea-market/.env.local with:"
    echo "  VITE_MARKET_APP_ID=<extracted_app_id>"
    exit 1
fi

echo -e "${GREEN}✅ Simple Market deployed!${NC}"
echo "  Market App ID: $MARKET_APP_ID"
echo "  Market Chain ID: $REGISTRY_CHAIN_ID"
echo ""

# Step 6: Update frontend configuration
echo -e "${BLUE}Step 6: Updating frontend configuration...${NC}"

MARKET_ENV_FILE="../alethea-market/.env.local"

if [ -f "$MARKET_ENV_FILE" ]; then
    # Backup original
    cp "$MARKET_ENV_FILE" "$MARKET_ENV_FILE.backup"
    
    # Update Market App ID
    if grep -q "VITE_MARKET_APP_ID=" "$MARKET_ENV_FILE"; then
        sed -i "s|VITE_MARKET_APP_ID=.*|VITE_MARKET_APP_ID=$MARKET_APP_ID|" "$MARKET_ENV_FILE"
    else
        echo "VITE_MARKET_APP_ID=$MARKET_APP_ID" >> "$MARKET_ENV_FILE"
    fi
    
    # Update Chain ID
    if grep -q "VITE_CHAIN_ID=" "$MARKET_ENV_FILE"; then
        sed -i "s|VITE_CHAIN_ID=.*|VITE_CHAIN_ID=$REGISTRY_CHAIN_ID|" "$MARKET_ENV_FILE"
    else
        echo "VITE_CHAIN_ID=$REGISTRY_CHAIN_ID" >> "$MARKET_ENV_FILE"
    fi
    
    # Update Registry App ID
    if grep -q "VITE_REGISTRY_APP_ID=" "$MARKET_ENV_FILE"; then
        sed -i "s|VITE_REGISTRY_APP_ID=.*|VITE_REGISTRY_APP_ID=$REGISTRY_APP_ID|" "$MARKET_ENV_FILE"
    else
        echo "VITE_REGISTRY_APP_ID=$REGISTRY_APP_ID" >> "$MARKET_ENV_FILE"
    fi
    
    # Update Registry Chain ID
    if grep -q "VITE_REGISTRY_CHAIN_ID=" "$MARKET_ENV_FILE"; then
        sed -i "s|VITE_REGISTRY_CHAIN_ID=.*|VITE_REGISTRY_CHAIN_ID=$REGISTRY_CHAIN_ID|" "$MARKET_ENV_FILE"
    else
        echo "VITE_REGISTRY_CHAIN_ID=$REGISTRY_CHAIN_ID" >> "$MARKET_ENV_FILE"
    fi
    
    echo -e "${GREEN}✅ Frontend configuration updated${NC}"
    echo "  File: $MARKET_ENV_FILE"
    echo "  Backup: $MARKET_ENV_FILE.backup"
else
    echo -e "${YELLOW}⚠️  Frontend .env.local not found at $MARKET_ENV_FILE${NC}"
    echo "Please manually update with:"
    echo "  VITE_CHAIN_ID=$REGISTRY_CHAIN_ID"
    echo "  VITE_MARKET_APP_ID=$MARKET_APP_ID"
    echo "  VITE_REGISTRY_APP_ID=$REGISTRY_APP_ID"
    echo "  VITE_REGISTRY_CHAIN_ID=$REGISTRY_CHAIN_ID"
fi

echo ""

# Step 7: Verify deployment
echo -e "${BLUE}Step 7: Verifying deployment...${NC}"

MARKET_URL="http://localhost:8080/chains/$REGISTRY_CHAIN_ID/applications/$MARKET_APP_ID"

VERIFY_RESPONSE=$(curl -s -X POST "$MARKET_URL" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ markets { id question status } }"}' 2>&1)

if echo "$VERIFY_RESPONSE" | grep -q "errors"; then
    echo -e "${YELLOW}⚠️  Verification query returned errors:${NC}"
    echo "$VERIFY_RESPONSE" | jq '.errors' 2>/dev/null || echo "$VERIFY_RESPONSE"
else
    echo -e "${GREEN}✅ Deployment verified${NC}"
    echo "  Market URL: $MARKET_URL"
    echo "  Response: $(echo "$VERIFY_RESPONSE" | jq -r '.data.markets | length' 2>/dev/null || echo 'N/A') markets found"
fi

echo ""

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Deployment Details:${NC}"
echo "  Market App ID: $MARKET_APP_ID"
echo "  Market Chain ID: $REGISTRY_CHAIN_ID"
echo "  Registry App ID: $REGISTRY_APP_ID"
echo "  Registry Chain ID: $REGISTRY_CHAIN_ID"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Restart alethea-market frontend: cd ../alethea-market && npm run dev"
echo "  2. Open http://localhost:4003"
echo "  3. Create a market and test callback mechanism"
echo ""
echo -e "${BLUE}Testing Callback:${NC}"
echo "  1. Create market"
echo "  2. Request resolution"
echo "  3. View market detail page"
echo "  4. Monitor callback events in Callback Monitor"
echo ""
