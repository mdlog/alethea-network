#!/bin/bash

export CHAIN_ID="c8e5acdfe8de4ee96300c8d072085351db08d8e49abacb5864cb53ef92524002"
export ALETHEA_REGISTRY_ID="3c018ea20034b33e630ff4db09874fef2bce75c9ba710dcc9fa7eb0b272b6c0a"

echo "=== Requesting Market Resolution ==="

echo "Requesting resolution for Market 0 (ETH 10k):"
curl -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { requestResolution(marketId: 0) }"}'

echo ""
echo "Requesting resolution for Market 1 (Bitcoin 100k):"
curl -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { requestResolution(marketId: 1) }"}'

echo ""
echo "=== Resolution Requests Complete ==="