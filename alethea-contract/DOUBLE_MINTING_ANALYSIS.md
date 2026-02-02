# 🔍 Analisis Detail: Double Minting Issue

**Tanggal**: 2026-01-31  
**Status**: ❌ **MASALAH DITEMUKAN**

## 📊 Data Aktual

- **Total Minted**: 405.90 ALTH
- **User Claimed**: 287.10 ALTH
- **Escrow Balance (Registry Chain)**: 405.90 ALTH
- **Protocol Treasury**: 1.0 ALTH

## 🔴 Masalah yang Ditemukan

### 1. **DOUBLE MINTING: Query Rewards**

#### Saat Query Resolve (line 5186-5219):
```rust
// Query rewards di-mint ke registry escrow
let mint_op = alethea_token::Operation::Mint {
    to: registry_owner,  // Registry escrow account
    amount: *reward,     // Query reward amount
};
// Mint dilakukan di sini (~100 ALTH dari query #3)
```

#### Saat Claim Rewards (line 5665-5684):
```rust
// pending_rewards (287.10 ALTH) di-mint LAGI
let mint_op = alethea_token::Operation::Mint {
    to: registry_owner,
    amount: pending_rewards,  // Termasuk query rewards yang sudah di-mint!
};
// Double minting terjadi di sini
```

**Hasil**: Query rewards di-mint **2x**:
- Pertama: saat resolve (~100 ALTH)
- Kedua: saat claim (termasuk dalam 287.10 ALTH)

### 2. **INFLATION REWARDS: Tidak Di-Mint Saat Resolve**

#### Saat Query Resolve (line 5366):
```rust
// Inflation rewards hanya ditambahkan ke pending_rewards
match self.state.distribute_inflation_reward(&correct_voter_infos).await {
    // TIDAK ada minting di sini!
    // Hanya menambahkan ke pending_rewards
}
```

#### Saat Claim:
```rust
// Inflation rewards baru di-mint saat claim
// Tapi query rewards juga di-mint lagi (double)
```

**Hasil**: 
- Inflation rewards (150 ALTH) baru di-mint saat claim
- Tapi query rewards juga ikut di-mint lagi (double)

### 3. **TIDAK ADA TRANSFER KE USER**

#### Masalah:
- Token di-mint ke **registry escrow account**
- Token **TIDAK pernah di-transfer** ke user
- User hanya dapat "stake increase" di registry state
- Token tetap di escrow (405.90 ALTH)

**Dampak**:
- User stake bertambah (487.10 ALTH)
- Tapi token real masih di escrow
- User tidak bisa menggunakan token tersebut

## 📈 Perhitungan Detail

### Token yang Di-Mint:

1. **Saat Query Resolve**:
   - Query #1: ~0 ALTH (sangat kecil)
   - Query #2: ~0 ALTH (sangat kecil)
   - Query #3: ~100 ALTH
   - **Total**: ~100 ALTH

2. **Saat Claim Rewards**:
   - pending_rewards: 287.10 ALTH
   - Termasuk: query rewards (~100) + inflation (~150) + lainnya
   - **Total**: 287.10 ALTH (termasuk double minting)

3. **Total Minted**: 405.90 ALTH
   - Query rewards (resolve): ~100 ALTH
   - Query rewards (claim, double): ~100 ALTH
   - Inflation rewards (claim): ~150 ALTH
   - Lainnya: ~55.90 ALTH

### Lokasi Token:

- **Escrow (Registry Chain)**: 405.90 ALTH ⭐
  - Semua token yang di-mint ada di sini
  - Tidak pernah di-transfer ke user

- **Escrow (User Chain)**: 200 ALTH
  - Stake awal yang di-escrow

- **User Balance**: 800 ALTH
  - Available untuk transfer/unstake

## 🎯 Root Cause

### Masalah Utama:

1. **Inkonsistensi Logika Minting**:
   - Query rewards: di-mint saat resolve
   - Inflation rewards: tidak di-mint saat resolve
   - Saat claim: semua pending_rewards di-mint (termasuk yang sudah di-mint)

2. **Tidak Ada Tracking**:
   - Tidak ada flag untuk menandai apakah rewards sudah di-mint
   - Tidak ada pemisahan antara "already minted" dan "not yet minted"

3. **Tidak Ada Transfer**:
   - Token di-mint ke escrow
   - Tapi tidak pernah di-transfer ke user
   - User hanya dapat "stake increase" di registry

## ✅ Solusi yang Diperlukan

### Opsi 1: Fix Claim Rewards (Recommended)

**Jangan mint lagi jika sudah di-mint saat resolve**

```rust
// Saat claim rewards:
// 1. Cek apakah rewards sudah di-mint (dari token holdings)
// 2. Jika sudah di-mint: transfer dari escrow ke user
// 3. Jika belum di-mint: mint baru

let current_holdings = self.state.token_holdings.get(&voter_chain).await;
if current_holdings >= pending_rewards {
    // Sudah di-mint, transfer dari escrow
    // Transfer dari registry escrow ke user
} else {
    // Belum di-mint, mint baru
    // Mint ke registry escrow
}
```

### Opsi 2: Ubah Logika Resolve

**Jangan mint saat resolve, hanya saat claim**

```rust
// Saat resolve:
// - Jangan mint query rewards
// - Hanya tambahkan ke pending_rewards

// Saat claim:
// - Mint semua pending_rewards (query + inflation)
// - Transfer ke user atau tambahkan ke stake
```

### Opsi 3: Pemisahan Tracking

**Track mana yang sudah di-mint dan mana yang belum**

```rust
// Tambahkan field baru:
struct RewardTracking {
    query_rewards_minted: Amount,
    inflation_rewards_minted: Amount,
    total_pending: Amount,
}

// Saat claim:
// - Hanya mint yang belum di-mint
// - Transfer yang sudah di-mint dari escrow
```

## 📝 Rekomendasi

**Solusi Terbaik**: Opsi 1 - Fix Claim Rewards

1. Cek token holdings sebelum mint
2. Jika sudah cukup: transfer dari escrow
3. Jika belum: mint baru
4. Pastikan transfer ke user terjadi (bukan hanya stake increase)

## 🔧 File yang Perlu Diperbaiki

1. `alethea-contract/oracle-registry-v2/src/contract.rs`:
   - `claim_rewards()` function (line 5655-5736)
   - Perlu cek apakah rewards sudah di-mint
   - Perlu transfer dari escrow jika sudah di-mint

2. `alethea-contract/oracle-registry-v2/src/contract.rs`:
   - `resolve_query()` function (line 5175-5255)
   - Perlu konsistensi: mint semua atau tidak sama sekali

## 📊 Impact

- **Total Minted**: 405.90 ALTH (seharusnya ~250 ALTH)
- **Double Minting**: ~155.90 ALTH extra
- **User Impact**: Token tidak pernah masuk ke balance user
- **Escrow**: 405.90 ALTH terperangkap di escrow

## ⚠️ Catatan

Masalah ini tidak mempengaruhi fungsi dasar sistem, tapi:
- Menyebabkan inflasi token yang tidak perlu
- Token tidak pernah masuk ke user balance
- Escrow balance tidak sesuai dengan stake
