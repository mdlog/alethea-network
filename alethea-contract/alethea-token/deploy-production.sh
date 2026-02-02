#!/bin/bash
# Production Deployment Script for Alethea Token with Security Features
# This script deploys the token with all security parameters configured

set -e

echo "🚀 Alethea Token - Production Deployment"
echo "=========================================="
echo ""

# Configuration
CHAIN_ID="${CHAIN_ID:-ce18260eea4fcbc1fa29da51a92e48d71eaf77513f6eec9b933e5b2f9f94732f}"
REGISTRY_APP_ID="${REGISTRY_APP_ID:-46d22719d75164270467baf275715dc48a25707770de763e8689a8e97fa74946}"
TREASURY_OWNER="${TREASURY_OWNER:-0x97f8b39f99b4097e4f05961d3a93539dbcd99851091809eaf7588d74123649b4}"

# Security Parameters
MIN_STAKE="100."              # 100 ALTH minimum stake
MAX_STAKE="10000000."         # 10M ALTH maximum stake per transaction
MAX_USER_STAKE="1000000."     # 1M ALTH maximum total stake per user (0.1% of supply)

# Token Parameters
INITIAL_SUPPLY="1000000000."  # 1 billion ALTH

WASM_CONTRACT="../target/wasm32-unknown-unknown/release/alethea-token-contract.wasm"
WASM_SERVICE="../target/wasm32-unknown-unknown/release/alethea-token-service.wasm"

echo "📋 Configuration:"
echo "  Chain ID: $CHAIN_ID"
echo "  Registry App ID: $REGISTRY_APP_ID"
echo "  Treasury Owner: $TREASURY_OWNER"
echo "  Initial Supply: $INITIAL_SUPPLY ALTH"
echo ""
echo "🔒 Security Parameters:"
echo "  Min Stake: $MIN_STAKE ALTH"
echo "  Max Stake: $MAX_STAKE ALTH"
echo "  Max User Stake: $MAX_USER_STAKE ALTH"
echo ""

# Check if WASM files exist
if [ ! -f "$WASM_CONTRACT" ]; then
    echo "❌ Contract WASM not found. Building..."
    cargo build --release --target wasm32-unknown-unknown
fi

if [ ! -f "$WASM_SERVICE" ]; then
    echo "❌ Service WASM not found. Building..."
    cargo build --release --target wasm32-unknown-unknown
fi

# Parameters JSON
PARAMS=$(cat <<EOF
{
    "name": "Alethea Token",
    "symbol": "ALTH",
    "decimals": 18,
    "registry_app_id": "$REGISTRY_APP_ID",
    "min_stake_amount": "$MIN_STAKE",
    "max_stake_amount": "$MAX_STAKE",
    "max_stake_per_user": "$MAX_USER_STAKE"
}
EOF
)

# Initial state JSON
INIT_STATE=$(cat <<EOF
{
    "accounts": {
        "$TREASURY_OWNER": "$INITIAL_SUPPLY"
    },
    "admin": "$TREASURY_OWNER"
}
EOF
)

echo "📦 Parameters:"
echo "$PARAMS" | jq .
echo ""
echo "📦 Initial State:"
echo "$INIT_STATE" | jq .
echo ""

# Confirm deployment
read -p "🤔 Deploy with these settings? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Stop existing service
echo "🛑 Stopping existing linera service..."
pkill -f "linera service" 2>/dev/null || true
sleep 2

# Sync chain
echo "🔄 Syncing chain..."
linera sync

# Deploy
echo "🚀 Deploying alethea-token..."
linera publish-and-create \
    "$WASM_CONTRACT" \
    "$WASM_SERVICE" \
    --json-parameters "$PARAMS" \
    --json-argument "$INIT_STATE" \
    2>&1 | tee deployment.log

# Extract App ID
APP_ID=$(grep "Application ID:" deployment.log | grep -oP '[a-f0-9]{64}' | head -1)

if [ -z "$APP_ID" ]; then
    echo "❌ Failed to extract Application ID"
    exit 1
fi

echo ""
echo "✅ Alethea Token Deployed Successfully!"
echo "=========================================="
echo "📝 Application ID: $APP_ID"
echo ""
echo "🔧 Next Steps:"
echo "1. Update .env.local with:"
echo "   VITE_TOKEN_APP_ID=$APP_ID"
echo ""
echo "2. Verify deployment:"
echo "   linera query-application $APP_ID"
echo ""
echo "3. Test queries:"
echo "   curl -X POST http://localhost:8080/chains/$CHAIN_ID/applications/$APP_ID \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"query\": \"{ tokenInfo { name symbol decimals totalSupply } }\"}'"
echo ""
echo "4. Check authorized registry:"
echo "   curl -X POST http://localhost:8080/chains/$CHAIN_ID/applications/$APP_ID \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"query\": \"{ isRegistryAuthorized(registryAppId: \\\"$REGISTRY_APP_ID\\\") }\"}'"
echo ""

# Save deployment info
cat > deployment-info.json <<EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "app_id": "$APP_ID",
    "chain_id": "$CHAIN_ID",
    "registry_app_id": "$REGISTRY_APP_ID",
    "treasury_owner": "$TREASURY_OWNER",
    "initial_supply": "$INITIAL_SUPPLY",
    "security_params": {
        "min_stake_amount": "$MIN_STAKE",
        "max_stake_amount": "$MAX_STAKE",
        "max_stake_per_user": "$MAX_USER_STAKE"
    }
}
EOF

echo "💾 Deployment info saved to: deployment-info.json"
echo ""

# Restart service
echo "🔄 Restarting linera service..."
nohup linera service --port 8080 > /tmp/linera-service.log 2>&1 &
sleep 3

echo "✅ Service restarted"
echo ""
echo "🎉 Deployment Complete!"
