#!/bin/bash

# ============================================================================
# Account-Based Voting Script
# Submit votes on queries/markets in the account-based oracle registry
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
DEFAULT_CONFIDENCE="90"

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     Account-Based Voting                                   ║${NC}"
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
# Step 3: Display Active Queries
# ============================================================================
print_section "Step 3: Viewing Active Queries"

echo -e "${YELLOW}Fetching active queries...${NC}"
echo ""

# Query active queries
QUERIES_QUERY='{ activeQueries { id description outcomes strategy minVotes voteCount timeRemaining deadline } }'

QUERIES_RESULT=$(curl -s -X POST "${REGISTRY_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"${QUERIES_QUERY}\"}")

# Check for errors
if echo "${QUERIES_RESULT}" | grep -q "error\|Error"; then
    print_error "Failed to fetch active queries"
    echo "${QUERIES_RESULT}"
    exit 1
fi

# Parse and display queries
QUERIES_DATA=$(echo "${QUERIES_RESULT}" | jq -r '.data.activeQueries // []')
QUERY_COUNT=$(echo "${QUERIES_DATA}" | jq 'length')

if [ "$QUERY_COUNT" -eq 0 ]; then
    print_warning "No active queries found"
    echo ""
    echo "You can create a query using:"
    echo "  ./scripts/create-query-account-based.sh"
    exit 0
fi

print_success "Found ${QUERY_COUNT} active queries"
echo ""

# Display queries in a formatted table
echo -e "${CYAN}Active Queries:${NC}"
echo ""

for i in $(seq 0 $((QUERY_COUNT - 1))); do
    QUERY=$(echo "${QUERIES_DATA}" | jq ".[$i]")
    
    QUERY_ID=$(echo "$QUERY" | jq -r '.id')
    DESCRIPTION=$(echo "$QUERY" | jq -r '.description')
    OUTCOMES=$(echo "$QUERY" | jq -r '.outcomes | join(", ")')
    STRATEGY=$(echo "$QUERY" | jq -r '.strategy')
    MIN_VOTES=$(echo "$QUERY" | jq -r '.minVotes')
    VOTE_COUNT=$(echo "$QUERY" | jq -r '.voteCount')
    TIME_REMAINING=$(echo "$QUERY" | jq -r '.timeRemaining')
    
    # Convert time remaining to human readable format
    if [ "$TIME_REMAINING" -gt 0 ]; then
        HOURS=$((TIME_REMAINING / 3600))
        MINUTES=$(((TIME_REMAINING % 3600) / 60))
        SECONDS=$((TIME_REMAINING % 60))
        TIME_STR="${HOURS}h ${MINUTES}m ${SECONDS}s"
    else
        TIME_STR="Expired"
    fi
    
    echo -e "${GREEN}Query #${QUERY_ID}${NC}"
    echo "  Description: ${DESCRIPTION}"
    echo "  Outcomes: ${OUTCOMES}"
    echo "  Strategy: ${STRATEGY}"
    echo "  Votes: ${VOTE_COUNT}/${MIN_VOTES} (minimum)"
    echo "  Time Remaining: ${TIME_STR}"
    echo ""
done

# ============================================================================
# Step 4: Select Query to Vote On
# ============================================================================
print_section "Step 4: Select Query"

echo -e "${YELLOW}Enter the Query ID you want to vote on:${NC}"
read -p "Query ID: " QUERY_ID_INPUT

# Validate query ID is a number
if ! [[ "$QUERY_ID_INPUT" =~ ^[0-9]+$ ]]; then
    print_error "Invalid query ID: must be a positive integer"
    exit 1
fi

QUERY_ID="$QUERY_ID_INPUT"

# Fetch the specific query details
QUERY_DETAIL_QUERY="{ query(id: ${QUERY_ID}) { id description outcomes strategy minVotes voteCount timeRemaining status } }"

QUERY_DETAIL_RESULT=$(curl -s -X POST "${REGISTRY_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"${QUERY_DETAIL_QUERY}\"}")

