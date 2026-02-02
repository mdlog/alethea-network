#!/bin/bash

# Quick Balance Check - Check who has tokens

TOKEN_APP_ID="56444479feb517556a54789197ebda46fd0267bd394b9b53e357181942d71f53"
TOKEN_CHAIN_ID="ce18260eea4fcbc1fa29da51a92e48d71eaf77513f6eec9b933e5b2f9f94732f"
TREASURY="0x97f8b39f99b4097e4f05961d3a93539dbcd99851091809eaf7588d74123649b4"

echo "💰 Quick Balance Check"
echo "====================="
echo ""

# Get user chain ID
USER_CHAIN=$(linera wallet show | grep "Owner" | head -1 | awk '{print $NF}')
echo "User Chain ID: $USER_CHAIN"
echo ""

# Check Treasury
echo "1. Treasury Balance:"
curl -s -X POST http://localhost:8080/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID} \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ balance(owner: \\\"${TREASURY}\\\") }\"}" | jq -r '.data.balance // "ERROR"'
echo ""

# Check User (using chain ID as owner)
echo "2. User Balance (Chain ID as Owner):"
curl -s -X POST http://localhost:8080/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID} \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ balance(owner: \\\"${USER_CHAIN}\\\") }\"}" | jq -r '.data.balance // "ERROR"'
echo ""

# Check Total Supply
echo "3. Total Supply:"
curl -s -X POST http://localhost:8080/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID} \
  -H "Content-Type: application/json" \
  -d '{"query":"{ totalSupply }"}' | jq -r '.data.totalSupply // "ERROR"'
echo ""

echo "---"
echo "If user balance is 0, try:"
echo "  ./quick_faucet_test.sh"
