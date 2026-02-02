#!/bin/bash

# Quick rebuild and redeploy Simple Market with fixes
# Fixes: Uses cross-chain messaging instead of call_application() to avoid WASM panic

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Rebuild & Redeploy Simple Market (Fixed)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Changes in this version:${NC}"
echo "  ✅ Uses cross-chain messaging (no more WASM panic)"
echo "  ✅ Removed call_application() from request_resolution"
echo "  ✅ More reliable OracleRequest handling"
echo ""

# Configuration
REGISTRY_APP_ID="f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990"
REGISTRY_CHAIN_ID="9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec"

cd "$(dirname "$0")/.."

# Step 1: Build
echo -e "${BLUE}Step 1: Building Simple Market...${NC}"
cargo build --release --target wasm32-unknown-unknown -p simple-market 2>&1 | tail -20

if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build complete${NC}"
echo ""

# Step 2: Check WASM files
WASM_DIR="target/wasm32-unknown-unknown/release"
CONTRACT_WASM="$WASM_DIR/simple_market_contract.wasm"
SERVICE_WASM="$WASM_DIR/simple_market_service.wasm"

if [ ! -f "$CONTRACT_WASM" ] || [ ! -f "$SERVICE_WASM" ]; then
    echo -e "${RED}❌ WASM files not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ WASM files found${NC}"
echo "  Contract: $CONTRACT_WASM"
echo "  Service:  $SERVICE_WASM"
echo ""

# Step 3: Set default chain
echo -e "${BLUE}Step 2: Setting default chain...${NC}"
linera project set-default-chain --chain-id "$REGISTRY_CHAIN_ID" 2>&1 | grep -E "(Default chain|chain set)" || true
echo -e "${GREEN}✅ Default chain set${NC}"
echo ""

# Step 4: Prepare instantiation argument
echo -e "${BLUE}Step 3: Preparing instantiation argument...${NC}"
# Note: use_local_instance doesn't matter anymore since we always use cross-chain messaging
INIT_ARG="{\"registry_app_id\":\"$REGISTRY_APP_ID\",\"registry_chain_id\":\"$REGISTRY_CHAIN_ID\",\"use_local_instance\":\"true\"}"
echo "  $INIT_ARG"
echo ""

# Step 5: Deploy
echo -e "${BLUE}Step 4: Deploying Simple Market...${NC}"
echo "Running deployment command..."
echo ""

# Use the same command format as deploy-simple-market-latest.sh
# Note: Using absolute paths for WASM files
CONTRACT_WASM_ABS="$(pwd)/$CONTRACT_WASM"
SERVICE_WASM_ABS="$(pwd)/$SERVICE_WASM"

echo "  Contract WASM: $CONTRACT_WASM_ABS"
echo "  Service WASM:  $SERVICE_WASM_ABS"
echo ""

# Execute deployment command directly (not capturing output first to see real-time progress)
# Use timeout to prevent hanging (60 seconds should be enough)
echo -e "${YELLOW}Executing: linera publish-and-create ...${NC}"
echo ""

# Create temp file for output
TEMP_OUTPUT=$(mktemp)

# Run with timeout and save output
timeout 60 linera publish-and-create \
    "$CONTRACT_WASM_ABS" \
    "$SERVICE_WASM_ABS" \
    --json-argument "$INIT_ARG" \
    --required-application-ids "$REGISTRY_APP_ID" > "$TEMP_OUTPUT" 2>&1

DEPLOY_EXIT_CODE=$?

# Display output
cat "$TEMP_OUTPUT"
echo ""

if [ $DEPLOY_EXIT_CODE -eq 124 ]; then
    echo -e "${RED}❌ Deployment command timed out after 60 seconds${NC}"
    echo ""
    echo -e "${YELLOW}This may mean:${NC}"
    echo "  1. Linera service is not responding"
    echo "  2. Network issue"
    echo "  3. Deployment is taking longer than expected"
    echo ""
    echo "Try running the command manually:"
    echo "  linera publish-and-create \\"
    echo "    $CONTRACT_WASM_ABS \\"
    echo "    $SERVICE_WASM_ABS \\"
    echo "    --json-argument '$INIT_ARG' \\"
    echo "    --required-application-ids $REGISTRY_APP_ID"
    rm -f "$TEMP_OUTPUT"
    exit 1
