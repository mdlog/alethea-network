# Oracle Application - Detail Parameter

**App ID:** `e798118f2608603f61f73888e57d17cac734f56df11b0de733943b7e3e274621`

**Deployed:** Nov 19, 2025

**Status:** ✅ Active

---

## 📋 Operations (Mutations)

Oracle Application mendukung 4 operasi utama:

### 1. CreateQuery

Membuat query/market baru untuk di-resolve oleh oracle.

#### Parameters:

```rust
CreateQuery {
    question: String,      // Pertanyaan yang akan di-resolve
    outcomes: Vec<String>, // Array kemungkinan hasil (2-10 options)
    deadline: u64,         // Unix timestamp dalam milliseconds
}
```

#### Contoh:

```graphql
mutation {
  createQuery(
    question: "Will Bitcoin reach $100k by Dec 31, 2025?"
    outcomes: ["Yes", "No"]
    deadline: 1735689600000
  )
}
```

#### Response:

```json
{
  "success": true,
  "message": "Query 0 created: Will Bitcoin reach $100k by Dec 31, 2025?"
}
```

#### Automatic Calculations:

Ketika query dibuat, sistem otomatis menghitung:
- `commit_end` = `deadline` + 24 jam (86,400,000 ms)
- `reveal_end` = `commit_end` + 24 jam (86,400,000 ms)

#### Validasi:

- ✅ `question` tidak boleh kosong
- ✅ `outcomes` harus memiliki minimal 2 opsi
- ✅ `deadline` harus di masa depan

---

### 2. CommitVote

Submit hash dari vote (Phase 1 commit-reveal).

#### Parameters:

```rust
CommitVote {
    query_id: u64,      // ID query yang akan di-vote
    commit_hash: String // SHA256 hash dari (value + salt)
}
```

#### Contoh:

```graphql
mutation {
  commitVote(
    queryId: 0
    commitHash: "a3c5f8d9e2b1c4a7f6e8d9c2b5a4f7e6d8c9b2a5f4e7d6c8b9a2f5e4d7c6b8a9"
  )
}
```

#### Response:

```json
{
  "success": true,
  "message": "Vote committed for query 0"
}
```

#### Hash Calculation:

```javascript
// JavaScript
const crypto = require('crypto');
const value = "Yes";
const salt = "random-string-12345";
const hash = crypto.createHash('sha256')
  .update(value + salt)
  .digest('hex');
```

```rust
// Rust
use sha2::{Sha256, Digest};

let value = "Yes";
let salt = "random-string-12345";
let mut hasher = Sha256::new();
hasher.update(value.as_bytes());
hasher.update(salt.as_bytes());
let hash = format!("{:x}", hasher.finalize());
```

#### Validasi:

- ✅ Query harus exist
- ✅ Harus dalam commit phase (`deadline` < now < `commit_end`)
- ✅ Voter belum commit sebelumnya
- ✅ `commit_hash` harus valid hex string (64 karakter)

#### Timing:

- **Start:** Setelah `deadline`
- **End:** `commit_end` (deadline + 24 jam)
- **Duration:** 24 jam

---

### 3. RevealVote

Reveal vote sebenarnya (Phase 2 commit-reveal).

#### Parameters:

```rust
RevealVote {
    query_id: u64,  // ID query
    value: String,  // Vote sebenarnya (harus salah satu dari outcomes)
    salt: String    // Salt yang sama dengan saat commit
}
```

#### Contoh:

```graphql
mutation {
  revealVote(
    queryId: 0
    value: "Yes"
    salt: "random-string-12345"
  )
}
```

#### Response:

```json
{
  "success": true,
  "message": "Vote revealed for query 0: Yes"
}
```

#### Verifikasi:

Sistem akan memverifikasi:
```
SHA256(value + salt) == commit_hash
```

Jika tidak match, reveal ditolak dengan error:
```json
{
  "success": false,
  "message": "Invalid reveal: hash mismatch"
}
```

#### Validasi:

- ✅ Query harus exist
- ✅ Harus dalam reveal phase (`commit_end` < now < `reveal_end`)
- ✅ Voter harus sudah commit sebelumnya
- ✅ Hash harus match dengan commit
- ✅ `value` harus salah satu dari `outcomes`

#### Timing:

