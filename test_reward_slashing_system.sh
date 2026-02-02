#!/bin/bash

echo "🧪 TESTING REWARD & SLASHING SYSTEM"
echo "=================================="
echo ""

# Configuration
REGISTRY_CHAIN="268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f"
REGISTRY_APP="22849e811d38de55050a50783c86486437e3c076161e2f043a1bdcdf6ae8334d"
TOKEN_CHAIN="268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f"
TOKEN_APP="d5e86fcaad7467c3f7ac6766092a77c25fd064f06941c927cf66be158d370044"
SERVICE_URL="http://localhost:8080"

echo "📊 STEP 1: Check Initial State"
echo "=============================="

# Get current voters and their balances
echo "🗳️ Current Voters:"
curl -s -X POST "${SERVICE_URL}/chains/${REGISTRY_CHAIN}/applications/${REGISTRY_APP}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ voters { address name stake availableStake lockedStake balance reputation } }"}' | \
  jq -r '.data.voters[] | "  \(.name): \(.stake) ALTH staked, \(.balance) ALTH balance, \(.reputation) reputation"'

echo ""
echo "💰 Token Balances:"
# Check token balances for each voter
VOTERS=$(curl -s -X POST "${SERVICE_URL}/chains/${REGISTRY_CHAIN}/applications/${REGISTRY_APP}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ voters { address name } }"}' | jq -r '.data.voters[] | .address')

