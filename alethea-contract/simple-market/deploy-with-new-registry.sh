#!/bin/bash
# Deploy Simple Market with New Registry (Dashboard Registry)
# Registry Chain: 36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2
# Registry App: 053e39a7bb6c3fe0c034da47a7a3591cc03d110c5e964c34f693c7fed2123730

set -e

echo "=========================================="
echo "Simple Market Deployment Script"
echo "=========================================="

# Configuration - Dashboard Registry
REGISTRY_CHAIN_ID="36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2"
REGISTRY_APP_ID="053e39a7bb6c3fe0c034da47a7a3591cc03d110c5e964c34f693c7fed2123730"

echo ""
echo "Target Registry:"
echo "  Chain: $REGISTRY_CHAIN_ID"
echo "  App:   $REGISTRY_APP_ID"
echo ""

# Step 1: Build
echo "Step 1: Building Simple Market..."
cd "$(dirname "$0")/.."
cargo build --release --target wasm32-unknown-unknown -p simple-market

echo "✅ Build complete"
echo ""

# Step 2: Check WASM files
WASM_DIR="target/wasm32-unknown-unknown/release"
CONTRACT_WASM="$WASM_DIR/simple_market_contract.wasm"
SERVICE_WASM="$WASM_DIR/simple_market_service.wasm"

if [ ! -f "$CONTRACT_WASM" ]; then
    echo "❌ Contract WASM not found: $CONTRACT_WASM"
    exit 1
fi

if [ ! -f "$SERVICE_WASM" ]; then
    echo "❌ Service WASM not found: $SERVICE_WASM"
    exit 1
fi

echo "Step 2: WASM files found"
echo "  Contract: $CONTRACT_WASM"
echo "  Service:  $SERVICE_WASM"
echo ""

# Step 3: Prepare instantiation argument
# Format: {"registry_app_id":"<APP_ID>","registry_chain_id":"<CHAIN_ID>"}
INIT_ARG="{\"registry_app_id\":\"$REGISTRY_APP_ID\",\"registry_chain_id\":\"$REGISTRY_CHAIN_ID\"}"

echo "Step 3: Instantiation argument:"
echo "  $INIT_ARG"
echo ""

# Step 4: Deploy
echo "Step 4: Deploying to Linera..."
echo ""
echo "Run the following command manually:"
echo ""
echo "linera --with-wallet 0 publish-and-create \\"
echo "  $CONTRACT_WASM \\"
echo "  $SERVICE_WASM \\"
echo "  --json-argument '$INIT_ARG'"
echo ""
echo "=========================================="
echo "After deployment, update these files:"
echo "  1. alethea-contract/.env.simple-market"
echo "  2. alethea-market/.env.local"
echo "=========================================="
