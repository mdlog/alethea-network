#!/bin/bash

# Quick check script for market query status
# Usage: ./quick-check-market-query.sh [market_id]

set -e

MARKET_ID="${1:-1}"
MARKET_APP_ID="${MARKET_APP_ID:-afa5023760441e2fd5768f42b010f42f7fab98317612e915e51537a29d7f33d1}"
MARKET_CHAIN_ID="${MARKET_CHAIN_ID:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"
REGISTRY_APP_ID="${REGISTRY_APP_ID:-f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990}"
REGISTRY_CHAIN_ID="${REGISTRY_CHAIN_ID:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"
SERVICE_URL="${VITE_SERVICE_URL:-http://localhost:8080}"

MARKET_URL="${SERVICE_URL}/chains/${MARKET_CHAIN_ID}/applications/${MARKET_APP_ID}"
REGISTRY_URL="${SERVICE_URL}/chains/${REGISTRY_CHAIN_ID}/applications/${REGISTRY_APP_ID}"

echo "🔍 Quick Check: Market #$MARKET_ID Query Status"
echo ""

# Check Market
MARKET_QUERY="{ market(id: \"$MARKET_ID\") { id question status queryId } }"
MARKET_RESPONSE=$(curl -s -X POST "$MARKET_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg query "$MARKET_QUERY" '{query: $query}')" 2>&1)

MARKET_DATA=$(echo "$MARKET_RESPONSE" | jq -r '.data.market' 2>/dev/null)
MARKET_QUESTION=$(echo "$MARKET_DATA" | jq -r '.question' 2>/dev/null)
MARKET_STATUS=$(echo "$MARKET_DATA" | jq -r '.status' 2>/dev/null)

echo "📊 Market #$MARKET_ID:"
echo "   Question: $MARKET_QUESTION"
echo "   Status: $MARKET_STATUS"
echo ""

# Check Registry Queries
QUERIES_QUERY="{ queries { id description status } }"
QUERIES_RESPONSE=$(curl -s -X POST "$REGISTRY_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg query "$QUERIES_QUERY" '{query: $query}')" 2>&1)

MATCHING_QUERY=$(echo "$QUERIES_RESPONSE" | jq -r --arg q "$MARKET_QUESTION" '.data.queries[] | select(.description == $q) | .id' 2>/dev/null | head -1)

if [ -n "$MATCHING_QUERY" ]; then
    echo "✅ Query found in Registry!"
    echo "   Query ID: $MATCHING_QUERY"
    echo ""
    echo "💡 Query exists but Market doesn't have Query ID linked yet"
    echo "   This is normal - callback will link it when query is created"
else
    echo "❌ Query NOT found in Registry"
    echo ""
    echo "🔧 Next steps:"
    echo "   1. Run: ./scripts/investigate-market-query-detailed.sh $MARKET_ID"
    echo "   2. Check Registry voters: curl -X POST $REGISTRY_URL -H 'Content-Type: application/json' -d '{\"query\": \"{ voters { address } }\"}'"
    echo "   3. Process inbox: ./scripts/process-registry-inbox.sh"
fi

echo ""
