#!/bin/bash
set -e

echo "🚀 Deploying Oracle Contract..."
echo ""

# Check if WASM files exist
if [ ! -f "target/wasm32-unknown-unknown/release/oracle-contract.wasm" ] || \
   [ ! -f "target/wasm32-unknown-unknown/release/oracle-service.wasm" ]; then
    echo "❌ WASM files not found! Run ./build.sh first"
    exit 1
fi

# Get chain ID from environment or use default
CHAIN_ID="${NEXT_PUBLIC_CHAIN_ID:-8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef}"

echo "📍 Using chain: $CHAIN_ID"
echo ""

# Step 1: Publish and create application in one command
echo "📤 Publishing bytecode and creating application..."
DEPLOY_OUTPUT=$(linera publish-and-create \
    target/wasm32-unknown-unknown/release/oracle-contract.wasm \
    target/wasm32-unknown-unknown/release/oracle-service.wasm \
    2>&1)

echo "$DEPLOY_OUTPUT"

# Extract application ID from output
APP_ID=$(echo "$DEPLOY_OUTPUT" | grep -oP 'Application ID: \K[a-f0-9]+' || echo "")

if [ -z "$APP_ID" ]; then
    echo "❌ Failed to extract application ID"
    echo "Output was:"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo "✅ Application created: $APP_ID"
echo ""

# Step 3: Update .env.local
echo "📝 Step 3: Updating .env.local..."

ENV_FILE="../alethea-dashboard/.env.local"

if [ -f "$ENV_FILE" ]; then
    # Check if ORACLE_APP_ID already exists
    if grep -q "NEXT_PUBLIC_ORACLE_APP_ID" "$ENV_FILE"; then
        # Update existing
        sed -i "s/NEXT_PUBLIC_ORACLE_APP_ID=.*/NEXT_PUBLIC_ORACLE_APP_ID=$APP_ID/" "$ENV_FILE"
        echo "✅ Updated NEXT_PUBLIC_ORACLE_APP_ID in .env.local"
    else
        # Add new
        echo "" >> "$ENV_FILE"
        echo "# Oracle Application - DEPLOYED! ✅" >> "$ENV_FILE"
        echo "NEXT_PUBLIC_ORACLE_APP_ID=$APP_ID" >> "$ENV_FILE"
        echo "✅ Added NEXT_PUBLIC_ORACLE_APP_ID to .env.local"
    fi
else
    echo "⚠️ .env.local not found at $ENV_FILE"
    echo "Please manually add:"
    echo "NEXT_PUBLIC_ORACLE_APP_ID=$APP_ID"
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Summary:"
echo "  Bytecode ID: $BYTECODE_ID"
echo "  Application ID: $APP_ID"
echo "  Chain ID: $CHAIN_ID"
echo ""
echo "🔗 GraphQL Endpoint:"
echo "  http://localhost:8080/chains/$CHAIN_ID/applications/$APP_ID"
echo ""
echo "✅ Next steps:"
echo "1. Restart your dashboard (npm run dev)"
echo "2. Try committing a vote"
echo "3. Check console for success messages"
