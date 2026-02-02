#!/bin/bash
# Correct Workflow Test - Conway Testnet

CHAIN_ID="0c77da791bd3daee848448091fefd29891fbeab54e57362af6598f551f924307"
REGISTRY_ID="d651214c20e067b10532909816fbd978ce4c07e61786b211bcd64e98257a5352"

echo "🧪 Alethea Protocol - Correct Workflow Test"
echo "============================================"
echo ""

# Test 1: Registry Status
echo "📊 Test 1: Registry Status"
curl -s -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ protocolStats { totalMarkets totalVoters } }"}' | jq .
echo ""

# Test 2: Register Market (correct schema)
echo "📝 Test 2: Register Market"
DEADLINE=$(($(date +%s) + 86400))000000
curl -s -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"mutation { registerMarket(question: \\\"Will BTC reach 100k?\\\", outcomes: [\\\"Yes\\\", \\\"No\\\"], deadline: \\\"$DEADLINE\\\", callbackData: \\\"test\\\") }\"}" | jq .
echo ""

# Test 3: Register Voter (correct schema - no voterApp param)
echo "📝 Test 3: Register Voter"
curl -s -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { registerVoter(stake: \"1000\") }"}' | jq .
echo ""

# Test 4: Check Active Markets
echo "📊 Test 4: Active Markets"
curl -s -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ activeMarkets { id question outcomes status } }"}' | jq .
echo ""

# Test 5: Request Resolution
echo "📝 Test 5: Request Resolution (Market ID: 0)"
curl -s -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { requestResolution(marketId: 0) }"}' | jq .
echo ""

echo "✅ Test Complete"
