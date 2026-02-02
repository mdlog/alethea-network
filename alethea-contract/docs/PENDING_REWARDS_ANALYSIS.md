# Analisis Pending Rewards yang Besar

## 🔍 Masalah

Voter memiliki pending rewards yang sangat besar: **152,460,217.8 ALTH**

Dari data:
- **Stake**: 200 ALTH
- **Pending Rewards**: 152,460,217.8 ALTH
- **Total Votes**: 2
- **Correct Votes**: 2
- **Queries Resolved**: 2 queries dengan reward masing-masing 100 ALTH

## 📊 Analisis

### Perhitungan Normal

Jika rewards hanya dari query rewards:
- Query 1: 100 ALTH reward
- Query 2: 100 ALTH reward
- **Total Expected**: ~200 ALTH (dengan multiplier)

Tapi pending rewards adalah **152,460,217.8 ALTH** - ini **762,301x lebih besar** dari expected!

### Kemungkinan Penyebab

#### 1. **Format Display Issue (Kemungkinan Besar)**

Nilai `pending_rewards` mungkin ditampilkan dalam **attos** (unit terkecil), bukan dalam **tokens**.

**Konversi:**
- 1 ALTH = 10^18 attos
- 152,460,217.8 attos = 0.0000001524602178 ALTH

Tapi ini terlalu kecil, jadi kemungkinan bukan ini.

#### 2. **Bug dalam Perhitungan Rewards**

Ada kemungkinan bug di fungsi `calculate_voter_reward` atau `distribute_rewards` yang menyebabkan:
- Rewards dikalikan berkali-kali
- Ada overflow atau perhitungan yang salah
- Inflation rewards ditambahkan berkali-kali

#### 3. **Inflation Rewards Ditambahkan**

Jika ada inflation mechanism yang menambahkan rewards per query:
- Mungkin ada perhitungan inflation yang salah
- Inflation rewards mungkin terlalu besar

#### 4. **Unit Conversion Error**

Kemungkinan ada masalah dalam konversi antara:
- `Amount` (dalam attos)
- Display format (tokens)
- Perhitungan rewards

## 🔬 Investigasi Lebih Lanjut

### Cek Format Amount

```rust
// Di service.rs line 554
pending_rewards: pending_rewards.to_string(),
```

`Amount::to_string()` mungkin menampilkan dalam attos, bukan tokens.

### Cek Perhitungan Rewards

Di `contract.rs` line 5283:
```rust
let new_pending = Amount::from_attos(current_value + reward_value);
```

Kedua nilai (`current_value` dan `reward_value`) seharusnya sudah dalam attos.

### Cek Query Rewards

Query rewards adalah:
- Query 1: 100 ALTH = 100 * 10^18 attos = 1e20 attos
- Query 2: 100 ALTH = 100 * 10^18 attos = 1e20 attos

Dengan reputation multiplier (100% = 1.2x) dan protocol fee deduction:
- Base reward per query: ~100 ALTH
- Dengan multiplier: ~120 ALTH per query
- Total untuk 2 queries: ~240 ALTH

Tapi pending rewards adalah **152,460,217.8** - ini jauh lebih besar!

## 🎯 Kemungkinan Root Cause

### Scenario 1: Display Format Issue

Jika `pending_rewards.to_string()` menampilkan dalam attos:
- 152,460,217.8 attos = 0.0000001524602178 ALTH ✅ **Masuk akal!**

Tapi ini terlalu kecil untuk 2 queries dengan 100 ALTH reward.

### Scenario 2: Rewards Dikalikan Berulang

Mungkin ada bug di mana rewards ditambahkan berkali-kali:
- Setiap kali query resolve, rewards ditambahkan
- Tapi mungkin ada loop atau perhitungan yang salah
- Atau rewards dari query lain juga masuk

### Scenario 3: Inflation Mechanism

Jika ada inflation rewards yang ditambahkan:
- Mungkin ada perhitungan inflation yang salah
- Inflation rate mungkin terlalu tinggi
- Atau inflation ditambahkan berkali-kali

## 🔧 Cara Verifikasi

### 1. Cek Raw Value dalam Attos

```bash
# Query langsung ke contract state
curl -X POST http://localhost:8080/chains/{CHAIN_ID}/applications/{REGISTRY_APP_ID} \
  -H "Content-Type: application/json" \
  -d '{"query": "{ voters { address pendingRewards } }"}'
```

### 2. Cek Query Rewards

```bash
# Cek reward amount dari queries
curl -X POST http://localhost:8080/chains/{CHAIN_ID}/applications/{REGISTRY_APP_ID} \
  -H "Content-Type: application/json" \
  -d '{"query": "{ queries { id rewardAmount } }"}'
```

### 3. Cek Protocol Parameters

```bash
# Cek inflation rate dan parameters
curl -X POST http://localhost:8080/chains/{CHAIN_ID}/applications/{REGISTRY_APP_ID} \
  -H "Content-Type: application/json" \
  -d '{"query": "{ protocolParameters { inflationRateBps inflationRewardPerQuery } }"}'
```

## 💡 Kesimpulan Sementara

**Kemungkinan besar**: Ada masalah dengan **format display** atau **unit conversion**.

Nilai `152,460,217.8` kemungkinan adalah:
1. **Dalam attos** (bukan tokens) - tapi terlalu kecil
2. **Hasil dari bug** dalam perhitungan rewards
3. **Hasil dari inflation mechanism** yang salah

**Rekomendasi**:
1. Cek raw value dalam contract state
2. Verifikasi perhitungan rewards di contract
3. Cek apakah ada inflation mechanism yang aktif
4. Verifikasi format display di service.rs

## 🔍 Next Steps

1. **Cek raw pending_rewards value** dari contract state
2. **Trace reward calculation** untuk query 1 dan 2
3. **Verifikasi inflation mechanism** jika ada
4. **Fix display format** jika memang masalah format
