#!/bin/bash

# ============================================================================
# Fix Wallet Lock Issue
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Fix Linera Wallet Lock                                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Find all Linera processes
echo -e "${YELLOW}[1] Finding Linera processes...${NC}"
LINERA_PROCS=$(ps aux | grep -i linera | grep -v grep | grep -v fix-wallet-lock)

if [ -z "${LINERA_PROCS}" ]; then
    echo -e "${GREEN}✓ No Linera processes found${NC}"
else
    echo "Found Linera processes:"
    echo "${LINERA_PROCS}"
    echo ""
    
    # Get PIDs
    PIDS=$(ps aux | grep -i linera | grep -v grep | grep -v fix-wallet-lock | awk '{print $2}')
    
    echo -e "${YELLOW}Kill these processes? (y/n)${NC}"
    read -p "> " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        for PID in ${PIDS}; do
            echo "Killing process ${PID}..."
            kill -9 ${PID} 2>/dev/null || true
        done
        echo -e "${GREEN}✓ Processes killed${NC}"
        sleep 2
    else
        echo "Skipping process kill"
    fi
fi
echo ""

# Step 2: Check lock file
echo -e "${YELLOW}[2] Checking lock file...${NC}"
LOCK_FILE="$HOME/.config/linera/wallet.db/default/LOCK"

if [ -f "${LOCK_FILE}" ]; then
    echo "Lock file exists: ${LOCK_FILE}"
    
    # Check if any process is using it
    LOCK_USERS=$(lsof "${LOCK_FILE}" 2>/dev/null || true)
    
    if [ -z "${LOCK_USERS}" ]; then
        echo -e "${YELLOW}⚠ Lock file exists but no process is using it${NC}"
        echo "This is a stale lock file"
        echo ""
        echo -e "${YELLOW}Remove stale lock file? (y/n)${NC}"
        read -p "> " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -f "${LOCK_FILE}"
            echo -e "${GREEN}✓ Stale lock file removed${NC}"
        fi
    else
        echo "Lock file is being used by:"
        echo "${LOCK_USERS}"
        echo ""
        echo -e "${RED}Please kill the process above first${NC}"
    fi
else
    echo -e "${GREEN}✓ No lock file found${NC}"
fi
echo ""

# Step 3: Verify wallet is accessible
echo -e "${YELLOW}[3] Testing wallet access...${NC}"
WALLET_TEST=$(linera wallet show 2>&1)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Wallet is now accessible!${NC}"
    echo "${WALLET_TEST}" | head -5
    echo ""
    echo -e "${GREEN}Problem fixed! You can now run your tests.${NC}"
else
    echo -e "${RED}✗ Wallet still not accessible${NC}"
    echo "${WALLET_TEST}"
    echo ""
    echo -e "${YELLOW}Additional troubleshooting:${NC}"
    echo "1. Restart your terminal"
    echo "2. Check if RocksDB is corrupted"
    echo "3. Backup and reinitialize wallet if needed"
fi
echo ""
