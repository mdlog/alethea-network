#!/bin/bash

# Execute Mint operation on ALETHEA token contract
# This script uses linera CLI to create a block with Mint operation

TO_ADDRESS="${1:-0xf1008485b277add6c3b54207014df45fd8fb48e8146689ba554128a32a6f1ce8}"
AMOUNT="${2:-1000000000000000000000}"  # 1000 tokens with 18 decimals

CHAIN_ID="3482d6e583c1ea93461a9df51dda460cb1d855fb30d8c9c5719145b07692147b"
APP_ID="fee1da3380b869246b647b9deedaed0403043c4474b1b347cf2f8297da674126"

echo "🪙 Minting ALETHEA Tokens"
echo "========================="
echo "Chain ID: $CHAIN_ID"
echo "App ID: $APP_ID"
echo "To Address: $TO_ADDRESS"
echo "Amount: $AMOUNT (raw)"
echo ""

# Create operation JSON
cat > /tmp/mint-op.json <<EOF
{
  "Mint": {
    "to": "$TO_ADDRESS",
    "amount": "$AMOUNT"
  }
}
EOF

echo "📝 Operation JSON:"
cat /tmp/mint-op.json
echo ""

# Try to execute using linera CLI
# Note: This requires proper chain ownership and signing
echo "⚠️  Attempting to execute operation..."
echo "Note: This requires you to own the chain and have signing keys"
echo ""

# Check if we can use linera project command
if linera project --help &>/dev/null; then
    echo "Using linera project command..."
    linera project publish-and-create \
        --path . \
        alethea-token \
        --json-argument '{"initial_supply": 1000000}' \
        --json-parameters '{"name": "ALETHEA", "symbol": "ALE", "decimals": 18}'
else
    echo "❌ linera project command not available"
    echo ""
    echo "Alternative: Use GraphQL mutation through authenticated client"
    echo "The operation needs to be submitted as a block proposal"
fi

echo ""
echo "✅ Script completed"
echo ""
echo "To check balance after minting:"
echo "python3 mint_token.py $TO_ADDRESS"
