#!/bin/bash
set -e

echo "🚀 Deploying Fixed ALETHEA Token Contract"
echo "========================================="
echo ""

# Get default chain and owner
DEFAULT_CHAIN=$(linera wallet show 2>&1 | grep -E "^│ [a-f0-9]{64}" | head -1 | awk '{print $2}')
OWNER_RAW=$(linera wallet show 2>&1 | grep "AccountOwner:" | head -1 | awk '{print $2}')

echo "📍 Chain: $DEFAULT_CHAIN"
echo "👤 Owner: $OWNER_RAW"

# Convert owner to proper format for JSON
# Owner is already in 0x format, so use it directly
OWNER_JSON="\"$OWNER_RAW\""

echo "📝 Owner for JSON: $OWNER_JSON"

# Build the contract
echo ""
echo "🔨 Building contract..."
cargo build --release --target wasm32-unknown-unknown --bin alethea-token-contract --bin alethea-token-service

# Create parameters JSON
cat > /tmp/token_params.json <<EOF
{
    "name": "Alethea Token",
    "symbol": "ALTH", 
    "decimals": 18,
    "registry_app_id": null
}
EOF

# Create initial state JSON with proper AccountOwner format
# Give admin 1000 tokens (1000 * 10^18 attos)
cat > /tmp/token_init.json <<EOF
{
    "accounts": {
        $OWNER_JSON: "1000000000000000000000"
    },
    "admin": $OWNER_JSON
}
EOF

echo ""
echo "📋 Parameters:"
cat /tmp/token_params.json

echo ""
echo "📋 Initial State:"
cat /tmp/token_init.json

echo ""
echo "🚀 Deploying contract..."

# Deploy the contract
DEPLOY_OUTPUT=$(linera publish-and-create \
    ../target/wasm32-unknown-unknown/release/alethea-token-contract.wasm \
    ../target/wasm32-unknown-unknown/release/alethea-token-service.wasm \
    --json-parameters "$(cat /tmp/token_params.json)" \
    --json-argument "$(cat /tmp/token_init.json)" 2>&1)

echo "$DEPLOY_OUTPUT"

# Extract application ID
NEW_APP_ID=$(echo "$DEPLOY_OUTPUT" | grep -oP '[a-f0-9]{64}' | tail -1)

if [ -z "$NEW_APP_ID" ]; then
    echo "❌ Failed to extract application ID"
    echo "Full output:"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ Fixed ALETHEA Token deployed successfully!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📱 NEW Token App ID: $NEW_APP_ID"
echo "⛓️  Chain ID: $DEFAULT_CHAIN"
echo ""
echo "🔧 Update .env.local:"
echo "   VITE_TOKEN_APP_ID=$NEW_APP_ID"
echo ""
echo "🧪 Test queries:"
echo ""
echo "1. Check admin balance:"
echo "   curl -s -X POST \"http://localhost:8080/chains/$DEFAULT_CHAIN/applications/$NEW_APP_ID\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"query\": \"{ balance(owner: \\\"$OWNER_RAW\\\") }\"}' | jq ."
echo ""
echo "2. Check registry balance (should be 0 initially):"
REGISTRY_APP="7a74ffc2b18dfe3f6b42ad6216a8a4d9efe1eb1c5c6ef98a872f515f0e7b06c9"
echo "   curl -s -X POST \"http://localhost:8080/chains/$DEFAULT_CHAIN/applications/$NEW_APP_ID\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"query\": \"{ balance(owner: \\\"0x$REGISTRY_APP\\\") }\"}' | jq ."
echo ""
echo "3. Test registry balance query (new feature):"
echo "   curl -s -X POST \"http://localhost:8080/chains/$DEFAULT_CHAIN/applications/$NEW_APP_ID\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"query\": \"{ registryBalance(registryAppId: \\\"$REGISTRY_APP\\\") }\"}' | jq ."
echo ""

# Clean up temp files
rm -f /tmp/token_params.json /tmp/token_init.json

echo "🎉 Deployment complete!"
echo ""