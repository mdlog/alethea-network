#!/bin/bash

# Script to sync and process inbox safely
# Stops linera service first to release database lock

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     SYNC AND PROCESS INBOX                                   ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Check and stop linera service if running
echo -e "${YELLOW}Step 1: Checking for running linera service...${NC}"

if pgrep -f "linera service" > /dev/null; then
    echo -e "${YELLOW}⚠️  linera service is running, stopping it...${NC}"
    pkill -f "linera service" || true
    sleep 2
    echo -e "${GREEN}✓ linera service stopped${NC}"
else
    echo -e "${GREEN}✓ No linera service running${NC}"
fi

echo ""

# Step 2: Sync
echo -e "${YELLOW}Step 2: Syncing chain state...${NC}"
if command -v linera &> /dev/null; then
    linera sync 2>&1 | head -30
    echo ""
    echo -e "${GREEN}✓ Sync completed${NC}"
else
    echo -e "${RED}❌ linera CLI not found${NC}"
    exit 1
fi

echo ""

# Step 3: Process inbox
echo -e "${YELLOW}Step 3: Processing inbox...${NC}"
linera process-inbox 2>&1 | head -30
echo ""
echo -e "${GREEN}✓ Process inbox completed${NC}"

echo ""

# Step 4: Restart linera service (optional)
echo -e "${YELLOW}Step 4: Restarting linera service...${NC}"
echo -e "${BLUE}Starting linera service in background...${NC}"
nohup linera service > /tmp/linera-service.log 2>&1 &
sleep 2

if pgrep -f "linera service" > /dev/null; then
    echo -e "${GREEN}✓ linera service restarted${NC}"
    echo -e "${YELLOW}Logs: /tmp/linera-service.log${NC}"
else
    echo -e "${YELLOW}⚠️  Failed to start linera service automatically${NC}"
    echo -e "${BLUE}Start manually: linera service${NC}"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              SYNC AND PROCESS COMPLETE                       ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next: Verify queries were created${NC}"
echo ""
