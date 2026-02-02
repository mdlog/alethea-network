#!/bin/bash
# Setup Test Environment for Account-Based Registry

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         Setting Up Test Environment                       ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}\n"

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}\n"

# 1. Check Rust
if ! command -v rustc &> /dev/null; then
    echo -e "${RED}✗ Rust not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Rust: $(rustc --version)${NC}"

# 2. Check wasm32 target
if ! rustup target list | grep -q "wasm32-unknown-unknown (installed)"; then
    echo -e "${YELLOW}⚠ Installing wasm32 target...${NC}"
    rustup target add wasm32-unknown-unknown
fi
echo -e "${GREEN}✓ wasm32-unknown-unknown target installed${NC}"

# 3. Check Linera CLI
if ! command -v linera &> /dev/null; then
    echo -e "${RED}✗ Linera CLI not installed${NC}"
    echo "Install with: cargo install linera-service"
    exit 1
fi
echo -e "${GREEN}✓ Linera CLI: $(linera --version 2>&1 | head -1)${NC}"

# 4. Check jq
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠ jq not installed, installing...${NC}"
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y jq
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install jq
    fi
fi
echo -e "${GREEN}✓ jq installed${NC}"

# 5. Check curl
if ! command -v curl &> /dev/null; then
    echo -e "${RED}✗ curl not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ curl installed${NC}\n"

# Build project
echo -e "${BLUE}Building project...${NC}\n"

echo -e "${YELLOW}Building oracle-registry-v2...${NC}"
cargo build --release --target wasm32-unknown-unknown --package oracle-registry-v2 2>&1 | grep -E "(Compiling|Finished)" || true

if [ ! -f "target/wasm32-unknown-unknown/release/oracle_registry_v2_contract.wasm" ]; then
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build successful${NC}\n"

# Check Linera wallet
echo -e "${BLUE}Checking Linera wallet...${NC}\n"

if ! linera wallet show &> /dev/null; then
    echo -e "${YELLOW}⚠ Wallet not initialized${NC}"
    echo "Please initialize wallet first"
    exit 1
fi

echo -e "${GREEN}✓ Wallet initialized${NC}"
linera wallet show | head -5
echo ""

# Check/Start Linera service
echo -e "${BLUE}Checking Linera service...${NC}\n"

if ! curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Starting Linera service...${NC}"
    
    # Kill any existing service
    pkill -f "linera service" || true
    sleep 2
    
    # Start service in background
    nohup linera service --port 8080 > /tmp/linera-service.log 2>&1 &
    SERVICE_PID=$!
    
    echo -e "${BLUE}Waiting for service to start...${NC}"
    for i in {1..10}; do
        if curl -s http://localhost:8080 > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Service started (PID: $SERVICE_PID)${NC}"
            break
        fi
        sleep 1
    done
    
    if ! curl -s http://localhost:8080 > /dev/null 2>&1; then
        echo -e "${RED}✗ Failed to start service${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Service already running${NC}"
fi

echo ""

# Make scripts executable
echo -e "${BLUE}Making scripts executable...${NC}\n"

chmod +x scripts/deploy-account-based-registry.sh
chmod +x scripts/onboard-voter-account-based.sh
chmod +x scripts/create-query-account-based.sh
chmod +x scripts/vote-account-based.sh
chmod +x scripts/monitor-account-based-registry.sh
chmod +x scripts/test-account-based-workflow.sh

echo -e "${GREEN}✓ Scripts ready${NC}\n"

# Summary
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Environment Setup Complete! ✓                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${CYAN}Ready to test! Run:${NC}"
echo -e "  ${YELLOW}bash scripts/test-account-based-workflow.sh${NC}"
echo ""

exit 0
