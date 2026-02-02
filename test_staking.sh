#!/bin/bash
set -e

echo "🧪 Testing Staking System"
echo "========================="
echo ""

TOKEN_CHAIN="268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f"
TOKEN_APP="d5e86fcaad7467c3f7ac6766092a77c25fd064f06941c927cf66be158d370044"
REGISTRY_APP="8ad197abd416c3d9797fc598494acf5d5c1d1424a94aa8e1dff0c9fda4115869"

echo "📊 Current Status:"
echo "=================="

# Check total supply
echo -n "Total Supply: "
curl -s -X POST "http://localhost:8080/chains/${TOKEN_CHAIN}/applications/${TOKEN_APP}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ totalSupply }"}' | jq -r '.data.totalSupply'

echo ""
echo "💰 User Balances:"
echo "=================="

# Check user balances
voters=(
  "296688fba8a523222a8327ffaa392d0384ec322b1c18afdbe33d50620c176a0e:mdlog"
  "bf3ce441d5d767c5379d26a7c897bf6ab515d16668586f624f6956ef0e8711a9:gedek"
)

for voter in "${voters[@]}"; do
  IFS=':' read -r chain_id name <<< "$voter"
  
  balance=$(curl -s -X POST "http://localhost:8080/chains/${TOKEN_CHAIN}/applications/${TOKEN_APP}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"{ balance(owner: \\\"0x${chain_id}\\\") }\"}" | jq -r '.data.balance')
  
  echo "$name (${chain_id:0:8}...): $balance ALTH"
done

echo ""
echo "🏦 Registry Balance:"
echo "==================="

registry_balance=$(curl -s -X POST "http://localhost:8080/chains/${TOKEN_CHAIN}/applications/${TOKEN_APP}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"{ balance(owner: \\\"0x${REGISTRY_APP}\\\") }\"}" | jq -r '.data.balance')

echo "Registry (${REGISTRY_APP:0:8}...): $registry_balance ALTH"

echo ""
echo "📋 Registry Stakes:"
echo "=================="

curl -s -X POST "http://localhost:8080/chains/${TOKEN_CHAIN}/applications/${REGISTRY_APP}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ voters(limit: 10, offset: 0, activeOnly: false) { address stake name } }"}' | jq -r '.data.voters[] | "\(.name // "Unknown") (\(.address[0:8])...): \(.stake) ALTH"'

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
  echo "   This indicates the staking system is not properly integrated."
else
  echo "✅ MATCH: Registry stake matches token balance"
fi

echo ""
echo "💡 Next Steps:"
echo "=============="
echo "1. Use the dashboard to stake tokens"
echo "2. Check if tokens are transferred to registry address"
echo "3. Verify registry stake is updated correctly"
echo ""