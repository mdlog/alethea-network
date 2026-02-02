#!/bin/bash

# Script to process Registry inbox to receive cross-chain messages from Market
# Usage: ./process-registry-inbox.sh [chain_id]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

REGISTRY_CHAIN_ID="${1:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Process Registry Inbox${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Configuration:${NC}"
echo "  Registry Chain ID: ${REGISTRY_CHAIN_ID:0:16}..."
echo ""

# Check if linera service is running
echo -e "${BLUE}Step 1: Checking Linera service status...${NC}"
SERVICE_RUNNING=false
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Linera service is running${NC}"
    SERVICE_RUNNING=true
    echo ""
    echo -e "${YELLOW}⚠️  Linera service must be stopped to process inbox${NC}"
    echo "  Processing inbox requires exclusive access to wallet/database"
    echo ""
    read -p "Stop linera service and process inbox? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}⚠️  Skipping inbox processing${NC}"
        echo ""
        echo -e "${BLUE}To process inbox manually:${NC}"
        echo "  1. Stop linera service: pkill -f 'linera service'"
        echo "  2. Run: linera process-inbox $REGISTRY_CHAIN_ID"
        echo "  3. Start linera service again"
        exit 0
    fi
    
    echo -e "${BLUE}Stopping linera service...${NC}"
    pkill -f 'linera service' || true
    sleep 2
    
    # Verify service stopped
    if curl -s http://localhost:8080/health > /dev/null 2>&1; then
        echo -e "${RED}❌ Failed to stop linera service${NC}"
        echo "  Please stop it manually: pkill -f 'linera service'"
        exit 1
    fi
    echo -e "${GREEN}✅ Linera service stopped${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠️  Linera service not running (this is OK for manual inbox processing)${NC}"
    echo ""
fi

# Process inbox
echo -e "${BLUE}Step 2: Processing Registry inbox...${NC}"
echo "Running: linera process-inbox $REGISTRY_CHAIN_ID"
echo ""

# Try to process inbox
PROCESS_OUTPUT=$(linera process-inbox "$REGISTRY_CHAIN_ID" 2>&1)
PROCESS_EXIT_CODE=$?

echo "$PROCESS_OUTPUT"
echo ""

# Restart service if it was running
if [ "$SERVICE_RUNNING" = true ]; then
    echo -e "${BLUE}Step 3: Restarting linera service...${NC}"
    # Start service in background (user should have their own service management)
    echo -e "${YELLOW}⚠️  Please restart linera service manually:${NC}"
    echo "  linera service start"
    echo ""
fi

if [ $PROCESS_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Inbox processed successfully${NC}"
    
    # Check if any blocks were processed
    if echo "$PROCESS_OUTPUT" | grep -qiE "Processed.*blocks|messages"; then
        BLOCKS_PROCESSED=$(echo "$PROCESS_OUTPUT" | grep -oE "[0-9]+ blocks" | grep -oE "[0-9]+" | head -1 || echo "0")
        if [ "$BLOCKS_PROCESSED" != "0" ]; then
            echo -e "${GREEN}  Processed $BLOCKS_PROCESSED blocks${NC}"
            echo ""
            echo -e "${BLUE}Step 3: Checking for new queries...${NC}"
            sleep 2
            
            # Check queries again
            cd "$(dirname "$0")/.."
            ./scripts/check-market-resolution-status.sh 1 2>/dev/null || echo "Run check-market-resolution-status.sh manually to verify"
        else
            echo -e "${YELLOW}  No new messages to process${NC}"
        fi
    fi
else
    echo -e "${RED}❌ Failed to process inbox${NC}"
    echo ""
    
    # Check for specific error messages
    if echo "$PROCESS_OUTPUT" | grep -qi "Resource temporarily unavailable\|lock\|busy"; then
        echo -e "${YELLOW}Error: Resource lock detected${NC}"
        echo "  This usually means linera service is still running or another process has lock"
        echo ""
        echo -e "${BLUE}Solution:${NC}"
        echo "  1. Stop all linera processes: pkill -f 'linera'"
        echo "  2. Wait 2-3 seconds"
        echo "  3. Run this script again"
    elif echo "$PROCESS_OUTPUT" | grep -qi "no.*message\|empty\|nothing"; then
        echo -e "${YELLOW}⚠️  No messages in inbox${NC}"
        echo "  This could mean:"
        echo "  - Messages already processed"
        echo "  - Messages not yet delivered to Registry chain"
        echo "  - Market hasn't sent the message yet"
    else
        echo -e "${YELLOW}Troubleshooting:${NC}"
        echo "  1. Verify linera service is stopped: pkill -f 'linera service'"
        echo "  2. Check wallet is accessible"
        echo "  3. Try manual command: linera process-inbox $REGISTRY_CHAIN_ID"
    fi
    
    # Restart service if it was running
    if [ "$SERVICE_RUNNING" = true ]; then
        echo ""
        echo -e "${YELLOW}⚠️  Don't forget to restart linera service:${NC}"
        echo "  linera service --port 8080"
    fi
    
    exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Inbox processing complete${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Check Oracle Dashboard for new queries"
echo "  2. Run: ./scripts/check-market-resolution-status.sh 1"
echo "  3. Verify market has Query ID linked"
echo ""
