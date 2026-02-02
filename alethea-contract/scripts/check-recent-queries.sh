#!/bin/bash

# Script to check recent queries in Oracle Registry
# Usage: ./check-recent-queries.sh [limit]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

LIMIT="${1:-10}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Check Recent Queries in Oracle Registry${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Load environment variables
if [ -f "../alethea-market/.env.local" ]; then
    while IFS= read -r line; do
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        [[ -z "${line// }" ]] && continue
        if [[ "$line" =~ ^[[:space:]]*([^=]+)=(.*)$ ]]; then
            export "$line"
        fi
    done < "../alethea-market/.env.local"
fi

REGISTRY_CHAIN_ID="${VITE_REGISTRY_CHAIN_ID:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"
REGISTRY_APP_ID="${VITE_REGISTRY_APP_ID:-f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990}"
SERVICE_URL="${VITE_SERVICE_URL:-http://localhost:8080}"

REGISTRY_URL="${SERVICE_URL}/chains/${REGISTRY_CHAIN_ID}/applications/${REGISTRY_APP_ID}"

echo -e "${BLUE}Configuration:${NC}"
echo "  Registry Chain ID: ${REGISTRY_CHAIN_ID:0:16}..."
echo "  Registry App ID: ${REGISTRY_APP_ID:0:16}..."
echo "  Limit: ${LIMIT}"
echo ""

# Query recent queries
echo -e "${BLUE}Fetching recent queries...${NC}"
QUERIES_QUERY="{ queries { id description status result createdAt resolvedAt querySource } }"

QUERIES_RESPONSE=$(curl -s -X POST "$REGISTRY_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg query "$QUERIES_QUERY" '{query: $query}')")

if echo "$QUERIES_RESPONSE" | jq -e '.errors' > /dev/null 2>&1; then
    echo -e "${RED}❌ Error fetching queries:${NC}"
    echo "$QUERIES_RESPONSE" | jq '.errors'
    exit 1
fi

QUERIES_COUNT=$(echo "$QUERIES_RESPONSE" | jq -r '.data.queries | length')
echo -e "${GREEN}✅ Found ${QUERIES_COUNT} queries${NC}"
echo ""

if [ "$QUERIES_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No queries found in Registry${NC}"
    echo ""
    echo "This could mean:"
    echo "  1. Request Resolution belum berhasil membuat query"
    echo "  2. Cross-chain message belum diproses"
    echo "  3. Check Linera service logs for errors"
    exit 0
fi

# Display queries
echo -e "${BLUE}Recent Queries:${NC}"
echo ""
echo "$QUERIES_RESPONSE" | jq -r '.data.queries[] | 
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Query ID: \(.id)
Description: \(.description)
Status: \(.status)
Result: \(.result // "Not resolved")
Created: \(.createdAt)
Resolved: \(.resolvedAt // "Not resolved")
Source: \(.querySource)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"'

echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Check if any query matches your market question"
echo "  2. If query exists, check if callback was sent to market chain"
echo "  3. Check Linera service logs for cross-chain message processing"
echo "  4. View in Oracle Dashboard: http://localhost:4002"
echo ""
