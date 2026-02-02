#!/bin/bash
set -e

echo "💰 Minting Tokens for Testing"
echo "============================="
echo ""

TOKEN_CHAIN="268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f"
TOKEN_APP="d31db910e7d088714daf22d906e89352b421ca7bde482d351996be216605e300"
ADMIN="0x5b2ca02bb9c5369e2c501953ba7a40a90b28f21d6364dbba91bc69a1c411a73d"

echo "Token App: $TOKEN_APP"
echo "Admin: $ADMIN"
echo ""

# Test users (chain IDs yang akan digunakan sebagai addresses)
users=(
  "296688fba8a523222a8327ffaa392d0384ec322b1c18afdbe33d50620c176a0e:mdlog:1000"
  "bf3ce441d5d767c5379d26a7c897bf6ab515d16668586f624f6956ef0e8711a9:gedek:1000"
  "130778f8e9fd014b476fc66d5e9054e5ff48e0a855553413439b685c372bae66:zora:500"
  "22254d70262a983077de23979842d6f206ac5e844ea2eba93a0acc09207deab3:sarah:500"
)

echo "🔨 Minting tokens to users..."
echo ""

for user in "${users[@]}"; do
  IFS=':' read -r chain_id name amount <<< "$user"
  
  echo "Minting $amount ALTH to $name (${chain_id:0:8}...):"
  
  # Mint tokens using GraphQL mutation
  MINT_RESULT=$(curl -s -X POST "http://localhost:8080/chains/$TOKEN_CHAIN/applications/$TOKEN_APP" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"mutation { mint(to: \\\"0x${chain_id}\\\", amount: \\\"${amount}.\\\") }\"}")

  echo "  Result: $(echo "$MINT_RESULT" | jq -r '.data.mint // .data // "error"')"
  
  # Small delay between operations
  sleep 1
done

echo ""
echo "⏳ Waiting for operations to process..."
sleep 5

echo ""
echo "📊 Checking balances..."
echo ""

# Check total supply
echo "Total supply:"
curl -s -X POST "http://localhost:8080/chains/$TOKEN_CHAIN/applications/$TOKEN_APP" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ totalSupply }"}' | jq -r '.data.totalSupply'

echo ""
echo "User balances:"
for user in "${users[@]}"; do
  IFS=':' read -r chain_id name amount <<< "$user"
  
  balance=$(curl -s -X POST "http://localhost:8080/chains/$TOKEN_CHAIN/applications/$TOKEN_APP" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"{ balance(owner: \\\"0x${chain_id}\\\") }\"}" | jq -r '.data.balance')
  
  echo "$name: $balance ALTH"
done

echo ""
echo "Admin balance:"
admin_balance=$(curl -s -X POST "http://localhost:8080/chains/$TOKEN_CHAIN/applications/$TOKEN_APP" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"{ balance(owner: \\\"$ADMIN\\\") }\"}" | jq -r '.data.balance')

echo "Admin: $admin_balance ALTH"

echo ""
echo "🎉 Token minting complete!"
echo ""
echo "💡 Note: Operations are scheduled but may need time to execute."
echo "If balances show 0, the operations are still being processed."