#!/bin/bash

# ============================================================================
# Register as Voter - Complete Onboarding Script
# Helps users deploy voter application and register with Registry
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Load environment
if [ -f .env.fresh ]; then
    source .env.fresh
    echo -e "${GREEN}✓ Loaded .env.fresh${NC}"
else
    echo -e "${RED}✗ .env.fresh not found${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Alethea Network - Voter Registration                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# Step 1: Check Prerequisites
# ============================================================================
echo -e "${YELLOW}[Step 1] Checking prerequisites...${NC}"

# Check Linera CLI
if ! command -v linera &> /dev/null; then
    echo -e "${RED}✗ Linera CLI not found${NC}"
    echo "Please install Linera CLI first:"
    echo "  cargo install linera-service"
    exit 1
fi
echo -e "${GREEN}✓ Linera CLI installed${NC}"

# Check if service is running
if ! curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo -e "${RED}✗ Linera service not running${NC}"
    echo "Please start Linera service:"
    echo "  linera service --port 8080"
    exit 1
fi
echo -e "${GREEN}✓ Linera service running${NC}"

# Check Registry is accessible
REGISTRY_ENDPOINT="http://localhost:8080/chains/${CHAIN_ID}/applications/${ALETHEA_REGISTRY_ID}"
if ! curl -s -f "${REGISTRY_ENDPOINT}" > /dev/null 2>&1; then
    echo -e "${RED}✗ Registry not accessible${NC}"
    echo "Registry endpoint: ${REGISTRY_ENDPOINT}"
    exit 1
fi
echo -e "${GREEN}✓ Registry accessible${NC}"

echo ""

# ============================================================================
# Step 2: Display Information
# ============================================================================
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}Registration Information${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Requirements:${NC}"
echo "  • Minimum Stake: 100 tokens"
echo "  • Initial Reputation: 100 points"
echo "  • Registry ID: ${ALETHEA_REGISTRY_ID}"
echo ""
echo -e "${YELLOW}Benefits:${NC}"
echo "  • Earn rewards for correct votes"
echo "  • Build reputation over time"
echo "  • Automated voting strategies available"
echo "  • Passive income potential"
echo ""
echo -e "${YELLOW}Process:${NC}"
echo "  1. Deploy voter application"
echo "  2. Initialize with Registry"
echo "  3. Start receiving vote requests"
echo ""

read -p "Continue with registration? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Registration cancelled."
    exit 0
fi

echo ""

# ============================================================================
# Step 3: Deploy Voter Application
# ============================================================================
echo -e "${YELLOW}[Step 2] Deploying voter application...${NC}"
echo ""

# Check if voter-template exists
if [ ! -d "voter-template" ]; then
    echo -e "${RED}✗ voter-template directory not found${NC}"
    echo "Please ensure you're in the project root directory"
    exit 1
fi

echo "Deploying voter application from template..."
echo ""

# Deploy voter application
DEPLOY_OUTPUT=$(linera project publish-and-create \
  --path voter-template \
  --json-parameters '{}' 2>&1)

echo "${DEPLOY_OUTPUT}"
echo ""

# Extract Application ID from output
VOTER_APP_ID=$(echo "${DEPLOY_OUTPUT}" | grep -oP 'Application ID: \K[a-f0-9]+' | tail -1)

if [ -z "${VOTER_APP_ID}" ]; then
    echo -e "${RED}✗ Failed to extract Voter Application ID${NC}"
    echo "Please check the deployment output above"
    exit 1
fi

echo -e "${GREEN}✓ Voter application deployed${NC}"
echo -e "${GREEN}  Application ID: ${VOTER_APP_ID}${NC}"
echo ""

# Save to environment file
echo "# Voter Application (Registered: $(date))" >> .env.fresh
echo "export MY_VOTER_APP_ID=\"${VOTER_APP_ID}\"" >> .env.fresh

# ============================================================================
# Step 4: Initialize Voter with Registry
# ============================================================================
echo -e "${YELLOW}[Step 3] Initializing voter with Registry...${NC}"
echo ""

VOTER_ENDPOINT="http://localhost:8080/chains/${CHAIN_ID}/applications/${VOTER_APP_ID}"

echo "Voter Endpoint: ${VOTER_ENDPOINT}"
echo "Registry ID: ${ALETHEA_REGISTRY_ID}"
echo "Initial Stake: 100 tokens"
echo ""

# Initialize voter
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

# Check if initialization was successful
if echo "${INIT_RESULT}" | grep -q "error"; then
    echo -e "${RED}✗ Initialization failed${NC}"
    echo "Please check the error message above"
    exit 1
fi

echo -e "${GREEN}✓ Voter initialized with Registry${NC}"
echo ""

# Wait a moment for registration to process
echo "Waiting for registration to process..."
sleep 3

# ============================================================================
# Step 5: Verify Registration
# ============================================================================
echo -e "${YELLOW}[Step 4] Verifying registration...${NC}"
echo ""

# Check voter status
STATUS_RESULT=$(curl -s -X POST "${VOTER_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ status { stake reputation totalVotes } }"}')

echo "Voter Status:"
echo "${STATUS_RESULT}" | jq '.' 2>/dev/null || echo "${STATUS_RESULT}"
echo ""

# Check in Registry
REGISTRY_CHECK=$(curl -s -X POST "${REGISTRY_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"{ voterStats(voterApp: \\\"${VOTER_APP_ID}\\\") { stake reputationScore isActive } }\"
  }")

echo "Registry Verification:"
echo "${REGISTRY_CHECK}" | jq '.' 2>/dev/null || echo "${REGISTRY_CHECK}"
echo ""

if echo "${REGISTRY_CHECK}" | grep -q "\"isActive\":true"; then
    echo -e "${GREEN}✓ Registration verified in Registry${NC}"
else
    echo -e "${YELLOW}⚠ Registration pending (may take a few moments)${NC}"
fi

echo ""

# ============================================================================
# Step 6: Configuration Options
# ============================================================================
echo -e "${YELLOW}[Step 5] Configuration options...${NC}"
echo ""

echo "Would you like to enable auto-voting?"
echo "  • Manual: You submit votes manually (default)"
echo "  • Auto: Automatically vote using a strategy"
echo ""

read -p "Enable auto-voting? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Select voting strategy:"
    echo "  1. Random - Vote randomly (for testing)"
    echo "  2. Oracle - Query external oracle (requires setup)"
    echo "  3. ML - Use ML model (requires setup)"
    echo ""
    read -p "Enter choice (1-3): " -n 1 -r STRATEGY_CHOICE
    echo ""
    
    case $STRATEGY_CHOICE in
        1)
            STRATEGY="random"
            ;;
        2)
            STRATEGY="oracle"
            ;;
        3)
            STRATEGY="ml"
            ;;
        *)
            STRATEGY="random"
            ;;
    esac
    
    echo "Setting strategy to: ${STRATEGY}"
    
    # Set strategy
    curl -s -X POST "${VOTER_ENDPOINT}" \
      -H "Content-Type: application/json" \
      -d "{\"query\": \"mutation { setDecisionStrategy(strategy: \\\"${STRATEGY}\\\") }\"}" \
      > /dev/null
    
    # Enable auto-vote
    curl -s -X POST "${VOTER_ENDPOINT}" \
      -H "Content-Type: application/json" \
      -d '{"query": "mutation { enableAutoVote }"}' \
      > /dev/null
    
    echo -e "${GREEN}✓ Auto-voting enabled with ${STRATEGY} strategy${NC}"