for voter in $VOTERS; do
  voter_name=$(curl -s -X POST "${SERVICE_URL}/chains/${REGISTRY_CHAIN}/applications/${REGISTRY_APP}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"{ voters(filter: {address: \\\"$voter\\\"}) { name } }\"}" | jq -r '.data.voters[0].name // "Unknown"')
  
  token_balance=$(curl -s -X POST "${SERVICE_URL}/chains/${TOKEN_CHAIN}/applications/${TOKEN_APP}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"{ balance(owner: \\\"0x$voter\\\") }\"}" | jq -r '.data.balance // "0."')
  
  echo "  $voter_name ($voter): $token_balance ALTH tokens"
done

echo ""
echo "📊 STEP 2: Create Test Query"
echo "============================"

# Create a test query for voting
echo "Creating test query: 'Will Bitcoin reach $100k by end of 2026?'"
QUERY_RESULT=$(curl -s -X POST "${SERVICE_URL}/chains/${REGISTRY_CHAIN}/applications/${REGISTRY_APP}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createQuery(question: \"Will Bitcoin reach $100k by end of 2026?\", options: [\"Yes\", \"No\"], endTime: \"2026-12-31T23:59:59Z\", category: \"Crypto\") }"
  }')

echo "Query creation result: $QUERY_RESULT"

# Get the latest query ID
QUERY_ID=$(curl -s -X POST "${SERVICE_URL}/chains/${REGISTRY_CHAIN}/applications/${REGISTRY_APP}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ queries(limit: 1, offset: 0) { id question } }"}' | jq -r '.data.queries[0].id')

echo "📝 Created Query ID: $QUERY_ID"
echo "📝 Question: $(curl -s -X POST "${SERVICE_URL}/chains/${REGISTRY_CHAIN}/applications/${REGISTRY_APP}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ queries(limit: 1, offset: 0) { question } }"}' | jq -r '.data.queries[0].question')"

echo ""
echo "🗳️ STEP 3: Submit Votes"
echo "======================"

# Get first two voters for testing
VOTER1=$(echo "$VOTERS" | head -n1)
VOTER2=$(echo "$VOTERS" | tail -n1)

VOTER1_NAME=$(curl -s -X POST "${SERVICE_URL}/chains/${REGISTRY_CHAIN}/applications/${REGISTRY_APP}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"{ voters(filter: {address: \\\"$VOTER1\\\"}) { name } }\"}" | jq -r '.data.voters[0].name // "Voter1"')

VOTER2_NAME=$(curl -s -X POST "${SERVICE_URL}/chains/${REGISTRY_CHAIN}/applications/${REGISTRY_APP}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"{ voters(filter: {address: \\\"$VOTER2\\\"}) { name } }\"}" | jq -r '.data.voters[0].name // "Voter2"')

echo "👤 $VOTER1_NAME votes 'Yes' (correct answer)"
echo "👤 $VOTER2_NAME votes 'No' (wrong answer)"

# Submit votes (this would normally be done through the dashboard)
echo ""
echo "⚠️  NOTE: Votes should be submitted through the dashboard UI"
echo "   Go to http://localhost:5173 and vote on Query ID: $QUERY_ID"
echo "   - $VOTER1_NAME should vote 'Yes'"
echo "   - $VOTER2_NAME should vote 'No'"
echo ""

read -p "Press Enter after submitting votes through the dashboard..."

echo ""
echo "📊 STEP 4: Check Votes Submitted"
echo "==============================="

# Check if votes were submitted
VOTES=$(curl -s -X POST "${SERVICE_URL}/chains/${REGISTRY_CHAIN}/applications/${REGISTRY_APP}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"{ query(id: \\\"$QUERY_ID\\\") { votes { voterAddress option stake } } }\"}")

echo "Votes submitted:"
echo "$VOTES" | jq -r '.data.query.votes[] | "  Voter: \(.voterAddress), Option: \(.option), Stake: \(.stake)"'

echo ""
echo "⏰ STEP 5: Commit Results"
echo "======================="

echo "Now we'll commit the results. Let's say 'Yes' is the correct answer."
echo "This should:"
echo "  ✅ Reward voters who voted 'Yes'"
echo "  ❌ Slash voters who voted 'No'"

# Commit results (normally done by oracle or admin)
echo ""
echo "⚠️  NOTE: Results should be committed through the dashboard"
echo "   Go to the Queries page and commit results for Query ID: $QUERY_ID"
echo "   Set 'Yes' as the correct answer"
echo ""

read -p "Press Enter after committing results through the dashboard..."

echo ""
echo "📊 STEP 6: Check Final State (After Reward/Slashing)"
echo "=================================================="

echo "🗳️ Final Voter States:"
curl -s -X POST "${SERVICE_URL}/chains/${REGISTRY_CHAIN}/applications/${REGISTRY_APP}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ voters { address name stake availableStake lockedStake balance reputation } }"}' | \
  jq -r '.data.voters[] | "  \(.name): \(.stake) ALTH staked, \(.balance) ALTH balance, \(.reputation) reputation"'

echo ""
echo "💰 Final Token Balances:"
for voter in $VOTERS; do
  voter_name=$(curl -s -X POST "${SERVICE_URL}/chains/${REGISTRY_CHAIN}/applications/${REGISTRY_APP}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"{ voters(filter: {address: \\\"$voter\\\"}) { name } }\"}" | jq -r '.data.voters[0].name // "Unknown"')
  
  token_balance=$(curl -s -X POST "${SERVICE_URL}/chains/${TOKEN_CHAIN}/applications/${TOKEN_APP}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"{ balance(owner: \\\"0x$voter\\\") }\"}" | jq -r '.data.balance // "0."')
  
  echo "  $voter_name: $token_balance ALTH tokens"
done

echo ""
echo "🔍 STEP 7: Verify Token Movements"
echo "================================"

echo "💰 Registry Token Holdings:"
REGISTRY_BALANCE=$(curl -s -X POST "${SERVICE_URL}/chains/${TOKEN_CHAIN}/applications/${TOKEN_APP}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"{ registryBalance(registryAppId: \\\"$REGISTRY_APP\\\") }\"}" | jq -r '.data.registryBalance')

echo "  Registry holds: $REGISTRY_BALANCE ALTH"

echo ""
echo "📈 Token Supply Info:"
curl -s -X POST "${SERVICE_URL}/chains/${TOKEN_CHAIN}/applications/${TOKEN_APP}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ tokenInfo { totalSupply totalMinted totalBurned } }"}' | \
  jq -r '"  Total Supply: " + .data.tokenInfo.totalSupply + " ALTH\n  Total Minted: " + .data.tokenInfo.totalMinted + " ALTH\n  Total Burned: " + .data.tokenInfo.totalBurned + " ALTH"'

echo ""
echo "✅ TESTING COMPLETE!"
echo "==================="
echo ""
echo "🔍 What to Look For:"
echo "  1. Voters who voted correctly should have:"
echo "     - Increased token balance (rewards)"
echo "     - Improved reputation score"
echo "  2. Voters who voted incorrectly should have:"
echo "     - Decreased token balance (slashing)"
echo "     - Reduced reputation score"
echo "  3. Registry balance should reflect stake changes"
echo "  4. Total supply might increase (rewards) or decrease (slashing)"
echo ""
echo "🎯 This confirms whether reward/slashing system transfers REAL tokens!"