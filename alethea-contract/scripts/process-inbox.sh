#!/bin/bash

# Script to process inbox for a chain using GraphQL mutation
# Usage: ./process-inbox.sh [chain_id]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CHAIN_ID="${1:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"
SERVICE_URL="${VITE_SERVICE_URL:-http://localhost:8080}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Process Inbox${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${BLUE}Configuration:${NC}"
echo "  Chain ID: ${CHAIN_ID:0:16}..."
echo "  Service URL: ${SERVICE_URL}"
echo ""

# Try to process inbox via GraphQL
echo -e "${BLUE}Processing inbox via GraphQL...${NC}"

PROCESS_MUTATION="{ processInbox(chainId: \"${CHAIN_ID}\") }"

RESPONSE=$(curl -s -X POST "$SERVICE_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg query "$PROCESS_MUTATION" '{query: $query}')")

if echo "$RESPONSE" | jq -e '.errors' > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  GraphQL processInbox mutation not available or error:${NC}"
    echo "$RESPONSE" | jq '.errors'
    echo ""
    echo -e "${BLUE}Alternative:${NC}"
    echo "  Cross-chain messages are usually processed automatically by Linera service."
    echo "  If messages are stuck, try:"
    echo "    1. Restart Linera service: linera service up"
    echo "    2. Wait a few seconds for automatic processing"
    echo "    3. Check Linera service logs for any errors"
else
    RESULT=$(echo "$RESPONSE" | jq -r '.data.processInbox // empty')
    
    if [ -n "$RESULT" ]; then
        echo -e "${GREEN}✅ Inbox processed successfully${NC}"
        echo "  Result: $RESULT"
    else
        echo -e "${YELLOW}⚠️  No result returned${NC}"
        echo "  Response: $RESPONSE"
    fi
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
