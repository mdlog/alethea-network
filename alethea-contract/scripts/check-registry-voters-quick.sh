#!/bin/bash

# Quick check for Registry voters
# Critical check - query creation fails if no voters

REGISTRY_APP_ID="${REGISTRY_APP_ID:-f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990}"
REGISTRY_CHAIN_ID="${REGISTRY_CHAIN_ID:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"
SERVICE_URL="${VITE_SERVICE_URL:-http://localhost:8080}"

REGISTRY_URL="${SERVICE_URL}/chains/${REGISTRY_CHAIN_ID}/applications/${REGISTRY_APP_ID}"

VOTERS_QUERY="{ voters { address stake isActive } statistics { totalVoters activeVoters } }"

VOTERS_RESPONSE=$(curl -s -X POST "$REGISTRY_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg query "$VOTERS_QUERY" '{query: $query}')" 2>&1)

if echo "$VOTERS_RESPONSE" | jq -e '.data.voters' > /dev/null 2>&1; then
    TOTAL_VOTERS=$(echo "$VOTERS_RESPONSE" | jq -r '.data.statistics.totalVoters' 2>/dev/null || echo "0")
    ACTIVE_VOTERS=$(echo "$VOTERS_RESPONSE" | jq -r '.data.statistics.activeVoters' 2>/dev/null || echo "0")
    
    echo "📊 Registry Voters Status:"
    echo "   Total Voters: $TOTAL_VOTERS"
    echo "   Active Voters: $ACTIVE_VOTERS"
    echo ""
    
    if [ "$ACTIVE_VOTERS" = "0" ] || [ "$TOTAL_VOTERS" = "0" ]; then
        echo "❌ CRITICAL: No voters in Registry!"
        echo ""
        echo "💡 This is why query creation fails:"
        echo "   Location: oracle-registry-v2/src/contract.rs:4950-4951"
        echo "   Error: 'No voters registered in Registry'"
        echo ""
        echo "🔧 Solution:"
        echo "   1. Go to Oracle Dashboard (http://localhost:4002)"
        echo "   2. Register as voter with stake"
        echo "   3. Then request resolution from Market again"
    else
        echo "✅ Registry has voters - query creation should work"
        echo ""
        echo "Voters list:"
        echo "$VOTERS_RESPONSE" | jq -r '.data.voters[] | "   - \(.address): Stake=\(.stake), Active=\(.isActive)"' 2>/dev/null
    fi
else
    echo "❌ Could not query Registry voters"
    echo "Response: $VOTERS_RESPONSE"
fi

echo ""