# Check if query exists
QUERY_DATA=$(echo "${QUERY_DETAIL_RESULT}" | jq -r '.data.query')

if [ "$QUERY_DATA" == "null" ]; then
    print_error "Query #${QUERY_ID} not found"
    exit 1
fi

# Extract query details
DESCRIPTION=$(echo "$QUERY_DATA" | jq -r '.description')
OUTCOMES_JSON=$(echo "$QUERY_DATA" | jq -r '.outcomes')
STRATEGY=$(echo "$QUERY_DATA" | jq -r '.strategy')
STATUS=$(echo "$QUERY_DATA" | jq -r '.status')
TIME_REMAINING=$(echo "$QUERY_DATA" | jq -r '.timeRemaining')

# Check if query is active
if [ "$STATUS" != "Active" ]; then
    print_error "Query #${QUERY_ID} is not active (status: ${STATUS})"
    exit 1
fi

# Check if deadline has passed
if [ "$TIME_REMAINING" -le 0 ]; then
    print_error "Query #${QUERY_ID} has expired"
    exit 1
fi

print_success "Query #${QUERY_ID}: ${DESCRIPTION}"
echo ""

# ============================================================================
# Step 5: Select Outcome
# ============================================================================
print_section "Step 5: Select Your Vote"

echo -e "${CYAN}Query: ${DESCRIPTION}${NC}"
echo ""
echo -e "${YELLOW}Available Outcomes:${NC}"

# Parse outcomes array
OUTCOMES_ARRAY=$(echo "$OUTCOMES_JSON" | jq -r '.[]')
OUTCOME_COUNT=$(echo "$OUTCOMES_JSON" | jq 'length')

# Display outcomes with numbers
i=1
while IFS= read -r outcome; do
    echo "  ${i}) ${outcome}"
    i=$((i + 1))
done <<< "$OUTCOMES_ARRAY"

echo ""
echo -e "${YELLOW}Select your vote (enter number or outcome text):${NC}"
read -p "Vote: " VOTE_INPUT

# Check if input is a number (outcome index)
if [[ "$VOTE_INPUT" =~ ^[0-9]+$ ]]; then
    # User entered a number - get the outcome at that index
    OUTCOME_INDEX=$((VOTE_INPUT - 1))
    
    if [ "$OUTCOME_INDEX" -lt 0 ] || [ "$OUTCOME_INDEX" -ge "$OUTCOME_COUNT" ]; then
        print_error "Invalid outcome number: must be between 1 and ${OUTCOME_COUNT}"
        exit 1
    fi
    
    VOTE_VALUE=$(echo "$OUTCOMES_JSON" | jq -r ".[$OUTCOME_INDEX]")
else
    # User entered text - validate it's a valid outcome
    VOTE_VALUE="$VOTE_INPUT"
    
    # Check if the outcome exists in the list
    if ! echo "$OUTCOMES_JSON" | jq -e --arg vote "$VOTE_VALUE" 'index($vote) != null' > /dev/null; then
        print_error "Invalid outcome: '${VOTE_VALUE}' is not in the list of valid outcomes"
        exit 1
    fi
fi

print_success "Selected outcome: ${VOTE_VALUE}"

# ============================================================================
# Step 6: Set Confidence Level
# ============================================================================
print_section "Step 6: Set Confidence Level"

echo -e "${YELLOW}How confident are you in this vote? (0-100)${NC}"
echo -e "${BLUE}  Higher confidence may affect your reputation more${NC}"
echo -e "${BLUE}  Default: ${DEFAULT_CONFIDENCE}${NC}"
read -p "Confidence: " CONFIDENCE_INPUT

CONFIDENCE="${CONFIDENCE_INPUT:-$DEFAULT_CONFIDENCE}"

# Validate confidence is a number
if ! [[ "$CONFIDENCE" =~ ^[0-9]+$ ]]; then
    print_error "Invalid confidence: must be a positive integer"
    exit 1
fi

# Validate confidence range
if [ "$CONFIDENCE" -lt 0 ] || [ "$CONFIDENCE" -gt 100 ]; then
    print_error "Invalid confidence: must be between 0 and 100"
    exit 1
