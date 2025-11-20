#!/bin/bash
set -e

echo "🔨 Building Oracle Contract..."

# Build contract binary
echo "📦 Building contract..."
cargo build --release --target wasm32-unknown-unknown --bin oracle-contract

# Build service binary
echo "📦 Building service..."
cargo build --release --target wasm32-unknown-unknown --bin oracle-service

echo "✅ Build complete!"
echo ""
echo "📦 WASM files location:"
echo "   Contract: target/wasm32-unknown-unknown/release/oracle-contract.wasm"
echo "   Service:  target/wasm32-unknown-unknown/release/oracle-service.wasm"
echo ""

# Check if files exist
if [ -f "target/wasm32-unknown-unknown/release/oracle-contract.wasm" ] && \
   [ -f "target/wasm32-unknown-unknown/release/oracle-service.wasm" ]; then
    echo "✅ Both WASM files found"
    ls -lh target/wasm32-unknown-unknown/release/oracle-*.wasm
else
    echo "❌ WASM files not found!"
    exit 1
fi

echo ""
echo "📋 Next steps:"
echo "1. Publish bytecode:"
echo "   linera publish-bytecode \\"
echo "     target/wasm32-unknown-unknown/release/oracle-contract.wasm \\"
echo "     target/wasm32-unknown-unknown/release/oracle-service.wasm"
echo ""
echo "2. Create application:"
echo "   linera create-application <BYTECODE_ID>"
echo ""
echo "3. Update .env.local with new Oracle app ID"
