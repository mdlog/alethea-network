#!/bin/bash

# Quick status check for Market #1 specifically
# Market #1: "Did Bitcoin close above 100000 USD on December 20, 2024?" | Status: Voting | Query ID: None

MARKET_ID=1
MARKET_APP_ID="${MARKET_APP_ID:-afa5023760441e2fd5768f42b010f42f7fab98317612e915e51537a29d7f33d1}"
MARKET_CHAIN_ID="${MARKET_CHAIN_ID:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"
REGISTRY_APP_ID="${REGISTRY_APP_ID:-f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990}"
REGISTRY_CHAIN_ID="${REGISTRY_CHAIN_ID:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"
SERVICE_URL="${VITE_SERVICE_URL:-http://localhost:8080}"

MARKET_URL="${SERVICE_URL}/chains/${MARKET_CHAIN_ID}/applications/${MARKET_APP_ID}"
REGISTRY_URL="${SERVICE_URL}/chains/${REGISTRY_CHAIN_ID}/applications/${REGISTRY_APP_ID}"

echo "🔍 Checking Market #1 Status..."
echo ""

# Market status
MARKET_QUERY="{ market(id: \"$MARKET_ID\") { id question status queryId } }"
MARKET_RESPONSE=$(curl -s -X POST "$MARKET_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg query "$MARKET_QUERY" '{query: $query}')" 2>&1)

MARKET_DATA=$(echo "$MARKET_RESPONSE" | jq -r '.data.market' 2>/dev/null)
MARKET_QUESTION=$(echo "$MARKET_DATA" | jq -r '.question' 2>/dev/null)
MARKET_STATUS=$(echo "$MARKET_DATA" | jq -r '.status' 2>/dev/null)
QUERY_ID=$(echo "$MARKET_DATA" | jq -r '.queryId' 2>/dev/null)

echo "📊 Market #1:"
echo "   Question: $MARKET_QUESTION"
echo "   Status: $MARKET_STATUS"
echo "   Query ID: ${QUERY_ID:-None}"
echo ""

# Check Registry queries
QUERIES_QUERY="{ queries { id description status createdAt } }"
QUERIES_RESPONSE=$(curl -s -X POST "$REGISTRY_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg query "$QUERIES_QUERY" '{query: $query}')" 2>&1)

MATCHING_QUERY=$(echo "$QUERIES_RESPONSE" | jq -r --arg q "$MARKET_QUESTION" '.data.queries[] | select(.description == $q) | .id' 2>/dev/null | head -1)

if [ -n "$MATCHING_QUERY" ]; then
    echo "✅ Query FOUND in Registry!"
    echo "   Query ID: $MATCHING_QUERY"
    echo ""
    echo "💡 Query exists but Market Query ID not linked yet"
    echo "   This happens when:"
    echo "   - Query was created but callback not received"
    echo "   - Callback not processed by Market"
    echo ""
    echo "🔧 Solution:"
    echo "   1. Query is already in Registry - should be visible in dashboard"
    echo "   2. Market Query ID will be linked when callback is processed"
    echo "   3. Check dashboard: http://localhost:4002"
else
    echo "❌ Query NOT found in Registry"
    echo ""
    echo "🔍 Investigating why..."
    echo ""
    
    # Check if linera service is running
    if curl -s http://localhost:8080/health > /dev/null 2>&1; then
        echo "✅ Linera service is running"
        echo "   ChainListener should process messages automatically"
    else
        echo "❌ Linera service NOT running"
        echo "   Messages will NOT be processed automatically"
    fi
    echo ""
    
    echo "🔧 Next steps:"
    echo "   1. Run full investigation: ./scripts/investigate-market-query-detailed.sh 1"
    echo "   2. Process inbox: ./scripts/process-registry-inbox.sh"
    echo "   3. Check linera service logs for errors"
fi

echo ""
