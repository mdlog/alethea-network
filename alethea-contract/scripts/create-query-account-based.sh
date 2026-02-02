#!/bin/bash

# ============================================================================
# Account-Based Query Creation Script
# Create queries/markets on the account-based oracle registry
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
DEFAULT_STRATEGY="Majority"
DEFAULT_MIN_VOTES="3"
DEFAULT_REWARD="1000"
DEFAULT_DURATION="300" # 5 minutes in seconds

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     Account-Based Query Creation                          ║${NC}"
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
print_section "Step 3: Query Creation Information"

echo -e "${YELLOW}What is a Query?${NC}"
echo "  • A question or prediction market that voters can vote on"
echo "  • Has multiple possible outcomes"
echo "  • Rewards voters who vote correctly"
echo "  • Resolved after deadline passes"
echo ""

echo -e "${YELLOW}Decision Strategies:${NC}"
echo "  • Majority: Simple majority wins"
echo "  • WeightedByStake: Votes weighted by stake amount"
echo "  • WeightedByReputation: Votes weighted by reputation"
echo "  • Median: Median value (for numeric outcomes)"
echo ""

echo -e "${YELLOW}Requirements:${NC}"
echo "  • At least 2 outcomes"
echo "  • Reward amount for correct voters"
echo "  • Deadline for voting"
echo "  • Minimum number of votes"
echo ""

# ============================================================================
# Step 4: Collect Query Details
# ============================================================================
print_section "Step 4: Query Details"

# Get description
echo -e "${YELLOW}Enter query description:${NC}"
echo -e "${BLUE}  Example: Will it rain in San Francisco tomorrow?${NC}"
read -p "Description: " DESCRIPTION

if [ -z "$DESCRIPTION" ]; then
    print_error "Description cannot be empty"
    exit 1
fi

print_success "Description: ${DESCRIPTION}"

# Get outcomes
echo ""
echo -e "${YELLOW}Enter outcomes (comma-separated):${NC}"
echo -e "${BLUE}  Example: Yes,No${NC}"
echo -e "${BLUE}  Example: 0-10,11-20,21-30,31+${NC}"
read -p "Outcomes: " OUTCOMES_INPUT

if [ -z "$OUTCOMES_INPUT" ]; then
    print_error "Outcomes cannot be empty"
    exit 1
fi

# Convert comma-separated string to array
IFS=',' read -ra OUTCOMES_ARRAY <<< "$OUTCOMES_INPUT"

# Validate at least 2 outcomes
if [ ${#OUTCOMES_ARRAY[@]} -lt 2 ]; then
    print_error "At least 2 outcomes required"
    exit 1
fi

print_success "Outcomes: ${OUTCOMES_INPUT}"

# Get strategy
echo ""
echo -e "${YELLOW}Select decision strategy:${NC}"
echo "  1) Majority (simple majority)"
echo "  2) WeightedByStake (weighted by stake)"
echo "  3) WeightedByReputation (weighted by reputation)"
echo "  4) Median (median value)"
read -p "Strategy (1-4, default: 1): " STRATEGY_CHOICE

case $STRATEGY_CHOICE in
    2) STRATEGY="WeightedByStake" ;;
    3) STRATEGY="WeightedByReputation" ;;
    4) STRATEGY="Median" ;;
    *) STRATEGY="Majority" ;;
esac

print_success "Strategy: ${STRATEGY}"

# Get minimum votes
echo ""
echo -e "${YELLOW}Enter minimum votes required (default: ${DEFAULT_MIN_VOTES}):${NC}"
read -p "Min votes: " MIN_VOTES_INPUT
MIN_VOTES="${MIN_VOTES_INPUT:-$DEFAULT_MIN_VOTES}"

# Validate min votes is a number
if ! [[ "$MIN_VOTES" =~ ^[0-9]+$ ]]; then
    print_error "Invalid min votes: must be a positive integer"
    exit 1
fi

if [ "$MIN_VOTES" -lt 1 ]; then
    print_error "Min votes must be at least 1"
    exit 1
fi

print_success "Min votes: ${MIN_VOTES}"

