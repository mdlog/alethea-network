#!/bin/bash

# Check if RequestResolution operation was actually executed and block was committed

set -e

MARKET_ID="${1:-1}"
MARKET_APP_ID="${2:-afa5023760441e2fd5768f42b010f42f7fab98317612e915e51537a29d7f33d1}"
MARKET_CHAIN_ID="${3:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"
SERVICE_URL="${VITE_SERVICE_URL:-http://localhost:8080}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  CHECKING MARKET OPERATION STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check Market status via GraphQL
MARKET_URL="${SERVICE_URL}/chains/${MARKET_CHAIN_ID}/applications/${MARKET_APP_ID}"
MARKET_QUERY="{ market(id: \"$MARKET_ID\") { id question status queryId } }"

echo "[Check 1] Market Status via GraphQL"
MARKET_RESPONSE=$(curl -s -X POST "$MARKET_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg query "$MARKET_QUERY" '{query: $query}')" 2>&1)

if echo "$MARKET_RESPONSE" | jq -e '.data.market' > /dev/null 2>&1; then
    MARKET_STATUS=$(echo "$MARKET_RESPONSE" | jq -r '.data.market.status' 2>/dev/null)
    QUERY_ID=$(echo "$MARKET_RESPONSE" | jq -r '.data.market.queryId' 2>/dev/null)
    
    echo "  ✅ Market found"
    echo "  Status: $MARKET_STATUS"
    echo "  Query ID: ${QUERY_ID:-null}"
    echo ""
    
    if [ "$MARKET_STATUS" = "Voting" ]; then
        echo "  ⚠️  Market status is 'Voting' but Query ID is null"
        echo "  This suggests:"
        echo "    1. Operation was executed (status changed)"
        echo "    2. BUT message may not have been sent or block not committed"
        echo ""
    fi
else
    echo "  ❌ Cannot query market"
    echo "  Response: $MARKET_RESPONSE"
    exit 1
fi

# Check chain info
echo "[Check 2] Chain Information"
echo "  Checking chain state..."
linera show-chain "$MARKET_CHAIN_ID" 2>&1 | head -30 || echo "  ⚠️  Cannot show chain info"

echo ""
echo "[Check 3] Possible Issues"
echo ""
echo "  If Market status is 'Voting' but Query ID is null:"
echo "    1. Operation executed but block not committed"
echo "    2. Message sent but block not finalized"
echo "    3. Message in outbox but not delivered to inbox"
echo ""
echo "  SOLUTION: Re-request resolution from Market frontend"
echo "    This will create a new block with the message"
