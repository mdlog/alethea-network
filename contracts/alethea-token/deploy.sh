#!/bin/bash
set -e

echo "🚀 Deploying ALETHEA Token to Linera network..."
echo ""

# Get default chain
DEFAULT_CHAIN=$(linera wallet show 2>&1 | grep -E "^│ [a-f0-9]{64}" | head -1 | awk '{print $2}')
echo "📍 Using chain: $DEFAULT_CHAIN"

# Get owner from chain
OWNER=$(linera wallet show 2>&1 | grep "AccountOwner:" | head -1 | awk '{print $2}')
echo "👤 Admin owner: $OWNER"

# Token parameters
TOKEN_NAME="Alethea"
TOKEN_SYMBOL="ALTH"
TOKEN_DECIMALS=18

echo ""
echo "📦 Publishing bytecode..."

# Navigate to alethea-token directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Publish bytecode
PUBLISH_OUTPUT=$(linera publish-bytecode \
    ../target/wasm32-unknown-unknown/release/alethea_token_contract.wasm \
    ../target/wasm32-unknown-unknown/release/alethea_token_service.wasm 2>&1)

echo "$PUBLISH_OUTPUT"

BYTECODE_ID=$(echo "$PUBLISH_OUTPUT" | grep -oP '[a-f0-9]{64}' | head -1)

if [ -z "$BYTECODE_ID" ]; then
    echo "❌ Failed to extract bytecode ID"
    echo "Trying alternative wasm files..."
    
    PUBLISH_OUTPUT=$(linera publish-bytecode \
        ../target/wasm32-unknown-unknown/release/alethea-token-contract.wasm \
        ../target/wasm32-unknown-unknown/release/alethea-token-service.wasm 2>&1)
    
    echo "$PUBLISH_OUTPUT"
    BYTECODE_ID=$(echo "$PUBLISH_OUTPUT" | grep -oP '[a-f0-9]{64}' | head -1)
fi

if [ -z "$BYTECODE_ID" ]; then
    echo "❌ Failed to publish bytecode"
    exit 1
fi

echo "✅ Bytecode published: $BYTECODE_ID"

# Create parameters JSON
cat > /tmp/alethea_params.json <<EOF
{
    "name": "$TOKEN_NAME",
    "symbol": "$TOKEN_SYMBOL",
    "decimals": $TOKEN_DECIMALS,
    "registry_app_id": null
}
EOF

echo ""
echo "📝 Parameters:"
cat /tmp/alethea_params.json

# Create initial state JSON with admin and initial supply
# Format: accounts is a map, admin is optional AccountOwner
cat > /tmp/alethea_init.json <<EOF
{
    "accounts": {
        "$OWNER": "1000000000000000000000000000"
    },
    "admin": "$OWNER"
}
EOF

echo ""
echo "📝 Initial state:"
cat /tmp/alethea_init.json

echo ""
echo "🎯 Creating application..."

# Create application
APP_OUTPUT=$(linera create-application "$BYTECODE_ID" \
    --json-parameters "$(cat /tmp/alethea_params.json)" \
    --json-argument "$(cat /tmp/alethea_init.json)" 2>&1)

echo "$APP_OUTPUT"

APP_ID=$(echo "$APP_OUTPUT" | grep -oP '[a-f0-9]{64}' | tail -1)

if [ -z "$APP_ID" ]; then
    echo "❌ Failed to create application"
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ ALETHEA Token deployed successfully!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📋 Token Details:"
echo "   Name: $TOKEN_NAME"
echo "   Symbol: $TOKEN_SYMBOL"
echo "   Decimals: $TOKEN_DECIMALS"
echo "   Initial Supply: 1,000,000,000 tokens"
echo "   Admin: $OWNER"
echo ""
echo "📱 Application ID: $APP_ID"
echo "⛓️  Chain ID: $DEFAULT_CHAIN"
echo ""
echo "🔧 Add to .env.local:"
echo "   VITE_TOKEN_APP_ID=$APP_ID"
echo "   VITE_TOKEN_CHAIN_ID=$DEFAULT_CHAIN"
echo ""
