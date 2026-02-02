#!/bin/bash

# ============================================================================
# Sync All Chains
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Sync Linera Chains                                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}This will sync all your chains with the network.${NC}"
echo ""

# Get all chain IDs
echo -e "${YELLOW}[1] Getting chain list...${NC}"
CHAINS=$(linera wallet show 2>&1 | grep -oP '[a-f0-9]{64}' | sort -u)

if [ -z "${CHAINS}" ]; then
    echo -e "${RED}✗ No chains found${NC}"
    exit 1
fi

CHAIN_COUNT=$(echo "${CHAINS}" | wc -l)
echo -e "${GREEN}✓ Found ${CHAIN_COUNT} chain(s)${NC}"
echo ""

# Sync each chain
echo -e "${YELLOW}[2] Syncing chains...${NC}"
echo ""

SYNCED=0
FAILED=0

for CHAIN in ${CHAINS}; do
    echo "Syncing chain: ${CHAIN:0:16}..."
    
    if linera sync-balance --with-chain-id "${CHAIN}" 2>&1 | grep -q "Successfully"; then
        echo -e "${GREEN}✓ Synced${NC}"
        ((SYNCED++))
    else
        echo -e "${YELLOW}⚠ Sync had issues (might be OK)${NC}"
        ((FAILED++))
    fi
    echo ""
done

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Sync Summary                                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Total chains: ${CHAIN_COUNT}"
echo "Synced: ${SYNCED}"
echo "Issues: ${FAILED}"
echo ""

if [ ${SYNCED} -gt 0 ]; then
    echo -e "${GREEN}✓ Chains synced!${NC}"
    echo ""
    echo "Now try creating a new chain:"
    echo "  linera open-chain"
    echo ""
    echo "Or run the diagnostic again:"
    echo "  ./scripts/check-linera-setup.sh"
else
    echo -e "${RED}✗ All syncs failed${NC}"
    echo ""
    echo "Possible issues:"
    echo "  • Network validator not accessible"
    echo "  • Linera service not running"
    echo "  • Network configuration issue"
fi
echo ""
