# For Voters

## Bergabung Menjadi Voter di Alethea Network

Selamat datang! Panduan ini akan membantu Anda memahami cara bergabung dan berpartisipasi sebagai voter di Alethea Network.

## 🎯 Apa itu Voter?

Voter adalah partisipan penting dalam Alethea Network yang bertugas untuk:
- Memberikan suara pada resolusi market prediction
- Membantu menentukan hasil yang akurat dan terdesentralisasi
- Mendapatkan reward atas partisipasi yang jujur dan akurat

## 📋 Persyaratan

Untuk menjadi voter, Anda memerlukan:
1. **Linera Wallet** - Wallet yang kompatibel dengan Linera blockchain
2. **Chain ID** - Identitas chain Anda di Linera network
3. **Koneksi ke Alethea Oracle Registry** - Untuk registrasi sebagai voter

## 🚀 Cara Bergabung

### 1. Persiapan Wallet

Pastikan Anda memiliki Linera wallet yang sudah dikonfigurasi. Anda akan membutuhkan:
- Owner address dari wallet Anda
- Chain ID yang aktif

### 2. Registrasi sebagai Voter

Untuk mendaftar sebagai voter, Anda perlu mengirim transaksi registrasi ke Oracle Registry:

```bash
# Contoh registrasi voter
linera request-application <REGISTRY_APP_ID> \
  --operation '{"RegisterVoter": {}}'
```

Atau melalui GraphQL mutation:

```graphql
mutation {
  registerVoter
}
```

### 3. Verifikasi Registrasi

Setelah registrasi, Anda dapat memverifikasi status voter Anda:

```graphql
query {
  voters {
    address
    isActive
    totalVotes
    reputation
  }
}
```

## 🗳️ Cara Memberikan Suara

### Proses Voting

Alethea Network menggunakan sistem **commit-reveal** untuk menjaga integritas voting:

#### Phase 1: Commit Phase
Pada fase ini, Anda mengirimkan hash dari vote Anda (bukan vote sebenarnya):

```graphql
mutation {
  commitVote(
    queryId: "query-123",
    commitment: "hash-of-your-vote"
  )
}
```

#### Phase 2: Reveal Phase
Setelah commit phase selesai, Anda mengungkapkan vote sebenarnya:

```graphql
mutation {
  revealVote(
    queryId: "query-123",
    value: "actual-result",
    salt: "your-random-salt"
  )
}
```

### Contoh Workflow Lengkap

```javascript
// 1. Buat commitment
const vote = "Yes";
const salt = generateRandomSalt();
const commitment = hash(vote + salt);

// 2. Submit commitment (Commit Phase)
await submitCommitment(queryId, commitment);

// 3. Tunggu hingga Reveal Phase
await waitForRevealPhase(queryId);

// 4. Reveal vote (Reveal Phase)
await revealVote(queryId, vote, salt);
```

## 💰 Reward System

Voter yang berpartisipasi dengan jujur akan mendapatkan reward:

- **Voting Reward**: Diberikan untuk setiap vote yang valid
- **Accuracy Bonus**: Bonus tambahan jika vote Anda sesuai dengan konsensus mayoritas
- **Reputation Score**: Skor reputasi yang meningkat seiring partisipasi yang konsisten

## 📊 Monitoring Aktivitas Anda

Anda dapat memantau aktivitas voting Anda melalui:

### Dashboard Voter
Akses dashboard di: `https://alethea-dashboard.example.com/voter`

### Query Status Voter

```graphql
query {
  myVoterProfile {
    address
    totalVotes
    successfulVotes
    reputation
    rewards
    activeQueries {
      queryId
      phase
      deadline
    }
  }
}
```

## ⚠️ Best Practices

1. **Selalu Simpan Salt**: Salt yang digunakan saat commit phase harus disimpan dengan aman untuk reveal phase
2. **Vote dengan Jujur**: Sistem dirancang untuk memberikan reward kepada voter yang jujur
3. **Perhatikan Deadline**: Pastikan Anda submit vote sebelum deadline masing-masing phase
4. **Jaga Reputasi**: Reputasi yang baik akan meningkatkan bobot vote Anda

## 🔒 Keamanan

- Jangan bagikan private key wallet Anda
- Simpan salt dengan aman (gunakan password manager jika perlu)
- Verifikasi alamat contract sebelum melakukan transaksi

## 🆘 Troubleshooting

### Vote Tidak Terhitung
- Pastikan Anda sudah terdaftar sebagai voter
- Cek apakah Anda submit vote dalam phase yang benar
- Verifikasi bahwa salt yang digunakan saat reveal sama dengan saat commit

### Tidak Bisa Registrasi
- Pastikan wallet Anda memiliki balance yang cukup untuk gas fee
- Cek koneksi ke Linera network
- Verifikasi bahwa Oracle Registry application ID sudah benar

## 📚 Resources Tambahan

- [Key Concepts](./key-concepts.md) - Memahami konsep dasar Alethea
- [API Reference](./api-reference.md) - Dokumentasi lengkap API
- [Quick Reference - Voting](../guides/QUICK_REFERENCE_VOTING.md) - Referensi cepat untuk voting

## 💬 Dukungan

Jika Anda memiliki pertanyaan atau mengalami masalah:
- Buka issue di GitHub repository
- Bergabung dengan komunitas Discord
- Baca [Troubleshooting Guide](./troubleshooting.md)

---

**Selamat bergabung di Alethea Network! Partisipasi Anda membantu menciptakan oracle yang lebih terdesentralisasi dan akurat.**