else
    echo -e "${BLUE}ℹ Manual voting mode (default)${NC}"
fi

echo ""

# ============================================================================
# Success Summary
# ============================================================================
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Registration Complete! 🎉                             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Your Voter Details:${NC}"
echo "  • Application ID: ${VOTER_APP_ID}"
echo "  • Stake: 100 tokens"
echo "  • Initial Reputation: 100 points"
echo "  • Status: Active"
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo "  1. You'll automatically receive vote requests for new markets"
echo "  2. Submit votes manually or let auto-vote handle it"
echo "  3. Build reputation by voting accurately"
echo "  4. Earn rewards for correct votes"
echo ""
echo -e "${CYAN}Useful Commands:${NC}"
echo ""
echo "  # Check your voter status"
echo "  curl -X POST \"${VOTER_ENDPOINT}\" \\"
echo "    -H \"Content-Type: application/json\" \\"
echo "    -d '{\"query\": \"{ status { stake reputation totalVotes } }\"}'"
echo ""
echo "  # Submit a vote manually"
echo "  curl -X POST \"${VOTER_ENDPOINT}\" \\"
echo "    -H \"Content-Type: application/json\" \\"
echo "    -d '{\"query\": \"mutation { submitVote(marketId: 1, outcomeIndex: 0, confidence: 90) }\"}'"
echo ""
echo "  # Check leaderboard"
echo "  curl -X POST \"${REGISTRY_ENDPOINT}\" \\"
echo "    -H \"Content-Type: application/json\" \\"
echo "    -d '{\"query\": \"{ voterLeaderboard(limit: 10) { voterApp reputationScore totalVotes accuracyRate } }\"}'"
echo ""
echo -e "${CYAN}Dashboard:${NC}"
echo "  Visit: http://localhost:4000/voters"
echo ""
echo -e "${GREEN}Happy voting! 🗳️${NC}"
echo ""
