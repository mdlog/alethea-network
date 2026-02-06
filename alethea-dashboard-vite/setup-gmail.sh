#!/bin/bash

# Gmail SMTP Setup Script
# Quick setup untuk development

echo "📧 Gmail SMTP Setup for Alethea Reminder"
echo "=========================================="
echo ""
echo "⚠️  IMPORTANT: This is for DEVELOPMENT only!"
echo "   For production, you MUST setup DNS in Cloudflare"
echo ""

# Backup current config
if [ -f .env.reminder ]; then
    echo "📦 Backing up current .env.reminder..."
    cp .env.reminder .env.reminder.hostinger.backup
    echo "✅ Backup saved to .env.reminder.hostinger.backup"
fi

echo ""
echo "📝 Please provide your Gmail credentials:"
echo ""

# Get Gmail address
read -p "Gmail address: " GMAIL_USER

# Get App Password
echo ""
echo "Generate App Password:"
echo "1. Go to: https://myaccount.google.com/apppasswords"
echo "2. Select: Mail → Other (Custom name)"
echo "3. Enter name: Alethea Reminder"
echo "4. Copy the 16-character password"
echo ""
read -p "Gmail App Password: " GMAIL_PASS

# Create new config
cat > .env.reminder << EOF
# Gmail SMTP Configuration (Temporary for Development)
# Generated: $(date)

# Gmail SMTP Settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=$GMAIL_USER
SMTP_PASSWORD=$GMAIL_PASS

# Email Display Settings
EMAIL_FROM_NAME=Alethea Oracle
EMAIL_FROM_ADDRESS=$GMAIL_USER

# Dashboard URL
DASHBOARD_URL=https://dashboard.alethea.network
REMINDER_API_PORT=3001

# ============================================
# NOTES:
# ============================================
# - Email will be sent from: $GMAIL_USER
# - Display name: "Alethea Oracle"
# - Gmail limit: 500 emails/day
# - For production: Setup DNS in Cloudflare
# 
# To restore Hostinger SMTP:
# cp .env.reminder.hostinger.backup .env.reminder
EOF

echo ""
echo "✅ Gmail SMTP configured!"
echo ""
echo "📧 Email will be sent from:"
echo "   From: Alethea Oracle <$GMAIL_USER>"
echo ""
echo "🧪 Test now:"
echo "   npm run test:email:debug adiadi2411@gmail.com"
echo ""
echo "📝 To restore Hostinger SMTP later:"
echo "   cp .env.reminder.hostinger.backup .env.reminder"
echo ""
