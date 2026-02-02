#!/bin/bash

# Safe inbox processing script that handles linera service automatically
# Usage: ./process-inbox-safe.sh [chain_id]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CHAIN_ID="${1:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Safe Inbox Processing${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}Chain ID:${NC} ${CHAIN_ID:0:16}..."
echo ""

# Check if linera service is running
SERVICE_RUNNING=false
SERVICE_PID=""

if pgrep -f "linera service" > /dev/null; then
    SERVICE_RUNNING=true
    SERVICE_PID=$(pgrep -f "linera service" | head -1)
    echo -e "${YELLOW}⚠️  Linera service is running (PID: $SERVICE_PID)${NC}"
    echo "  Must stop service to process inbox"
    echo ""
    
    read -p "Stop service and process inbox? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}⚠️  Cancelled${NC}"
        exit 0
    fi
    
    echo -e "${BLUE}Stopping linera service...${NC}"
    pkill -f "linera service" || true
    
    # Wait for service to stop
    for i in {1..10}; do
        if ! pgrep -f "linera service" > /dev/null; then
            break
        fi
        sleep 0.5
    done
    
    if pgrep -f "linera service" > /dev/null; then
        echo -e "${RED}❌ Failed to stop linera service${NC}"
        echo "  Please stop manually: pkill -f 'linera service'"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Linera service stopped${NC}"
    echo ""
else
    echo -e "${GREEN}✅ Linera service not running${NC}"
    echo ""
fi

# Process inbox
echo -e "${BLUE}Processing inbox for chain...${NC}"
echo "Command: linera process-inbox $CHAIN_ID"
echo ""

PROCESS_OUTPUT=$(linera process-inbox "$CHAIN_ID" 2>&1)
PROCESS_EXIT_CODE=$?

echo "$PROCESS_OUTPUT"
echo ""

if [ $PROCESS_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Inbox processed successfully${NC}"
    
    # Check if messages were processed
    if echo "$PROCESS_OUTPUT" | grep -qiE "Processed.*[1-9]|blocks|messages"; then
        BLOCKS=$(echo "$PROCESS_OUTPUT" | grep -oE "[0-9]+ blocks" | grep -oE "[0-9]+" | head -1 || echo "0")
        if [ "$BLOCKS" != "0" ]; then
            echo -e "${GREEN}  Processed $BLOCKS blocks${NC}"
        fi
    elif echo "$PROCESS_OUTPUT" | grep -qiE "0 blocks|no.*message|empty"; then
        echo -e "${YELLOW}  No new messages to process${NC}"
    fi
else
    echo -e "${RED}❌ Failed to process inbox${NC}"
    
    if echo "$PROCESS_OUTPUT" | grep -qi "Resource temporarily unavailable\|lock"; then
        echo -e "${YELLOW}  Error: Resource lock detected${NC}"
        echo "  Another process may have lock on wallet/database"
    fi
fi

# Restart service if it was running
if [ "$SERVICE_RUNNING" = true ]; then
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Restarting Linera Service${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Please restart linera service manually:${NC}"
    echo "  linera service start"
    echo ""
    echo -e "${CYAN}Or run in background:${NC}"
    echo "  nohup linera service start > linera-service.log 2>&1 &"
    echo ""
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Inbox processing complete${NC}"
echo ""
