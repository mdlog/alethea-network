#!/bin/bash
# Test script for voter registration tests only

echo "=== Testing Voter Registration ==="
echo ""

# Run specific test
cargo test --lib voter_registration_tests:: --no-fail-fast 2>&1 | grep -E "(test |passed|FAILED|error)"
