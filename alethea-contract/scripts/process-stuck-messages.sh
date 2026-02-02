#!/bin/bash

# ============================================================================
# Process Stuck Messages
# Processes all pending inbox messages for a chain
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
echo -e "${BLUE}║     Process Stuck Messages                                 ║${NC}"
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
    echo "Or set CHAIN_ID in .env.fresh"
    exit 1
fi

echo -e "${CYAN}Processing inbox for chain: ${CHAIN_ID:0:16}...${NC}"
echo ""

# Process inbox
echo "Running: linera process-inbox ${CHAIN_ID}"
echo ""

linera process-inbox "${CHAIN_ID}"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Inbox processed successfully${NC}"
    echo ""
    echo "All pending messages have been processed."
else
    echo ""
    echo -e "${RED}✗ Failed to process inbox${NC}"
    echo ""
    echo "Possible issues:"
    echo "  • Chain not synced"
    echo "  • Network connectivity"
    echo "  • Invalid messages in inbox"
fi

echo ""
