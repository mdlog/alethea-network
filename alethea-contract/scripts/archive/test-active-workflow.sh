#!/bin/bash
# Test dengan chain aktif
ACTIVE_CHAIN="c8e5acdfe8de4ee96300c8d072085351db08d8e49abacb5864cb53ef92524002"
REG="d651214c20e067b10532909816fbd978ce4c07e61786b211bcd64e98257a5352"
DL=$(($(date +%s) + 86400))000000

echo "=== Test Active Chain Workflow ==="
echo "Chain: $ACTIVE_CHAIN (Block Height: 77)"
echo ""

echo "1. Protocol Stats:"
curl -s "http://localhost:8080/chains/$ACTIVE_CHAIN/applications/$REG" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ protocolStats { totalMarkets totalVoters } }"}' | jq .

echo ""
echo "2. Register Market:"
curl -s "http://localhost:8080/chains/$ACTIVE_CHAIN/applications/$REG" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { registerMarket(question: \\\"BTC 100k?\\\", outcomes: [\\\"Yes\\\", \\\"No\\\"], deadline: \\\"$DL\\\", callbackData: \\\"00\\\") }\"}" | jq .

echo ""
echo "3. Register Voter:"
curl -s "http://localhost:8080/chains/$ACTIVE_CHAIN/applications/$REG" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { registerVoter(stake: \"1000\") }"}' | jq .

echo ""
echo "4. Active Markets:"
curl -s "http://localhost:8080/chains/$ACTIVE_CHAIN/applications/$REG" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ activeMarkets { id question outcomes } }"}' | jq .
