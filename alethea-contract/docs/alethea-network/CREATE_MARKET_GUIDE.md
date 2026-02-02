# 📝 Create Test Market - Manual Guide

Karena GraphQL mutation tidak tersedia di service saat ini, kita perlu create market secara manual.

---

## 🎯 Option 1: Via GraphiQL IDE (Recommended)

### Step 1: Open GraphiQL

```
http://localhost:8080
```

### Step 2: Navigate to Application

Paste URL ini di browser:
```
http://localhost:8080/chains/a2c0349ae6add80c92e26bb383aca8d98f9f3441c3097fec99111199c7f1e221/applications/948a0e49dc424b3cfb0a997d7c7ef05b048c5f4184a2a4d546d6d7abae823261
```

### Step 3: Check Available Operations

Paste query ini untuk melihat operations yang tersedia:
```graphql
{
  __schema {
    mutationType {
      fields {
        name
        args {
          name
          type {
            name
          }
        }
      }
    }
  }
}
```

---

## 🎯 Option 2: Check Contract Source

Market creation mungkin perlu dilakukan via contract operation, bukan GraphQL.

### Check Contract Operations

```bash
# Lihat contract source
cat oracle-registry/src/contract.rs | grep -A 20 "pub enum Operation"
```

### Expected Operations:
```rust
pub enum Operation {
    CreateMarket {
        question: String,
        outcomes: Vec<String>,
        resolution_deadline: Timestamp,
        initial_liquidity: Amount,
    },
    // ... other operations
}
```

---

## 🎯 Option 3: Via Linera Wallet (If Available)

```bash
# Load environment
source .env.conway

# Calculate deadline (2 minutes from now)
DEADLINE=$(($(date +%s) * 1000000 + 120000000))

# Create operation JSON
cat > /tmp/create_market.json <<EOF
{
  "CreateMarket": {
    "question": "Test Market - Will this resolve in 2 minutes?",
    "outcomes": ["Yes", "No"],
    "resolution_deadline": $DEADLINE,
    "initial_liquidity": "1000000"
  }
}
EOF

# Execute (if command exists)
linera execute-operation \
  --application-id "$ALETHEA_REGISTRY_ID" \
  --operation "$(cat /tmp/create_market.json)"
```

---

## 🔍 Verify Market Created

After creating market, verify with:

```bash
source .env.conway

curl -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ activeMarkets { id question outcomes status createdAt deadline } }"}'
```

---

## 📊 Current Status

**Issue:** Service hanya expose queries, tidak ada mutations.

**Solution Options:**
1. ✅ Implement mutations di service.rs
2. ✅ Use contract operations directly
3. ✅ Create markets via wallet/CLI

**Recommended:** Implement GraphQL mutations di `oracle-registry/src/service.rs`

---

## 🛠️ Fix: Add Mutations to Service

Edit `oracle-registry/src/service.rs`:

```rust
#[Object]
impl MutationRoot {
    async fn create_market(
        &self,
        question: String,
        outcomes: Vec<String>,
        resolution_deadline: u64,
        initial_liquidity: String,
    ) -> Result<String, Error> {
        // Implementation here
        Ok("Market created".to_string())
    }
}
```

Then rebuild and redeploy.

---

**Status:** Waiting for mutation implementation or alternative method.

