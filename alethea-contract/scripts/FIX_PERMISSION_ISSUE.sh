#!/bin/bash

# FIX PERMISSION ISSUE - Linera service running as root
# This script will fix the ownership issue

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  FIXING LINERA PERMISSION ISSUE${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${RED}PROBLEM IDENTIFIED:${NC}"
echo "  - Linera service running as ROOT"
echo "  - Wallet files owned by ROOT"
echo "  - User 'mdlog' cannot access wallet"
echo "  - This prevents message sending and inbox processing"
echo ""

echo -e "${CYAN}SOLUTION STEPS:${NC}"
echo ""

# Step 1: Stop service
echo -e "${YELLOW}[Step 1] Stopping Linera service (requires sudo)...${NC}"
sudo pkill -f 'linera service' 2>/dev/null || true
sudo pkill -f 'linera publish-module' 2>/dev/null || true
sleep 2
echo -e "${GREEN}  ✅ Services stopped${NC}"
echo ""

# Step 2: Fix permissions
echo -e "${YELLOW}[Step 2] Fixing wallet permissions (requires sudo)...${NC}"
WALLET_DIR="$HOME/.config/linera"
if [ -d "$WALLET_DIR" ]; then
    sudo chown -R $(whoami):$(whoami) "$WALLET_DIR"
    sudo chmod -R 755 "$WALLET_DIR"
    echo -e "${GREEN}  ✅ Wallet permissions fixed${NC}"
    echo "    Owner changed to: $(whoami)"
else
    echo -e "${RED}  ❌ Wallet directory not found: $WALLET_DIR${NC}"
    exit 1
fi
echo ""

# Step 3: Verify permissions
echo -e "${YELLOW}[Step 3] Verifying permissions...${NC}"
ls -la "$WALLET_DIR" | head -10
echo ""

# Step 4: Process inbox
echo -e "${YELLOW}[Step 4] Processing inbox (as current user)...${NC}"
REGISTRY_CHAIN_ID="${REGISTRY_CHAIN_ID:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"
echo "  Processing: linera process-inbox $REGISTRY_CHAIN_ID"
linera process-inbox "$REGISTRY_CHAIN_ID" 2>&1 || echo "  (Error processing - will try again after service starts)"
echo ""

# Step 5: Start service as current user
echo -e "${YELLOW}[Step 5] Starting Linera service as current user...${NC}"
echo -e "${GREEN}  Run this command in a separate terminal:${NC}"
echo ""
echo "    linera service --port 8080"
echo ""
echo "  OR run in background:"
echo "    nohup linera service --port 8080 > /tmp/linera-service.log 2>&1 &"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Permission fix completed!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}NEXT STEPS:${NC}"
echo "  1. Start linera service as your user (not root!)"
echo "  2. Wait 30-60 seconds for ChainListener to initialize"
echo "  3. Re-request resolution from Market frontend"
echo "  4. Verify query creation: ./scripts/investigate-market-query-detailed.sh 1"
echo ""
