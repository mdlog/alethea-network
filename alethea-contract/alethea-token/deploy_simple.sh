#!/bin/bash
set -e

echo "🚀 Simple ALETHEA Token Deployment"
echo "=================================="

# Get wallet info
DEFAULT_CHAIN=$(linera wallet show 2>&1 | grep -E "^│ [a-f0-9]{64}" | head -1 | awk '{print $2}')
OWNER_RAW=$(linera wallet show 2>&1 | grep "AccountOwner:" | head -1 | awk '{print $2}')

echo "Chain: $DEFAULT_CHAIN"
echo "Owner: $OWNER_RAW"

# Build first
echo "Building..."
cargo build --release --target wasm32-unknown-unknown --bin alethea-token-contract --bin alethea-token-service

# Simple parameters - no registry initially
echo '{"name": "Alethea Token", "symbol": "ALTH", "decimals": 18, "registry_app_id": null}' > /tmp/simple_params.json

# Simple initial state - just admin with 1000 tokens
# Note: admin field should be Some(AccountOwner) in JSON
cat > /tmp/simple_init.json <<EOF
{
    "accounts": {
        "$OWNER_RAW": "1000000000000000000000"
    },
    "admin": "$OWNER_RAW"
}
EOF

echo "Parameters:"
cat /tmp/simple_params.json
echo ""
echo "Initial state:"
cat /tmp/simple_init.json
echo ""

# Deploy
echo "Deploying..."
linera publish-and-create \
    ../target/wasm32-unknown-unknown/release/alethea-token-contract.wasm \
    ../target/wasm32-unknown-unknown/release/alethea-token-service.wasm \
    --json-parameters "$(cat /tmp/simple_params.json)" \
    --json-argument "$(cat /tmp/simple_init.json)"

# Cleanup
rm -f /tmp/simple_params.json /tmp/simple_init.json