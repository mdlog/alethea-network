#!/bin/bash
# Run multiple voters integration tests

echo "Running multiple voters integration tests..."
cargo test --lib multiple_voters_tests -- --test-threads=1 --nocapture

echo ""
echo "Test execution complete!"
