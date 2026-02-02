#!/bin/bash

# ============================================================================
# Setup Inbox Processing Cron Job
# Automatically processes inbox every 5 minutes
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Setup Inbox Processing Cron Job                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Load configuration
if [ ! -f .env.fresh ]; then
    echo -e "${RED}✗ .env.fresh not found${NC}"
    exit 1
fi

source .env.fresh

if [ -z "${CHAIN_ID}" ]; then
    echo -e "${RED}✗ CHAIN_ID not set in .env.fresh${NC}"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "${SCRIPT_DIR}")"

# Create cron script
CRON_SCRIPT="${PROJECT_DIR}/scripts/cron-process-inbox.sh"

cat > "${CRON_SCRIPT}" << EOF
#!/bin/bash
# Auto-generated cron script for processing inbox
cd "${PROJECT_DIR}"
source .env.fresh
linera process-inbox "\${CHAIN_ID}" >> /tmp/linera-inbox-cron.log 2>&1
EOF

chmod +x "${CRON_SCRIPT}"

echo -e "${GREEN}✓ Cron script created: ${CRON_SCRIPT}${NC}"
echo ""

# Add to crontab
CRON_LINE="*/5 * * * * ${CRON_SCRIPT}"

echo "Cron job to add:"
echo "  ${CRON_LINE}"
echo ""
echo "This will process inbox every 5 minutes."
echo ""

read -p "Add to crontab? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Check if already exists
    if crontab -l 2>/dev/null | grep -q "${CRON_SCRIPT}"; then
        echo -e "${YELLOW}⚠ Cron job already exists${NC}"
    else
        # Add to crontab
        (crontab -l 2>/dev/null; echo "${CRON_LINE}") | crontab -
        echo -e "${GREEN}✓ Cron job added${NC}"
    fi
    
    echo ""
    echo "Current crontab:"
    crontab -l | grep linera
    echo ""
    echo -e "${GREEN}✓ Inbox will be processed every 5 minutes${NC}"
    echo "Logs: /tmp/linera-inbox-cron.log"
else
    echo "Skipped. You can manually add it later:"
    echo "  crontab -e"
    echo "  ${CRON_LINE}"
fi

echo ""