fi

print_success "Confidence: ${CONFIDENCE}%"

# ============================================================================
# Step 7: Confirm Vote
# ============================================================================
print_section "Step 7: Confirm Vote"

echo -e "${CYAN}Vote Summary:${NC}"
echo "  • Query ID: ${QUERY_ID}"
echo "  • Description: ${DESCRIPTION}"
echo "  • Your Vote: ${VOTE_VALUE}"
echo "  • Confidence: ${CONFIDENCE}%"
echo "  • Strategy: ${STRATEGY}"
echo ""

echo -e "${YELLOW}Important:${NC}"
echo "  • Your vote is final and cannot be changed"
echo "  • Incorrect votes may result in reputation loss"
echo "  • Correct votes earn rewards and increase reputation"
echo ""

read -p "Submit this vote? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Vote cancelled."
    exit 0
fi

# ============================================================================
# Step 8: Submit Vote
# ============================================================================
print_section "Step 8: Submitting Vote"

print_info "Submitting vote to registry..."

# Build the operation JSON
OPERATION_JSON="{
  \"SubmitVote\": {
    \"query_id\": ${QUERY_ID},
    \"value\": \"${VOTE_VALUE}\",
    \"confidence\": ${CONFIDENCE}
  }
}"

# Submit via linera CLI
VOTE_RESULT=$(linera request-application "${REGISTRY_ID}" \
  --operation "${OPERATION_JSON}" 2>&1)

echo ""
echo "Vote Result:"
echo "${VOTE_RESULT}"
echo ""

# Check for errors
if echo "${VOTE_RESULT}" | grep -qi "error\|failed"; then
    print_error "Vote submission failed"
    echo "Please check the error message above"
    
    # Provide helpful error messages
    if echo "${VOTE_RESULT}" | grep -qi "not registered"; then
        echo ""
        echo "You need to register as a voter first:"
        echo "  ./scripts/onboard-voter-account-based.sh"
    elif echo "${VOTE_RESULT}" | grep -qi "already voted"; then
        echo ""
        echo "You have already voted on this query."
    elif echo "${VOTE_RESULT}" | grep -qi "insufficient stake"; then
        echo ""
        echo "You need to increase your stake:"
        echo "  Use the updateStake mutation"
    fi
    
    exit 1
fi

print_success "Vote submitted successfully!"

# Wait for vote to process
print_info "Waiting for vote to process..."
sleep 3

# ============================================================================
# Step 9: Verify Vote
# ============================================================================
print_section "Step 9: Verifying Vote"

# Query the query details again to see updated vote count
VERIFY_QUERY="{ query(id: ${QUERY_ID}) { id description voteCount minVotes status } }"

VERIFY_RESULT=$(curl -s -X POST "${REGISTRY_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"${VERIFY_QUERY}\"}")

echo "Query Status:"
echo "${VERIFY_RESULT}" | jq '.' 2>/dev/null || echo "${VERIFY_RESULT}"
echo ""

# Extract vote count
NEW_VOTE_COUNT=$(echo "${VERIFY_RESULT}" | jq -r '.data.query.voteCount // 0')
MIN_VOTES=$(echo "${VERIFY_RESULT}" | jq -r '.data.query.minVotes // 0')
QUERY_STATUS=$(echo "${VERIFY_RESULT}" | jq -r '.data.query.status // "Unknown"')

if [ "$NEW_VOTE_COUNT" -gt 0 ]; then
    print_success "Vote recorded! (${NEW_VOTE_COUNT}/${MIN_VOTES} votes)"
    
    if [ "$QUERY_STATUS" == "Resolved" ]; then
        print_success "Query has been resolved!"
    elif [ "$NEW_VOTE_COUNT" -ge "$MIN_VOTES" ]; then
        print_info "Query has enough votes and may be resolved soon"
    else
        VOTES_NEEDED=$((MIN_VOTES - NEW_VOTE_COUNT))
        print_info "${VOTES_NEEDED} more vote(s) needed for resolution"
    fi
