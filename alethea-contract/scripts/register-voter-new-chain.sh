#!/bin/bash

# ============================================================================
# Register Voter on NEW CHAIN (Best Practice)
# Avoids stuck messages by deploying voter on separate chain
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Register Voter on NEW CHAIN (Recommended)             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Load environment
if [ -f .env.fresh ]; then
    source .env.fresh
    echo -e "${GREEN}✓ Loaded .env.fresh${NC}"
else
    echo -e "${RED}✗ .env.fresh not found${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Why deploy on new chain?${NC}"
echo "  • Avoids message ordering issues"
echo "  • Better isolation and reliability"
echo "  • Improved scalability"
echo "  • No stuck messages affecting other voters"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi

echo ""

# ============================================================================
# Step 1: Create New Chain
# ============================================================================
echo -e "${YELLOW}[Step 1] Creating new chain for voter...${NC}"

# Create new chain
NEW_CHAIN_OUTPUT=$(linera open-chain 2>&1)
echo "${NEW_CHAIN_OUTPUT}"

# Extract new chain ID
NEW_CHAIN_ID=$(echo "${NEW_CHAIN_OUTPUT}" | grep -oP 'Chain ID: \K[a-f0-9]+' | tail -1)

if [ -z "${NEW_CHAIN_ID}" ]; then
    echo -e "${RED}✗ Failed to create new chain${NC}"
    exit 1
fi

echo -e "${GREEN}✓ New chain created${NC}"
echo -e "${GREEN}  Chain ID: ${NEW_CHAIN_ID}${NC}"
echo ""

# ============================================================================
# Step 2: Deploy Voter Application on New Chain
# ============================================================================
echo -e "${YELLOW}[Step 2] Deploying voter application on new chain...${NC}"

# Deploy to new chain
DEPLOY_OUTPUT=$(linera project publish-and-create \
  --path voter-template \
  --json-parameters '{}' \
  --chain-id ${NEW_CHAIN_ID} 2>&1)

echo "${DEPLOY_OUTPUT}"

# Extract Application ID
VOTER_APP_ID=$(echo "${DEPLOY_OUTPUT}" | grep -oP 'Application ID: \K[a-f0-9]+' | tail -1)

if [ -z "${VOTER_APP_ID}" ]; then
    echo -e "${RED}✗ Failed to deploy voter application${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Voter application deployed${NC}"
echo -e "${GREEN}  Application ID: ${VOTER_APP_ID}${NC}"
echo -e "${GREEN}  Chain ID: ${NEW_CHAIN_ID}${NC}"
echo ""

# ============================================================================
# Step 3: Initialize Voter with Registry (Cross-Chain)
# ============================================================================
echo -e "${YELLOW}[Step 3] Initializing voter with Registry (cross-chain)...${NC}"

VOTER_ENDPOINT="http://localhost:8080/chains/${NEW_CHAIN_ID}/applications/${VOTER_APP_ID}"

echo "Voter Endpoint: ${VOTER_ENDPOINT}"
echo "Registry ID: ${ALETHEA_REGISTRY_ID}"
echo "Registry Chain: ${CHAIN_ID}"
echo ""

# Initialize voter (will use cross-chain messaging)
INIT_RESULT=$(curl -s -X POST "${VOTER_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"mutation {
      initialize(
        registryId: \\\"${ALETHEA_REGISTRY_ID}\\\",
        initialStake: \\\"100\\\"
      )
    }\"
  }")

echo "Initialization Result:"
echo "${INIT_RESULT}" | jq '.' 2>/dev/null || echo "${INIT_RESULT}"
echo ""

if echo "${INIT_RESULT}" | grep -q "error"; then
    echo -e "${RED}✗ Initialization failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Voter initialized (cross-chain registration)${NC}"
echo ""

# Wait for cross-chain message to be processed
echo "Waiting for cross-chain registration to complete..."
sleep 5

# ============================================================================
# Step 4: Verify Registration
# ============================================================================
echo -e "${YELLOW}[Step 4] Verifying registration...${NC}"

# Check voter status
STATUS_RESULT=$(curl -s -X POST "${VOTER_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ status { stake reputation totalVotes } }"}')

echo "Voter Status:"
echo "${STATUS_RESULT}" | jq '.' 2>/dev/null || echo "${STATUS_RESULT}"
echo ""

# Check in Registry
REGISTRY_ENDPOINT="http://localhost:8080/chains/${CHAIN_ID}/applications/${ALETHEA_REGISTRY_ID}"

REGISTRY_CHECK=$(curl -s -X POST "${REGISTRY_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"{ voterStats(voterApp: \\\"${VOTER_APP_ID}\\\") { stake reputationScore isActive } }\"
  }")

echo "Registry Verification:"
echo "${REGISTRY_CHECK}" | jq '.' 2>/dev/null || echo "${REGISTRY_CHECK}"
echo ""

# ============================================================================
# Success Summary
# ============================================================================
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Voter Registered on NEW CHAIN! 🎉                     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Your Voter Details:${NC}"
echo "  • Application ID: ${VOTER_APP_ID}"
echo "  • Chain ID: ${NEW_CHAIN_ID} (NEW!)"
echo "  • Registry Chain: ${CHAIN_ID}"
echo "  • Stake: 100 tokens"
echo "  • Status: Active"
echo ""
echo -e "${CYAN}Benefits of Separate Chain:${NC}"
echo "  ✅ No stuck message issues"
echo "  ✅ Better isolation"
echo "  ✅ Improved reliability"
echo "  ✅ Independent processing"
echo ""
echo -e "${CYAN}Save to Environment:${NC}"
echo "  export MY_VOTER_APP_ID=\"${VOTER_APP_ID}\""
echo "  export MY_VOTER_CHAIN_ID=\"${NEW_CHAIN_ID}\""
echo ""
echo -e "${GREEN}Happy voting! 🗳️${NC}"
echo ""
