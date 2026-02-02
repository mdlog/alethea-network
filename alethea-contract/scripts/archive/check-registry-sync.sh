#!/bin/bash
source .env.conway

echo "=== Check Registry Sync Status ==="
echo ""
echo "Chain: $CHAIN_ID"
echo "Registry: $ALETHEA_REGISTRY_ID"
echo ""

echo "1. Protocol Stats:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ protocolStats { totalMarkets totalVoters activeMarkets resolvedMarkets } }"}' | jq .

echo ""
echo "2. Active Markets:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ activeMarkets { id question outcomes status } }"}' | jq .

echo ""
echo "3. GraphQL Service Status:"
ps aux | grep "linera service" | grep -v grep