# Get reward amount
echo ""
echo -e "${YELLOW}Enter reward amount (default: ${DEFAULT_REWARD}):${NC}"
read -p "Reward: " REWARD_INPUT
REWARD="${REWARD_INPUT:-$DEFAULT_REWARD}"

# Validate reward is a number
if ! [[ "$REWARD" =~ ^[0-9]+$ ]]; then
    print_error "Invalid reward: must be a positive integer"
    exit 1
fi

if [ "$REWARD" -lt 1 ]; then
    print_error "Reward must be greater than zero"
    exit 1
fi

print_success "Reward: ${REWARD} tokens"

# Get duration
echo ""
echo -e "${YELLOW}Enter voting duration in seconds (default: ${DEFAULT_DURATION}):${NC}"
echo -e "${BLUE}  Examples: 300 (5 min), 3600 (1 hour), 86400 (1 day)${NC}"
read -p "Duration: " DURATION_INPUT
DURATION="${DURATION_INPUT:-$DEFAULT_DURATION}"

# Validate duration is a number
if ! [[ "$DURATION" =~ ^[0-9]+$ ]]; then
    print_error "Invalid duration: must be a positive integer"
    exit 1
fi

if [ "$DURATION" -lt 60 ]; then
    print_error "Duration must be at least 60 seconds"
    exit 1
fi

print_success "Duration: ${DURATION} seconds"

# ============================================================================
# Step 5: Confirm Query Creation
# ============================================================================
print_section "Step 5: Confirm Query Creation"

echo -e "${CYAN}Query Summary:${NC}"
echo "  • Description: ${DESCRIPTION}"
echo "  • Outcomes: ${OUTCOMES_INPUT}"
echo "  • Strategy: ${STRATEGY}"
echo "  • Min Votes: ${MIN_VOTES}"
echo "  • Reward: ${REWARD} tokens"
echo "  • Duration: ${DURATION} seconds"
echo ""

read -p "Proceed with query creation? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Query creation cancelled."
    exit 0
fi

# ============================================================================
# Step 6: Create Query
# ============================================================================
print_section "Step 6: Creating Query"

# Build outcomes JSON array
OUTCOMES_JSON="["
for i in "${!OUTCOMES_ARRAY[@]}"; do
    OUTCOME=$(echo "${OUTCOMES_ARRAY[$i]}" | xargs) # trim whitespace
    if [ $i -gt 0 ]; then
        OUTCOMES_JSON="${OUTCOMES_JSON},"
    fi
    OUTCOMES_JSON="${OUTCOMES_JSON}\\\"${OUTCOME}\\\""
done
OUTCOMES_JSON="${OUTCOMES_JSON}]"

# Calculate deadline (current time + duration)
# Note: This is a simplified approach. In production, use proper timestamp calculation
CURRENT_TIME=$(date +%s)
DEADLINE_TIME=$((CURRENT_TIME + DURATION))
DEADLINE_MICROS=$((DEADLINE_TIME * 1000000))

print_info "Submitting query creation..."

# Build the operation JSON
OPERATION_JSON="{
  \"CreateQuery\": {
    \"description\": \"${DESCRIPTION}\",
    \"outcomes\": ${OUTCOMES_JSON},
    \"strategy\": \"${STRATEGY}\",
    \"min_votes\": ${MIN_VOTES},
    \"reward_amount\": \"${REWARD}\",
    \"deadline\": ${DEADLINE_MICROS}
  }
}"

# Submit via linera CLI
CREATE_RESULT=$(linera request-application "${REGISTRY_ID}" \
  --operation "${OPERATION_JSON}" 2>&1)

echo ""
echo "Creation Result:"
echo "${CREATE_RESULT}"
echo ""

# Check for errors
if echo "${CREATE_RESULT}" | grep -qi "error\|failed"; then
    print_error "Query creation failed"
    echo "Please check the error message above"
    exit 1
fi

print_success "Query creation submitted successfully!"

# Wait for query to process
print_info "Waiting for query to process..."
sleep 3

# ============================================================================
# Step 7: Verify Query Creation
# ============================================================================
print_section "Step 7: Verifying Query Creation"

# Query active queries
QUERIES_QUERY='{ activeQueries { id description outcomes strategy minVotes rewardAmount deadline } }'

