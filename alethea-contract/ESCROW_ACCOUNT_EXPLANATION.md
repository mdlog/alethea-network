# Penjelasan Akun Escrow

## 🏦 Akun Escrow: Registry Escrow Account

### Definisi
**Escrow account** adalah akun khusus di Token Contract yang menyimpan semua token ALTH yang di-stake oleh voters.

### Cara Pembuatan Escrow Account

Escrow account **tidak dibuat secara eksplisit**, melainkan **derived (diturunkan)** dari Registry Application ID menggunakan formula deterministik:

```rust
// Di Token Contract (alethea-token/src/contract.rs)
let registry_owner = AccountOwner::Address32(
    to_registry.application_description_hash.into()
);
```

### Detail Teknis

1. **Source**: Registry Application ID (`ApplicationId`)
2. **Derivation**: Mengambil `application_description_hash` dari Application ID
3. **Format**: Dikonversi menjadi `AccountOwner::Address32` (32-byte address)
4. **Deterministik**: Setiap Registry App ID menghasilkan escrow address yang sama

### Contoh

Jika Registry Application ID adalah:
```
e557a2b2c668d1cbf4774694f55cade4c71a9723bf70d8f69afeac9b088aeed7
```

Maka escrow account address adalah:
```
Address32(application_description_hash dari App ID tersebut)
```

### Lokasi Escrow Account

**Escrow account berada di Token Contract**, bukan di Registry Contract.

- **Chain**: User's chain (chain dimana user melakukan staking)
- **Contract**: Token Contract (`alethea-token`)
- **Storage**: `state.balances[registry_owner]`

### Fungsi Escrow Account

1. **Menyimpan Staked Tokens**
   - Ketika user stake, token dipindah dari user balance → escrow balance
   - Semua staked tokens dari semua voters disimpan di satu escrow account

2. **Menyimpan Reward Tokens**
   - Ketika query resolve, reward tokens di-mint langsung ke escrow account
   - Reward kemudian bisa di-claim oleh voters

3. **Mengembalikan Unstaked Tokens**
   - Ketika user unstake, token dipindah dari escrow balance → user balance

### Flow Staking dengan Escrow

```
1. User Balance: 1000 ALTH
   Escrow Balance: 0 ALTH

2. User stakes 150 ALTH
   → Token Contract: SendStakeRequest
   → Deduct: User Balance -150
   → Credit: Escrow Balance +150

3. Result:
   User Balance: 850 ALTH
   Escrow Balance: 150 ALTH ✅
```

### Flow Reward dengan Escrow

```
1. Query resolves with 59.4 ALTH reward
   → Registry Contract: MintReward
   → Token Contract: Mint 59.4 ALTH to escrow
   
2. Result:
   Escrow Balance: 150 + 59.4 = 209.4 ALTH ✅
   Total Supply: +59.4 ALTH ✅
```

### Flow Unstaking dengan Escrow

```
1. Escrow Balance: 209.4 ALTH
   User Balance: 850 ALTH

2. User unstakes 50 ALTH
   → Token Contract: SendUnstakeRequest
   → Deduct: Escrow Balance -50
   → Credit: User Balance +50

3. Result:
   Escrow Balance: 159.4 ALTH ✅
   User Balance: 900 ALTH ✅
```

### Query Escrow Balance

Untuk query escrow balance dari GraphQL:

```graphql
query {
  registryBalance(registryAppId: "e557a2b2c668d1cbf4774694f55cade4c71a9723bf70d8f69afeac9b088aeed7")
}
```

Atau langsung query balance dengan owner:

```graphql
query {
  balance(owner: "0x<application_description_hash>")
}
```

### Catatan Penting

1. **Satu Escrow untuk Semua**: Semua voters share satu escrow account (registry escrow)
2. **Per-Chain**: Escrow account ada di setiap chain dimana user melakukan staking
3. **Deterministik**: Escrow address selalu sama untuk Registry App ID yang sama
4. **Tidak Ada Private Key**: Escrow account tidak punya private key, hanya bisa diakses oleh Token Contract logic

### Keamanan

- ✅ Escrow account hanya bisa diakses melalui Token Contract operations
- ✅ Registry Contract tidak bisa langsung mengakses escrow (harus via Token Contract)
- ✅ User tidak bisa langsung withdraw dari escrow (harus via unstake operation)