else
    print_warning "Vote pending (may take a few moments)"
fi

# ============================================================================
# Step 10: Display Next Steps
# ============================================================================
print_section "Step 10: Next Steps"

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Vote Submitted! 🗳️                                     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}Your Vote:${NC}"
echo "  • Query ID: ${QUERY_ID}"
echo "  • Description: ${DESCRIPTION}"
echo "  • Your Vote: ${VOTE_VALUE}"
echo "  • Confidence: ${CONFIDENCE}%"
echo ""

echo -e "${CYAN}What Happens Next:${NC}"
echo "  1. Your vote is recorded on the blockchain"
echo "  2. Other voters can submit their votes"
echo "  3. After deadline or minimum votes, query is resolved"
echo "  4. If you voted correctly, you earn rewards"
echo "  5. Your reputation is updated based on accuracy"
echo ""

echo -e "${CYAN}Useful Commands:${NC}"
echo ""

echo -e "${YELLOW}# Check query status${NC}"
echo "curl -X POST \"${REGISTRY_ENDPOINT}\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"query\": \"{ query(id: ${QUERY_ID}) { id description status result voteCount } }\"}'"
echo ""

echo -e "${YELLOW}# Check your voter info${NC}"
echo "curl -X POST \"${REGISTRY_ENDPOINT}\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"query\": \"{ myVoterInfo { stake reputation totalVotes correctVotes accuracyPercentage } }\"}'"
echo ""

echo -e "${YELLOW}# Check pending rewards${NC}"
echo "curl -X POST \"${REGISTRY_ENDPOINT}\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"query\": \"{ myPendingRewards }\"}'"
echo ""

echo -e "${YELLOW}# View other active queries${NC}"
echo "curl -X POST \"${REGISTRY_ENDPOINT}\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"query\": \"{ activeQueries { id description outcomes timeRemaining } }\"}'"
echo ""

echo -e "${YELLOW}# Claim rewards (after query resolution)${NC}"
echo "curl -X POST \"${REGISTRY_ENDPOINT}\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"query\": \"mutation { claimRewards }\"}'"
echo ""

echo -e "${CYAN}Tips:${NC}"
echo "  • Vote accurately to build reputation"
echo "  • Higher reputation increases your voting weight"
echo "  • Check query status regularly"
echo "  • Claim rewards after queries are resolved"
echo "  • Vote on multiple queries to maximize earnings"
echo ""

echo -e "${GREEN}Happy voting! 🎯${NC}"
echo ""

# Save vote info to file
VOTE_INFO_FILE=".vote-info-$(date +%Y%m%d-%H%M%S).txt"
cat > "$VOTE_INFO_FILE" << EOF
# Vote Submission Info
# Submitted: $(date)

Registry ID: ${REGISTRY_ID}
Chain ID: ${CHAIN_ID}
Query ID: ${QUERY_ID}
Description: ${DESCRIPTION}
Vote: ${VOTE_VALUE}
Confidence: ${CONFIDENCE}%

Registry Endpoint: ${REGISTRY_ENDPOINT}

# Quick Commands
export REGISTRY_ENDPOINT="${REGISTRY_ENDPOINT}"
export QUERY_ID="${QUERY_ID}"

# Check query status
alias check-query='curl -s -X POST "\${REGISTRY_ENDPOINT}" -H "Content-Type: application/json" -d '"'"'{"query": "{ query(id: '\${QUERY_ID}') { id description status result voteCount } }"}'"'"' | jq'

# Check voter info
alias check-voter='curl -s -X POST "\${REGISTRY_ENDPOINT}" -H "Content-Type: application/json" -d '"'"'{"query": "{ myVoterInfo { stake reputation totalVotes correctVotes accuracyPercentage } }"}'"'"' | jq'

# Check rewards
alias check-rewards='curl -s -X POST "\${REGISTRY_ENDPOINT}" -H "Content-Type: application/json" -d '"'"'{"query": "{ myPendingRewards }"}'"'"' | jq'
EOF

print_success "Vote info saved to: ${VOTE_INFO_FILE}"
echo ""

exit 0
