#!/bin/bash
CHAIN="0c77da791bd3daee848448091fefd29891fbeab54e57362af6598f551f924307"
REG="d651214c20e067b10532909816fbd978ce4c07e61786b211bcd64e98257a5352"
DL=$(($(date +%s) + 86400))000000

echo "=== Conway Testnet Final Test ==="
echo ""
echo "1. Protocol Stats:"
curl -s "http://localhost:8080/chains/$CHAIN/applications/$REG" -H "Content-Type: application/json" -d '{"query":"{ protocolStats { totalMarkets totalVoters } }"}' | jq .

echo ""
echo "2. Register Market (hex callback):"
curl -s "http://localhost:8080/chains/$CHAIN/applications/$REG" -H "Content-Type: application/json" -d "{\"query\":\"mutation { registerMarket(question: \\\"BTC 100k?\\\", outcomes: [\\\"Yes\\\", \\\"No\\\"], deadline: \\\"$DL\\\", callbackData: \\\"00\\\") }\"}" | jq .

echo ""
echo "3. Register Voter:"
curl -s "http://localhost:8080/chains/$CHAIN/applications/$REG" -H "Content-Type: application/json" -d '{"query":"mutation { registerVoter(stake: \"1000\") }"}' | jq .

echo ""
echo "4. Active Markets:"
curl -s "http://localhost:8080/chains/$CHAIN/applications/$REG" -H "Content-Type: application/json" -d '{"query":"{ activeMarkets { id question } }"}' | jq .
