#!/bin/bash

echo "=== Fixing Dashboard Resolved Markets Issue ==="

# Load current environment
source .env.conway

echo "Current deployment:"
echo "Chain ID: $CHAIN_ID"
echo "Registry ID: $ALETHEA_REGISTRY_ID"

echo ""
echo "1. Check current market status:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ protocolStats { totalMarkets activeMarkets resolvedMarkets } }"}' | jq .

echo ""
echo "2. Check individual market details:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ market0: marketDetails(id: 0) { id question status } market1: marketDetails(id: 1) { id question status } }"}' | jq .

echo ""
echo "3. The issue: Markets are still 'Active', not 'Resolved'"
echo "   Dashboard shows resolvedMarkets: 0 because no markets have status 'Resolved'"

echo ""
echo "4. Solution: Update dashboard to show markets by status correctly"
echo "   - Active markets: status = 'Active'"
echo "   - Resolved markets: status = 'Resolved' (currently none)"
echo "   - Dashboard should filter markets by status, not rely on separate resolvedMarkets query"

echo ""
echo "5. Alternative: Manually resolve markets if voting is complete"
echo "   This would change market status from 'Active' to 'Resolved'"