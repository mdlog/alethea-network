#!/bin/bash

# Quick script to check latest query status

set -e

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
echo "║     STATUS TERBARU QUERIES                                   ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

RESPONSE=$(curl -s -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d '{"query": "{ queries { id description status outcomes voteCount result rewardAmount deadline commitEnd revealEnd createdAt } }"}')

QUERY_COUNT=$(echo "${RESPONSE}" | jq '.data.queries | length' 2>/dev/null || echo "0")

if [ "$QUERY_COUNT" -eq 0 ]; then
    echo "⚠️  Tidak ada query ditemukan"
    exit 0
fi

# Summary
ACTIVE=$(echo "${RESPONSE}" | jq '[.data.queries[] | select(.status == "Active")] | length' 2>/dev/null || echo "0")
RESOLVED=$(echo "${RESPONSE}" | jq '[.data.queries[] | select(.status == "Resolved")] | length' 2>/dev/null || echo "0")
EXPIRED=$(echo "${RESPONSE}" | jq '[.data.queries[] | select(.status == "Expired")] | length' 2>/dev/null || echo "0")
TOTAL_VOTES=$(echo "${RESPONSE}" | jq '[.data.queries[].voteCount] | add' 2>/dev/null || echo "0")

echo "📊 RINGKASAN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total Queries:     ${QUERY_COUNT}"
echo "✅ Active:         ${ACTIVE}"
echo "✅ Resolved:       ${RESOLVED}"
echo "❌ Expired:        ${EXPIRED}"
echo "🗳️  Total Votes:    ${TOTAL_VOTES}"
echo ""

# Display each query
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "DETAIL QUERIES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "${RESPONSE}" | jq -r '.data.queries[] | 
"Query ID: \(.id)
Description: \(.description)
Status: \(.status)
Outcomes: \(.outcomes | join(", "))
Votes: \(.voteCount)
Result: \(.result // "Belum ada hasil")
Reward: \(.rewardAmount) ALTH
Deadline: \(.deadline)
Commit End: \(.commitEnd)
Reveal End: \(.revealEnd)
Created: \(.createdAt)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"' 2>/dev/null

echo ""
echo "✅ Status terbaru berhasil diambil"
echo ""
