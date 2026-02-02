#!/bin/bash

# Test Faucet Transfer Manually
# This script tests the faucet transfer from treasury to user

set -e

# Configuration
TOKEN_APP_ID="56444479feb517556a54789197ebda46fd0267bd394b9b53e357181942d71f53"
TOKEN_CHAIN_ID="ce18260eea4fcbc1fa29da51a92e48d71eaf77513f6eec9b933e5b2f9f94732f"
TREASURY_OWNER="0x97f8b39f99b4097e4f05961d3a93539dbcd99851091809eaf7588d74123649b4"
SERVICE_URL="http://localhost:8080"

# Get user's chain ID and owner from default wallet
echo "📋 Getting user information..."
USER_CHAIN_ID=$(linera wallet show | grep "Public Key" -A 2 | grep "Owner" | head -1 | awk '{print $NF}')
USER_OWNER=$(linera wallet show | grep "Public Key" -A 2 | grep "Owner" | head -1 | awk '{print $NF}')

echo "  User Chain ID: $USER_CHAIN_ID"
echo "  User Owner: $USER_OWNER"

# Check treasury balance
echo ""
echo "💰 Checking treasury balance..."
TREASURY_BALANCE=$(curl -s -X POST \
  "${SERVICE_URL}/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ balance(owner: \\\"${TREASURY_OWNER}\\\") }\"}" | jq -r '.data.balance')

echo "  Treasury Balance: $TREASURY_BALANCE ALTH"

# Check user balance BEFORE transfer
echo ""
echo "💰 Checking user balance BEFORE transfer..."
USER_BALANCE_BEFORE=$(curl -s -X POST \
  "${SERVICE_URL}/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ balance(owner: \\\"${USER_OWNER}\\\") }\"}" | jq -r '.data.balance')

echo "  User Balance: $USER_BALANCE_BEFORE ALTH"

# Transfer 1000 ALTH from treasury to user
AMOUNT="1000"
echo ""
echo "📤 Transferring $AMOUNT ALTH from treasury to user..."
echo "  From: $TREASURY_OWNER (chain $TOKEN_CHAIN_ID)"
echo "  To: $USER_OWNER (chain $USER_CHAIN_ID)"

TRANSFER_RESULT=$(curl -s -X POST \
  "${SERVICE_URL}/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { transfer(owner: \\\"${TREASURY_OWNER}\\\", amount: \\\"${AMOUNT}.\\\", targetChain: \\\"${USER_CHAIN_ID}\\\", targetOwner: \\\"${USER_OWNER}\\\") }\"}")

echo "  Transfer Result:"
echo "$TRANSFER_RESULT" | jq .

# Check for errors
if echo "$TRANSFER_RESULT" | jq -e '.errors' > /dev/null 2>&1; then
  echo "❌ Transfer failed!"
  echo "$TRANSFER_RESULT" | jq '.errors'
  exit 1
fi

echo "✅ Transfer initiated!"

# Wait for cross-chain message
echo ""
echo "⏳ Waiting 5 seconds for cross-chain message..."
sleep 5

# Process inbox on user chain
echo ""
echo "📥 Processing inbox on user chain..."
linera sync-balance --with-chain-id "$USER_CHAIN_ID"

# Wait a bit more
echo "⏳ Waiting 3 seconds..."
sleep 3

# Check user balance AFTER transfer
echo ""
echo "💰 Checking user balance AFTER transfer..."
USER_BALANCE_AFTER=$(curl -s -X POST \
  "${SERVICE_URL}/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ balance(owner: \\\"${USER_OWNER}\\\") }\"}" | jq -r '.data.balance')

echo "  User Balance: $USER_BALANCE_AFTER ALTH"

# Compare balances
echo ""
echo "📊 Summary:"
echo "  Before: $USER_BALANCE_BEFORE ALTH"
echo "  After:  $USER_BALANCE_AFTER ALTH"

if [ "$USER_BALANCE_AFTER" != "$USER_BALANCE_BEFORE" ]; then
  echo "✅ Balance changed! Transfer successful!"
else
  echo "⚠️ Balance unchanged. Checking inbox..."
  
  # Try to query via user chain to trigger inbox processing
  echo ""
  echo "📥 Querying balance via user chain to trigger inbox..."
  linera query-application --application-id "$TOKEN_APP_ID" \
    --query-json "{\"query\":\"{ balance(owner: \\\"${USER_OWNER}\\\") }\"}"
  
  # Check again
  sleep 2
  USER_BALANCE_FINAL=$(curl -s -X POST \
    "${SERVICE_URL}/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID}" \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"{ balance(owner: \\\"${USER_OWNER}\\\") }\"}" | jq -r '.data.balance')
  
  echo "  Final Balance: $USER_BALANCE_FINAL ALTH"
  
  if [ "$USER_BALANCE_FINAL" != "$USER_BALANCE_BEFORE" ]; then
    echo "✅ Balance updated after inbox processing!"
  else
    echo "❌ Balance still unchanged. Manual investigation needed."
  fi
fi
