#!/bin/bash

# Check Specific Addresses

TOKEN_APP_ID="56444479feb517556a54789197ebda46fd0267bd394b9b53e357181942d71f53"
TOKEN_CHAIN_ID="ce18260eea4fcbc1fa29da51a92e48d71eaf77513f6eec9b933e5b2f9f94732f"

echo "🔍 Checking Specific Addresses"
echo "=============================="
echo ""

# 1. Check Chain ID as Owner
CHAIN_ID="cea61ba44825f91893de2ae48d3b418493a946a96d95c45bf7a6016c7b885651"
echo "1️⃣  Chain ID as Owner"
echo "   Address: $CHAIN_ID"
echo "   Balance:"
curl -s -X POST http://localhost:8080/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID} \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ balance(owner: \\\"${CHAIN_ID}\\\") }\"}" | jq .
echo ""

# 2. Check Account Owner
ACCOUNT_OWNER="0xA1252F54b3D7926089a1433bBd78cADeBdb08542"
echo "2️⃣  Account Owner"
echo "   Address: $ACCOUNT_OWNER"
echo "   Balance:"
curl -s -X POST http://localhost:8080/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID} \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ balance(owner: \\\"${ACCOUNT_OWNER}\\\") }\"}" | jq .
echo ""

# 3. Try lowercase version of Account Owner
ACCOUNT_OWNER_LOWER=$(echo "$ACCOUNT_OWNER" | tr '[:upper:]' '[:lower:]')
echo "3️⃣  Account Owner (lowercase)"
echo "   Address: $ACCOUNT_OWNER_LOWER"
echo "   Balance:"
curl -s -X POST http://localhost:8080/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID} \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ balance(owner: \\\"${ACCOUNT_OWNER_LOWER}\\\") }\"}" | jq .
echo ""

echo "📊 Summary"
echo "=========="
echo "Chain ID: $CHAIN_ID"
echo "Account Owner: $ACCOUNT_OWNER"
echo "Account Owner (lower): $ACCOUNT_OWNER_LOWER"
echo ""
echo "💡 Note:"
echo "  - Linera uses AccountOwner format, not just addresses"
echo "  - Chain ID can be used as owner (Address32)"
echo "  - Account owner should be in format: User:0x..."
