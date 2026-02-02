#!/bin/bash
set -e

echo "🧪 Manual Staking Test"
echo "======================"
echo ""

TOKEN_CHAIN="268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f"
TOKEN_APP="5e49563bddabeff9d49eb508fb8a01aa1ac292e08848e5fabb85b60907fb3d1b"
REGISTRY_APP="7a74ffc2b18dfe3f6b42ad6216a8a4d9efe1eb1c5c6ef98a872f515f0e7b06c9"

# Test user (mdlog has tokens)
TEST_USER="296688fba8a523222a8327ffaa392d0384ec322b1c18afdbe33d50620c176a0e"
STAKE_AMOUNT="50"

echo "📊 Before Staking:"
echo "=================="

# Check user balance
user_balance=$(curl -s -X POST "http://localhost:8080/chains/${TOKEN_CHAIN}/applications/${TOKEN_APP}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"{ balance(owner: \\\"0x${TEST_USER}\\\") }\"}" | jq -r '.data.balance')
echo "User balance: $user_balance ALTH"

# Check registry balance
registry_balance=$(curl -s -X POST "http://localhost:8080/chains/${TOKEN_CHAIN}/applications/${TOKEN_APP}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"{ balance(owner: \\\"0x${REGISTRY_APP}\\\") }\"}" | jq -r '.data.balance')
echo "Registry balance: $registry_balance ALTH"

# Check registry stake
total_stake=$(curl -s -X POST "http://localhost:8080/chains/${TOKEN_CHAIN}/applications/${REGISTRY_APP}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ totalStake }"}' | jq -r '.data.totalStake // "0"')
echo "Registry stake: $total_stake ALTH"

echo ""
echo "🔄 Executing Manual Stake Transfer:"
echo "==================================="

# Test the new stakeTransfer with deterministic address
echo "Calling stakeTransfer with:"
echo "  fromChainId: $TEST_USER"
echo "  amount: $STAKE_AMOUNT"
echo "  toRegistry: $REGISTRY_APP"

result=$(curl -s -X POST "http://localhost:8080/chains/${TOKEN_CHAIN}/applications/${TOKEN_APP}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"mutation { stakeTransfer(fromChainId: \\\"${TEST_USER}\\\", amount: \\\"${STAKE_AMOUNT}.\\\", toRegistry: \\\"${REGISTRY_APP}\\\") }\"}")

echo "Result: $result"

echo ""
echo "⏳ Waiting for transaction to process..."
sleep 3

echo ""
echo "📊 After Staking:"
echo "================="

# Check user balance
user_balance_after=$(curl -s -X POST "http://localhost:8080/chains/${TOKEN_CHAIN}/applications/${TOKEN_APP}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"{ balance(owner: \\\"0x${TEST_USER}\\\") }\"}" | jq -r '.data.balance')
echo "User balance: $user_balance_after ALTH (was $user_balance)"

# Check registry balance
registry_balance_after=$(curl -s -X POST "http://localhost:8080/chains/${TOKEN_CHAIN}/applications/${TOKEN_APP}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"{ balance(owner: \\\"0x${REGISTRY_APP}\\\") }\"}" | jq -r '.data.balance')
echo "Registry balance: $registry_balance_after ALTH (was $registry_balance)"

echo ""
echo "🔍 Analysis:"
echo "============"

user_change=$(echo "$user_balance - $user_balance_after" | bc -l 2>/dev/null || echo "N/A")
registry_change=$(echo "$registry_balance_after - $registry_balance" | bc -l 2>/dev/null || echo "N/A")

echo "User balance change: -$user_change ALTH"
echo "Registry balance change: +$registry_change ALTH"

if [ "$user_change" = "$registry_change" ] && [ "$user_change" = "$STAKE_AMOUNT" ]; then
  echo "✅ SUCCESS: Token transfer worked correctly!"
  echo "   - User lost $STAKE_AMOUNT ALTH"
  echo "   - Registry gained $STAKE_AMOUNT ALTH"
  echo "   - Amounts match perfectly"
else
  echo "❌ ISSUE: Token transfer didn't work as expected"
  echo "   Expected: User -$STAKE_AMOUNT, Registry +$STAKE_AMOUNT"
  echo "   Actual: User -$user_change, Registry +$registry_change"
fi

echo ""
echo "💡 Next Steps:"
echo "=============="
echo "If token transfer worked, the registry stake should be updated via cross-chain message."
echo "Check the registry stake in a few seconds to see if it increased by $STAKE_AMOUNT ALTH."
echo ""