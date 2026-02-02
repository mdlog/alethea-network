#!/bin/bash
set -e

echo "🚀 Deploying Fixed Registry Contract"
echo "===================================="
echo ""

# Get current chain info
DEFAULT_CHAIN=$(linera wallet show 2>&1 | grep -E "^│ [a-f0-9]{64}" | head -1 | awk '{print $2}')
echo "Chain: $DEFAULT_CHAIN"

# Build registry contract
echo "Building registry contract..."
cd alethea-contract
cargo build --release --target wasm32-unknown-unknown -p oracle-registry-v2

echo ""
echo "Deploying registry contract..."

# Deploy with Hub configuration
DEPLOY_OUTPUT=$(linera publish-and-create \
    target/wasm32-unknown-unknown/release/oracle_registry_v2_contract.wasm \
    target/wasm32-unknown-unknown/release/oracle_registry_v2_service.wasm \
    --json-parameters '{}' \
    --json-argument '"Hub"' 2>&1)

echo "$DEPLOY_OUTPUT"

# Extract application ID
NEW_REGISTRY_APP=$(echo "$DEPLOY_OUTPUT" | grep -oP '[a-f0-9]{64}' | tail -1)

if [ -z "$NEW_REGISTRY_APP" ]; then
    echo "❌ Failed to extract registry application ID"
    echo "Full output:"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo ""
echo "✅ Fixed Registry deployed successfully!"
echo "New Registry App ID: $NEW_REGISTRY_APP"
echo "Chain: $DEFAULT_CHAIN"

echo ""
echo "🧪 Testing new registry..."
curl -s -X POST "http://localhost:8080/chains/$DEFAULT_CHAIN/applications/$NEW_REGISTRY_APP" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ totalStake voterCount }"}' | jq .

echo ""
echo "🔧 Next Steps:"
echo "1. Update .env.local with new registry app ID: $NEW_REGISTRY_APP"
echo "2. Test staking with new registry"
echo "3. Verify token integration works correctly"
echo ""
echo "🎉 Registry deployment complete!"