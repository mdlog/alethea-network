#!/bin/bash
source .env.conway
DL=$(($(date +%s) + 86400))000000

echo "=== Test Workflow (.env.conway) ==="
echo "Chain: $CHAIN_ID"
echo "Registry: $ALETHEA_REGISTRY_ID"
echo ""

echo "1. Protocol Stats:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ protocolStats { totalMarkets totalVoters } }"}' | jq .

echo ""
echo "2. Register Market:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { registerMarket(question: \\\"BTC 100k?\\\", outcomes: [\\\"Yes\\\", \\\"No\\\"], deadline: \\\"$DL\\\", callbackData: \\\"00\\\") }\"}" | jq .

echo ""
echo "3. Active Markets:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ activeMarkets { id question outcomes } }"}' | jq .
