#!/bin/bash
# Quick Deploy Commands - Copy-paste ready
# Mengikuti DEPLOYMENT_SUCCESS_FACTORS.md

set -e

echo "========================================="
echo "ALETHEA NETWORK - QUICK DEPLOY COMMANDS"
echo "========================================="
echo ""
echo "Copy-paste commands berikut satu per satu:"
echo ""

# Step 1: Build
echo "=== STEP 1: BUILD ==="
echo "cd /media/mdlog/mdlog/Project-MDlabs/alethea-network/alethea-contract"
echo "cargo build --release --target wasm32-unknown-unknown"
echo ""

# Step 2: Get Chain & Owner
echo "=== STEP 2: GET CHAIN & OWNER ==="
echo "linera wallet show | grep -A 5 'AccountOwner'"
echo "# Catat Chain ID dan Owner address"
echo ""

# Step 3: Publish Token Module
echo "=== STEP 3: PUBLISH TOKEN MODULE ==="
echo "linera publish-module \\"
echo "    target/wasm32-unknown-unknown/release/alethea-token-contract.wasm \\"
echo "    target/wasm32-unknown-unknown/release/alethea-token-service.wasm"
echo ""
echo "# Simpan Module ID (130 chars hex) ke variable:"
echo "TOKEN_MODULE_ID=\"<MODULE_ID>\""
echo "sleep 10  # Tunggu blob replication"
echo ""

# Step 4: Create Token Application
echo "=== STEP 4: CREATE TOKEN APPLICATION ==="
echo "cat > /tmp/token_init.json <<'EOF'"
echo "{"
echo "    \"accounts\": {"
echo "        \"0xf53bade3e76939a3ede4a22993d877fdbabe5394b98a6b83cdfbac9f317e6ca7\": \"1000000000.\""
echo "    },"
echo "    \"admin\": \"0xf53bade3e76939a3ede4a22993d877fdbabe5394b98a6b83cdfbac9f317e6ca7\""
echo "}"
echo "EOF"
echo ""
echo "cat > /tmp/token_params.json <<'EOF'"
echo "{"
echo "    \"name\": \"Alethea\","
echo "    \"symbol\": \"ALTH\","
echo "    \"decimals\": 18,"
echo "    \"registry_app_id\": null,"
echo "    \"min_stake_amount\": \"100.\","
echo "    \"max_stake_amount\": \"10000000.\","
echo "    \"max_stake_per_user\": \"1000000.\""
echo "}"
echo "EOF"
echo ""
echo "linera create-application \\"
echo "    \"\$TOKEN_MODULE_ID\" \\"
echo "    --json-parameters \"\$(cat /tmp/token_params.json)\" \\"
echo "    --json-argument \"\$(cat /tmp/token_init.json)\""
echo ""
echo "# Simpan Application ID (64 chars hex):"
echo "TOKEN_APP_ID=\"<APP_ID>\""
echo ""

# Step 5: Publish Registry Module
echo "=== STEP 5: PUBLISH REGISTRY MODULE ==="
echo "linera publish-module \\"
echo "    target/wasm32-unknown-unknown/release/oracle_registry_v2_contract.wasm \\"
echo "    target/wasm32-unknown-unknown/release/oracle_registry_v2_service.wasm"
echo ""
echo "# Simpan Module ID:"
echo "REGISTRY_MODULE_ID=\"<MODULE_ID>\""
echo "sleep 10  # Tunggu blob replication"
echo ""

# Step 6: Create Registry Application
echo "=== STEP 6: CREATE REGISTRY APPLICATION ==="
echo "# PENTING: Format init argument harus: '\"Hub\"'"
echo "linera create-application \\"
echo "    \"\$REGISTRY_MODULE_ID\" \\"
echo "    --json-argument '\"Hub\"'"
echo ""
echo "# Simpan Application ID:"
echo "REGISTRY_APP_ID=\"<APP_ID>\""
echo ""

# Step 7: Sync & Process Inbox
echo "=== STEP 7: SYNC & PROCESS INBOX (CRITICAL!) ==="
echo "pkill -f 'linera service' || true"
echo "sleep 2"
echo "linera sync"
echo "linera process-inbox"
echo ""

# Step 8: Verify
echo "=== STEP 8: VERIFY ==="
echo "linera service --port 8080 > /tmp/linera-service.log 2>&1 &"
echo "sleep 5"
echo "linera application info \"\$TOKEN_APP_ID\""
echo "linera application info \"\$REGISTRY_APP_ID\""
echo ""

# Step 9: Update Environment
echo "=== STEP 9: UPDATE ENVIRONMENT ==="
echo "cd /media/mdlog/mdlog/Project-MDlabs/alethea-network/alethea-dashboard-vite"
echo "cat > .env.local <<EOF"
echo "VITE_TOKEN_APP_ID=\$TOKEN_APP_ID"
echo "VITE_REGISTRY_APP_ID=\$REGISTRY_APP_ID"
echo "VITE_CHAIN_ID=9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec"
echo "VITE_LINERA_RPC=https://rpc.testnet-conway.linera.net"
echo "VITE_NETWORK=Conway Testnet"
echo "EOF"
echo ""

echo "========================================="
echo "Selesai! Ikuti command di atas step by step"
echo "========================================="
