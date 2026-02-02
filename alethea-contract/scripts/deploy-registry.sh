#!/bin/bash
# Copyright (c) Alethea Network
# SPDX-License-Identifier: MIT

# Oracle Registry Deployment Script
# This script deploys the canonical Oracle Registry to Linera testnet

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGISTRY_DIR="oracle-registry-v2"
BUILD_DIR="target/wasm32-unknown-unknown/release"
WASM_FILE="oracle_registry.wasm"
DEPLOYMENT_LOG="deployment-registry.log"

# Default protocol parameters
MIN_STAKE="${MIN_STAKE:-1000}"
MIN_VOTERS_PER_MARKET="${MIN_VOTERS_PER_MARKET:-3}"
MAX_VOTERS_PER_MARKET="${MAX_VOTERS_PER_MARKET:-50}"
COMMIT_PHASE_DURATION="${COMMIT_PHASE_DURATION:-3600}"
REVEAL_PHASE_DURATION="${REVEAL_PHASE_DURATION:-3600}"
BASE_MARKET_FEE="${BASE_MARKET_FEE:-10}"
PROTOCOL_FEE_PERCENTAGE="${PROTOCOL_FEE_PERCENTAGE:-10}"
SLASH_PERCENTAGE="${SLASH_PERCENTAGE:-10}"
MIN_REPUTATION="${MIN_REPUTATION:-20}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Alethea Oracle Registry Deployment${NC}"
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

# Check if linera CLI is installed
if ! command -v linera &> /dev/null; then
    print_error "linera CLI not found. Please install Linera SDK first."
    exit 1
fi
print_status "Linera CLI found"

# Check if we're in the right directory
if [ ! -d "$REGISTRY_DIR" ]; then
    print_error "Registry directory not found. Please run from project root."
    exit 1
fi
print_status "Project structure verified"

# Step 1: Build the WASM binary
echo ""
print_info "Step 1: Building Oracle Registry WASM binary..."
echo ""

cargo build --release --target wasm32-unknown-unknown --package oracle-registry

if [ ! -f "$BUILD_DIR/$WASM_FILE" ]; then
    print_error "WASM build failed. Binary not found at $BUILD_DIR/$WASM_FILE"
    exit 1
fi
print_status "WASM binary built successfully"

# Get binary size
BINARY_SIZE=$(du -h "$BUILD_DIR/$WASM_FILE" | cut -f1)
print_info "Binary size: $BINARY_SIZE"

# Step 2: Prepare deployment parameters
echo ""
print_info "Step 2: Preparing deployment parameters..."
echo ""

cat << EOF
Protocol Parameters:
  - Min Stake: $MIN_STAKE tokens
  - Min Voters Per Market: $MIN_VOTERS_PER_MARKET
  - Max Voters Per Market: $MAX_VOTERS_PER_MARKET
  - Commit Phase Duration: $COMMIT_PHASE_DURATION seconds
  - Reveal Phase Duration: $REVEAL_PHASE_DURATION seconds
  - Base Market Fee: $BASE_MARKET_FEE tokens
  - Protocol Fee Percentage: $PROTOCOL_FEE_PERCENTAGE%
  - Slash Percentage: $SLASH_PERCENTAGE%
  - Min Reputation: $MIN_REPUTATION
EOF

echo ""
read -p "Continue with these parameters? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Deployment cancelled by user"
    exit 0
fi

# Step 3: Deploy to Linera
echo ""
print_info "Step 3: Deploying to Linera..."
echo ""

# Create parameters JSON
PARAMS_JSON=$(cat <<EOF
{
  "min_stake": "$MIN_STAKE",
  "min_voters_per_market": $MIN_VOTERS_PER_MARKET,
  "max_voters_per_market": $MAX_VOTERS_PER_MARKET,
  "commit_phase_duration": $COMMIT_PHASE_DURATION,
  "reveal_phase_duration": $REVEAL_PHASE_DURATION,
  "base_market_fee": "$BASE_MARKET_FEE",
  "protocol_fee_percentage": $PROTOCOL_FEE_PERCENTAGE,
  "slash_percentage": $SLASH_PERCENTAGE,
  "min_reputation": $MIN_REPUTATION
}
EOF
)

