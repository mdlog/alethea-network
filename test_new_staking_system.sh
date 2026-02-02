#!/bin/bash
set -e

echo "🧪 Testing New Staking System"
echo "============================="
echo ""

TOKEN_CHAIN="268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f"
TOKEN_APP="d31db910e7d088714daf22d906e89352b421ca7bde482d351996be216605e300"
REGISTRY_APP="7a74ffc2b18dfe3f6b42ad6216a8a4d9efe1eb1c5c6ef98a872f515f0e7b06c9"
ADMIN="0x5b2ca02bb9c5369e2c501953ba7a40a90b28f21d6364dbba91bc69a1c411a73d"

echo "📊 Step 1: Check Current State"
echo "=============================="

# Check token state
echo "Token total supply:"
curl -s -X POST "http://localhost:8080/chains/$TOKEN_CHAIN/applications/$TOKEN_APP" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ totalSupply }"}' | jq -r '.data.totalSupply'

echo ""
echo "Admin balance:"
curl -s -X POST "http://localhost:8080/chains/$TOKEN_CHAIN/applications/$TOKEN_APP" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"{ balance(owner: \\\"$ADMIN\\\") }\"}" | jq -r '.data.balance'

echo ""
echo "Registry balance (using new deterministic address):"
curl -s -X POST "http://localhost:8080/chains/$TOKEN_CHAIN/applications/$TOKEN_APP" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"{ registryBalance(registryAppId: \\\"$REGISTRY_APP\\\") }\"}" | jq -r '.data.registryBalance'

echo ""
echo "Registry total stake:"
curl -s -X POST "http://localhost:8080/chains/$TOKEN_CHAIN/applications/$REGISTRY_APP" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ totalStake }"}' | jq -r '.data.totalStake'

echo ""
echo "🔨 Step 2: Mint Tokens for Testing"
echo "=================================="

# Mint 2000 tokens to admin
echo "Minting 2000 tokens to admin..."
MINT_RESULT=$(curl -s -X POST "http://localhost:8080/chains/$TOKEN_CHAIN/applications/$TOKEN_APP" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"mutation { mint(to: \\\"$ADMIN\\\", amount: \\\"2000.\\\") }\"}")

echo "Mint operation scheduled: $(echo "$MINT_RESULT" | jq -r '.data')"

echo ""
echo "⏳ Waiting for mint operation to process..."
sleep 3

echo ""
echo "📊 Step 3: Check Updated Balances"
echo "================================="

echo "New total supply:"
curl -s -X POST "http://localhost:8080/chains/$TOKEN_CHAIN/applications/$TOKEN_APP" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ totalSupply }"}' | jq -r '.data.totalSupply'

echo ""
echo "New admin balance:"
curl -s -X POST "http://localhost:8080/chains/$TOKEN_CHAIN/applications/$TOKEN_APP" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"{ balance(owner: \\\"$ADMIN\\\") }\"}" | jq -r '.data.balance'

echo ""
echo "🧪 Step 4: Test Staking with New System"
echo "======================================="

# Test users (using chain IDs as addresses)
users=(
  "296688fba8a523222a8327ffaa392d0384ec322b1c18afdbe33d50620c176a0e:mdlog"
  "bf3ce441d5d767c5379d26a7c897bf6ab515d16668586f624f6956ef0e8711a9:gedek"
)

echo "Testing token transfers to user chains..."
for user in "${users[@]}"; do
  IFS=':' read -r chain_id name <<< "$user"
  
  echo ""
  echo "Testing $name (${chain_id:0:8}...):"
  
  # Check user balance using chain ID as address
  balance=$(curl -s -X POST "http://localhost:8080/chains/$TOKEN_CHAIN/applications/$TOKEN_APP" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"{ balance(owner: \\\"0x${chain_id}\\\") }\"}" | jq -r '.data.balance')
  
  echo "  Current balance: $balance ALTH"
  
  # Test stake transfer (this should work with new deterministic address)
  echo "  Testing stake transfer of 100 ALTH..."
  stake_result=$(curl -s -X POST "http://localhost:8080/chains/$TOKEN_CHAIN/applications/$TOKEN_APP" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"mutation { stakeTransfer(fromChainId: \\\"${chain_id}\\\", amount: \\\"100.\\\", toRegistry: \\\"$REGISTRY_APP\\\") }\"}")
  
  echo "  Stake result: $(echo "$stake_result" | jq -r '.data.stakeTransfer // .data // "error"')"
done

echo ""
echo "⏳ Waiting for stake operations to process..."
sleep 3

echo ""
echo "📊 Step 5: Check Final State"
echo "============================"

echo "Registry balance after staking:"
curl -s -X POST "http://localhost:8080/chains/$TOKEN_CHAIN/applications/$TOKEN_APP" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"{ registryBalance(registryAppId: \\\"$REGISTRY_APP\\\") }\"}" | jq -r '.data.registryBalance'

echo ""
echo "Registry total stake:"
curl -s -X POST "http://localhost:8080/chains/$TOKEN_CHAIN/applications/$REGISTRY_APP" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ totalStake }"}' | jq -r '.data.totalStake'

echo ""
echo "User balances after staking:"
for user in "${users[@]}"; do
  IFS=':' read -r chain_id name <<< "$user"
  
  balance=$(curl -s -X POST "http://localhost:8080/chains/$TOKEN_CHAIN/applications/$TOKEN_APP" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"{ balance(owner: \\\"0x${chain_id}\\\") }\"}" | jq -r '.data.balance')
  
  echo "$name: $balance ALTH"
done

echo ""
echo "🎉 New Staking System Test Complete!"
echo ""
echo "💡 Summary:"
echo "- Token contract baru: $TOKEN_APP"
echo "- Registry menggunakan deterministic address calculation"
echo "- Sistem staking terintegrasi dengan token contract"