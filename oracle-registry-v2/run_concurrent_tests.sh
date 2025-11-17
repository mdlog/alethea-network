#!/bin/bash
# Run concurrent operations tests

echo "Running concurrent operations tests..."
cargo test --lib concurrent_operations_tests -- --test-threads=1 --nocapture