print_info "Deploying contract..."

# Deploy the contract
DEPLOY_OUTPUT=$(linera publish-and-create \
    --bytecode "$BUILD_DIR/$WASM_FILE" \
    --parameters "$PARAMS_JSON" \
    2>&1 | tee -a "$DEPLOYMENT_LOG")

# Extract Application ID from output
APP_ID=$(echo "$DEPLOY_OUTPUT" | grep -oP 'Application ID: \K[a-f0-9]+' || echo "")

if [ -z "$APP_ID" ]; then
    print_error "Failed to extract Application ID from deployment output"
    print_info "Check $DEPLOYMENT_LOG for details"
    exit 1
fi

print_status "Contract deployed successfully"
echo ""

# Step 4: Record canonical Application ID
echo ""
print_info "Step 4: Recording canonical Application ID..."
echo ""

# Create deployment info file
DEPLOYMENT_INFO="deployment-info.json"
cat > "$DEPLOYMENT_INFO" << EOF
{
  "registry_application_id": "$APP_ID",
  "deployment_timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "network": "testnet",
  "parameters": $PARAMS_JSON,
  "binary_size": "$BINARY_SIZE",
  "deployer": "$(whoami)"
}
EOF

print_status "Deployment info saved to $DEPLOYMENT_INFO"

# Update constants file
CONSTANTS_FILE="alethea-oracle-types/src/constants.rs"
if [ -f "$CONSTANTS_FILE" ]; then
    print_info "Updating constants file with canonical registry ID..."
    
    # Backup original
    cp "$CONSTANTS_FILE" "${CONSTANTS_FILE}.bak"
    
    # Update the CANONICAL_REGISTRY_ID
    sed -i "s/pub const CANONICAL_REGISTRY_ID: &str = \".*\";/pub const CANONICAL_REGISTRY_ID: &str = \"$APP_ID\";/" "$CONSTANTS_FILE"
    
    print_status "Constants file updated"
else
    print_warning "Constants file not found at $CONSTANTS_FILE"
    print_info "Please manually update CANONICAL_REGISTRY_ID to: $APP_ID"
fi

# Step 5: Verify deployment
echo ""
print_info "Step 5: Verifying deployment..."
echo ""

# Query the deployed contract
print_info "Querying contract state..."
QUERY_OUTPUT=$(linera query-application "$APP_ID" 2>&1 || echo "Query failed")

if [[ "$QUERY_OUTPUT" == *"Query failed"* ]]; then
    print_warning "Could not verify contract state"
    print_info "Contract may still be initializing"
else
    print_status "Contract is responding to queries"
fi

# Step 6: Display summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Successful!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Canonical Registry Application ID:${NC}"
echo -e "${GREEN}$APP_ID${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Share this Application ID with dApp developers"
echo "2. Deploy voter applications using: ./scripts/deploy-voter.sh $APP_ID"
echo "3. Update your dApps to use this registry ID"
echo ""
echo -e "${BLUE}Deployment Details:${NC}"
echo "- Deployment log: $DEPLOYMENT_LOG"
echo "- Deployment info: $DEPLOYMENT_INFO"
echo "- Binary: $BUILD_DIR/$WASM_FILE"
echo ""
echo -e "${YELLOW}IMPORTANT:${NC} Save the Application ID above!"
echo "This is the canonical registry ID that all dApps and voters will use."
echo ""

# Save to environment file
ENV_FILE=".env.registry"
cat > "$ENV_FILE" << EOF
# Alethea Oracle Registry
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

ALETHEA_REGISTRY_ID=$APP_ID
ALETHEA_NETWORK=testnet
EOF

print_status "Environment file created: $ENV_FILE"
echo ""
print_info "You can source this file in your shell: source $ENV_FILE"
echo ""

exit 0
