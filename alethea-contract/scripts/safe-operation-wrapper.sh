#!/bin/bash

# ============================================================================
# Safe Operation Wrapper
# Wraps any Linera operation with sync + process-inbox
# ============================================================================

set +e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get chain ID from arguments or environment
CHAIN_ID=""
for arg in "$@"; do
    if [[ $arg == --with-chain-id=* ]]; then
        CHAIN_ID="${arg#*=}"
        break
    fi
done

if [ -z "${CHAIN_ID}" ] && [ -f .env.fresh ]; then
    source .env.fresh
fi

if [ -n "${CHAIN_ID}" ]; then
    echo -e "${YELLOW}[Pre-flight] Syncing and processing inbox...${NC}"
    
    # Sync
    linera sync --with-chain-id "${CHAIN_ID}" > /dev/null 2>&1
    
    # Process inbox
    linera process-inbox "${CHAIN_ID}" > /dev/null 2>&1
    
    echo -e "${GREEN}✓ Chain ready${NC}"
    echo ""
fi

# Execute the actual command
linera "$@"