fi

if [ $DEPLOY_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed with exit code $DEPLOY_EXIT_CODE${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo "  1. Check if linera service is running: linera service start"
    echo "  2. Verify WASM files exist"
    echo "  3. Check linera service logs"
    rm -f "$TEMP_OUTPUT"
    exit 1
fi

# Read output for parsing
DEPLOY_OUTPUT=$(cat "$TEMP_OUTPUT")
rm -f "$TEMP_OUTPUT"

# Extract Market App ID from output
# Try multiple patterns to find the App ID
MARKET_APP_ID=$(echo "$DEPLOY_OUTPUT" | grep -oE '[a-f0-9]{64}' | tail -1)

if [ -z "$MARKET_APP_ID" ]; then
    # Try alternative pattern
    MARKET_APP_ID=$(echo "$DEPLOY_OUTPUT" | grep -i "application.*id" | grep -oE '[a-f0-9]{64}' | head -1)
fi

if [ -z "$MARKET_APP_ID" ]; then
    echo -e "${YELLOW}⚠️  Could not extract Market App ID from output${NC}"
    echo "Please check the output above and manually extract the Application ID"
    echo ""
    echo "Then update alethea-market/.env.local with:"
    echo "  VITE_MARKET_APP_ID=<extracted_app_id>"
    echo ""
    echo "Full output:"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Simple Market deployed!${NC}"
echo "  Market App ID: $MARKET_APP_ID"
echo "  Market Chain ID: $REGISTRY_CHAIN_ID"
echo ""

# Step 6: Update frontend .env.local
echo -e "${BLUE}Step 5: Updating frontend configuration...${NC}"
FRONTEND_ENV="../alethea-market/.env.local"

if [ -f "$FRONTEND_ENV" ]; then
    # Backup
    cp "$FRONTEND_ENV" "${FRONTEND_ENV}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Update MARKET_APP_ID
    if grep -q "VITE_MARKET_APP_ID=" "$FRONTEND_ENV"; then
        sed -i "s|VITE_MARKET_APP_ID=.*|VITE_MARKET_APP_ID=$MARKET_APP_ID|" "$FRONTEND_ENV"
    else
        echo "VITE_MARKET_APP_ID=$MARKET_APP_ID" >> "$FRONTEND_ENV"
    fi
    
    # Ensure other required vars exist
    if ! grep -q "VITE_REGISTRY_APP_ID=" "$FRONTEND_ENV"; then
        echo "VITE_REGISTRY_APP_ID=$REGISTRY_APP_ID" >> "$FRONTEND_ENV"
    fi
    if ! grep -q "VITE_CHAIN_ID=" "$FRONTEND_ENV"; then
        echo "VITE_CHAIN_ID=$REGISTRY_CHAIN_ID" >> "$FRONTEND_ENV"
    fi
    if ! grep -q "VITE_SERVICE_URL=" "$FRONTEND_ENV"; then
        echo "VITE_SERVICE_URL=http://localhost:8080" >> "$FRONTEND_ENV"
    fi
    
    echo -e "${GREEN}✅ Frontend configuration updated${NC}"
    echo "  File: $FRONTEND_ENV"
else
    echo -e "${YELLOW}⚠️  Frontend .env.local not found, creating it...${NC}"
    mkdir -p "$(dirname "$FRONTEND_ENV")"
    cat > "$FRONTEND_ENV" <<EOF
VITE_MARKET_APP_ID=$MARKET_APP_ID
VITE_REGISTRY_APP_ID=$REGISTRY_APP_ID
VITE_CHAIN_ID=$REGISTRY_CHAIN_ID
VITE_SERVICE_URL=http://localhost:8080
EOF
    echo -e "${GREEN}✅ Created frontend .env.local${NC}"
fi
echo ""

# Step 7: Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Restart alethea-market frontend to load new Market App ID"
echo "  2. Test creating a new market"
echo "  3. Test requestResolution - should work without WASM panic"
echo ""
echo -e "${BLUE}Market App ID:${NC} $MARKET_APP_ID"
echo -e "${BLUE}Frontend config:${NC} $FRONTEND_ENV"
echo ""
