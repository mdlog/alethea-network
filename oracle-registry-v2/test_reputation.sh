#!/bin/bash
# Test script for reputation calculation tests

echo "Running reputation calculation tests..."
cargo test --lib reputation_tests 2>&1
