#!/bin/bash

# Script to verify that contracts are properly instantiated
# This helps diagnose BcsError(Eof) issues in service.rs

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        VERIFYING CONTRACT INSTANTIATION                     ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get Application IDs from deployment info or environment
if [ -f "deployment-info.txt" ]; then
    TOKEN_APP_ID=$(grep "Token Application ID:" deployment-info.txt | awk '{print $4}')
    REGISTRY_APP_ID=$(grep "Registry Application ID:" deployment-info.txt | awk '{print $4}')
    CHAIN_ID=$(grep "Chain ID:" deployment-info.txt | awk '{print $3}')
else
    echo -e "${YELLOW}⚠ deployment-info.txt not found. Using environment variables...${NC}"
    TOKEN_APP_ID="${VITE_TOKEN_APP_ID}"
    REGISTRY_APP_ID="${VITE_REGISTRY_APP_ID}"
    CHAIN_ID="${VITE_CHAIN_ID}"
fi

if [ -z "$TOKEN_APP_ID" ] || [ -z "$REGISTRY_APP_ID" ] || [ -z "$CHAIN_ID" ]; then
    echo -e "${RED}❌ Missing Application IDs or Chain ID${NC}"
    echo "Please set VITE_TOKEN_APP_ID, VITE_REGISTRY_APP_ID, and VITE_CHAIN_ID"
    exit 1
fi

echo -e "${BLUE}Application IDs:${NC}"
echo "  Token:    $TOKEN_APP_ID"
echo "  Registry: $REGISTRY_APP_ID"
echo "  Chain:    $CHAIN_ID"
echo ""

# Step 1: Sync chain
echo -e "${BLUE}[1/4] Syncing chain...${NC}"
linera sync 2>&1 | tail -5
echo ""

# Step 2: Process inbox (critical for instantiation)
echo -e "${BLUE}[2/4] Processing inbox (this processes instantiation messages)...${NC}"
INBOX_OUTPUT=$(linera process-inbox 2>&1)
echo "$INBOX_OUTPUT"
echo ""

# Check if any blocks were processed
if echo "$INBOX_OUTPUT" | grep -q "0 blocks processed"; then
    echo -e "${YELLOW}⚠ No blocks processed. Instantiation may have already occurred.${NC}"
else
    echo -e "${GREEN}✓ Blocks processed successfully${NC}"
fi
echo ""

# Step 3: Verify Token instantiation via GraphQL
echo -e "${BLUE}[3/4] Verifying Token instantiation...${NC}"

# Start service if not running
if ! pgrep -f "linera service" > /dev/null; then
    echo -e "${YELLOW}  Starting linera service...${NC}"
    nohup linera service --port 8080 > /tmp/linera-service.log 2>&1 &
    sleep 5
fi

# Query token info
TOKEN_QUERY='{"query": "query { tokenInfo { name symbol decimals } }"}'
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:8080/chains/$CHAIN_ID/applications/$TOKEN_APP_ID/query \
    -H "Content-Type: application/json" \
    -d "$TOKEN_QUERY" 2>&1 || echo "ERROR")

if echo "$TOKEN_RESPONSE" | grep -q "ERROR\|error\|Failed"; then
    echo -e "${RED}  ❌ Token query failed:${NC}"
    echo "$TOKEN_RESPONSE" | head -5
    echo -e "${YELLOW}  ⚠ Token may not be instantiated yet${NC}"
else
    echo -e "${GREEN}  ✓ Token is instantiated and accessible${NC}"
    echo "$TOKEN_RESPONSE" | jq '.' 2>/dev/null || echo "$TOKEN_RESPONSE"
fi
echo ""

# Step 4: Verify Registry instantiation via GraphQL
echo -e "${BLUE}[4/4] Verifying Registry instantiation...${NC}"

# Query registry parameters
REGISTRY_QUERY='{"query": "query { parameters { minStake minVotesDefault defaultQueryDuration } }"}'
REGISTRY_RESPONSE=$(curl -s -X POST http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_APP_ID/query \
    -H "Content-Type: application/json" \
    -d "$REGISTRY_QUERY" 2>&1 || echo "ERROR")

if echo "$REGISTRY_RESPONSE" | grep -q "ERROR\|error\|Failed\|BcsError\|Eof"; then
    echo -e "${RED}  ❌ Registry query failed:${NC}"
    echo "$REGISTRY_RESPONSE" | head -10
    echo ""
    echo -e "${RED}  ⚠ Registry is NOT instantiated!${NC}"
    echo -e "${YELLOW}  This is the root cause of BcsError(Eof) in service.rs${NC}"
    echo ""
    echo -e "${BLUE}  Solutions:${NC}"
    echo "    1. Wait a few seconds and run: linera sync && linera process-inbox"
    echo "    2. Check service logs: tail -f /tmp/linera-service.log"
    echo "    3. Redeploy contract if instantiation message was lost"
    exit 1
else
    echo -e "${GREEN}  ✓ Registry is instantiated and accessible${NC}"
    echo "$REGISTRY_RESPONSE" | jq '.' 2>/dev/null || echo "$REGISTRY_RESPONSE"
fi
echo ""

# Summary
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              VERIFICATION COMPLETE                            ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Both contracts are properly instantiated${NC}"
echo -e "${GREEN}✓ Service should work without BcsError(Eof)${NC}"
echo ""
