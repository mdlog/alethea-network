#!/bin/bash

# Start Alethea Dashboard with correct environment variables

echo "🚀 Starting Alethea Dashboard..."
echo ""
echo "Configuration:"
echo "  Chain ID: 95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4"
echo "  App ID:   47c507d7cc92ddf56fee5aad39376f4c6bea46fde82eeef72a26f1e0d33059c3"
echo "  Service:  http://localhost:8080"
echo "  Port:     4000"
echo ""

# Kill existing process
pkill -f "next dev"
sleep 1

# Start dashboard
npm run dev -- -p 4000 > dashboard.log 2>&1 &

echo "✅ Dashboard starting..."
echo "📊 Logs: tail -f dashboard.log"
echo "🌐 URL: http://localhost:4000"
echo ""
echo "Waiting for dashboard to start..."
sleep 3

# Check if running
if ps aux | grep -v grep | grep "next dev" > /dev/null; then
    echo "✅ Dashboard is running!"
    echo ""
    echo "Test registration at: http://localhost:4000/register"
else
    echo "❌ Failed to start dashboard"
    echo "Check logs: tail -f dashboard.log"
fi
