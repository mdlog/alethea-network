#!/bin/bash
# Production startup script for inbox processor
# Run this on nectiq.xyz server

# Set production environment variables
export LINERA_SERVICE_URL=https://evonft.xyz
export INBOX_HOST=0.0.0.0
export PORT=4003

# Start inbox processor
echo "🚀 Starting Inbox Processor (Production)"
echo "   Linera Service: $LINERA_SERVICE_URL"
echo "   Host: $INBOX_HOST"
echo "   Port: $PORT"
echo ""

node server/inbox-processor.js
