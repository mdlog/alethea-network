#!/bin/bash
# Test dengan chain yang aktif (c8e5acd... - block height 77)
CHAIN="c8e5acdfe8de4ee96300c8d072085351db08d8e49abacb5864cb53ef92524002"
REG="d651214c20e067b10532909816fbd978ce4c07e61786b211bcd64e98257a5352"
DL=$(($(date +%s) + 86400))000000

echo "=== Test Active Chain (c8e5acd...) ==="
echo "Chain: $CHAIN"
echo "Registry: $REG"
echo ""

echo "1. Protocol Stats:"
curl -s "http://localhost:8080/chains/$CHAIN/applications/$REG" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ protocolStats { totalMarkets totalVoters } }"}' | jq .

echo ""
echo "2. Register Market:"
curl -s "http://localhost:8080/chains/$CHAIN/applications/$REG" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { registerMarket(question: \\\"BTC 100k?\\\", outcomes: [\\\"Yes\\\", \\\"No\\\"], deadline: \\\"$DL\\\", callbackData: \\\"00\\\") }\"}" | jq .