- **Start:** Setelah `commit_end`
- **End:** `reveal_end` (commit_end + 24 jam)
- **Duration:** 24 jam

---

### 4. ResolveQuery

Finalisasi query dan hitung hasil berdasarkan votes.

#### Parameters:

```rust
ResolveQuery {
    query_id: u64  // ID query yang akan di-resolve
}
```

#### Contoh:

```graphql
mutation {
  resolveQuery(queryId: 0)
}
```

#### Response:

```json
{
  "success": true,
  "message": "Query 0 resolved: Some(\"Yes\")"
}
```

#### Resolution Logic:

1. Hitung semua revealed votes
2. Agregasi berdasarkan value
3. Outcome dengan votes terbanyak = winner
4. Update query status menjadi "Resolved"
5. Set `resolved_outcome`

#### Vote Counting:

```
Votes:
- "Yes": 7 votes
- "No": 3 votes

Winner: "Yes" (70% consensus)
```

#### Validasi:

- ✅ Query harus exist
- ✅ Reveal phase harus sudah selesai (now >= `reveal_end`)
- ✅ Query belum resolved sebelumnya

#### Timing:

- **Start:** Setelah `reveal_end`
- **No deadline:** Bisa di-resolve kapan saja setelah reveal phase

---

## 📊 Data Structures

### Query

```rust
pub struct Query {
    pub id: u64,                      // Unique query ID
    pub question: String,             // Pertanyaan
    pub outcomes: Vec<String>,        // Kemungkinan hasil
    pub deadline: u64,                // Deadline market (ms)
    pub commit_end: u64,              // Akhir commit phase (ms)
    pub reveal_end: u64,              // Akhir reveal phase (ms)
    pub status: String,               // "Active" | "Resolved"
    pub resolved_outcome: Option<String> // Hasil akhir (jika resolved)
}
```

#### GraphQL Query:

```graphql
query {
  query(id: 0) {
    id
    question
    outcomes
    deadline
    commitEnd
    revealEnd
    status
    resolvedOutcome
  }
}
```

#### Example Response:

```json
{
  "id": 0,
  "question": "Will Bitcoin reach $100k by Dec 31, 2025?",
  "outcomes": ["Yes", "No"],
  "deadline": 1735689600000,
  "commitEnd": 1735776000000,
  "revealEnd": 1735862400000,
  "status": "Resolved",
  "resolvedOutcome": "Yes"
}
```

---

### Vote

```rust
pub struct Vote {
    pub voter: String,     // Chain ID voter
    pub value: String,     // Vote value
    pub timestamp: u64     // Waktu reveal (microseconds)
}
```

**Note:** Votes tidak exposed via GraphQL untuk privacy. Hanya hasil agregasi yang visible.

---

## ⏱️ Timeline Example

Contoh timeline untuk query dengan deadline Dec 31, 2025 23:00 UTC:

```
Dec 31, 2025 23:00 UTC (1735689600000)
├─ Market Deadline
│  └─ Trading stops
│
├─ Commit Phase Start
│  ├─ Duration: 24 hours
│  ├─ Voters submit hash
│  └─ Votes hidden
│
Jan 1, 2026 23:00 UTC (1735776000000)
├─ Commit Phase End / Reveal Phase Start
│  ├─ Duration: 24 hours
│  ├─ Voters reveal actual votes
│  └─ System verifies hashes
│
Jan 2, 2026 23:00 UTC (1735862400000)
├─ Reveal Phase End
│  └─ Resolution can be triggered
│
Jan 2, 2026 23:00+ UTC
└─ Resolution
   ├─ Count votes
   ├─ Determine winner
   └─ Finalize result
```

---

## 🔐 Security Features

### 1. Commit-Reveal Protocol

**Mencegah:**
- Vote manipulation
- Voter collusion
- Last-minute vote changes
- Information leakage

**Cara Kerja:**
1. Commit: Voter submit hash (vote tersembunyi)
2. Reveal: Voter reveal vote + salt
3. Verify: System cek hash match
4. Aggregate: Hitung hasil

### 2. Hash Verification

```rust
fn compute_hash(value: &str, salt: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    hasher.update(salt.as_bytes());
    format!("{:x}", hasher.finalize())
}
```

**Properties:**
- Deterministic: Same input = same hash
- One-way: Cannot reverse hash to get value
- Collision-resistant: Hard to find two inputs with same hash

