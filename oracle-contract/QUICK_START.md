# 🚀 Oracle Contract - Quick Start

## ⚡ TL;DR

```bash
# 1. Build
cd oracle-contract
./build.sh

# 2. Deploy
./deploy.sh

# 3. Test
curl -X POST "http://localhost:8080/chains/CHAIN/applications/ORACLE_APP" \
  -d '{"query":"mutation { commitVote(queryId: 0, commitHash: \"abc123\") }"}'
```

## 📁 Project Structure

```
oracle-contract/
├── src/
│   ├── lib.rs          # ABI definitions
│   ├── state.rs        # State management
│   ├── contract.rs     # Contract logic (WASM binary)
│   └── service.rs      # GraphQL service (WASM binary)
├── Cargo.toml          # Dependencies
├── build.sh            # Build script
├── deploy.sh           # Deployment script
└── README.md           # Full documentation
```

## 🔧 Build Output

After `./build.sh`:
```
target/wasm32-unknown-unknown/release/
├── oracle-contract.wasm  # Contract binary
└── oracle-service.wasm   # Service binary
```

## 📡 GraphQL API

### Queries

```graphql
# Get next query ID
query { nextQueryId }

# Get specific query
query { query(id: 0) { id question outcomes status } }

# Get all queries
query { queries { id question status } }
```

### Mutations

```graphql
# Create query
mutation {
  createQuery(
    question: "Will BTC reach $100k?"
    outcomes: ["Yes", "No"]
    deadline: 1735689600000
  )
}

# Commit vote
mutation {
  commitVote(
    queryId: 0
    commitHash: "e14c1f09965683b0..."
  )
}

# Reveal vote
mutation {
  revealVote(
    queryId: 0
    value: "Yes"
    salt: "random_salt_123"
  )
}

# Resolve query
mutation {
  resolveQuery(queryId: 0)
}
```

## 🧪 Testing

### 1. Create Query
```bash
curl -X POST "http://localhost:8080/chains/$CHAIN/applications/$APP" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createQuery(question: \"Test?\", outcomes: [\"Yes\", \"No\"], deadline: 1735689600000) }"
  }'
```

### 2. Commit Vote
```bash
# Generate hash
HASH=$(echo -n "Yesrandom_salt" | sha256sum | cut -d' ' -f1)

curl -X POST "http://localhost:8080/chains/$CHAIN/applications/$APP" \
  -d "{\"query\": \"mutation { commitVote(queryId: 0, commitHash: \\\"$HASH\\\") }\"}"
```

### 3. Reveal Vote
```bash
curl -X POST "http://localhost:8080/chains/$CHAIN/applications/$APP" \
  -d '{"query": "mutation { revealVote(queryId: 0, value: \"Yes\", salt: \"random_salt\") }"}'
```

## ⚠️ Common Issues

### Build fails
```bash
rustup target add wasm32-unknown-unknown
cargo clean
./build.sh
```

### Deploy fails
```bash
# Check Linera service is running
linera service --port 8080

# Check wallet has balance
linera wallet show
```

### Mutation fails
```bash
# Check GraphQL schema
curl -X POST "http://localhost:8080/chains/$CHAIN/applications/$APP" \
  -d '{"query":"{ __schema { mutationType { fields { name } } } }"}'
```

## 📊 Status Check

```bash
# Check if deployed
curl -X POST http://localhost:8080 \
  -d '{"query":"query { chain(chainId: \"'$CHAIN'\") { applications { id } } }"}'

# Check queries
curl -X POST "http://localhost:8080/chains/$CHAIN/applications/$APP" \
  -d '{"query":"query { queries { id question status } }"}'
```

## 🔄 Update Flow

```bash
# 1. Make changes to src/
# 2. Rebuild
./build.sh

# 3. Redeploy
./deploy.sh

# 4. Restart dashboard
cd ../alethea-dashboard
npm run dev
```

## ✅ Success Checklist

- [ ] Build completes without errors
- [ ] Both WASM files generated
- [ ] Bytecode published successfully
- [ ] Application created
- [ ] `.env.local` updated
- [ ] GraphQL endpoint responds
- [ ] Can create query
- [ ] Can commit vote
- [ ] Can reveal vote
- [ ] Dashboard shows success

---

**Need help?** Check `README.md` for full documentation
