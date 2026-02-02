#!/bin/bash

# Create Query via Linera CLI Operation
# This bypasses GraphQL and uses direct operation

REGISTRY_APP="b08bd0587eb941b8db83fd7dffa32ad0ebd1a55eed0f9e0789b7cf02c402b9ff"
APP_CHAIN="9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         CREATE QUERY VIA LINERA CLI OPERATION              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Create operation JSON
OPERATION_JSON=$(cat <<EOF
{
  "CreateQuery": {
    "description": "Did Bitcoin reach \$50,000 on January 1, 2025?",
    "outcomes": ["Yes", "No"],
    "strategy": "Majority",
    "min_votes": 1,
    "reward_amount": "100.",
    "deadline": null,
    "duration_secs": 300
  }
}
EOF
)

echo "Operation JSON:"
echo "$OPERATION_JSON" | jq '.'
echo ""

echo "Executing operation via linera CLI..."
echo ""

# Execute operation
linera service query-block \
  --chain-id "${APP_CHAIN}" \
  --application-id "${REGISTRY_APP}" \
  --operation "$OPERATION_JSON" 2>&1 || {
    echo ""
    echo "⚠️ Direct CLI operation might not be supported"
    echo ""
    echo "✅ RECOMMENDED: Use dashboard at http://localhost:5173"
    echo "   Dashboard handles query creation properly via WASM client"
}
