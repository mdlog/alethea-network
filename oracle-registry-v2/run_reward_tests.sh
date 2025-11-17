#!/bin/bash

echo "Running reward distribution tests..."
cargo test --lib reward_distribution_tests -- --test-threads=1 --nocapture

echo ""
echo "Test execution complete!"
