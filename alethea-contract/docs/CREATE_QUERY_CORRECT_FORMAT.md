# Format Benar untuk Create Query via GraphQL

## ⚠️ Error yang Sering Terjadi

**Error:**
```json
{
  "errors": [
    {
      "message": "Field \"createQuery\" must not have a selection since type \"String\" has no subfields"
    }
  ]
}
```

**Penyebab:** Mutation `createQuery` mengembalikan `String` (JSON string), bukan object GraphQL.

## ✅ Format yang Benar

### Format GraphQL Mutation

```graphql
mutation {
  createQuery(...) 
}
```

**TIDAK perlu selection** seperti `{ success message }` karena return type adalah `String`.

### Contoh Curl Command

```bash
curl -X POST http://localhost:8080/chains/9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec/applications/bee143d1a76cb7e0b8985002d70aca3b6807345b111a5b1f03248c3fe156a5ae \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createQuery(description: \"Did Bitcoin halving occur on or before April 20, 2024?\", outcomes: [\"Yes\", \"No\"], strategy: \"WeightedByStake\", minVotes: 3, rewardAmount: \"50000000000000000000\", deadline: \"1713571200000000\", durationSecs: 300) }"
  }'
```

## 📋 Contoh Query untuk Peristiwa yang Sudah Terjadi

### 1. Bitcoin Halving 2024

```bash
curl -X POST http://localhost:8080/chains/9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec/applications/bee143d1a76cb7e0b8985002d70aca3b6807345b111a5b1f03248c3fe156a5ae \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createQuery(description: \"Did Bitcoin halving occur on or before April 20, 2024?\", outcomes: [\"Yes\", \"No\"], strategy: \"WeightedByStake\", minVotes: 3, rewardAmount: \"50000000000000000000\", deadline: \"1713571200000000\", durationSecs: 300) }"
  }'
```

**Expected Response:**
```json
{
  "data": {
    "createQuery": "{\"success\":true,\"message\":\"Query creation scheduled\",\"description\":\"...\",\"outcomes\":[\"Yes\",\"No\"],...}"
  }
}
```

### 2. Ethereum Merge

```bash
curl -X POST http://localhost:8080/chains/9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec/applications/bee143d1a76cb7e0b8985002d70aca3b6807345b111a5b1f03248c3fe156a5ae \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createQuery(description: \"Was Ethereum Merge completed successfully on September 15, 2022?\", outcomes: [\"Yes\", \"No\"], strategy: \"WeightedByStake\", minVotes: 3, rewardAmount: \"50000000000000000000\", deadline: \"1663200000000000\", durationSecs: 300) }"
  }'
```

### 3. FIFA World Cup 2022

```bash
curl -X POST http://localhost:8080/chains/9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec/applications/bee143d1a76cb7e0b8985002d70aca3b6807345b111a5b1f03248c3fe156a5ae \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createQuery(description: \"Who won the FIFA World Cup 2022 final on December 18, 2022?\", outcomes: [\"Argentina\", \"France\"], strategy: \"WeightedByStake\", minVotes: 3, rewardAmount: \"50000000000000000000\", deadline: \"1671321600000000\", durationSecs: 300) }"
  }'
```

## 🔍 Verifikasi Query Setelah Dibuat

```bash
# Sync dan process inbox
linera sync && linera process-inbox

# Check queries
curl -X POST http://localhost:8080/chains/9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec/applications/bee143d1a76cb7e0b8985002d70aca3b6807345b111a5b1f03248c3fe156a5ae \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ queries { id description status outcomes } }"
  }'
```

## 📝 Parameter Mutation

- `description`: String - Pertanyaan/deskripsi query
- `outcomes`: Array[String] - Daftar outcomes (min 2, max 100)
- `strategy`: String - "Majority", "Median", "WeightedByStake", atau "WeightedByReputation"
- `minVotes`: Int (optional) - Minimum votes required
- `rewardAmount`: String - Jumlah reward dalam attos (contoh: "50000000000000000000" = 50 ALTH)
- `deadline`: String (optional) - Timestamp dalam microseconds
- `durationSecs`: Int (optional) - Durasi voting dalam detik

## 🎯 Langkah Setelah Create Query

1. **Sync dan Process:**
   ```bash
   linera sync && linera process-inbox
   ```

2. **Vote pada Query:**
   - Via dashboard: Buka query dan vote
   - Via GraphQL: Gunakan mutation `submitVote`

3. **Resolve Query:**
   - Otomatis setelah deadline + duration
   - Atau manual via mutation `resolveQuery`
