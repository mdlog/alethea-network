#!/bin/bash

echo "⚡ CREATING QUICK TEST QUERY (3 minutes)"
echo "======================================="

# Configuration
REGISTRY_CHAIN="268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f"
REGISTRY_APP="22849e811d38de55050a50783c86486437e3c076161e2f043a1bdcdf6ae8334d"
SERVICE_URL="http://localhost:8080"

# Calculate end time (3 minutes from now)
END_TIME=$(date -u -d '+3 minutes' '+%Y-%m-%dT%H:%M:%SZ')
echo "📅 Query will end at: $END_TIME (3 minutes from now)"

echo ""
echo "📝 Creating test query..."

# Create a simple test query
QUERY_RESULT=$(curl -s -X POST "${SERVICE_URL}/chains/${REGISTRY_CHAIN}/applications/${REGISTRY_APP}" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"mutation { createQuery(question: \\\"Quick Test: Will this query end in 3 minutes?\\\", options: [\\\"Yes\\\", \\\"No\\\"], endTime: \\\"$END_TIME\\\", category: \\\"Test\\\") }\"
  }")

echo "Query creation result:"
echo "$QUERY_RESULT" | jq '.'

# Get the latest query
echo ""
echo "📊 Latest query created:"
LATEST_QUERY=$(curl -s -X POST "${SERVICE_URL}/chains/${REGISTRY_CHAIN}/applications/${REGISTRY_APP}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ queries(limit: 1, offset: 0) { id question endTime status } }"}')

echo "$LATEST_QUERY" | jq -r '.data.queries[0] | "  ID: " + .id + "\n  Question: " + .question + "\n  End Time: " + .endTime + "\n  Status: " + .status'

QUERY_ID=$(echo "$LATEST_QUERY" | jq -r '.data.queries[0].id')

echo ""
echo "✅ QUICK TEST QUERY CREATED!"
echo "============================"
echo "🆔 Query ID: $QUERY_ID"
echo "⏰ Duration: 3 minutes"
echo "🎯 Question: Quick Test: Will this query end in 3 minutes?"
echo "📝 Options: Yes, No"
echo ""
echo "🚀 NEXT STEPS:"
echo "1. Go to dashboard: http://localhost:5173"
echo "2. Navigate to Queries page"
echo "3. Vote on Query ID: $QUERY_ID"
echo "   - Some voters vote 'Yes' (correct)"
echo "   - Some voters vote 'No' (wrong)"
echo "4. Wait 3 minutes for query to end"
echo "5. Commit results with 'Yes' as correct answer"
echo "6. Check if rewards/slashing transfer real tokens!"
echo ""
echo "⏱️ Timer started - query ends in 3 minutes!"

# Show countdown
echo "⏰ Countdown:"
for i in {180..1}; do
  mins=$((i / 60))
  secs=$((i % 60))
  printf "\r  Time remaining: %02d:%02d" $mins $secs
  sleep 1
done

echo ""
echo ""
echo "⏰ TIME'S UP! Query should now be ended."
echo "🎯 Now commit the results with 'Yes' as the correct answer!"