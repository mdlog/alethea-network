#!/bin/bash
# Script to run voter registration tests

echo "Running voter registration tests..."
cargo test --lib tests::test_register_voter_success --no-fail-fast -- --nocapture
