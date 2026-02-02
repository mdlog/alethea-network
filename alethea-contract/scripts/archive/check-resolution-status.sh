#!/bin/bash
source .env.conway

echo "=== Check Market Resolution Status ==="
echo ""

echo "1. Market 1 Status:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ market(id: 1) { id question status } marketDetails(id: 1) { status selectedVotersCount totalCommitments totalReveals } }"}' | jq .

echo ""
echo "2. Protocol Stats:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ protocolStats { totalMarkets resolvedMarkets totalVoters activeVoters } }"}' | jq .

echo ""
echo "3. Try Request Resolution Again:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { requestResolution(marketId: 1) }"}' | jq .
