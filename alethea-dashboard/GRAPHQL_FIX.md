# GraphQL Error Fix - Create Market

## ❌ Error yang Terjadi

```json
{
  "data": null,
  "errors": [{
    "message": "Unknown field \"createMarket\" on type \"MutationRoot\".",
    "locations": [{"line": 2, "column": 3}]
  }]
}
```

## 🔍 Penyebab

Error ini terjadi karena format mutation yang salah. Aplikasi Rust menggunakan parameter yang berbeda:

### ❌ Format Salah (Yang Digunakan Sebelumnya)
```graphql
mutation {
  createMarket(
    question: "Will it rain?",
    outcomes: ["Yes", "No"],
    deadline: 1735689600000,  # ❌ Milliseconds
    metadata: "test"           # ❌ Parameter tidak ada
  ) {
    id                         # ❌ Response bukan object
    question
  }
}
```

### ✅ Format Benar (Sesuai Implementasi Rust)
```graphql
mutation {
  createMarket(
    question: "Will it rain?",
    outcomes: ["Yes", "No"],
    resolutionDeadline: 1735689600,  # ✅ Seconds
    initialLiquidity: "1000000"      # ✅ String amount
  )  # ✅ Response langsung, bukan object
}
```

## 🔧 Solusi

### 1. Update Parameter Names

| Old | New | Type | Notes |
|-----|-----|------|-------|
| `deadline` | `resolutionDeadline` | Int | Unix timestamp in **SECONDS** |
| `metadata` | `initialLiquidity` | String | Amount as string |

### 2. Update Timestamp Format

```javascript
// ❌ Wrong: Milliseconds
const deadline = Date.now(); // 1735689600000

// ✅ Correct: Seconds
const deadline = Math.floor(Date.now() / 1000); // 1735689600
```

### 3. Update Response Handling

```typescript
// ❌ Wrong: Expecting object with fields
const result = await queryGraphQL(`
  mutation {
    createMarket(...) {
      id
      question
    }
  }
`);

// ✅ Correct: Direct response
const result = await queryGraphQL(`
  mutation {
    createMarket(...)
  }
`);
```

## 📝 Updated Code

### TypeScript Service (registry.service.ts)

```typescript
export interface CreateMarketParams {
    question: string;
    outcomes: string[];
    resolutionDeadline: number; // Unix timestamp in SECONDS
    initialLiquidity: string;   // Amount as string
}

static async createMarket(params: CreateMarketParams): Promise<any> {
    const outcomesStr = params.outcomes.map(o => `"${o}"`).join(', ');
    
    const result = await queryGraphQL(`
        mutation {
            createMarket(
                question: "${params.question}",
                outcomes: [${outcomesStr}],
                resolutionDeadline: ${params.resolutionDeadline},
                initialLiquidity: "${params.initialLiquidity}"
            )
        }
    `, 'registry');
    
    return result;
}
```

### React Component (CreateMarketForm.tsx)

```typescript
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert to Unix timestamp in SECONDS
    const deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000);
    
    const market = await createMarket({
        question,
        outcomes: filteredOutcomes,
        resolutionDeadline: deadlineTimestamp,
        initialLiquidity: "1000000"
    });
};
```

## 🧪 Testing

### Test dengan cURL

```bash
# Load environment
source .env.conway

# Calculate deadline (24 hours from now, in seconds)
DEADLINE=$(($(date +%s) + 86400))

# Create market
curl -X POST http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"mutation { createMarket(question: \\\"Will it rain?\\\", outcomes: [\\\"Yes\\\", \\\"No\\\"], resolutionDeadline: $DEADLINE, initialLiquidity: \\\"1000000\\\") }\"
  }" | jq .
```

### Test dengan Script

```bash
./scripts/test-create-market.sh
```

## ✅ Verification

Setelah fix, response yang benar akan terlihat seperti:

```json
{
  "data": {
    "createMarket": 1
  }
}
```

Atau jika ada error dari contract (bukan GraphQL):

```json
{
  "data": null,
  "errors": [{
    "message": "Contract error: ..."
  }]
}
```

## 📚 Files Updated

1. ✅ `lib/services/registry.service.ts` - Updated CreateMarketParams
2. ✅ `components/CreateMarketForm.tsx` - Updated timestamp conversion
3. ✅ `GRAPHQL_CORRECT_FORMAT.md` - Complete documentation
4. ✅ `scripts/test-create-market.sh` - Test script

## 🎯 Key Takeaways

1. **Always use SECONDS for timestamps**, not milliseconds
2. **initialLiquidity must be a STRING**, not a number
3. **Response is direct value**, not an object with fields
4. **Parameter names must match Rust enum exactly** (camelCase in GraphQL)

## 🔗 Related

- [Rust Implementation](../market-chain/src/lib.rs) - MarketOperation enum
- [GraphQL Correct Format](GRAPHQL_CORRECT_FORMAT.md) - Complete guide
- [Test Script](../scripts/test-create-market.sh) - Testing tool
