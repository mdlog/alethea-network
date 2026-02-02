#!/bin/bash

# Admin script to register a voter using RegisterVoterFor operation
# Usage: ./scripts/admin-register-voter.sh <chain_id> <stake> [name]

set -e

# Configuration
REGISTRY_CHAIN="8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef"
REGISTRY_APP="9ee97b285979b8aa6aea7d70be372398e2081839f0ba2006031152a06231c03f"

# Parse arguments
VOTER_CHAIN=${1:-"a98f820b097c07f4022a0d506d003a1314b38345aa90094b2594936fa4937c3f"}
STAKE=${2:-1000}
NAME=${3:-"TestVoter"}

echo "🔐 Admin: Registering voter..."
echo "  Voter Chain: $VOTER_CHAIN"
echo "  Stake: $STAKE"
echo "  Name: $NAME"
echo ""

# Build operation JSON
OPERATION="{\"RegisterVoterFor\":{\"voter_address\":\"$VOTER_CHAIN\",\"stake\":\"$STAKE\",\"name\":\"$NAME\"}}"

echo "📝 Operation: $OPERATION"
echo ""

# Try to execute operation using GraphQL service
# Note: This might not work because GraphQL service can only schedule operations
echo "🚀 Attempting to execute via GraphQL..."
MUTATION="mutation { executeOperation(operation: \"$OPERATION\") }"

curl -s -X POST "http://localhost:8080/chains/$REGISTRY_CHAIN/applications/$REGISTRY_APP" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"$MUTATION\"}" | jq .

echo ""
echo "⚠️  Note: GraphQL mutations only schedule operations, they don't execute them."
echo "    The operation needs to be executed in a block context with wallet access."
echo ""
echo "🔍 Checking voter count..."
sleep 1

curl -s -X POST "http://localhost:8080/chains/$REGISTRY_CHAIN/applications/$REGISTRY_APP" \
    -H "Content-Type: application/json" \
    -d '{"query": "query { voterCount totalStake }"}' | jq .

echo ""
