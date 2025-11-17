#!/bin/bash
echo "🔄 Restarting Next.js dev server with fresh environment variables..."
echo ""
echo "1. Stopping any running dev server..."
pkill -f "next dev" || true
sleep 2
echo ""
echo "2. Clearing Next.js cache..."
rm -rf .next
echo "   ✅ Cache cleared"
echo ""
echo "3. Verifying .env.local exists..."
if [ -f .env.local ]; then
    echo "   ✅ .env.local found"
    echo "   CHAIN_ID: $(grep NEXT_PUBLIC_CHAIN_ID .env.local | cut -d'=' -f2 | head -c 16)..."
else
    echo "   ❌ .env.local not found!"
    exit 1
fi
echo ""
echo "4. Starting dev server..."
echo "   Run: npm run dev"
echo ""
echo "✅ Ready! Now run: npm run dev"
