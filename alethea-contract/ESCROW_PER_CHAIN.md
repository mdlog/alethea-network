# Escrow Account Per Chain

## 🎯 Konsep: Escrow Address vs Escrow Balance

### Escrow ADDRESS (Sama di Semua Chain)
Escrow **address** adalah **deterministik** dan **sama di semua chain** karena diturunkan dari Registry Application ID yang sama.

### Escrow BALANCE (Berbeda Per Chain)
Escrow **balance** berbeda per chain karena setiap chain punya state sendiri di Token Contract.

## 📐 Formula Escrow Address

```rust
// Formula yang sama di SEMUA chain
let registry_owner = AccountOwner::Address32(
    registry_app_id.application_description_hash.into()
);
```

**Hasil**: Escrow address selalu sama untuk Registry App ID yang sama, tidak peduli di chain mana.

## 🔍 Contoh: Escrow di Multiple Chains

### Scenario: 3 Users di 3 Chain Berbeda

```
Registry App ID: e557a2b2c668d1cbf4774694f55cade4c71a9723bf70d8f69afeac9b088aeed7

Chain A (User 1):
  Escrow Address: Address32(hash)  ← SAMA
  Escrow Balance: 150 ALTH          ← BERBEDA

Chain B (User 2):
  Escrow Address: Address32(hash)  ← SAMA
  Escrow Balance: 200 ALTH          ← BERBEDA

Chain C (User 3):
  Escrow Address: Address32(hash)  ← SAMA
  Escrow Balance: 100 ALTH          ← BERBEDA
```

## 🔄 Flow Staking Per Chain

### Chain A (User 1 staking 150 ALTH)

```
1. User 1 di Chain A memanggil SendStakeRequest
   → Operation dijalankan di Chain A (user's chain)
   
2. Token Contract di Chain A:
   - Deduct: User 1 balance -150 ALTH
   - Credit: Escrow balance +150 ALTH
   
3. Result di Chain A:
   User 1 Balance: 850 ALTH
   Escrow Balance: 150 ALTH ✅
```

### Chain B (User 2 staking 200 ALTH)

```
1. User 2 di Chain B memanggil SendStakeRequest
   → Operation dijalankan di Chain B (user's chain)
   
2. Token Contract di Chain B:
   - Deduct: User 2 balance -200 ALTH
   - Credit: Escrow balance +200 ALTH
   
3. Result di Chain B:
   User 2 Balance: 800 ALTH
   Escrow Balance: 200 ALTH ✅ (TERPISAH dari Chain A!)
```

## 🎯 Cara Menentukan Escrow di Chain Tertentu

### 1. Identifikasi Chain ID
```rust
let chain_id = self.runtime.chain_id(); // Chain dimana operation dijalankan
```

### 2. Derive Escrow Address (Sama di Semua Chain)
```rust
let registry_app_id = to_registry; // Registry App ID (sama di semua chain)
let registry_owner = AccountOwner::Address32(
    registry_app_id.application_description_hash.into()
);
```

### 3. Query Escrow Balance (Per Chain)
```rust
// Balance di chain ini (bukan chain lain!)
let escrow_balance = self.state.balances
    .get(&registry_owner)
    .await
    .ok()
    .flatten()
    .unwrap_or(Amount::ZERO);
```

## 📊 Query Escrow Balance dari GraphQL

### Query Escrow Balance di Chain Tertentu

```graphql
# Query escrow balance di Chain A
POST http://localhost:8080/chains/{CHAIN_A_ID}/applications/{TOKEN_APP_ID}
{
  "query": "query { registryBalance(registryAppId: \"e557a2b2...\") }"
}
# Result: "150." (balance di Chain A)

# Query escrow balance di Chain B
POST http://localhost:8080/chains/{CHAIN_B_ID}/applications/{TOKEN_APP_ID}
{
  "query": "query { registryBalance(registryAppId: \"e557a2b2...\") }"
}
# Result: "200." (balance di Chain B - BERBEDA!)
```

## 🔐 Keamanan: Escrow Isolation Per Chain

### ✅ Keuntungan Escrow Per Chain

1. **Isolation**: User di Chain A tidak bisa unstake dari escrow Chain B
2. **Performance**: Tidak perlu cross-chain sync untuk setiap staking operation
3. **Scalability**: Setiap chain manage escrow sendiri

### ⚠️ Catatan Penting

1. **Escrow Address Sama**: Semua chain menggunakan escrow address yang sama
2. **Escrow Balance Terpisah**: Setiap chain punya escrow balance sendiri
3. **Tidak Ada Global Escrow**: Tidak ada "global escrow" yang menggabungkan semua chain

## 🎯 Kesimpulan

**Escrow Address** = Deterministik dari Registry App ID (sama di semua chain)
**Escrow Balance** = Per-chain state (berbeda di setiap chain)

Untuk menentukan escrow di chain tertentu:
1. Gunakan Registry App ID (sama di semua chain)
2. Derive escrow address menggunakan formula deterministik
3. Query balance di chain yang dimaksud (bukan chain lain)
