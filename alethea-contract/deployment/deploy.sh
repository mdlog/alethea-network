#!/bin/bash

# Alethea Oracle Network - Production Deployment Script
# This script deploys the complete oracle system to production

set -e

echo "🚀 Alethea Oracle Network - Production Deployment"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
DEPLOY_DIR="/opt/alethea"
SERVICE_USER="alethea"
BACKEND_PORT=3001

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Please run as root (use sudo)${NC}"
    exit 1
fi

echo -e "${BLUE}Step 1: Pre-deployment Checks${NC}"
echo "--------------------------------"

# Check if required tools are installed
command -v cargo >/dev/null 2>&1 || { echo -e "${RED}❌ cargo not found${NC}"; exit 1; }
command -v linera >/dev/null 2>&1 || { echo -e "${YELLOW}⚠️  linera CLI not found${NC}"; }
command -v nginx >/dev/null 2>&1 || { echo -e "${YELLOW}⚠️  nginx not found${NC}"; }

echo -e "${GREEN}✅ Pre-deployment checks passed${NC}"
echo ""

echo -e "${BLUE}Step 2: Create Deployment User${NC}"
echo "--------------------------------"

# Create service user if doesn't exist
if ! id "$SERVICE_USER" &>/dev/null; then
    useradd -r -s /bin/false -d "$DEPLOY_DIR" "$SERVICE_USER"
    echo -e "${GREEN}✅ Created user: $SERVICE_USER${NC}"
else
    echo -e "${GREEN}✅ User already exists: $SERVICE_USER${NC}"
fi
echo ""

echo -e "${BLUE}Step 3: Create Directories${NC}"
echo "---------------------------"

# Create directories
mkdir -p "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/oracle-api-backend"
mkdir -p "$DEPLOY_DIR/oracle-cli"
mkdir -p /var/lib/alethea
mkdir -p /var/log/alethea

# Set permissions
chown -R "$SERVICE_USER:$SERVICE_USER" "$DEPLOY_DIR"
chown -R "$SERVICE_USER:$SERVICE_USER" /var/lib/alethea
chown -R "$SERVICE_USER:$SERVICE_USER" /var/log/alethea

echo -e "${GREEN}✅ Directories created${NC}"
echo ""

echo -e "${BLUE}Step 4: Build Backend${NC}"
echo "----------------------"

cd oracle-api-backend
cargo build --release
cp target/release/oracle-api-backend "$DEPLOY_DIR/oracle-api-backend/"
echo -e "${GREEN}✅ Backend built and copied${NC}"
echo ""

echo -e "${BLUE}Step 5: Build CLI Tool${NC}"
echo "-----------------------"

cd ../oracle-cli
cargo build --release
cp target/release/oracle-cli "$DEPLOY_DIR/oracle-cli/"
echo -e "${GREEN}✅ CLI tool built and copied${NC}"
echo ""

echo -e "${BLUE}Step 6: Copy Configuration${NC}"
echo "---------------------------"

# Copy environment file
if [ ! -f "$DEPLOY_DIR/.env.production" ]; then
    cp ../deployment/production.env.example "$DEPLOY_DIR/.env.production"
    echo -e "${YELLOW}⚠️  Please edit $DEPLOY_DIR/.env.production with your values${NC}"
else
    echo -e "${GREEN}✅ Configuration already exists${NC}"
fi
echo ""

echo -e "${BLUE}Step 7: Install Systemd Service${NC}"
echo "--------------------------------"

# Copy systemd service
cp ../deployment/alethea-backend.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable alethea-backend.service

echo -e "${GREEN}✅ Systemd service installed${NC}"
echo ""

echo -e "${BLUE}Step 8: Configure Nginx (Optional)${NC}"
echo "-----------------------------------"

if command -v nginx >/dev/null 2>&1; then
    if [ ! -f /etc/nginx/sites-available/alethea-api ]; then
        cp ../deployment/nginx-api.conf /etc/nginx/sites-available/alethea-api
        echo -e "${YELLOW}⚠️  Nginx config copied. Please:${NC}"
        echo "   1. Update server_name in /etc/nginx/sites-available/alethea-api"
        echo "   2. Setup SSL certificates"
        echo "   3. Enable site: ln -s /etc/nginx/sites-available/alethea-api /etc/nginx/sites-enabled/"
        echo "   4. Test config: nginx -t"
        echo "   5. Reload nginx: systemctl reload nginx"
    else
        echo -e "${GREEN}✅ Nginx config already exists${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Nginx not installed, skipping${NC}"
fi
echo ""

echo -e "${BLUE}Step 9: Set Permissions${NC}"
echo "------------------------"

chown -R "$SERVICE_USER:$SERVICE_USER" "$DEPLOY_DIR"
chmod +x "$DEPLOY_DIR/oracle-api-backend/oracle-api-backend"
chmod +x "$DEPLOY_DIR/oracle-cli/oracle-cli"

echo -e "${GREEN}✅ Permissions set${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Edit configuration:"
echo "   sudo nano $DEPLOY_DIR/.env.production"
echo ""
echo "2. Deploy oracle contract:"
echo "   cd oracle-registry-v2"
echo "   linera project publish-and-create"
echo ""
echo "3. Update .env.production with CHAIN_ID and APP_ID"
echo ""
echo "4. Start backend service:"
echo "   sudo systemctl start alethea-backend"
echo ""
echo "5. Check status:"
echo "   sudo systemctl status alethea-backend"
echo ""
echo "6. View logs:"
echo "   sudo journalctl -u alethea-backend -f"
echo ""
echo "7. Test API:"
echo "   curl http://localhost:$BACKEND_PORT/health"
echo ""
