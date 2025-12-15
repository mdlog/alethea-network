#!/bin/bash
set -e

echo "🚀 Deploying ALETHEA Token to local network..."

# Get default chain
DEFAULT_CHAIN=$(linera wallet show | grep "Chain ID" | head -1 | awk '{print $3}')
echo "📍 Using chain: $DEFAULT_CHAIN"

# Get owner from chain
OWNER=$(linera wallet show | grep "AccountOwner:" | head -1 | awk '{print $2}')
echo "👤 Admin owner: $OWNER"

# Token parameters
TOKEN_NAME="Alethea"
TOKEN_SYMBOL="ALETHEA"
TOKEN_DECIMALS=18
INITIAL_SUPPLY="1000000000000000000000000000"  # 1 billion tokens with 18 decimals

echo "📦 Publishing bytecode..."

# Publish bytecode
BYTECODE_ID=$(linera publish-bytecode \
    ../target/wasm32-unknown-unknown/release/alethea-token-contract.wasm \
    ../target/wasm32-unknown-unknown/release/alethea-token-service.wasm \
    2>&1 | grep "Bytecode ID:" | awk '{print $3}')

if [ -z "$BYTECODE_ID" ]; then
    echo "❌ Failed to publish bytecode"
    exit 1
fi

echo "✅ Bytecode published: $BYTECODE_ID"

# Create initial state JSON using BCS format
cat > /tmp/alethea_init.json <<EOF
{
  "admin": "$OWNER",
  "name": "$TOKEN_NAME",
  "symbol": "$TOKEN_SYMBOL",
  "decimals": $TOKEN_DECIMALS,
  "initial_supply": "$INITIAL_SUPPLY"
}
EOF

echo "📝 Initial state:"
cat /tmp/alethea_init.json

echo ""
echo "🎯 Creating application..."

# Create application
linera create-application $BYTECODE_ID \
    --json-argument-path /tmp/alethea_init.json \
    --json-parameters '{}'

echo ""
echo "✅ ALETHEA Token deployed successfully!"
echo ""
echo "📋 Token Details:"
echo "   Name: $TOKEN_NAME"
echo "   Symbol: $TOKEN_SYMBOL"
echo "   Decimals: $TOKEN_DECIMALS"
echo "   Initial Supply: 1,000,000,000 tokens"
echo "   Admin: $OWNER"
