#!/bin/bash
# Start Alethea Dashboard

echo "🚀 Starting Alethea Dashboard..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check if port 3333 is in use
if lsof -Pi :3333 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port 3333 is already in use!"
    echo "Killing existing process..."
    lsof -ti:3333 | xargs kill -9 2>/dev/null
    sleep 2
fi

# Start dashboard
echo "✅ Starting dashboard on http://localhost:3333"
echo ""
npm run dev
