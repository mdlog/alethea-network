#!/bin/bash

# Script to process all inboxes after staking operation
# This ensures all cross-chain messages are processed

set -e

# Get environment variables
source alethea-contract/alethea-token/.env.local 2>/dev/null || true

# Default values if not set
USER_CHAIN_ID="${USER_CHAIN_ID:-ce18260eea4fcbc1fa29da51a92e48d71eaf77513f6eec9b933e5b2f9f94732f}"
TOKEN_CHAIN_ID="${TOKEN_CHAIN_ID:-ce18260eea4fcbc1fa29da51a92e48d71eaf77513f6eec9b933e5b2f9f94732f}"
REGISTRY_CHAIN_ID="${REGISTRY_CHAIN_ID:-ce18260eea4fcbc1fa29da51a92e48d71eaf77513f6eec9b933e5b2f9f94732f}"

echo "═══════════════════════════════════════════════════════════"
echo "Processing All Inboxes After Staking"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Function to process inbox with retries
process_inbox() {
    local chain_id=$1
    local chain_name=$2
    local max_retries=3
    
    echo "📥 Processing $chain_name inbox..."
    echo "   Chain ID: $chain_id"
    
    for i in $(seq 1 $max_retries); do
        echo "   Attempt $i/$max_retries..."
        
        if linera sync-balance --wait-for-outgoing-messages 2>&1 | grep -q "Synchronized"; then
            echo "   ✅ Inbox processed successfully"
            return 0
        fi
        
        if [ $i -lt $max_retries ]; then
            echo "   ⚠️ Retrying in 2 seconds..."
            sleep 2
        fi
    done
    
    echo "   ⚠️ Failed to process inbox after $max_retries attempts"
    return 1
}

# Step 1: Process user chain inbox
echo "Step 1: User Chain"
process_inbox "$USER_CHAIN_ID" "User"
echo ""

# Step 2: Process token chain inbox
echo "Step 2: Token Chain"
process_inbox "$TOKEN_CHAIN_ID" "Token"
echo ""

# Step 3: Process registry chain inbox
echo "Step 3: Registry Chain"
process_inbox "$REGISTRY_CHAIN_ID" "Registry"
echo ""

# Step 4: Process user chain again to see updated balance
echo "Step 4: User Chain (Final)"
process_inbox "$USER_CHAIN_ID" "User"
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "✅ All inboxes processed!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Now check your balance:"
echo "  1. Refresh the dashboard (Ctrl+Shift+R)"
echo "  2. Click the refresh button next to balance"
echo "  3. Check Profile page for updated stake"
echo ""
