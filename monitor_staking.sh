#!/bin/bash

TOKEN_CHAIN="268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f"
TOKEN_APP="5e49563bddabeff9d49eb508fb8a01aa1ac292e08848e5fabb85b60907fb3d1b"
REGISTRY_APP="7a74ffc2b18dfe3f6b42ad6216a8a4d9efe1eb1c5c6ef98a872f515f0e7b06c9"

echo "🔄 Real-time Staking Monitor"
echo "============================"
echo "Press Ctrl+C to stop"
echo ""

while true; do
  clear
  echo "🔄 Real-time Staking Monitor - $(date)"
  echo "============================"
  echo ""
  
  # Check registry balance
  registry_balance=$(curl -s -X POST "http://localhost:8080/chains/${TOKEN_CHAIN}/applications/${TOKEN_APP}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"{ balance(owner: \\\"0x${REGISTRY_APP}\\\") }\"}" | jq -r '.data.balance')
  
  # Check total stake
  total_stake=$(curl -s -X POST "http://localhost:8080/chains/${TOKEN_CHAIN}/applications/${REGISTRY_APP}" \
    -H "Content-Type: application/json" \
    -d '{"query": "{ totalStake }"}' | jq -r '.data.totalStake // "0"')
  
  echo "🏦 Registry Status:"
  echo "  Token Balance: $registry_balance ALTH"
  echo "  Total Stake:   $total_stake ALTH"
  
  if [ "$total_stake" != "$registry_balance" ]; then
    echo "  Status: ❌ MISMATCH"
    discrepancy=$(echo "$total_stake - $registry_balance" | bc -l 2>/dev/null || echo "N/A")
    echo "  Discrepancy: $discrepancy ALTH"
  else
    echo "  Status: ✅ HEALTHY"
  fi
  
  echo ""
  echo "💰 User Balances:"
  
  voters=(
    "296688fba8a523222a8327ffaa392d0384ec322b1c18afdbe33d50620c176a0e:mdlog"
    "bf3ce441d5d767c5379d26a7c897bf6ab515d16668586f624f6956ef0e8711a9:gedek"
  )
  
  for voter in "${voters[@]}"; do
    IFS=':' read -r chain_id name <<< "$voter"
    
    balance=$(curl -s -X POST "http://localhost:8080/chains/${TOKEN_CHAIN}/applications/${TOKEN_APP}" \
      -H "Content-Type: application/json" \
      -d "{\"query\": \"{ balance(owner: \\\"0x${chain_id}\\\") }\"}" | jq -r '.data.balance')
    
    echo "  $name: $balance ALTH"
  done
  
  echo ""
  echo "📊 Total Supply:"
  total_supply=$(curl -s -X POST "http://localhost:8080/chains/${TOKEN_CHAIN}/applications/${TOKEN_APP}" \
    -H "Content-Type: application/json" \
    -d '{"query": "{ totalSupply }"}' | jq -r '.data.totalSupply')
  echo "  $total_supply ALTH"
  
  echo ""
  echo "Refreshing in 5 seconds..."
  sleep 5
done