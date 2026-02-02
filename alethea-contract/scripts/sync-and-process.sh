#!/bin/bash

# ============================================================================
# Sync and Process Chain
# Syncs chain and processes all pending messages
# ============================================================================

set +e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Sync and Process Chain                                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Load configuration
if [ -f .env.fresh ]; then
    source .env.fresh
fi

CHAIN_ID="${CHAIN_ID:-$1}"

if [ -z "${CHAIN_ID}" ]; then
    echo -e "${RED}✗ Chain ID required${NC}"
    echo "Usage: $0 [CHAIN_ID]"
    exit 1
fi

echo -e "${CYAN}Chain: ${CHAIN_ID:0:16}...${NC}"
echo ""

# Step 1: Sync
echo -e "${YELLOW}[1] Syncing chain...${NC}"
linera sync --with-chain-id "${CHAIN_ID}"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Chain synced${NC}"
else
    echo -e "${RED}✗ Sync failed${NC}"
    exit 1
fi

echo ""

# Step 2: Process inbox
echo -e "${YELLOW}[2] Processing inbox...${NC}"
linera process-inbox "${CHAIN_ID}"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Inbox processed${NC}"
else
    echo -e "${YELLOW}⚠ Inbox processing had issues (might be OK)${NC}"
fi

echo ""
echo -e "${GREEN}✓ Chain is ready for operations${NC}"
echo ""
