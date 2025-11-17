#!/bin/bash

# Script to fix all test compilation errors

echo "Fixing test files..."

# Fix all test files
for file in src/*_tests.rs; do
    echo "Processing $file..."
    
    # Add test_utils import at the top of tests module
    sed -i '/^mod tests {/a\    use crate::test_utils::test_helpers::*;' "$file"
    
    # Replace AccountOwner::from([...]) with create_account_owner(...)
    sed -i 's/AccountOwner::from(\[\([0-9]\+\)u8; 32\])/create_account_owner(\1)/g' "$file"
    
    # Replace MemoryContext::default() with create_memory_context()
    sed -i 's/MemoryContext::default()/create_memory_context()/g' "$file"
    
    # Replace .is_ok() with .is_some() for Option types
    sed -i 's/\.is_ok()/\.is_some()/g' "$file"
    
    # Fix reputation type from u8 to u32 in assertions
    # This is trickier and might need manual review
    
done

echo "Done! Now run cargo check --tests to see remaining issues."
