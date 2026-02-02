#!/bin/bash
set -e

echo "🚀 Fixed ALETHEA Token Deployment v2"
echo "===================================="

# Get wallet info
DEFAULT_CHAIN=$(linera wallet show 2>&1 | grep -E "^│ [a-f0-9]{64}" | head -1 | awk '{print $2}')
OWNER_RAW=$(linera wallet show 2>&1 | grep "AccountOwner:" | head -1 | awk '{print $2}')

echo "Chain: $DEFAULT_CHAIN"
echo "Owner: $OWNER_RAW"

# Build first
echo "Building..."
cargo build --release --target wasm32-unknown-unknown --bin alethea-token-contract --bin alethea-token-service

# Parameters
echo '{"name": "Alethea Token", "symbol": "ALTH", "decimals": 18, "registry_app_id": null}' > /tmp/params_v2.json

# Initial state - admin is Option<AccountOwner>, so it can be null or the owner
# Let's try with null first to see if that works
cat > /tmp/init_v2.json <<EOF
{
    "accounts": {
        "$OWNER_RAW": "1000000000000000000000"
    },
    "admin": null
}
EOF

echo "Parameters:"
cat /tmp/params_v2.json
echo ""
echo "Initial state:"
cat /tmp/init_v2.json
echo ""

# Deploy
echo "Deploying..."
DEPLOY_OUTPUT=$(linera publish-and-create \
    ../target/wasm32-unknown-unknown/release/alethea-token-contract.wasm \
    ../target/wasm32-unknown-unknown/release/alethea-token-service.wasm \
    --json-parameters "$(cat /tmp/params_v2.json)" \
    --json-argument "$(cat /tmp/init_v2.json)" 2>&1)

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
echo "✅ Token deployed successfully!"
echo "App ID: $NEW_APP_ID"
echo "Chain: $DEFAULT_CHAIN"

# Test basic query
echo ""
echo "Testing basic query..."
curl -s -X POST "http://localhost:8080/chains/$DEFAULT_CHAIN/applications/$NEW_APP_ID" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ totalSupply }"}' | jq .

# Cleanup
rm -f /tmp/params_v2.json /tmp/init_v2.json

echo ""
echo "🎉 Deployment complete!"
echo "Update .env.local with: VITE_TOKEN_APP_ID=$NEW_APP_ID"