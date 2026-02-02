#!/bin/bash
set -e

# Configuration
CHAIN_ID="8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef"
APP_ID="9936172d5d1f3fb3ae65ea2bb51391afc561d9f8b80927c9e8e32c1efe9380d2"
GRAPHQL_URL="http://localhost:8080"

echo "🧪 Testing Voter Registration"
echo "=============================="
echo "Chain ID: $CHAIN_ID"
echo "App ID: $APP_ID"
echo ""

# Step 1: Submit registration
echo "📝 Step 1: Submitting voter registration..."
RESULT=$(curl -s -X POST "$GRAPHQL_URL/chains/$CHAIN_ID/applications/$APP_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { executeRegisterVoter(stake: \"1000\", name: \"TestVoter\") }"}')

echo "$RESULT" | python3 -m json.tool
echo ""

# Step 2: Process inbox to execute pending operations
echo "⚙️  Step 2: Processing inbox to execute operations..."
linera process-inbox $CHAIN_ID
echo ""

# Step 3: Verify registration
echo "✅ Step 3: Verifying voter registration..."
sleep 1

VOTERS=$(curl -s -X POST "$GRAPHQL_URL/chains/$CHAIN_ID/applications/$APP_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ voterCount voters { address name stake } }"}')

echo "$VOTERS" | python3 -m json.tool
echo ""

# Check if voter count > 0
COUNT=$(echo "$VOTERS" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['voterCount'])" 2>/dev/null || echo "0")

if [ "$COUNT" -gt 0 ]; then
    echo "✅ SUCCESS! Voter registered successfully!"
    echo "Voter count: $COUNT"
else
    echo "❌ FAILED! Voter not registered."
    echo "This might be because:"
    echo "  1. Operations are not being executed"
    echo "  2. Application needs to be re-deployed"
    echo "  3. Chain needs proper validator setup"
fi
