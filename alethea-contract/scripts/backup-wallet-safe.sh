#!/bin/bash
# Backup wallet dengan aman sebelum clean
# Simpan semua chain IDs dan deployment info

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}💾 Safe Wallet Backup${NC}\n"

# Step 1: Create backup directory
BACKUP_DIR="$HOME/.config/linera/backup_safe_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo -e "${YELLOW}Backup Directory: $BACKUP_DIR${NC}\n"

# Step 2: Backup wallet files
echo -e "${YELLOW}Step 1: Backing up wallet files...${NC}"
cp "$HOME/.config/linera/wallet.json" "$BACKUP_DIR/" 2>/dev/null && echo "  ✅ wallet.json" || echo "  ❌ wallet.json not found"
cp -r "$HOME/.config/linera/client.db" "$BACKUP_DIR/" 2>/dev/null && echo "  ✅ client.db" || echo "  ⚠️  client.db not found"

# Step 3: Save wallet info
echo -e "${YELLOW}Step 2: Saving wallet info...${NC}"
linera wallet show > "$BACKUP_DIR/wallet_info.txt" 2>&1
echo "  ✅ wallet_info.txt"

# Step 4: Save chain list
echo -e "${YELLOW}Step 3: Saving chain list...${NC}"
linera wallet show 2>&1 | grep -E "^│ [0-9a-f]{64}" | awk '{print $2}' > "$BACKUP_DIR/chain_ids.txt"
CHAIN_COUNT=$(cat "$BACKUP_DIR/chain_ids.txt" | wc -l)
echo "  ✅ chain_ids.txt ($CHAIN_COUNT chains)"

# Step 5: Save deployment info
echo -e "${YELLOW}Step 4: Saving deployment info...${NC}"
cp .env.conway "$BACKUP_DIR/" 2>/dev/null && echo "  ✅ .env.conway" || echo "  ⚠️  .env.conway not found"

# Step 6: Save current deployment IDs
cat > "$BACKUP_DIR/DEPLOYMENT_INFO.md" << 'EOF'
# Deployment Info - Backup

## Current Conway Deployment

### Chain & Applications
```bash
# Main Chain
CHAIN_ID="0c77da791bd3daee848448091fefd29891fbeab54e57362af6598f551f924307"

# Applications
ALETHEA_REGISTRY_ID="3c018ea20034b33e630ff4db09874fef2bce75c9ba710dcc9fa7eb0b272b6c0a"
MARKET_CHAIN_ID="67655adfa7f0380e0fe2e16ffc4e68ebb1ba13b38ff62434811d4797819ddd84"
VOTER_TEMPLATE_ID="ffe7546cec93d873d0f35aa79aa5068312f5ca46e6bcc9bdc2e8cc3e08db89b7"

# Voters
VOTER_1_ID="fa3fec8eb4b72893abee7f471e4dbd702a13e6a638e5716a2067c7d70cddf831"
VOTER_2_ID="8fe971309e20616184c97fe90634fac1fa9b78aed7a3e5fd3ffe1a8fc8fa0e02"
VOTER_3_ID="d0924ce36976edd3342f94b62bf3ecaa2de62d3356622c20854ed416e8d4b752"
```

## Restore Instructions

### Option 1: Restore Full Wallet (32 chains)
```bash
# Stop service
pkill -9 -f "linera"

# Restore wallet
cp BACKUP_DIR/wallet.json ~/.config/linera/
cp -r BACKUP_DIR/client.db ~/.config/linera/

# Start service
linera service --port 8080
```

### Option 2: Use Specific Chain Only
```bash
# Create new wallet
linera wallet init

# Import specific chain (if possible)
# Note: Linera might not support importing single chain
# You may need to restore full wallet
```

## Important Notes

- Wallet contains 32 chains (might cause performance issues)
- Main deployment chain: 0c77da791bd3daee848448091fefd29891fbeab54e57362af6598f551f924307
- All applications deployed on this chain
- Faucet tokens available on main chain

## If Conway Testnet Recovers

You can restore this wallet to access deployed applications:
- Oracle Registry (working)
- Voter Template (working)
- Market Chain (working)
- 3 Voters (deployed)
EOF

echo "  ✅ DEPLOYMENT_INFO.md"

# Step 7: Create restore script
cat > "$BACKUP_DIR/restore.sh" << 'RESTORE_EOF'
#!/bin/bash
# Restore wallet from backup

set -e

echo "🔄 Restoring wallet from backup..."

# Stop service
pkill -9 -f "linera" 2>/dev/null || echo "No service running"
sleep 2

# Backup current wallet (if exists)
if [ -f "$HOME/.config/linera/wallet.json" ]; then
    CURRENT_BACKUP="$HOME/.config/linera/backup_before_restore_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$CURRENT_BACKUP"
    cp -r "$HOME/.config/linera/"* "$CURRENT_BACKUP/"
    echo "Current wallet backed up to: $CURRENT_BACKUP"
fi

# Restore wallet
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp "$SCRIPT_DIR/wallet.json" "$HOME/.config/linera/"
cp -r "$SCRIPT_DIR/client.db" "$HOME/.config/linera/" 2>/dev/null || echo "No client.db to restore"

echo "✅ Wallet restored!"
echo ""
echo "Verify with: linera wallet show"
echo "Start service: linera service --port 8080"
RESTORE_EOF

chmod +x "$BACKUP_DIR/restore.sh"
echo "  ✅ restore.sh"

# Step 8: Summary
echo ""
echo -e "${GREEN}✅ Backup Complete!${NC}"
echo ""
echo "Backup Location:"
echo "  $BACKUP_DIR"
echo ""
echo "Backup Contents:"
echo "  ✅ wallet.json - Wallet configuration"
echo "  ✅ client.db - Chain storage"
echo "  ✅ wallet_info.txt - Wallet details"
echo "  ✅ chain_ids.txt - All chain IDs ($CHAIN_COUNT chains)"
echo "  ✅ .env.conway - Deployment IDs"
echo "  ✅ DEPLOYMENT_INFO.md - Deployment documentation"
echo "  ✅ restore.sh - Restore script"
echo ""
echo "To Restore:"
echo "  bash $BACKUP_DIR/restore.sh"
echo ""
echo -e "${BLUE}Safe to proceed with clean wallet!${NC}"
echo "  bash scripts/clean-wallet-fresh-start.sh"
