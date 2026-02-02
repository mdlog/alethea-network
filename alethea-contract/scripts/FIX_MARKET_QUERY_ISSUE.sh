#!/bin/bash

# FINAL SOLUTION SCRIPT
# This script will fix the market query creation issue

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

REGISTRY_CHAIN_ID="${REGISTRY_CHAIN_ID:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  FIXING MARKET QUERY CREATION ISSUE${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${CYAN}ROOT CAUSE IDENTIFIED:${NC}"
echo "  Message is sent from Market but not processed by ChainListener"
echo "  ChainListener requires Registry chain to be tracked and have preferred owner"
echo ""

echo -e "${CYAN}SOLUTION STEPS:${NC}"
echo ""

# Step 1: Stop service
echo -e "${YELLOW}[Step 1] Stopping Linera service...${NC}"
if pgrep -f 'linera service' > /dev/null; then
    pkill -f 'linera service'
    sleep 2
    echo -e "${GREEN}  ✅ Service stopped${NC}"
else
    echo -e "${YELLOW}  ⚠️  Service not running${NC}"
fi
echo ""

# Step 2: Process inbox manually
echo -e "${YELLOW}[Step 2] Processing Registry inbox manually...${NC}"
echo "  This will process any pending messages"
echo ""

PROCESS_OUTPUT=$(linera process-inbox "$REGISTRY_CHAIN_ID" 2>&1 || echo "ERROR")
echo "$PROCESS_OUTPUT"

if echo "$PROCESS_OUTPUT" | grep -qiE "Processed.*[1-9]"; then
    BLOCKS=$(echo "$PROCESS_OUTPUT" | grep -oE "[0-9]+ blocks" | grep -oE "[0-9]+" | head -1 || echo "0")
    echo -e "${GREEN}  ✅ Processed $BLOCKS blocks${NC}"
    echo ""
    echo -e "${GREEN}  🎉 Messages processed! Query should be created now.${NC}"
else
    echo -e "${YELLOW}  ⚠️  No messages to process${NC}"
    echo "    This could mean:"
    echo "    1. Messages already processed"
    echo "    2. Message was not sent (check Market contract logs)"
    echo "    3. Message is stuck (try restarting service)"
fi
echo ""

# Step 3: Restart service
echo -e "${YELLOW}[Step 3] Restarting Linera service...${NC}"
echo "  Please run manually: linera service --port 8080"
echo "  Then wait 30-60 seconds for ChainListener to initialize"
echo ""

# Step 4: Verify
echo -e "${YELLOW}[Step 4] Verification${NC}"
echo "  After restarting service, run:"
echo "    ./scripts/investigate-market-query-detailed.sh 1"
echo ""
echo "  Or check Oracle Dashboard for new queries"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Script completed!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