QUERIES_INFO=$(curl -s -X POST "${REGISTRY_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"${QUERIES_QUERY}\"}")

echo "Active Queries:"
echo "${QUERIES_INFO}" | jq '.' 2>/dev/null || echo "${QUERIES_INFO}"
echo ""

# Check if query was created
if echo "${QUERIES_INFO}" | grep -q "\"description\":\"${DESCRIPTION}\""; then
    print_success "Query creation verified!"
else
    print_warning "Query pending (may take a few moments)"
fi

# ============================================================================
# Step 8: Display Next Steps
# ============================================================================
print_section "Step 8: Next Steps"

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Query Created! 🎉                                     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}Query Details:${NC}"
echo "  • Description: ${DESCRIPTION}"
echo "  • Outcomes: ${OUTCOMES_INPUT}"
echo "  • Strategy: ${STRATEGY}"
echo "  • Min Votes: ${MIN_VOTES}"
echo "  • Reward: ${REWARD} tokens"
echo "  • Duration: ${DURATION} seconds"
echo ""

echo -e "${CYAN}What Happens Next:${NC}"
echo "  1. Voters can now submit votes on this query"
echo "  2. After deadline, query can be resolved"
echo "  3. Correct voters receive rewards"
echo "  4. Incorrect voters may be slashed"
echo ""

echo -e "${CYAN}Useful Commands:${NC}"
echo ""

echo -e "${YELLOW}# View all active queries${NC}"
echo "curl -X POST \"${REGISTRY_ENDPOINT}\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"query\": \"{ activeQueries { id description outcomes deadline } }\"}'"
echo ""

echo -e "${YELLOW}# View specific query details${NC}"
echo "curl -X POST \"${REGISTRY_ENDPOINT}\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"query\": \"{ query(id: QUERY_ID) { description outcomes votes { voter value confidence } } }\"}'"
echo ""

echo -e "${YELLOW}# Submit a vote (as a registered voter)${NC}"
echo "curl -X POST \"${REGISTRY_ENDPOINT}\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"query\": \"mutation { submitVote(queryId: QUERY_ID, value: \\\"OUTCOME\\\", confidence: 90) }\"}'"
echo ""

echo -e "${YELLOW}# Resolve query (after deadline)${NC}"
echo "curl -X POST \"${REGISTRY_ENDPOINT}\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"query\": \"mutation { resolveQuery(queryId: QUERY_ID) }\"}'"
echo ""

echo -e "${CYAN}Tips:${NC}"
echo "  • Voters need to be registered to vote"
echo "  • Votes can only be submitted before deadline"
echo "  • Query can be resolved after deadline passes"
echo "  • Rewards are distributed upon resolution"
echo ""

echo -e "${GREEN}Happy querying! 🔮${NC}"
echo ""

# Save query info to file
QUERY_INFO_FILE=".query-info-$(date +%Y%m%d-%H%M%S).txt"
cat > "$QUERY_INFO_FILE" << EOF
# Query Creation Info
# Created: $(date)

Registry ID: ${REGISTRY_ID}
Chain ID: ${CHAIN_ID}
Description: ${DESCRIPTION}
Outcomes: ${OUTCOMES_INPUT}
Strategy: ${STRATEGY}
Min Votes: ${MIN_VOTES}
Reward: ${REWARD}
Duration: ${DURATION} seconds

Registry Endpoint: ${REGISTRY_ENDPOINT}

# Quick Commands
export REGISTRY_ENDPOINT="${REGISTRY_ENDPOINT}"

# View active queries
alias view-queries='curl -s -X POST "\${REGISTRY_ENDPOINT}" -H "Content-Type: application/json" -d '"'"'{"query": "{ activeQueries { id description outcomes } }"}'"'"' | jq'

# View query statistics
alias query-stats='curl -s -X POST "\${REGISTRY_ENDPOINT}" -H "Content-Type: application/json" -d '"'"'{"query": "{ statistics { totalQueries activeQueries resolvedQueries } }"}'"'"' | jq'
EOF

print_success "Query info saved to: ${QUERY_INFO_FILE}"
echo ""

exit 0
