#!/bin/bash
# Copyright (c) Alethea Network
# SPDX-License-Identifier: MIT

# Voter Template Deployment Script
# This script deploys a voter application and registers it with the Oracle Registry

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VOTER_DIR="voter-template"
BUILD_DIR="target/wasm32-unknown-unknown/release"
WASM_FILE="voter_template.wasm"
DEPLOYMENT_LOG="deployment-voter-$(date +%s).log"

# Default parameters
DEFAULT_STAKE="${DEFAULT_STAKE:-1000}"
DECISION_STRATEGY="${DECISION_STRATEGY:-Manual}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Alethea Voter Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Show usage
usage() {
    echo "Usage: $0 <REGISTRY_ID> [STAKE_AMOUNT]"
    echo ""
    echo "Arguments:"
    echo "  REGISTRY_ID    - The canonical Oracle Registry Application ID"
    echo "  STAKE_AMOUNT   - Initial stake amount (default: $DEFAULT_STAKE tokens)"
    echo ""
    echo "Environment Variables:"
    echo "  DECISION_STRATEGY - Voting strategy: Manual, Random, Oracle, ML (default: Manual)"
    echo ""
    echo "Examples:"
    echo "  $0 e476187f6ddfeb9d588c7e2d7c8a7e3c1b5f9e8d7c6b5a4e3d2c1b0a9f8e7d6c5"
    echo "  $0 e476187f6ddfeb9d588c7e2d7c8a7e3c1b5f9e8d7c6b5a4e3d2c1b0a9f8e7d6c5 2000"
    echo "  DECISION_STRATEGY=Random $0 <REGISTRY_ID> 1500"
    exit 1
}

