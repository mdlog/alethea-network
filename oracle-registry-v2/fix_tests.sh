#!/bin/bash

# Fix import paths from linera_sdk::base to linera_sdk::linera_base_types
find src -name "*_tests.rs" -exec sed -i 's/linera_sdk::base::/linera_sdk::linera_base_types::/g' {} \;

# Fix AccountOwner::from([...]) to proper construction
# This is more complex and needs manual review, but we can prepare the pattern

echo "Fixed import paths. Now need to fix:"
echo "1. AccountOwner construction"
echo "2. MemoryContext usage"
echo "3. Type mismatches (u8 vs u32, u8 vs usize)"
echo "4. .is_ok() on Option to .is_some()"
echo "5. Missing .await on view operations"
