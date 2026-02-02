#!/bin/bash

# Mint ALETHEA tokens to specific address
# Usage: ./mint-to-address.sh <address> <amount>

TO_ADDRESS="${1:-f1008485b277add6c3b54207014df45fd8fb48e8146689ba554128a32a6f1ce8}"
AMOUNT="${2:-1000.}"

echo "🪙 Minting $AMOUNT ALETHEA tokens to $TO_ADDRESS"
echo ""

# Call the API endpoint
curl -X POST http://localhost:4000/api/mint-alethea \
  -H "Content-Type: application/json" \
  -d "{\"to\":\"$TO_ADDRESS\",\"amount\":\"$AMOUNT\"}" \
  | jq .

echo ""
echo "✅ Mint request completed"
