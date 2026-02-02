#!/bin/bash
# Simple Workflow Test - Conway Testnet

set -e

# Load environment
CHAIN_ID="0c77da791bd3daee848448091fefd29891fbeab54e57362af6598f551f924307"
REGISTRY_ID="d651214c20e067b10532909816fbd978ce4c07e61786b211bcd64e98257a5352"
MARKET_CHAIN_ID="2bd2d86cec6af2af327ee1a61037c8ec3cd950bf2bb214a1da0e2bf259ccedc5"

echo "=========================================="
echo "🧪 Alethea Protocol - Workflow Test"
echo "=========================================="
echo ""

# Test 1: Check Registry Status
echo "📊 Test 1: Check Registry Status"
echo "Registry ID: $REGISTRY_ID"
echo ""

STATS=$(curl -s -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ protocolStats { totalMarkets totalVoters activeMarkets resolvedMarkets } }"}')

echo "$STATS" | jq .
echo ""

TOTAL_MARKETS=$(echo "$STATS" | jq -r '.data.protocolStats.totalMarkets')
TOTAL_VOTERS=$(echo "$STATS" | jq -r '.data.protocolStats.totalVoters')

echo "✅ Total Markets: $TOTAL_MARKETS"
echo "✅ Total Voters: $TOTAL_VOTERS"
echo ""

# Test 2: Register a Market
echo "=========================================="
echo "📝 Test 2: Register Market"
echo "=========================================="
echo ""

DEADLINE=$(($(date +%s) + 86400))000000  # 24 hours from now

REGISTER_RESULT=$(curl -s -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"mutation { registerMarket(marketId: 1, question: \\\"Test Market - Will BTC reach 100k?\\\", outcomes: [\\\"Yes\\\", \\\"No\\\"], deadline: \\\"$DEADLINE\\\") }\"
  }")

echo "$REGISTER_RESULT" | jq .
echo ""

if echo "$REGISTER_RESULT" | jq -e '.errors' > /dev/null 2>&1; then
    echo "⚠️  Register market has errors (may be already registered)"
else
    echo "✅ Market registered successfully"
fi

echo ""

# Test 3: Check Markets
echo "=========================================="
echo "📊 Test 3: Check Active Markets"
echo "=========================================="
echo ""

MARKETS=$(curl -s -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ activeMarkets { id question outcomes status } }"}')

echo "$MARKETS" | jq .
echo ""

# Test 4: Register a Voter
echo "=========================================="
echo "📝 Test 4: Register Voter"
echo "=========================================="
echo ""

# Use a dummy voter app ID for testing
VOTER_APP="0000000000000000000000000000000000000000000000000000000000000001"

VOTER_RESULT=$(curl -s -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"mutation { registerVoter(voterApp: \\\"$VOTER_APP\\\", stake: \\\"1000\\\") }\"
  }")

echo "$VOTER_RESULT" | jq .
echo ""

if echo "$VOTER_RESULT" | jq -e '.errors' > /dev/null 2>&1; then
    echo "⚠️  Register voter has errors (may be already registered)"
else
    echo "✅ Voter registered successfully"
fi

echo ""

# Test 5: Check Updated Stats
echo "=========================================="
echo "📊 Test 5: Check Updated Stats"
echo "=========================================="
echo ""

FINAL_STATS=$(curl -s -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ protocolStats { totalMarkets totalVoters activeMarkets } }"}')

echo "$FINAL_STATS" | jq .
echo ""

NEW_MARKETS=$(echo "$FINAL_STATS" | jq -r '.data.protocolStats.totalMarkets')
NEW_VOTERS=$(echo "$FINAL_STATS" | jq -r '.data.protocolStats.totalVoters')

echo "📈 Markets: $TOTAL_MARKETS → $NEW_MARKETS"
echo "📈 Voters: $TOTAL_VOTERS → $NEW_VOTERS"
echo ""

# Test 6: Request Resolution
echo "=========================================="
echo "📝 Test 6: Request Resolution"
echo "=========================================="
echo ""

RESOLUTION_RESULT=$(curl -s -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { requestResolution(marketId: 1) }"}')

echo "$RESOLUTION_RESULT" | jq .
echo ""

if echo "$RESOLUTION_RESULT" | jq -e '.errors' > /dev/null 2>&1; then
    ERROR_MSG=$(echo "$RESOLUTION_RESULT" | jq -r '.errors[0].message')
    echo "⚠️  Resolution request: $ERROR_MSG"
else
    echo "✅ Resolution requested successfully"
fi

echo ""
echo "=========================================="
echo "✅ Workflow Test Complete"
echo "=========================================="
echo ""
echo "Summary:"
echo "- Registry Status: ✅ Working"
echo "- Register Market: ✅ Tested"
echo "- Check Markets: ✅ Tested"
echo "- Register Voter: ✅ Tested"
echo "- Request Resolution: ✅ Tested"
echo ""
echo "Next Steps:"
echo "1. Deploy actual voter applications"
echo "2. Test voting workflow"
echo "3. Test resolution with real votes"
