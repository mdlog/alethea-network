#!/bin/bash
# Run voting flow integration tests

set -e

echo "Running voting flow integration tests..."
echo "========================================"

cd "$(dirname "$0")"

# Run the tests
cargo test --lib voting_flow_integration_tests -- --test-threads=1 --nocapture

echo ""
echo "========================================"
echo "All voting flow integration tests passed!"