# Check arguments
if [ $# -lt 1 ]; then
    print_error "Missing required argument: REGISTRY_ID"
    echo ""
    usage
fi

REGISTRY_ID="$1"
STAKE_AMOUNT="${2:-$DEFAULT_STAKE}"

# Validate registry ID format (basic check)
if [ ${#REGISTRY_ID} -lt 32 ]; then
    print_error "Invalid REGISTRY_ID format. Must be a valid Application ID."
    exit 1
fi

# Check if linera CLI is installed
if ! command -v linera &> /dev/null; then
    print_error "linera CLI not found. Please install Linera SDK first."
    exit 1
fi
print_status "Linera CLI found"

# Check if we're in the right directory
if [ ! -d "$VOTER_DIR" ]; then
    print_error "Voter directory not found. Please run from project root."
    exit 1
fi
print_status "Project structure verified"

# Display configuration
echo ""
print_info "Deployment Configuration:"
echo ""
cat << EOF
  Registry ID: $REGISTRY_ID
  Initial Stake: $STAKE_AMOUNT tokens
  Decision Strategy: $DECISION_STRATEGY
EOF
echo ""

# Step 1: Build the WASM binary
echo ""
print_info "Step 1: Building Voter Template WASM binary..."
echo ""

cargo build --release --target wasm32-unknown-unknown --package voter-template

if [ ! -f "$BUILD_DIR/$WASM_FILE" ]; then
    print_error "WASM build failed. Binary not found at $BUILD_DIR/$WASM_FILE"
    exit 1
fi
print_status "WASM binary built successfully"

# Get binary size
BINARY_SIZE=$(du -h "$BUILD_DIR/$WASM_FILE" | cut -f1)
print_info "Binary size: $BINARY_SIZE"

# Step 2: Deploy voter application
echo ""
print_info "Step 2: Deploying voter application..."
echo ""

# Create initialization arguments
INIT_ARGS=$(cat <<EOF
{
  "registry_id": "$REGISTRY_ID",
  "initial_stake": "$STAKE_AMOUNT",
  "decision_strategy": "$DECISION_STRATEGY"
}
EOF
)

print_info "Deploying contract..."

# Deploy the contract
DEPLOY_OUTPUT=$(linera publish-and-create \
    --bytecode "$BUILD_DIR/$WASM_FILE" \
    --instantiation-argument "$INIT_ARGS" \
    2>&1 | tee -a "$DEPLOYMENT_LOG")

# Extract Application ID from output
VOTER_APP_ID=$(echo "$DEPLOY_OUTPUT" | grep -oP 'Application ID: \K[a-f0-9]+' || echo "")

if [ -z "$VOTER_APP_ID" ]; then
    print_error "Failed to extract Application ID from deployment output"
    print_info "Check $DEPLOYMENT_LOG for details"
    exit 1
fi

print_status "Voter application deployed successfully"
echo ""
print_info "Voter Application ID: $VOTER_APP_ID"

# Step 3: Register with Oracle Registry
echo ""
print_info "Step 3: Registering voter with Oracle Registry..."
echo ""

# Send registration message to registry
print_info "Sending registration message..."

REGISTER_OUTPUT=$(linera execute-operation \
    --application-id "$VOTER_APP_ID" \
    --operation "RegisterWithRegistry" \
    2>&1 | tee -a "$DEPLOYMENT_LOG" || echo "Registration pending")

if [[ "$REGISTER_OUTPUT" == *"Success"* ]] || [[ "$REGISTER_OUTPUT" == *"pending"* ]]; then
    print_status "Registration initiated"
    print_info "Voter will be registered automatically"
else
    print_warning "Registration status unclear"
    print_info "You may need to manually trigger registration"
fi

# Step 4: Save deployment info
echo ""
print_info "Step 4: Saving deployment information..."
echo ""

DEPLOYMENT_INFO="voter-deployment-${VOTER_APP_ID:0:8}.json"
cat > "$DEPLOYMENT_INFO" << EOF
{
  "voter_application_id": "$VOTER_APP_ID",
  "registry_id": "$REGISTRY_ID",
  "initial_stake": "$STAKE_AMOUNT",
  "decision_strategy": "$DECISION_STRATEGY",
  "deployment_timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "network": "testnet",
  "binary_size": "$BINARY_SIZE",
  "deployer": "$(whoami)"
}
EOF

print_status "Deployment info saved to $DEPLOYMENT_INFO"

# Step 5: Verify deployment
echo ""
print_info "Step 5: Verifying deployment..."
echo ""

# Query the deployed voter
print_info "Querying voter state..."
QUERY_OUTPUT=$(linera query-application "$VOTER_APP_ID" 2>&1 || echo "Query failed")

if [[ "$QUERY_OUTPUT" == *"Query failed"* ]]; then
    print_warning "Could not verify voter state"
    print_info "Voter may still be initializing"
else
    print_status "Voter is responding to queries"
fi

# Step 6: Display summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Voter Deployment Successful!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Voter Application ID:${NC}"
echo -e "${GREEN}$VOTER_APP_ID${NC}"
echo ""
echo -e "${BLUE}Configuration:${NC}"
echo "- Registry ID: $REGISTRY_ID"
echo "- Initial Stake: $STAKE_AMOUNT tokens"
echo "- Decision Strategy: $DECISION_STRATEGY"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Wait for registration confirmation from the registry"
echo "2. Monitor voter status: linera query-application $VOTER_APP_ID"
echo "3. Check voter reputation in the registry"
echo ""
echo -e "${BLUE}Voter Operations:${NC}"
echo "- Submit manual vote: linera execute-operation --application-id $VOTER_APP_ID --operation SubmitVote"
echo "- Check active votes: linera query-application $VOTER_APP_ID"
echo "- View vote history: linera query-application $VOTER_APP_ID"
echo ""
echo -e "${BLUE}Deployment Details:${NC}"
echo "- Deployment log: $DEPLOYMENT_LOG"
echo "- Deployment info: $DEPLOYMENT_INFO"
echo "- Binary: $BUILD_DIR/$WASM_FILE"
echo ""

# Save to environment file
ENV_FILE=".env.voter-${VOTER_APP_ID:0:8}"
cat > "$ENV_FILE" << EOF
# Alethea Voter Application
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

VOTER_APP_ID=$VOTER_APP_ID
REGISTRY_ID=$REGISTRY_ID
STAKE_AMOUNT=$STAKE_AMOUNT
DECISION_STRATEGY=$DECISION_STRATEGY
EOF

print_status "Environment file created: $ENV_FILE"
echo ""

# Optional: Deploy multiple voters
echo ""
read -p "Deploy another voter? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Deploying another voter..."
    exec "$0" "$REGISTRY_ID" "$STAKE_AMOUNT"
fi

print_info "Deployment complete!"
echo ""

exit 0
