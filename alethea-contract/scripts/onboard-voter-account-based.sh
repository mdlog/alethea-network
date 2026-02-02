#!/bin/bash

# ============================================================================
# Account-Based Voter Onboarding Script
# Simplified voter registration for account-based oracle registry
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

# Default values
DEFAULT_STAKE="1000"
DEFAULT_NAME=""
DEFAULT_METADATA_URL=""

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     Account-Based Voter Onboarding                        ║${NC}"
    echo -e "${BLUE}║     Alethea Oracle Network                                ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# ============================================================================
# Main Script
# ============================================================================

print_header

# ============================================================================
# Step 1: Load Environment
# ============================================================================
print_section "Step 1: Loading Environment"

if [ -f .env.account-based-registry ]; then
    source .env.account-based-registry
    print_success "Loaded .env.account-based-registry"
elif [ -f .env.fresh ]; then
    source .env.fresh
    print_warning "Using .env.fresh (account-based registry not found)"
else
    print_error ".env file not found"
    echo "Please deploy the account-based registry first:"
    echo "  ./scripts/deploy-account-based-registry.sh"
    exit 1
fi

# Check required variables
if [ -z "$ACCOUNT_BASED_REGISTRY_ID" ] && [ -z "$ALETHEA_REGISTRY_ID" ]; then
    print_error "Registry ID not found in environment"
    echo "Please set ACCOUNT_BASED_REGISTRY_ID or ALETHEA_REGISTRY_ID"
    exit 1
fi

# Use account-based registry if available, otherwise fall back
REGISTRY_ID="${ACCOUNT_BASED_REGISTRY_ID:-$ALETHEA_REGISTRY_ID}"
print_info "Registry ID: ${REGISTRY_ID}"

if [ -z "$CHAIN_ID" ]; then
    print_error "CHAIN_ID not found in environment"
    exit 1
fi

print_info "Chain ID: ${CHAIN_ID}"

# ============================================================================
# Step 2: Check Prerequisites
# ============================================================================
print_section "Step 2: Checking Prerequisites"

# Check Linera CLI
if ! command -v linera &> /dev/null; then
    print_error "Linera CLI not found"
    echo "Please install Linera CLI:"
    echo "  cargo install linera-service"
    exit 1
fi
print_success "Linera CLI installed"

# Check if service is running
if ! curl -s http://localhost:8080 > /dev/null 2>&1; then
    print_error "Linera service not running"
    echo "Please start Linera service:"
    echo "  linera service --port 8080"
    exit 1
fi
print_success "Linera service running"

# Check Registry is accessible
REGISTRY_ENDPOINT="http://localhost:8080/chains/${CHAIN_ID}/applications/${REGISTRY_ID}"
if ! curl -s -f "${REGISTRY_ENDPOINT}" > /dev/null 2>&1; then
    print_error "Registry not accessible"
    echo "Registry endpoint: ${REGISTRY_ENDPOINT}"
    exit 1
fi
print_success "Registry accessible"

# ============================================================================
# Step 3: Display Information
# ============================================================================
print_section "Step 3: Registration Information"

echo -e "${YELLOW}What is Account-Based Voting?${NC}"
echo "  • No need to deploy separate voter applications"
echo "  • Register directly with your account address"
echo "  • Vote using simple GraphQL mutations"
echo "  • Much faster and simpler than application-based voting"
echo ""

echo -e "${YELLOW}Requirements:${NC}"
echo "  • Minimum Stake: ${MIN_STAKE:-1000} tokens"
echo "  • Initial Reputation: 50 points (default)"
echo "  • Active account with sufficient balance"
echo ""

echo -e "${YELLOW}Benefits:${NC}"
echo "  • Earn rewards for correct votes"
echo "  • Build reputation over time (max 100)"
echo "  • Influence protocol decisions"
echo "  • Simple registration process (30 seconds)"
echo ""

echo -e "${YELLOW}How It Works:${NC}"
echo "  1. Register with your account address"
echo "  2. Stake tokens to participate"
echo "  3. Submit votes on queries"
echo "  4. Earn rewards for accurate votes"
echo "  5. Build reputation to increase voting weight"
echo ""

