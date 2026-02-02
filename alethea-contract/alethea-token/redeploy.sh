#!/bin/bash
set -e

echo "🔄 Redeploying ALETHEA Token with fixes..."
echo ""

# Get default chain
DEFAULT_CHAIN=$(linera wallet show 2>&1 | grep -E "^│ [a-f0-9]{64}" | head -1 | awk '{print $2}')
echo "📍 Using chain: $DEFAULT_CHAIN"

# Get owner from chain
OWNER=$(linera wallet show 2>&1 | grep "AccountOwner:" | head -1 | awk '{print $2}')
echo "👤 Admin owner: $OWNER"

# Token parameters
TOKEN_NAME="Alethea Token"
TOKEN_SYMBOL="ALTH"
TOKEN_DECIMALS=18

echo ""
echo "📦 Publishing new bytecode..."

# Navigate to alethea-token directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Build first
echo "🔨 Building..."
cargo build --release --target wasm32-unknown-unknown

# Publish bytecode
PUBLISH_OUTPUT=$(linera publish-bytecode \
    ../target/wasm32-unknown-unknown/release/alethea_token_contract.wasm \
    ../target/wasm32-unknown-unknown/release/alethea_token_service.wasm 2>&1)

echo "$PUBLISH_OUTPUT"

BYTECODE_ID=$(echo "$PUBLISH_OUTPUT" | grep -oP '[a-f0-9]{64}' | head -1)

if [ -z "$BYTECODE_ID" ]; then
    echo "❌ Failed to extract bytecode ID"
    exit 1
fi

echo "✅ New bytecode published: $BYTECODE_ID"

# Create parameters JSON
cat > /tmp/alethea_params_new.json <<EOF
{
    "name": "$TOKEN_NAME",
    "symbol": "$TOKEN_SYMBOL",
    "decimals": $TOKEN_DECIMALS,
    "registry_app_id": null
}
EOF

# Create initial state JSON with admin and initial supply
cat > /tmp/alethea_init_new.json <<EOF
{
    "accounts": {
        "$OWNER": "1000000000000000000000000000"
    },
    "admin": "$OWNER"
}
EOF

echo ""
echo "🎯 Creating new application..."

# Create application
APP_OUTPUT=$(linera create-application "$BYTECODE_ID" \
    --json-parameters "$(cat /tmp/alethea_params_new.json)" \
    --json-argument "$(cat /tmp/alethea_init_new.json)" 2>&1)

echo "$APP_OUTPUT"

NEW_APP_ID=$(echo "$APP_OUTPUT" | grep -oP '[a-f0-9]{64}' | tail -1)

if [ -z "$NEW_APP_ID" ]; then
    echo "❌ Failed to create application"
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ ALETHEA Token redeployed successfully!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📱 NEW Application ID: $NEW_APP_ID"
echo "⛓️  Chain ID: $DEFAULT_CHAIN"
echo ""
echo "🔧 Update .env.local:"
echo "   VITE_TOKEN_APP_ID=$NEW_APP_ID"
echo ""
echo "🧪 Test registry balance:"
echo "   curl -s -X POST \"http://localhost:8080/chains/$DEFAULT_CHAIN/applications/$NEW_APP_ID\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"query\": \"{ registryBalance(registryAppId: \\\"7a74ffc2b18dfe3f6b42ad6216a8a4d9efe1eb1c5c6ef98a872f515f0e7b06c9\\\") }\"}' | jq ."
echo ""
