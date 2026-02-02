#!/bin/bash
set -e

echo "🧪 Testing Frontend Staking Integration"
echo "======================================"
echo ""

TOKEN_CHAIN="268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f"
TOKEN_APP="5e49563bddabeff9d49eb508fb8a01aa1ac292e08848e5fabb85b60907fb3d1b"
REGISTRY_APP="7a74ffc2b18dfe3f6b42ad6216a8a4d9efe1eb1c5c6ef98a872f515f0e7b06c9"

echo "📊 Current Status Before Test:"
echo "=============================="

# Check user balances
echo "💰 User Token Balances:"
voters=(
  "296688fba8a523222a8327ffaa392d0384ec322b1c18afdbe33d50620c176a0e:mdlog"
  "bf3ce441d5d767c5379d26a7c897bf6ab515d16668586f624f6956ef0e8711a9:gedek"
)

for voter in "${voters[@]}"; do
  IFS=':' read -r chain_id name <<< "$voter"
  
  balance=$(curl -s -X POST "http://localhost:8080/chains/${TOKEN_CHAIN}/applications/${TOKEN_APP}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"{ balance(owner: \\\"0x${chain_id}\\\") }\"}" | jq -r '.data.balance')
  
  echo "  $name: $balance ALTH"
done

echo ""
echo "🏦 Registry Token Balance:"
registry_balance=$(curl -s -X POST "http://localhost:8080/chains/${TOKEN_CHAIN}/applications/${TOKEN_APP}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"{ balance(owner: \\\"0x${REGISTRY_APP}\\\") }\"}" | jq -r '.data.balance')
echo "  Registry: $registry_balance ALTH"

echo ""
echo "📋 Registry Stakes:"
curl -s -X POST "http://localhost:8080/chains/${TOKEN_CHAIN}/applications/${REGISTRY_APP}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ voters(limit: 10, offset: 0, activeOnly: false) { address stake name } }"}' | jq -r '.data.voters[] | "  \(.name // "Unknown"): \(.stake) ALTH"'

echo ""
echo "🔍 Analysis:"
echo "============"

total_registry_stake=$(curl -s -X POST "http://localhost:8080/chains/${TOKEN_CHAIN}/applications/${REGISTRY_APP}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ totalStake }"}' | jq -r '.data.totalStake // "0"')

echo "Total Registry Stake: $total_registry_stake ALTH"
echo "Registry Token Balance: $registry_balance ALTH"

if [ "$total_registry_stake" != "$registry_balance" ]; then
  echo "❌ MISMATCH: Registry stake ($total_registry_stake) != Token balance ($registry_balance)"
  discrepancy=$(echo "$total_registry_stake - $registry_balance" | bc -l 2>/dev/null || echo "N/A")
  echo "   Discrepancy: $discrepancy ALTH"
else
  echo "✅ MATCH: Registry stake matches token balance"
fi

echo ""
echo "💡 Frontend Testing Instructions:"
echo "================================="
echo "1. Open dashboard: http://localhost:5173"
echo "2. Go to Profile page"
echo "3. Try to stake tokens using 'Add Stake' button"
echo "4. Monitor console logs for cross-chain messages"
echo "5. Check if tokens are transferred to registry address"
echo "6. Verify registry stake is updated correctly"
echo ""
echo "🔧 Expected Behavior with Fixed Frontend:"
echo "========================================="
echo "- Frontend should use sendStakeRequest (cross-chain message)"
echo "- Token should be transferred to registry address: 0x$REGISTRY_APP"
echo "- Registry stake should be updated via UpdateStake message"
echo "- Both token balance and registry stake should match"
echo ""