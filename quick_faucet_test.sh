#!/bin/bash

# Quick Faucet Test - Simple version
# Tests if faucet transfer works from treasury to user

echo "🧪 Quick Faucet Test"
echo "===================="
echo ""

# Configuration
TOKEN_APP_ID="56444479feb517556a54789197ebda46fd0267bd394b9b53e357181942d71f53"
TOKEN_CHAIN_ID="ce18260eea4fcbc1fa29da51a92e48d71eaf77513f6eec9b933e5b2f9f94732f"
TREASURY_OWNER="0x97f8b39f99b4097e4f05961d3a93539dbcd99851091809eaf7588d74123649b4"

# Get user info from wallet
echo "📋 Step 1: Getting user information..."
USER_INFO=$(linera wallet show | grep -A 2 "Public Key" | head -3)
USER_CHAIN_ID=$(echo "$USER_INFO" | grep "Owner" | awk '{print $NF}')
USER_OWNER="$USER_CHAIN_ID"  # Owner is same as chain ID for default wallet

echo "   User Chain ID: $USER_CHAIN_ID"
echo "   User Owner: $USER_OWNER"
echo ""

# Check user balance BEFORE
echo "💰 Step 2: Checking user balance BEFORE transfer..."
BALANCE_BEFORE=$(curl -s -X POST \
  "http://localhost:8080/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ balance(owner: \\\"${USER_OWNER}\\\") }\"}" | jq -r '.data.balance // "0."')

echo "   Balance: $BALANCE_BEFORE ALTH"
echo ""

# Transfer 1000 ALTH
echo "📤 Step 3: Transferring 1000 ALTH from treasury..."
TRANSFER_RESULT=$(curl -s -X POST \
  "http://localhost:8080/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { transfer(owner: \\\"${TREASURY_OWNER}\\\", amount: \\\"1000.\\\", targetChain: \\\"${USER_CHAIN_ID}\\\", targetOwner: \\\"${USER_OWNER}\\\") }\"}")

# Check for errors
if echo "$TRANSFER_RESULT" | jq -e '.errors' > /dev/null 2>&1; then
  echo "   ❌ Transfer failed!"
  echo "$TRANSFER_RESULT" | jq '.errors'
  exit 1
fi

echo "   ✅ Transfer initiated"
echo ""

# Wait for cross-chain message
echo "⏳ Step 4: Waiting 5 seconds for cross-chain message..."
sleep 5
echo ""

# Process inbox
echo "📥 Step 5: Processing inbox on user chain..."
linera sync-balance --with-chain-id "$USER_CHAIN_ID" 2>&1 | head -5
echo ""

# Wait a bit
echo "⏳ Waiting 3 more seconds..."
sleep 3
echo ""

# Check balance AFTER
echo "💰 Step 6: Checking user balance AFTER transfer..."
BALANCE_AFTER=$(curl -s -X POST \
  "http://localhost:8080/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ balance(owner: \\\"${USER_OWNER}\\\") }\"}" | jq -r '.data.balance // "0."')

echo "   Balance: $BALANCE_AFTER ALTH"
echo ""

# Summary
echo "📊 Summary"
echo "=========="
echo "   Before:  $BALANCE_BEFORE ALTH"
echo "   After:   $BALANCE_AFTER ALTH"
echo ""

# Parse balances (remove trailing dot)
BEFORE_NUM=$(echo "$BALANCE_BEFORE" | sed 's/\.$//')
AFTER_NUM=$(echo "$BALANCE_AFTER" | sed 's/\.$//')

if [ "$AFTER_NUM" != "$BEFORE_NUM" ]; then
  DIFF=$(echo "$AFTER_NUM - $BEFORE_NUM" | bc)
  echo "✅ SUCCESS! Balance increased by $DIFF ALTH"
  echo ""
  echo "Next steps:"
  echo "1. Refresh dashboard to see new balance"
  echo "2. Try registering as voter with stake"
  echo "3. Verify balance decreases after staking"
else
  echo "⚠️  WARNING: Balance unchanged"
  echo ""
  echo "Possible causes:"
  echo "1. Cross-chain message not yet processed"
  echo "2. Owner address mismatch"
  echo "3. Inbox processing failed"
  echo ""
  echo "Try:"
  echo "1. Run: linera sync-balance --with-chain-id $USER_CHAIN_ID"
  echo "2. Wait 10 seconds"
  echo "3. Check balance again"
fi
