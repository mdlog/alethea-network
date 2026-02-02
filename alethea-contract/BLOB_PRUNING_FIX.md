# 🔥 Blob Pruning Fix - 2-Step Deployment

## Root Cause Analysis

### ❌ Masalah dengan `publish-and-create`

**Command yang bermasalah:**
```bash
linera publish-and-create <contract.wasm> <service.wasm> --json-argument '...'
```

**Kenapa bermasalah di Conway Testnet:**

1. **Shortcut Operation**
   - `publish-and-create` = upload blob + create app + commit certificate sekaligus
   - Blob tidak sempat ter-replicate ke semua validators
   - Certificate sudah dibuat sebelum blob stabil

2. **Blob Storage Tidak Durable**
   - Validator boleh prune blob yang "tidak dirujuk cukup lama"
   - Isolated app (tanpa cross-reference) = paling cepat dipruning
   - App terlihat ada, tapi `ApplicationDescription` blob hilang

3. **Error Muncul Belakangan**
   - App sukses dibuat → kamu pakai app
   - Validator restart/rotate → blob di GC
   - Certificate replay → 💥 `Blob not found ApplicationDescription:<hash>`

### ✅ Solusi: 2-Step Deployment

**STEP 1: Publish Module**
```bash
linera publish-module \
  target/wasm32-unknown-unknown/release/oracle_registry_v2_contract.wasm \
  target/wasm32-unknown-unknown/release/oracle_registry_v2_service.wasm
```

**Output:** `Module ID: <MODULE_ID>`

**STEP 2: Create Application**
```bash
linera create-application \
  <MODULE_ID> \
  --json-argument '"Hub"'
```

**Output:** `Application ID: <APP_ID>`

**Keuntungan:**
- ✅ Blob disimpan dulu, validator sempat replicate
- ✅ Baru app dibuat setelah blob stabil
- ✅ Lebih aman dari pruning

## 📋 Perbandingan

| Aspect | `publish-and-create` | `publish-module` + `create-application` |
|--------|---------------------|------------------------------------------|
| **Speed** | ⚡ Cepat (1 command) | 🐢 Lebih lambat (2 commands + wait) |
| **Blob Stability** | ❌ Rawan pruning | ✅ Lebih stabil |
| **Testnet Safety** | ❌ Tidak aman | ✅ Aman |
| **Production Ready** | ✅ Bisa digunakan | ✅ Recommended |

## 🧪 Verifikasi Wajib

Setelah deploy, **WAJIB** verifikasi:

```bash
# Check application info
linera application info <APP_ID>

# Query application
linera query-application <APP_ID>
```

**Harus:**
- ❌ Tidak ada warning blob
- ✅ Info muncul konsisten
- ✅ Query berhasil

## 🧯 Best Practices

### ✅ 1. Jangan Pakai `publish-and-create` di Testnet

Gunakan hanya untuk:
- Local development
- Ephemeral devnet

### ✅ 2. Simpan Application ID di Env

```bash
export TOKEN_APP_ID=...
export REGISTRY_APP_ID=...
```

### ✅ 3. Cross-Reference untuk Blob Awet

Update Token dengan reference ke Registry:

```json
{
  "registry_app_id": "<REGISTRY_APP_ID>"
}
```

Cross-reference membuat blob lebih awet karena ada dependency chain.

## 🚀 Usage

### Deploy dengan Script Baru

```bash
cd alethea-contract/scripts
./deploy-2step-stable.sh
```

### Deploy Manual

```bash
# 1. Publish Token Module
TOKEN_MODULE_ID=$(linera publish-module \
  target/wasm32-unknown-unknown/release/alethea-token-contract.wasm \
  target/wasm32-unknown-unknown/release/alethea-token-service.wasm | grep -oP '[a-f0-9]{64}' | tail -1)

sleep 10  # Wait for blob replication

# 2. Create Token Application
TOKEN_APP_ID=$(linera create-application \
  "$TOKEN_MODULE_ID" \
  --json-parameters '{"name":"Alethea","symbol":"ALTH","decimals":18,"registry_app_id":null}' \
  --json-argument '{"admin":{"Chain":"<CHAIN_ID>"},"accounts":[]}' | grep -oP '[a-f0-9]{64}' | tail -1)

# 3. Publish Registry Module
REGISTRY_MODULE_ID=$(linera publish-module \
  target/wasm32-unknown-unknown/release/oracle_registry_v2_contract.wasm \
  target/wasm32-unknown-unknown/release/oracle_registry_v2_service.wasm | grep -oP '[a-f0-9]{64}' | tail -1)

sleep 10  # Wait for blob replication

# 4. Create Registry Application
REGISTRY_APP_ID=$(linera create-application \
  "$REGISTRY_MODULE_ID" \
  --json-argument '"Hub"' | grep -oP '[a-f0-9]{64}' | tail -1)
```

## 📝 Kesimpulan

**❌ Command lama (`publish-and-create`):**
- Sintaks benar ✅
- Operasional tidak aman di Conway testnet ❌
- Blob di-prune → ApplicationDescription hilang ❌

**✅ Fix (`publish-module` + `create-application`):**
- 2-step approach ✅
- Blob lebih stabil ✅
- Aman untuk testnet ✅

## 🔗 References

- [Linera CLI Documentation](https://linera.dev)
- Root cause analysis dari komunitas Linera
- Testnet blob storage behavior
