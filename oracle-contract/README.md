# 🔮 Oracle Contract

Linera smart contract for decentralized oracle voting using commit-reveal scheme.

## 📋 Features

- ✅ **Commit-Reveal Voting** - Privacy-preserving vote mechanism
- ✅ **Query Management** - Create and manage oracle queries
- ✅ **Vote Aggregation** - Automatic vote counting and resolution
- ✅ **Registry Integration** - Verifies voters against Registry app
- ✅ **Time-based Phases** - Automatic phase transitions

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│           Oracle Contract                    │
├─────────────────────────────────────────────┤
│                                             │
│  State:                                     │
│  ├── queries: Map<u64, Query>              │
│  ├── commits: Map<(u64, voter), hash>      │
│  └── votes: Map<(u64, voter), Vote>        │
│                                             │
│  Operations:                                │
│  ├── CreateQuery                            │
│  ├── CommitVote (Phase 1)                   │
│  ├── RevealVote (Phase 2)                   │
│  └── ResolveQuery                           │
│                                             │
└─────────────────────────────────────────────┘
```

## 🔄 Voting Flow

```
1. Market Expires (deadline reached)
   ↓
2. Commit Phase (24 hours)
   - Voters submit SHA-256(value + salt)
   - Votes are hidden
   ↓
3. Reveal Phase (24 hours)
   - Voters reveal value + salt
   - Contract verifies hash matches
   ↓
4. Resolution
   - Count votes
   - Determine winner (most votes)
   - Update market with result
```

## 🚀 Quick Start

### 1. Build Contract

```bash
./build.sh
```

This will:
- Build WASM binary
- Output to `target/wasm32-unknown-unknown/release/oracle.wasm`

### 2. Deploy Contract

```bash
./deploy.sh
```

This will:
- Publish bytecode to blockchain
- Create application instance
- Update `.env.local` with Oracle app ID

### 3. Verify Deployment

```bash
# Check application exists
curl -s -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{"query":"query { chain(chainId: \"YOUR_CHAIN_ID\") { applications { id } } }"}' \
  | jq
```

## 📡 GraphQL API

### Mutations

#### Create Query
```graphql
mutation {
  createQuery(
    question: "Will Bitcoin reach $100k in 2025?"
    outcomes: ["Yes", "No"]
    deadline: 1735689600000
  )
}
```

#### Commit Vote
```graphql
mutation {
  commitVote(
    queryId: 0
    commitHash: "e14c1f09965683b04c88b33d5db24f3653a6807b2b60931f4d1d7c4f4d686bbd"
  )
}
```

#### Reveal Vote
```graphql
mutation {
  revealVote(
    queryId: 0
    value: "Yes"
    salt: "random_salt_12345"
  )
}
```

#### Resolve Query
```graphql
mutation {
  resolveQuery(queryId: 0)
}
```

### Queries

#### Get Query
```graphql
query {
  query(id: 0) {
    id
    question
    outcomes
    status
    resolvedOutcome
  }
}
```

#### Get All Queries
```graphql
query {
  queries {
    id
    question
    status
  }
}
```

## 🔐 Security Features

### 1. Commit-Reveal Scheme

```
Commit: SHA-256("Yes" + "random_salt")
       = e14c1f09965683b0...

Reveal: value="Yes", salt="random_salt"
Verify: SHA-256(value + salt) == commit_hash
```

**Benefits:**
- ✅ Votes are private during commit phase
- ✅ Cannot change vote after commit
- ✅ Cannot see others' votes before reveal

### 2. Phase Validation

```rust
// Only allow commits during commit phase
if now < query.deadline || now >= query.commit_end {
    return Err(InvalidPhase);
}

// Only allow reveals during reveal phase
if now < query.commit_end || now >= query.reveal_end {
    return Err(InvalidPhase);
}
```

### 3. Voter Verification

```rust
// Check if voter is registered (via Registry app)
let is_registered = check_registry(voter);
if !is_registered {
    return Err(VoterNotRegistered);
}
```

## 📊 State Management

### Query State
```rust
pub struct Query {
    pub id: u64,
    pub question: String,
    pub outcomes: Vec<String>,
    pub deadline: u64,          // Market expiry
    pub commit_end: u64,        // deadline + 24h
    pub reveal_end: u64,        // commit_end + 24h
    pub status: QueryStatus,
    pub resolved_outcome: Option<String>,
}
```

### Vote State
```rust
// Commits (hidden)
commits: Map<(query_id, voter), commit_hash>

// Revealed votes
votes: Map<(query_id, voter), Vote>

pub struct Vote {
    pub voter: String,
    pub value: String,
    pub timestamp: u64,
}
```

## 🧪 Testing

### Manual Test Flow

```bash
# 1. Create query
curl -X POST http://localhost:8080/chains/CHAIN/applications/ORACLE_APP \
  -d '{"query":"mutation { createQuery(...) }"}'

# 2. Commit vote
curl -X POST http://localhost:8080/chains/CHAIN/applications/ORACLE_APP \
  -d '{"query":"mutation { commitVote(queryId: 0, commitHash: \"...\") }"}'

# 3. Reveal vote
curl -X POST http://localhost:8080/chains/CHAIN/applications/ORACLE_APP \
  -d '{"query":"mutation { revealVote(queryId: 0, value: \"Yes\", salt: \"...\") }"}'

# 4. Resolve query
curl -X POST http://localhost:8080/chains/CHAIN/applications/ORACLE_APP \
  -d '{"query":"mutation { resolveQuery(queryId: 0) }"}'
```

## 🔧 Configuration

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_ORACLE_APP_ID=<oracle_app_id>
NEXT_PUBLIC_REGISTRY_ID=<registry_app_id>
NEXT_PUBLIC_CHAIN_ID=<chain_id>
```

### Frontend Integration

```typescript
// lib/linera-operations.ts
const oracleAppId = process.env.NEXT_PUBLIC_ORACLE_APP_ID;
const url = `http://localhost:8080/chains/${chainId}/applications/${oracleAppId}`;

await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
        query: `mutation { commitVote(queryId: ${id}, commitHash: "${hash}") }`
    })
});
```

## 📈 Performance

- **State Size:** O(n) where n = number of queries + votes
- **Commit Operation:** O(1) - constant time
- **Reveal Operation:** O(1) - constant time + hash verification
- **Resolution:** O(v) where v = number of votes for query

## 🐛 Troubleshooting

### Build Errors

```bash
# Install Rust target
rustup target add wasm32-unknown-unknown

# Clean and rebuild
cargo clean
./build.sh
```

### Deployment Errors

```bash
# Check Linera service is running
linera service --port 8080

# Check wallet has balance
linera wallet show
```

### Runtime Errors

```bash
# Check application logs
linera service --port 8080 --verbose

# Query application state
curl -X POST http://localhost:8080/chains/CHAIN/applications/APP \
  -d '{"query":"query { queries { id status } }"}'
```

## 📚 References

- [Linera SDK Documentation](https://docs.linera.io)
- [Commit-Reveal Scheme](https://en.wikipedia.org/wiki/Commitment_scheme)
- [Oracle Design Patterns](https://docs.chain.link/architecture-overview/architecture-decentralized-model)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

---

**Status:** ✅ Ready for deployment  
**Version:** 0.1.0  
**Last Updated:** 2025-11-19
