#!/bin/bash

# Quick redeploy using existing working script
# This just calls the existing deploy-simple-market-latest.sh which is proven to work

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_SCRIPT="$SCRIPT_DIR/deploy-simple-market-latest.sh"

if [ ! -f "$DEPLOY_SCRIPT" ]; then
    echo "❌ deploy-simple-market-latest.sh not found at $DEPLOY_SCRIPT"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Quick Redeploy Simple Market"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Using existing deploy script: $DEPLOY_SCRIPT"
echo ""
echo "Note: This will rebuild and redeploy Simple Market with fixes:"
echo "  ✅ Uses cross-chain messaging (no more WASM panic)"
echo "  ✅ Removed call_application() from request_resolution"
echo ""

# Change to script directory
cd "$SCRIPT_DIR/.."

# Run the existing deploy script
exec "$DEPLOY_SCRIPT"
