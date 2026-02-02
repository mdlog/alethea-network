#!/bin/bash
set -e

echo "🚀 Deploying Token Contract with Initial Supply"
echo "=============================================="
echo ""

# Get wallet info
DEFAULT_CHAIN=$(linera wallet show 2>&1 | grep -E "^│ [a-f0-9]{64}" | head -1 | awk '{print $2}')
OWNER_RAW=$(linera wallet show 2>&1 | grep "AccountOwner:" | head -1 | awk '{print $2}')

echo "Chain: $DEFAULT_CHAIN"
echo "Owner: $OWNER_RAW"

# Build contract
echo ""
echo "Building token contract..."
cd alethea-contract/alethea-token
cargo build --release --target wasm32-unknown-unknown --bin alethea-token-contract --bin alethea-token-service

# Create parameters
echo '{"name": "Alethea Token", "symbol": "ALTH", "decimals": 18, "registry_app_id": null}' > /tmp/token_params.json

# Create initial state with tokens for multiple users
cat > /tmp/token_init.json <<EOF
{
    "accounts": {
        "$OWNER_RAW": "2000000000000000000000",
        "0x296688fba8a523222a8327ffaa392d0384ec322b1c18afdbe33d50620c176a0e": "1000000000000000000000",
        "0xbf3ce441d5d767c5379d26a7c897bf6ab515d16668586f624f6956ef0e8711a9": "1000000000000000000000",
        "0x130778f8e9fd014b476fc66d5e9054e5ff48e0a855553413439b685c372bae66": "500000000000000000000",
        "0x22254d70262a983077de23979842d6f206ac5e844ea2eba93a0acc09207deab3": "500000000000000000000"
    },
    "admin": "$OWNER_RAW"
}
EOF

echo ""
echo "Parameters:"
cat /tmp/token_params.json
echo ""
echo "Initial state:"
cat /tmp/token_init.json

echo ""
echo "Deploying contract..."

# Deploy
DEPLOY_OUTPUT=$(linera publish-and-create \
    ../target/wasm32-unknown-unknown/release/alethea-token-contract.wasm \
    ../target/wasm32-unknown-unknown/release/alethea-token-service.wasm \
    --json-parameters "$(cat /tmp/token_params.json)" \
    --json-argument "$(cat /tmp/token_init.json)" 2>&1)

echo "$DEPLOY_OUTPUT"

# Extract application ID
NEW_TOKEN_APP=$(echo "$DEPLOY_OUTPUT" | grep -oP '[a-f0-9]{64}' | tail -1)

if [ -z "$NEW_TOKEN_APP" ]; then
    echo "❌ Failed to extract token application ID"
    echo "Full output:"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo ""
echo "✅ Token contract deployed with initial supply!"
echo "New Token App ID: $NEW_TOKEN_APP"
echo "Chain: $DEFAULT_CHAIN"

echo ""
echo "🧪 Testing new token contract..."
curl -s -X POST "http://localhost:8080/chains/$DEFAULT_CHAIN/applications/$NEW_TOKEN_APP" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ totalSupply tokenInfo { name symbol } }"}' | jq .

echo ""
echo "Checking user balances:"
users=(
  "296688fba8a523222a8327ffaa392d0384ec322b1c18afdbe33d50620c176a0e:mdlog"
  "bf3ce441d5d767c5379d26a7c897bf6ab515d16668586f624f6956ef0e8711a9:gedek"
  "130778f8e9fd014b476fc66d5e9054e5ff48e0a855553413439b685c372bae66:zora"
  "22254d70262a983077de23979842d6f206ac5e844ea2eba93a0acc09207deab3:sarah"
)

for user in "${users[@]}"; do
  IFS=':' read -r chain_id name <<< "$user"
  
  balance=$(curl -s -X POST "http://localhost:8080/chains/$DEFAULT_CHAIN/applications/$NEW_TOKEN_APP" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"{ balance(owner: \\\"0x${chain_id}\\\") }\"}" | jq -r '.data.balance')
  
  echo "$name: $balance ALTH"
done

echo ""
echo "Registry balance test:"
REGISTRY_APP="8ad197abd416c3d9797fc598494acf5d5c1d1424a94aa8e1dff0c9fda4115869"
registry_balance=$(curl -s -X POST "http://localhost:8080/chains/$DEFAULT_CHAIN/applications/$NEW_TOKEN_APP" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"{ registryBalance(registryAppId: \\\"$REGISTRY_APP\\\") }\"}" | jq -r '.data.registryBalance')

echo "Registry: $registry_balance ALTH"

# Clean up
rm -f /tmp/token_params.json /tmp/token_init.json

echo ""
echo "🎉 Token deployment complete!"
echo ""
echo "🔧 Update .env.local with: VITE_TOKEN_APP_ID=$NEW_TOKEN_APP"