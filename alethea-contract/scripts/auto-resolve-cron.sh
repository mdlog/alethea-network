#!/bin/bash

# Auto-Resolve Queries Cron Job
# This script should be run periodically (e.g., every 5 minutes) to:
# 1. Check for queries that have completed reveal phase
# 2. Auto-resolve them if they have minimum votes
# 3. Expire them if they don't have enough votes

# Configuration
CHAIN_ID="${CHAIN_ID:-8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef}"
REGISTRY_ID="${REGISTRY_ID:-9936172d5d1f3fb3ae65ea2bb51391afc561d9f8b80927c9e8e32c1efe9380d2}"
LINERA_WALLET="${LINERA_WALLET:-$HOME/.config/linera/wallet.json}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "========================================="
echo "Auto-Resolve Queries Cron Job"
echo "========================================="
echo "Chain ID: $CHAIN_ID"
echo "Registry ID: $REGISTRY_ID"
echo "Time: $(date)"
echo ""

# Function to run auto-resolve
run_auto_resolve() {
    echo -e "${YELLOW}Running auto-resolve operation...${NC}"
    
    # Execute AutoResolveQueries operation
    linera --wallet "$LINERA_WALLET" \
        --with-new-chain \
        --chain "$CHAIN_ID" \
        request-application "$REGISTRY_ID" \
        --operation '{"AutoResolveQueries": {}}' \
        2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Auto-resolve completed successfully${NC}"
        return 0
    else
        echo -e "${RED}✗ Auto-resolve failed${NC}"
        return 1
    fi
}

# Function to check expired queries
check_expired() {
    echo -e "${YELLOW}Checking for expired queries...${NC}"
    
    # Execute CheckExpiredQueries operation
    linera --wallet "$LINERA_WALLET" \
        --with-new-chain \
        --chain "$CHAIN_ID" \
        request-application "$REGISTRY_ID" \
        --operation '{"CheckExpiredQueries": {}}' \
        2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Expired queries check completed${NC}"
        return 0
    else
        echo -e "${RED}✗ Expired queries check failed${NC}"
        return 1
    fi
}

# Main execution
echo "Step 1: Auto-resolve queries with completed reveal phase"
run_auto_resolve
AUTO_RESOLVE_STATUS=$?

echo ""
echo "Step 2: Check and expire queries past deadline"
check_expired
EXPIRED_STATUS=$?

echo ""
echo "========================================="
echo "Summary"
echo "========================================="
echo "Auto-resolve: $([ $AUTO_RESOLVE_STATUS -eq 0 ] && echo -e "${GREEN}SUCCESS${NC}" || echo -e "${RED}FAILED${NC}")"
echo "Expired check: $([ $EXPIRED_STATUS -eq 0 ] && echo -e "${GREEN}SUCCESS${NC}" || echo -e "${RED}FAILED${NC}")"
echo "Completed at: $(date)"
echo "========================================="

# Exit with error if any operation failed
if [ $AUTO_RESOLVE_STATUS -ne 0 ] || [ $EXPIRED_STATUS -ne 0 ]; then
    exit 1
fi

exit 0
