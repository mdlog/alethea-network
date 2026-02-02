#!/bin/bash

# Clear Stuck Messages from Chain Inbox
# This script processes all pending messages in the chain inbox

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}🧹 Clearing Stuck Messages${NC}\n"

# Load environment
if [ -f .env.conway ]; then
    set -a
    source <(grep '^export' .env.conway 2>/dev/null || true)
    set +a
fi

CHAIN_ID="${CHAIN_ID:-371f1707095d36c155e513a9cf7030760acda20278a14828f5d176dd8fffecce}"

echo -e "${BLUE}📋 Configuration:${NC}"
echo -e "   Chain ID: ${CHAIN_ID}\n"

# Stop linera service first
echo -e "${YELLOW}⚠️  Stopping linera service...${NC}"
pkill -f "linera service" 2>/dev/null || true
sleep 2

# Try to process inbox multiple times
echo -e "${CYAN}📥 Processing inbox messages...${NC}"
for i in {1..5}; do
    echo -e "${YELLOW}  Attempt $i/5...${NC}"
    
    # Try to process inbox
    OUTPUT=$(linera process-inbox --with-chain "$CHAIN_ID" 2>&1 || true)
    
    if echo "$OUTPUT" | grep -q "error"; then
        echo -e "${RED}  ❌ Error processing inbox${NC}"
        echo "$OUTPUT" | tail -3
    else
        echo -e "${GREEN}  ✅ Processed inbox${NC}"
    fi
    
    sleep 1
done

# Try to retry pending block
echo -e "${CYAN}🔄 Retrying pending blocks...${NC}"
for i in {1..3}; do
    echo -e "${YELLOW}  Attempt $i/3...${NC}"
    
    OUTPUT=$(linera retry-pending-block --with-chain "$CHAIN_ID" 2>&1 || true)
    
    if echo "$OUTPUT" | grep -q "error"; then
        echo -e "${RED}  ❌ Error retrying block${NC}"
    else
        echo -e "${GREEN}  ✅ Retried pending block${NC}"
    fi
    
    sleep 1
done

echo -e "\n${GREEN}✅ Message clearing complete!${NC}\n"
echo -e "${CYAN}Next steps:${NC}"
echo -e "   1. Start linera service: linera service --port 8080"
echo -e "   2. Test operations again"
echo ""
