#!/bin/bash

# Script to register a voter in Oracle Registry v2
# Usage: ./scripts/register-voter.sh <stake> [name]

set -e

# Configuration
REGISTRY_CHAIN="8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef"
REGISTRY_APP="9ee97b285979b8aa6aea7d70be372398e2081839f0ba2006031152a06231c03f"

# Parse arguments
STAKE=${1:-1000}
NAME=${2:-""}

echo "🔐 Registering voter..."
echo "  Stake: $STAKE"
echo "  Name: $NAME"
echo ""

# Build message JSON
if [ -z "$NAME" ]; then
    MESSAGE="{\"RegisterVoter\":{\"stake\":\"$STAKE\"}}"
else
    MESSAGE="{\"RegisterVoter\":{\"stake\":\"$STAKE\",\"name\":\"$NAME\"}}"
fi

echo "📝 Message: $MESSAGE"
echo ""

# Send cross-chain message
echo "🚀 Sending message to registry..."
linera transfer 0 \
    --target-chain "$REGISTRY_CHAIN" \
    --target-application "$REGISTRY_APP" \
    --message "$MESSAGE"

echo ""
echo "✅ Registration message sent!"
echo ""
echo "🔍 Verifying registration..."
sleep 2

# Query voter count
curl -s -X POST "http://localhost:8080/chains/$REGISTRY_CHAIN/applications/$REGISTRY_APP" \
    -H "Content-Type: application/json" \
    -d '{"query": "query { voterCount totalStake }"}' | jq .

echo ""
echo "✅ Done!"