### 3. Phase Enforcement

```rust
// Commit Phase Check
if now < query.deadline || now >= query.commit_end {
    return Error("Not in commit phase");
}

// Reveal Phase Check
if now < query.commit_end || now >= query.reveal_end {
    return Error("Not in reveal phase");
}
```

### 4. Double-Vote Prevention

```rust
// Check if already committed
if commits.contains_key(&(query_id, voter)) {
    return Error("Already committed");
}
```

---

## 📈 State Management

### Storage Structure

```rust
pub struct OracleState {
    pub next_query_id: RegisterView<u64>,
    pub queries: MapView<u64, Query>,
    pub commits: MapView<(u64, String), String>,
    pub votes: MapView<(u64, String), Vote>,
}
```

### Storage Keys:

- `next_query_id`: Counter untuk query ID
- `queries[query_id]`: Query data
- `commits[(query_id, voter)]`: Commit hash
- `votes[(query_id, voter)]`: Revealed vote

### Storage Size:

Estimasi per query dengan 10 voters:
- Query: ~500 bytes
- Commits: 10 × 100 bytes = 1 KB
- Votes: 10 × 150 bytes = 1.5 KB
- **Total: ~2 KB per query**

---

## 🔄 Integration Example

### Complete Workflow

```typescript
import { AletheaClient } from '@alethea/sdk';
import crypto from 'crypto';

const client = new AletheaClient({
  oracleAppId: 'e798118f2608603f61f73888e57d17cac734f56df11b0de733943b7e3e274621',
  chainId: '8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef'
});

// 1. Create Query
const createResult = await client.createQuery({
  question: "Will Bitcoin reach $100k by Dec 31, 2025?",
  outcomes: ["Yes", "No"],
  deadline: Date.parse("2025-12-31T23:00:00Z")
});
const queryId = createResult.queryId;

// 2. Wait for deadline...

// 3. Commit Vote
const vote = "Yes";
const salt = crypto.randomBytes(32).toString('hex');
const hash = crypto.createHash('sha256')
  .update(vote + salt)
  .digest('hex');

await client.commitVote({
  queryId,
  commitHash: hash
});

// Store salt securely!
localStorage.setItem(`salt_${queryId}`, salt);

// 4. Wait for reveal phase...

// 5. Reveal Vote
const storedSalt = localStorage.getItem(`salt_${queryId}`);
await client.revealVote({
  queryId,
  value: vote,
  salt: storedSalt
});

// 6. Wait for reveal phase end...

// 7. Resolve Query
await client.resolveQuery({ queryId });

// 8. Get Result
const query = await client.getQuery(queryId);
console.log("Result:", query.resolvedOutcome);
```

---

## 🧪 Testing

### Test Scenarios

#### 1. Happy Path
```bash
# Create query
# Wait for commit phase
# Commit vote
# Wait for reveal phase
# Reveal vote
# Wait for reveal end
# Resolve query
# ✅ Success
```

#### 2. Invalid Reveal
```bash
# Commit with hash(Yes + salt1)
# Reveal with (No + salt1)
# ❌ Error: hash mismatch
```

#### 3. Late Commit
```bash
# Try to commit after commit_end
# ❌ Error: Not in commit phase
```

#### 4. Early Reveal
```bash
# Try to reveal before commit_end
# ❌ Error: Not in reveal phase
```

#### 5. Double Commit
```bash
# Commit once
# Try to commit again
# ❌ Error: Already committed
```

---

## 📚 Related Documentation

- [Commit-Reveal Security Analysis](../../COMMIT_REVEAL_SECURITY_ANALYSIS.md)
- [Oracle Registry Parameters](./ORACLE_REGISTRY_PARAMETERS.md)
- [Integration Guide](./SDK_INTEGRATION_GUIDE.md)
- [Architecture Overview](./ARCHITECTURE_SUMMARY.md)

---

## 🔗 Endpoints

### GraphQL Endpoint

```
http://localhost:8080/chains/8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef/applications/e798118f2608603f61f73888e57d17cac734f56df11b0de733943b7e3e274621
```

### Test in GraphQL Playground

```
http://localhost:8080/chains/8a80fe20.../applications/e798118f.../graphql
```

---

**Last Updated:** December 1, 2025

**Built with ❤️ on Linera Blockchain**
