#!/bin/bash

# Run Oracle API Backend

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Oracle API Backend${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Set environment variables (Latest deployment - Account-Based FINAL)
export CHAIN_ID="${CHAIN_ID:-95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4}"
export APP_ID="${APP_ID:-47c507d7cc92ddf56fee5aad39376f4c6bea46fde82eeef72a26f1e0d33059c3}"
export WALLET_PATH="${WALLET_PATH:-$HOME/.config/linera/wallet.json}"
export STORAGE_PATH="${STORAGE_PATH:-rocksdb:$HOME/.config/linera/client.db}"
export RUST_LOG="${RUST_LOG:-info}"

echo -e "${YELLOW}Configuration:${NC}"
echo "  Chain ID: $CHAIN_ID"
echo "  App ID: $APP_ID"
echo "  Wallet: $WALLET_PATH"
echo "  Storage: $STORAGE_PATH"
echo "  Log Level: $RUST_LOG"
echo ""

# Check if wallet exists
if [ ! -f "$WALLET_PATH" ]; then
    echo -e "${YELLOW}⚠️  Warning: Wallet file not found at $WALLET_PATH${NC}"
    echo "Backend will start but operations may fail"
    echo ""
fi

# Build if needed
if [ ! -f "target/release/oracle-api-backend" ]; then
    echo -e "${YELLOW}Building backend...${NC}"
    cargo build --release
    echo -e "${GREEN}✅ Build complete${NC}"
    echo ""
fi

# Run server
echo -e "${GREEN}Starting server on http://0.0.0.0:3001${NC}"
echo ""
cargo run --release
