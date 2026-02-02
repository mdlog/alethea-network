#!/bin/bash

# Script to check pending rewards for all voters

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Load config
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../../alethea-dashboard-vite/.env.local"

if [ -f "${ENV_FILE}" ]; then
    source "${ENV_FILE}"
    REGISTRY_APP_ID="${VITE_REGISTRY_APP_ID}"
    CHAIN_ID="${VITE_CHAIN_ID}"
else
    REGISTRY_APP_ID="bee143d1a76cb7e0b8985002d70aca3b6807345b111a5b1f03248c3fe156a5ae"
    CHAIN_ID="9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec"
fi

SERVICE_URL="http://localhost:8080"
ENDPOINT="${SERVICE_URL}/chains/${CHAIN_ID}/applications/${REGISTRY_APP_ID}"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     PENDING REWARDS UNTUK VOTERS                             ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Get all voters with pending rewards
RESPONSE=$(curl -s -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d '{"query": "{ voters { address stake pendingRewards reputation totalVotes correctVotes isActive name } }"}')

# Check for errors
if echo "${RESPONSE}" | grep -q '"errors"'; then
    echo -e "${RED}❌ Error:${NC}"
    echo "${RESPONSE}" | jq '.errors' 2>/dev/null || echo "${RESPONSE}"
    exit 1
fi

VOTER_COUNT=$(echo "${RESPONSE}" | jq '.data.voters | length' 2>/dev/null || echo "0")

if [ "$VOTER_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Tidak ada voters ditemukan${NC}"
    exit 0
fi

# Calculate total pending rewards
TOTAL_PENDING=$(echo "${RESPONSE}" | jq '[.data.voters[].pendingRewards | tonumber] | add' 2>/dev/null || echo "0")
VOTERS_WITH_REWARDS=$(echo "${RESPONSE}" | jq '[.data.voters[] | select((.pendingRewards | tonumber) > 0)] | length' 2>/dev/null || echo "0")

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "RINGKASAN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total Voters:              ${VOTER_COUNT}"
echo "Voters dengan Pending Rewards: ${VOTERS_WITH_REWARDS}"
echo -e "Total Pending Rewards:      ${CYAN}${TOTAL_PENDING} ALTH${NC}"
echo ""

# Display each voter
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "DETAIL VOTERS & PENDING REWARDS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "${RESPONSE}" | jq -r '.data.voters[] | 
"Address: \(.address)
Name: \(.name // "N/A")
Stake: \(.stake) ALTH
Pending Rewards: \(.pendingRewards) ALTH
Reputation: \(.reputation)/100
Total Votes: \(.totalVotes)
Correct Votes: \(.correctVotes)
Accuracy: \((if .totalVotes > 0 then (.correctVotes / .totalVotes * 100) else 0 end) | floor)%
Status: \(if .isActive then "✅ Active" else "❌ Inactive" end)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"' 2>/dev/null

# Highlight voters with rewards
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "VOTERS DENGAN PENDING REWARDS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

HAS_REWARDS=false
echo "${RESPONSE}" | jq -r '.data.voters[] | select((.pendingRewards | tonumber) > 0) | 
"${GREEN}✅ Address: \(.address)${NC}
   Pending Rewards: \(.pendingRewards) ALTH
   Stake: \(.stake) ALTH
   Votes: \(.totalVotes) (Correct: \(.correctVotes))
"' 2>/dev/null | while IFS= read -r line; do
    if [ -n "$line" ]; then
        HAS_REWARDS=true
        echo "$line"
    fi
done

if [ "$HAS_REWARDS" = false ]; then
    echo -e "${YELLOW}⚠️  Tidak ada voters dengan pending rewards${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CARA CLAIM REWARDS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Via Dashboard:"
echo "   - Buka: http://localhost:5173/profile"
echo "   - Klik tombol 'Claim Rewards'"
echo ""
echo "2. Via GraphQL Mutation:"
echo "   mutation { claimRewards }"
echo ""
echo "3. Via Linera CLI:"
echo "   linera service execute-operation \\"
echo "     --application-id ${REGISTRY_APP_ID} \\"
echo "     --operation '{\"ClaimRewards\": {}}'"
echo ""