# ============================================================================
# Step 4: Collect Registration Details
# ============================================================================
print_section "Step 4: Registration Details"

# Get stake amount
echo -e "${YELLOW}Enter stake amount (default: ${DEFAULT_STAKE}):${NC}"
read -p "Stake: " STAKE_INPUT
STAKE="${STAKE_INPUT:-$DEFAULT_STAKE}"

# Validate stake is a number
if ! [[ "$STAKE" =~ ^[0-9]+$ ]]; then
    print_error "Invalid stake amount: must be a positive integer"
    exit 1
fi

# Check minimum stake
MIN_STAKE_VALUE="${MIN_STAKE:-1000}"
if [ "$STAKE" -lt "$MIN_STAKE_VALUE" ]; then
    print_error "Stake too low: minimum is ${MIN_STAKE_VALUE}"
    exit 1
fi

print_success "Stake: ${STAKE} tokens"

# Get voter name (optional)
echo ""
echo -e "${YELLOW}Enter voter name (optional, press Enter to skip):${NC}"
read -p "Name: " VOTER_NAME

if [ -n "$VOTER_NAME" ]; then
    print_success "Name: ${VOTER_NAME}"
fi

# Get metadata URL (optional)
echo ""
echo -e "${YELLOW}Enter metadata URL (optional, press Enter to skip):${NC}"
echo -e "${BLUE}  Example: https://example.com/voter-profile.json${NC}"
read -p "URL: " METADATA_URL

if [ -n "$METADATA_URL" ]; then
    print_success "Metadata URL: ${METADATA_URL}"
fi

# ============================================================================
# Step 5: Confirm Registration
# ============================================================================
print_section "Step 5: Confirm Registration"

echo -e "${CYAN}Registration Summary:${NC}"
echo "  • Stake: ${STAKE} tokens"
echo "  • Name: ${VOTER_NAME:-<not provided>}"
echo "  • Metadata URL: ${METADATA_URL:-<not provided>}"
echo "  • Registry: ${REGISTRY_ID}"
echo ""

read -p "Proceed with registration? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Registration cancelled."
    exit 0
fi

# ============================================================================
# Step 6: Register Voter
# ============================================================================
print_section "Step 6: Registering Voter"

# Build GraphQL mutation
MUTATION="mutation { registerVoter(stake: \\\"${STAKE}\\\""

if [ -n "$VOTER_NAME" ]; then
    MUTATION="${MUTATION}, name: \\\"${VOTER_NAME}\\\""
fi

if [ -n "$METADATA_URL" ]; then
    MUTATION="${MUTATION}, metadataUrl: \\\"${METADATA_URL}\\\""
fi

MUTATION="${MUTATION}) }"

print_info "Submitting registration..."

# Submit registration
REGISTER_RESULT=$(curl -s -X POST "${REGISTRY_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"${MUTATION}\"}")

echo ""
echo "Registration Result:"
echo "${REGISTER_RESULT}" | jq '.' 2>/dev/null || echo "${REGISTER_RESULT}"
echo ""

# Check for errors
if echo "${REGISTER_RESULT}" | grep -q "error\|Error"; then
    print_error "Registration failed"
    echo "Please check the error message above"
    exit 1
fi

print_success "Registration submitted successfully!"

# Wait for registration to process
print_info "Waiting for registration to process..."
sleep 3

# ============================================================================
# Step 7: Verify Registration
# ============================================================================
print_section "Step 7: Verifying Registration"

# Query voter info
VOTER_QUERY='{ myVoterInfo { stake reputation totalVotes isActive } }'

VOTER_INFO=$(curl -s -X POST "${REGISTRY_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"${VOTER_QUERY}\"}")

echo "Voter Information:"
echo "${VOTER_INFO}" | jq '.' 2>/dev/null || echo "${VOTER_INFO}"
echo ""

# Check if registration was successful
if echo "${VOTER_INFO}" | grep -q "\"isActive\":true"; then
    print_success "Registration verified!"
else
    print_warning "Registration pending (may take a few moments)"
fi

