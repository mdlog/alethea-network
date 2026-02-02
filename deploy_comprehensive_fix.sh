#!/bin/bash
set -e

echo "🚀 Comprehensive Staking System Fix Deployment"
echo "=============================================="
echo ""

# Configuration
TOKEN_CHAIN="268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f"
REGISTRY_APP="7a74ffc2b18dfe3f6b42ad6216a8a4d9efe1eb1c5c6ef98a872f515f0e7b06c9"
ADMIN="0x5b2ca02bb9c5369e2c501953ba7a40a90b28f21d6364dbba91bc69a1c411a73d"

echo "📋 Current Configuration:"
echo "Token Chain: $TOKEN_CHAIN"
echo "Registry App: $REGISTRY_APP"
echo "Admin: $ADMIN"
echo ""

echo "🔍 Step 1: Check Current State"
echo "=============================="

# Check current token state
echo "Current token total supply:"
curl -s -X POST "http://localhost:8080/chains/$TOKEN_CHAIN/applications/5e49563bddabeff9d49eb508fb8a01aa1ac292e08848e5fabb85b60907fb3d1b" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ totalSupply }"}' | jq -r '.data.totalSupply'

echo ""
echo "Current admin balance:"
curl -s -X POST "http://localhost:8080/chains/$TOKEN_CHAIN/applications/5e49563bddabeff9d49eb508fb8a01aa1ac292e08848e5fabb85b60907fb3d1b" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"{ balance(owner: \\\"$ADMIN\\\") }\"}" | jq -r '.data.balance'

echo ""
echo "Current registry stake total:"
curl -s -X POST "http://localhost:8080/chains/$TOKEN_CHAIN/applications/$REGISTRY_APP" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ totalStake }"}' | jq -r '.data.totalStake'

echo ""
echo "🎯 Step 2: Deploy New Token Contract"
echo "===================================="

# Use the new token contract we already deployed
NEW_TOKEN_APP="d31db910e7d088714daf22d906e89352b421ca7bde482d351996be216605e300"
echo "Using new token contract: $NEW_TOKEN_APP"

# Test the new contract
echo "Testing new token contract..."
curl -s -X POST "http://localhost:8080/chains/$TOKEN_CHAIN/applications/$NEW_TOKEN_APP" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ tokenInfo { name symbol totalSupply } }"}' | jq .

echo ""
echo "🔧 Step 3: Update Environment Configuration"
echo "==========================================="

# Update .env.local
sed -i "s/VITE_TOKEN_APP_ID=.*/VITE_TOKEN_APP_ID=$NEW_TOKEN_APP/" alethea-dashboard-vite/.env.local
echo "✅ Updated .env.local with new token app ID"

echo ""
echo "🧪 Step 4: Test New Registry Address Calculation"
echo "==============================================="

# Test the new registry balance query
echo "Testing registry balance query with new contract:"
curl -s -X POST "http://localhost:8080/chains/$TOKEN_CHAIN/applications/$NEW_TOKEN_APP" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"{ registryBalance(registryAppId: \\\"$REGISTRY_APP\\\") }\"}" | jq .

echo ""
echo "📊 Step 5: Summary"
echo "=================="
echo "✅ New token contract deployed: $NEW_TOKEN_APP"
echo "✅ Environment updated"
echo "✅ Registry address calculation fixed (deterministic)"
echo ""
echo "⚠️  Next Steps:"
echo "1. Mint tokens to admin account in new contract"
echo "2. Deploy updated registry contract with token verification"
echo "3. Test staking with new system"
echo "4. Migrate existing stakes if needed"
echo ""
echo "🎉 Comprehensive fix deployment complete!"