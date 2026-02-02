#!/bin/bash

# ============================================================================
# Simple Multi-Wallet Test (No New Chains)
# Uses existing chain, just deploys multiple voter apps
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Simple Multi-Wallet Test                               ║${NC}"
echo -e "${BLUE}║     Multiple voters on SAME chain                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Load environment
if [ -f .env.fresh ]; then
    source .env.fresh
fi

echo -e "${CYAN}Concept:${NC}"
echo "  • Each voter = separate Application ID"
echo "  • All on same chain (simpler for testing)"
echo "  • In production: each voter would have own wallet"
echo "  • Demonstrates voter isolation"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi

echo ""

# Get current chain
echo -e "${YELLOW}[1] Getting current chain...${NC}"
CURRENT_CHAIN=$(linera wallet show 2>&1 | grep -oP '[a-f0-9]{64}' | head -1)

if [ -z "${CURRENT_CHAIN}" ]; then
    echo -e "${RED}✗ No chain found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Using chain: ${CURRENT_CHAIN:0:16}...${NC}"
echo ""

# Deploy multiple voters
echo -e "${YELLOW}[2] Deploying voters...${NC}"
echo ""

declare -a VOTER_APP_IDS
declare -a VOTER_NAMES=("Alice" "Bob" "Charlie")

for i in {0..2}; do
    VOTER_NAME="${VOTER_NAMES[$i]}"
    echo "Deploying voter for ${VOTER_NAME}..."
    
    # Check if voter-template exists
    if [ ! -d "voter-template" ]; then
        echo -e "${RED}✗ voter-template directory not found${NC}"
        echo "Please make sure you're in the project root"
        exit 1
    fi
    
    # Deploy voter
    echo "  Publishing and creating application..."
    DEPLOY_OUTPUT=$(timeout 60s linera project publish-and-create \
      --path voter-template \
      --json-parameters '{}' 2>&1)
    
    if [ $? -eq 124 ]; then
        echo -e "${RED}✗ Deployment timed out for ${VOTER_NAME}${NC}"
        exit 1
    fi
    
    VOTER_APP=$(echo "${DEPLOY_OUTPUT}" | grep -oP 'Application ID: \K[a-f0-9]+' | tail -1)
    
    if [ -z "${VOTER_APP}" ]; then
        echo -e "${RED}✗ Failed to deploy voter for ${VOTER_NAME}${NC}"
        echo "Output:"
        echo "${DEPLOY_OUTPUT}"
        exit 1
    fi
    
    VOTER_APP_IDS+=("${VOTER_APP}")
    echo -e "${GREEN}✓ Voter deployed: ${VOTER_APP:0:16}...${NC}"
    echo ""
done

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Deployment Summary                              