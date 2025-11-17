#!/bin/bash

# Start Oracle API Backend with correct configuration

set -e

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                      ║"
echo "║              Starting Oracle API Backend                            ║"
echo "║                                                                      ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# Load environment from parent directory if available
if [ -f ../.env.fresh ]; then
    echo "Loading configuration from ../.env.fresh"
    source ../.env.fresh
elif [ -f ../.env.production ]; then
    echo "Loading configuration from ../.env.production"
    source ../.env.production
fi

# Load local .env if available
if [ -f .env ]; then
    echo "Loading local .env"
    source .env
fi

# Set defaults if not set
export CHAIN_ID="${CHAIN_ID:-95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4}"
export APP_ID="${APP_ID:-99740274ffaa04d9ac49a6fe9af3763d7d9dbdf98379a6d68a7e04fcfb77a0e0}"
export SENDER_CHAIN_ID="${SENDER_CHAIN_ID:-$CHAIN_ID}"
export WALLET_PATH="${WALLET_PATH:-$HOME/.config/linera/wallet.json}"
export STORAGE_PATH="${STORAGE_PATH:-rocksdb:$HOME/.config/linera/client.db}"
export RUST_LOG="${RUST_LOG:-info}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Configuration:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Chain ID:       $CHAIN_ID"
echo "App ID:         $APP_ID"
echo "Sender Chain:   $SENDER_CHAIN_ID"
echo "Wallet:         $WALLET_PATH"
echo "Storage:        $STORAGE_PATH"
echo "Log Level:      $RUST_LOG"
echo ""

# Check if wallet exists
if [ ! -f "$WALLET_PATH" ]; then
    echo "⚠️  Warning: Wallet file not found at $WALLET_PATH"
    echo "   Make sure Linera is properly configured"
    echo ""
fi

# Check if port 3001 is available
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Warning: Port 3001 is already in use"
    echo "   Kill existing process or use different port"
    echo ""
    read -p "Kill existing process? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        lsof -ti:3001 | xargs kill -9
        echo "✅ Process killed"
        echo ""
    else
        echo "Exiting..."
        exit 1
    fi
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Starting Backend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Build if needed
if [ ! -f "target/release/oracle-api-backend" ]; then
    echo "Building backend..."
    cargo build --release
    echo ""
fi

# Start backend
echo "Starting server on http://0.0.0.0:3001"
echo ""
echo "API Endpoints:"
echo "  Health:         http://localhost:3001/health"
echo "  Register Voter: http://localhost:3001/api/register-voter"
echo "  List Voters:    http://localhost:3001/api/voters"
echo "  List Queries:   http://localhost:3001/api/queries"
echo ""
echo "Press Ctrl+C to stop"
echo ""

cargo run --release
