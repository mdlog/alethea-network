# Bug Fix: Inflation Reward Calculation

## Bug Ditemukan

**Lokasi:** `oracle-registry-v2/src/state.rs` line 2039-2044

**Gejala:** Pending rewards voter sangat besar (~152 juta ALTH) untuk hanya 2 queries

**Root Cause:** Denominator dalam perhitungan inflation reward menggunakan `queries_this_year` yang bernilai 0, sehingga seluruh annual inflation target diberikan ke setiap query.

## Sebelum (BUGGY)

```rust
// Get query volume for current year
let queries_this_year = params.queries_this_year;
let volume = queries_this_year.max(1);  // volume = max(0, 1) = 1

// Calculate reward per query
let remaining_value: u128 = remaining.into();
let reward_value = remaining_value / volume as u128;
// 70,000,000 ALTH / 1 = 70,000,000 ALTH per query!
```

**Hasil:** Setiap query resolved memberikan 70 juta ALTH sebagai inflation reward.

## Sesudah (FIXED)

```rust
// BUG FIX: Use expected_queries_per_year as denominator, NOT queries_this_year
// Previously: queries_this_year (0) caused division by 1, giving entire annual target to first query
// Now: Use expected volume (10,000) to properly spread inflation across queries
let expected_volume = params.expected_queries_per_year.max(1) as u128;

// Calculate reward per query based on expected annual volume
let remaining_value: u128 = remaining.into();
let reward_value = remaining_value / expected_volume;
// 70,000,000 ALTH / 10,000 = 7,000 ALTH per query
```

**Hasil:** Setiap query resolved memberikan 7,000 ALTH (untuk Year 1 dengan 7% inflation).

## Perhitungan Detail

| Parameter | Nilai |
|-----------|-------|
| Total Supply | 1,000,000,000 ALTH |
| Year 1 Inflation Rate | 7% (700 bps) |
| Annual Inflation Target | 70,000,000 ALTH |
| Expected Queries/Year | 10,000 |
| **Reward per Query** | **7,000 ALTH** |

## Inflasi Tahunan yang Benar

| Year | Rate | Annual Target | Per Query |
|------|------|---------------|-----------|
| 1 | 7% | 70,000,000 ALTH | 7,000 ALTH |
| 2 | 6% | 60,000,000 ALTH | 6,000 ALTH |
| 3 | 5% | 50,000,000 ALTH | 5,000 ALTH |
| 4 | 3.5% | 35,000,000 ALTH | 3,500 ALTH |
| 5 | 2.5% | 25,000,000 ALTH | 2,500 ALTH |
| 6+ | 2% | 20,000,000 ALTH | 2,000 ALTH |

## Langkah Deploy

Setelah perbaikan, perlu deploy ulang contract:

```bash
cd /media/mdlog/mdlog/Project-MDlabs/alethea-network/alethea-contract/scripts
./deploy-2step-stable.sh
```

## Status

- [x] Bug identified
- [x] Fix implemented
- [x] Build successful
- [ ] Re-deployed to testnet
- [ ] Verified with new queries