# ============================================================================
# Step 8: Display Next Steps
# ============================================================================
print_section "Step 8: Next Steps"

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Registration Complete! 🎉                             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}Your Voter Details:${NC}"
echo "  • Stake: ${STAKE} tokens"
echo "  • Initial Reputation: 50 points"
echo "  • Status: Active"
echo ""

echo -e "${CYAN}What You Can Do Now:${NC}"
echo "  1. Check your voter info"
echo "  2. View active queries"
echo "  3. Submit votes on queries"
echo "  4. Claim rewards"
echo "  5. Update your stake"
echo ""

echo -e "${CYAN}Useful Commands:${NC}"
echo ""

echo -e "${YELLOW}# Check your voter information${NC}"
echo "curl -X POST \"${REGISTRY_ENDPOINT}\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"query\": \"{ myVoterInfo { stake reputation totalVotes correctVotes accuracyRate isActive } }\"}'"
echo ""

echo -e "${YELLOW}# View active queries${NC}"
echo "curl -X POST \"${REGISTRY_ENDPOINT}\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"query\": \"{ activeQueries { id description outcomes deadline } }\"}'"
echo ""

echo -e "${YELLOW}# Submit a vote${NC}"
echo "curl -X POST \"${REGISTRY_ENDPOINT}\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"query\": \"mutation { submitVote(queryId: 1, value: 0, confidence: 90) }\"}'"
echo ""

echo -e "${YELLOW}# Check pending rewards${NC}"
echo "curl -X POST \"${REGISTRY_ENDPOINT}\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"query\": \"{ myPendingRewards }\"}'"
echo ""

echo -e "${YELLOW}# Claim rewards${NC}"
echo "curl -X POST \"${REGISTRY_ENDPOINT}\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"query\": \"mutation { claimRewards }\"}'"
echo ""

echo -e "${YELLOW}# Update stake${NC}"
echo "curl -X POST \"${REGISTRY_ENDPOINT}\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"query\": \"mutation { updateStake(additionalStake: \\\"500\\\") }\"}'"
echo ""

echo -e "${YELLOW}# View leaderboard${NC}"
echo "curl -X POST \"${REGISTRY_ENDPOINT}\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"query\": \"{ voters(limit: 10) { address stake reputation totalVotes accuracyRate } }\"}'"
echo ""

echo -e "${CYAN}Tips for Success:${NC}"
echo "  • Vote accurately to build reputation"
echo "  • Higher reputation = higher voting weight"
echo "  • Stake more tokens to increase selection probability"
echo "  • Check active queries regularly"
echo "  • Claim rewards periodically"
echo ""

echo -e "${GREEN}Happy voting! 🗳️${NC}"
echo ""

# Save voter info to file
VOTER_INFO_FILE=".voter-info-$(date +%Y%m%d-%H%M%S).txt"
cat > "$VOTER_INFO_FILE" << EOF
# Voter Registration Info
# Registered: $(date)

Registry ID: ${REGISTRY_ID}
Chain ID: ${CHAIN_ID}
Stake: ${STAKE}
Name: ${VOTER_NAME:-<not provided>}
Metadata URL: ${METADATA_URL:-<not provided>}

Registry Endpoint: ${REGISTRY_ENDPOINT}

# Quick Commands
export REGISTRY_ENDPOINT="${REGISTRY_ENDPOINT}"

# Check voter info
alias voter-info='curl -s -X POST "\${REGISTRY_ENDPOINT}" -H "Content-Type: application/json" -d '"'"'{"query": "{ myVoterInfo { stake reputation totalVotes isActive } }"}'"'"' | jq'

# View active queries
alias voter-queries='curl -s -X POST "\${REGISTRY_ENDPOINT}" -H "Content-Type: application/json" -d '"'"'{"query": "{ activeQueries { id description outcomes } }"}'"'"' | jq'

# Check rewards
alias voter-rewards='curl -s -X POST "\${REGISTRY_ENDPOINT}" -H "Content-Type: application/json" -d '"'"'{"query": "{ myPendingRewards }"}'"'"' | jq'
EOF

print_success "Voter info saved to: ${VOTER_INFO_FILE}"
echo ""

exit 0
