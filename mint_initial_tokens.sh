#!/bin/bash
set -e

echo "💰 Minting Initial Tokens"
echo "========================="

TOKEN_CHAIN="268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f"
NEW_TOKEN_APP="d31db910e7d088714daf22d906e89352b421ca7bde482d351996be216605e300"
ADMIN="0x5b2ca02bb9c5369e2c501953ba7a40a90b28f21d6364dbba91bc69a1c411a73d"

echo "Token App: $NEW_TOKEN_APP"
echo "Admin: $ADMIN"
echo ""

# Check current state
echo "Current total supply:"
curl -s -X POST "http://localhost:8080/chains/$TOKEN_CHAIN/applications/$NEW_TOKEN_APP" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ totalSupply }"}' | jq -r '.data.totalSupply'

echo ""
echo "Current admin balance:"
curl -s -X POST "http://localhost:8080/chains/$TOKEN_CHAIN/applications/$NEW_TOKEN_APP" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"{ balance(owner: \\\"$ADMIN\\\") }\"}" | jq -r '.data.balance'

echo ""
echo "🔨 Minting 2000 tokens to admin..."

# Mint tokens using GraphQL mutation
MINT_RESULT=$(curl -s -X POST "http://localhost:8080/chains/$TOKEN_CHAIN/applications/$NEW_TOKEN_APP" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"mutation { mint(to: \\\"$ADMIN\\\", amount: \\\"2000.\\\") }\"}")

echo "Mint result: $MINT_RESULT"

# Extract operation bytes
OP_BYTES=$(echo "$MINT_RESULT" | jq -r '.data.mint // .data')

if [ "$OP_BYTES" != "null" ] && [ ${#OP_BYTES} -eq 64 ]; then
    echo "✅ Mint operation scheduled: $OP_BYTES"
    echo ""
    echo "⏳ Waiting for operation to be processed..."
    sleep 3
    
    # Check if tokens were minted
    echo "Checking updated balances..."
    echo ""
    echo "New total supply:"
    curl -s -X POST "http://localhost:8080/chains/$TOKEN_CHAIN/applications/$NEW_TOKEN_APP" \
      -H "Content-Type: application/json" \
      -d '{"query": "{ totalSupply }"}' | jq -r '.data.totalSupply'
    
    echo ""
    echo "New admin balance:"
    curl -s -X POST "http://localhost:8080/chains/$TOKEN_CHAIN/applications/$NEW_TOKEN_APP" \
      -H "Content-Type: application/json" \
      -d "{\"query\": \"{ balance(owner: \\\"$ADMIN\\\") }\"}" | jq -r '.data.balance'
else
    echo "❌ Mint operation failed or returned unexpected result"
    echo "Result: $MINT_RESULT"
fi

echo ""
echo "🎉 Token minting complete!"