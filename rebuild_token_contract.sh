#!/bin/bash

echo "🔧 Rebuilding Token Contract with Fixed Service Layer"
echo "=================================================="

cd alethea-contract

# Build the token contract
echo "📦 Building alethea-token..."
cargo build --release --target wasm32-unknown-unknown --package alethea-token

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"

# Deploy new token contract
echo ""
echo "🚀 Deploying new token contract..."

# Use the same parameters as before
linera publish-and-create \
    target/wasm32-unknown-unknown/release/alethea_token_{contract,service}.wasm \
    --json-parameters '{
        "name": "Alethea Token",
        "symbol": "ALTH", 
        "decimals": 18,
        "registry_app_id": "22849e811d38de55050a50783c86486437e3c076161e2f043a1bdcdf6ae8334d"
    }' \
    --json-argument '{
        "accounts": {
            "Address32([40, 67, 26, 16, 116, 53, 156, 38, 77, 35, 215, 168, 74, 135, 90, 12, 227, 160, 185, 163, 59, 118, 77, 46, 15, 38, 197, 156, 132, 171, 200, 95])": "2000."
        },
        "admin": "Address32([40, 67, 26, 16, 116, 53, 156, 38, 77, 35, 215, 168, 74, 135, 90, 12, 227, 160, 185, 163, 59, 118, 77, 46, 15, 38, 197, 156, 132, 171, 200, 95])"
    }'

echo ""
echo "🎉 Token contract rebuilt and deployed!"
echo "📝 Update your .env.local with the new VITE_TOKEN_APP_ID"