#!/bin/bash
# Simple Market Deployment Script

set -e

echo "🏗️  Building Simple Market..."
cargo build --release --target wasm32-unknown-unknown -p simple-market

echo "📦 Contract and Service built successfully!"
echo ""
echo "To deploy:"
echo "1. Start Linera network: linera net up"
echo "2. Get Registry v2 App ID from deployment"
echo "3. Deploy simple-market with: linera project publish-and-create simple-market --json-argument '<REGISTRY_APP_ID>'"
echo ""
echo "Example GraphQL queries:"
echo ""
echo "# List all markets"
echo 'query { markets { id question status yesPool noPool totalPool } }'
echo ""
echo "# Get specific market"
echo 'query { market(id: "1") { id question status winningOutcome } }'
echo ""
echo "# Create market"
echo 'mutation { createMarket(question: "Will it rain tomorrow?", endTime: "1234567890000000") }'
echo ""
echo "# Place bet"
echo 'mutation { placeBet(marketId: "1", outcome: "Yes", stake: "1000") }'
echo ""
echo "# Claim payout"
echo 'mutation { claimPayout(marketId: "1") }'
