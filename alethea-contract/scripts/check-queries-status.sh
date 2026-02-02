#!/bin/bash

# Script to check all queries, their status, and vote counts

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
    echo -e "${RED}❌ .env.local not found${NC}"
    exit 1
fi

SERVICE_URL="${VITE_SERVICE_URL:-http://localhost:8080}"
ENDPOINT="${SERVICE_URL}/chains/${CHAIN_ID}/applications/${REGISTRY_APP_ID}"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     CHECK QUERIES STATUS & VOTES                              ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Registry: ${REGISTRY_APP_ID}${NC}"
echo -e "${YELLOW}Chain: ${CHAIN_ID}${NC}"
echo ""

# Check if linera service is running
if ! curl -s "${SERVICE_URL}" > /dev/null 2>&1; then
    echo -e "${RED}❌ Linera service is not running at ${SERVICE_URL}${NC}"
    echo -e "${YELLOW}Please start it: linera service${NC}"
    exit 1
fi

# Query all queries with detailed information
echo -e "${BLUE}Fetching queries...${NC}"
echo ""

QUERY='{
  "query": "{ queries { id description status outcomes rewardAmount deadline commitEnd revealEnd voteCount result createdAt } }"
}'

RESPONSE=$(curl -s -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d "${QUERY}")

# Check for errors
if echo "${RESPONSE}" | grep -q '"errors"'; then
    echo -e "${RED}❌ Error querying queries:${NC}"
    echo "${RESPONSE}" | jq '.errors' 2>/dev/null || echo "${RESPONSE}"
    exit 1
fi

# Parse response
QUERY_COUNT=$(echo "${RESPONSE}" | jq '.data.queries | length' 2>/dev/null || echo "0")

if [ "$QUERY_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No queries found${NC}"
    echo ""
    echo -e "${BLUE}Possible reasons:${NC}"
    echo "1. Belum ada query yang dibuat"
    echo "2. Query belum diproses (perlu sync & process-inbox)"
    echo ""
    echo -e "${YELLOW}To create query:${NC}"
    echo "- Via dashboard: http://localhost:5173/queries (tab 'Create Query')"
    echo "- Via GraphQL: See CREATE_QUERY_CORRECT_FORMAT.md"
    exit 0
fi

echo -e "${GREEN}✅ Found ${QUERY_COUNT} query/queries${NC}"
echo ""

# Display summary
ACTIVE_COUNT=$(echo "${RESPONSE}" | jq '[.data.queries[] | select(.status == "Active")] | length' 2>/dev/null || echo "0")
RESOLVED_COUNT=$(echo "${RESPONSE}" | jq '[.data.queries[] | select(.status == "Resolved")] | length' 2>/dev/null || echo "0")
EXPIRED_COUNT=$(echo "${RESPONSE}" | jq '[.data.queries[] | select(.status == "Expired")] | length' 2>/dev/null || echo "0")

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}SUMMARY${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Total Queries:     ${BLUE}${QUERY_COUNT}${NC}"
echo -e "Active:            ${GREEN}${ACTIVE_COUNT}${NC}"
echo -e "Resolved:          ${YELLOW}${RESOLVED_COUNT}${NC}"
echo -e "Expired:           ${RED}${EXPIRED_COUNT}${NC}"
echo ""

# Display each query in detail
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}QUERY DETAILS${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Process each query
echo "${RESPONSE}" | jq -r '.data.queries[] | "\(.id)|\(.description)|\(.status)|\(.voteCount)|\(.outcomes)|\(.result // "N/A")"' 2>/dev/null | while IFS='|' read -r id description status voteCount outcomes result; do
    # Format status color
    case "$status" in
        "Active")
            STATUS_COLOR="${GREEN}"
            ;;
        "Resolved")
            STATUS_COLOR="${YELLOW}"
            ;;
        "Expired")
            STATUS_COLOR="${RED}"
            ;;
        *)
            STATUS_COLOR="${BLUE}"
            ;;
    esac
    
    # Format vote count
    if [ "$voteCount" -gt 0 ]; then
        VOTE_COLOR="${GREEN}"
        VOTE_TEXT="${voteCount} votes"
    else
        VOTE_COLOR="${RED}"
        VOTE_TEXT="No votes yet"
    fi
    
    echo -e "${BLUE}Query ID:${NC} ${id}"
    echo -e "${BLUE}Description:${NC} ${description}"
    echo -e "${BLUE}Status:${NC} ${STATUS_COLOR}${status}${NC}"
    echo -e "${BLUE}Votes:${NC} ${VOTE_COLOR}${VOTE_TEXT}${NC}"
    echo -e "${BLUE}Outcomes:${NC} $(echo "$outcomes" | jq -r '.[]' | tr '\n' ', ' | sed 's/, $//')"
    if [ "$result" != "N/A" ] && [ "$result" != "null" ]; then
        echo -e "${BLUE}Result:${NC} ${GREEN}${result}${NC}"
    fi
    echo ""
done

# If jq parsing failed, show raw JSON
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Raw JSON response:${NC}"
    echo "${RESPONSE}" | jq '.' 2>/dev/null || echo "${RESPONSE}"
fi

# Get detailed vote information if available
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}DETAILED VOTE INFORMATION${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Try to get vote details for each query
QUERY_IDS=$(echo "${RESPONSE}" | jq -r '.data.queries[].id' 2>/dev/null)

if [ -n "$QUERY_IDS" ]; then
    for query_id in $QUERY_IDS; do
        VOTE_QUERY="{
          \"query\": \"{ query(id: ${query_id}) { id voteCount votes { voter outcome stake confidence } } }\"
        }"
        
        VOTE_RESPONSE=$(curl -s -X POST "${ENDPOINT}" \
            -H "Content-Type: application/json" \
            -d "${VOTE_QUERY}")
        
        VOTE_COUNT=$(echo "${VOTE_RESPONSE}" | jq '.data.query.voteCount // 0' 2>/dev/null || echo "0")
        
        if [ "$VOTE_COUNT" -gt 0 ]; then
            echo -e "${BLUE}Query ${query_id} Votes:${NC}"
            echo "${VOTE_RESPONSE}" | jq '.data.query.votes[] | {voter, outcome, stake, confidence}' 2>/dev/null || echo "Could not parse vote details"
            echo ""
        fi
    done
fi

echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              CHECK COMPLETE                                  ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
