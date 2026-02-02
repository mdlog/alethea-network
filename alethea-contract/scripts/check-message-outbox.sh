#!/bin/bash

# Check if messages are in Market chain's outbox
# This verifies if messages were actually sent

set -e

MARKET_CHAIN_ID="${1:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"
REGISTRY_CHAIN_ID="${2:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"

echo "Checking outbox for Market chain..."
echo "Market Chain: ${MARKET_CHAIN_ID:0:16}..."
echo "Registry Chain: ${REGISTRY_CHAIN_ID:0:16}..."
echo ""

# Use linera CLI to check outbox
echo "Checking outbox status..."
linera show-chain "$MARKET_CHAIN_ID" 2>&1 | grep -i "outbox\|message" || echo "No outbox info found"

echo ""
echo "To check inbox on Registry chain:"
echo "  linera show-chain $REGISTRY_CHAIN_ID"
