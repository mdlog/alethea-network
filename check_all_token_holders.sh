#!/bin/bash

# Check All Token Holders
# This script checks which addresses have tokens in the contract

echo "🔍 Checking All Token Holders"
echo "=============================="
echo ""

TOKEN_APP_ID="56444479feb517556a54789197ebda46fd0267bd394b9b53e357181942d71f53"
TOKEN_CHAIN_ID="ce18260eea4fcbc1fa29da51a92e48d71eaf77513f6eec9b933e5b2f9f94732f"
TREASURY_OWNER="0x97f8b39f99b4097e4f05961d3a93539dbcd99851091809eaf7588d74123649b4"
REGISTRY_APP_ID="46d22719d75164270467baf275715dc48a25707770de763e8689a8e97fa74946"

# Function to check balance
check_balance() {
    local owner=$1
    local label=$2
    
    balance=$(curl -s -X POST \
        "http://localhost:8080/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID}" \
        -H "Content-Type: application/json" \
        -d "{\"query\":\"{ balance(owner: \\\"${owner}\\\") }\"}" | jq -r '.data.balance // "0."')
    
    # Remove trailing dot and check if > 0
    balance_num=$(echo "$balance" | sed 's/\.$//')
    
    if [ "$balance_num" != "0" ] && [ "$balance_num" != "" ]; then
        echo "✅ $label"
        echo "   Address: $owner"
        echo "   Balance: $balance ALTH"
        echo ""
        return 0
    else
        echo "❌ $label"
        echo "   Address: $owner"
        echo "   Balance: 0 ALTH"
        echo ""
        return 1
    fi
}

# 1. Check Treasury
echo "1️⃣  Treasury Account"
echo "-------------------"
check_balance "$TREASURY_OWNER" "Treasury"

# 2. Check Registry (using Address32 from app ID)
echo "2️⃣  Registry Account"
echo "-------------------"
# Registry balance uses special query
registry_balance=$(curl -s -X POST \
    "http://localhost:8080/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID}" \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"{ registryBalance(registryAppId: \\\"${REGISTRY_APP_ID}\\\") }\"}" | jq -r '.data.registryBalance // "0."')

echo "   Registry App ID: $REGISTRY_APP_ID"
echo "   Balance: $registry_balance ALTH"
echo ""

# 3. Check User's Chain ID as Owner
echo "3️⃣  User Account (Chain ID as Owner)"
echo "------------------------------------"
USER_CHAIN_ID=$(linera wallet show | grep "Public Key" -A 2 | grep "Owner" | head -1 | awk '{print $NF}')
check_balance "$USER_CHAIN_ID" "User (Chain ID)"

# 4. Check User's actual Owner from wallet
echo "4️⃣  User Account (Wallet Owner)"
echo "-------------------------------"
# Get the actual owner address from wallet
WALLET_OWNER=$(linera wallet show | grep "Owner" | head -1 | awk '{print $NF}')
if [ "$WALLET_OWNER" != "$USER_CHAIN_ID" ]; then
    check_balance "$WALLET_OWNER" "User (Wallet Owner)"
else
    echo "   Same as Chain ID (already checked above)"
    echo ""
fi

# 5. Try to get all accounts from state (if possible)
echo "5️⃣  Querying Token Info"
echo "----------------------"
token_info=$(curl -s -X POST \
    "http://localhost:8080/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID}" \
    -H "Content-Type: application/json" \
    -d '{"query":"{ tokenInfo { name symbol decimals totalSupply totalMinted totalBurned } }"}')

echo "$token_info" | jq .
echo ""

# Summary
echo "📊 Summary"
echo "=========="
echo ""
echo "Token Contract: $TOKEN_APP_ID"
echo "Token Chain: $TOKEN_CHAIN_ID"
echo ""
echo "Known Addresses:"
echo "  Treasury: $TREASURY_OWNER"
echo "  Registry: $REGISTRY_APP_ID"
echo "  User Chain: $USER_CHAIN_ID"
echo "  User Owner: $WALLET_OWNER"
echo ""
echo "💡 Tips:"
echo "  - If treasury has all tokens, no transfers have been made"
echo "  - If user has 0 balance, faucet transfer failed or not processed"
echo "  - If registry has tokens, some users have staked"
echo ""
echo "To check a specific address:"
echo "  curl -s -X POST http://localhost:8080/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID} \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"query\":\"{ balance(owner: \\\"YOUR_ADDRESS\\\") }\"}' | jq ."
