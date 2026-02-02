#!/bin/bash

echo "⚡ QUICK TEST QUERY CREATOR"
echo "=========================="

# Configuration
REGISTRY_CHAIN="268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f"
REGISTRY_APP="22849e811d38de55050a50783c86486437e3c076161e2f043a1bdcdf6ae8334d"
SERVICE_URL="http://localhost:8080"

# Calculate end time (3 minutes from now)
END_TIME=$(date -u -d '+3 minutes' '+%Y-%m-%dT%H:%M:%SZ')

echo "📅 Creating query that ends at: $END_TIME"

# Create query
curl -s -X POST "${SERVICE_URL}/chains/${REGISTRY_CHAIN}/applications/${REGISTRY_APP}" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"mutation { createQuery(question: \\\"Test Query: Is 2+2=4?\\\", options: [\\\"Yes\\\", \\\"No\\\"], endTime: \\\"$END_TIME\\\", category: \\\"Math\\\") }\"
  }" | jq '.'

echo ""
echo "📊 Latest query:"
curl -s -X POST "${SERVICE_URL}/chains/${REGISTRY_CHAIN}/applications/${REGISTRY_APP}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ queries(limit: 1, offset: 0) { id question endTime } }"}' | \
  jq -r '.data.queries[0] | "🆔 ID: " + .id + "\n📝 Question: " + .question + "\n⏰ Ends: " + .endTime'

echo ""
echo "✅ Query created! Go vote in dashboard and test reward/slashing!"