# 🔧 Fix: Service Layer "Failed to load state: BcsError(Eof)"

**Error:** `Failed to load state: BcsError(Eof)`  
**Location:** `oracle-registry-v2/src/service.rs:468`  
**Cause:** Service layer mencoba load state sebelum contract instantiation selesai

---

## 🔍 Root Cause

Error ini terjadi karena:

1. **Service dipanggil sebelum instantiation selesai**
   - GraphQL service bisa dipanggil sebelum `instantiate()` selesai
   - State belum di-save ke storage

2. **RootView::load() mencoba deserialize state yang belum ada**
   - BCS deserialization gagal karena data belum ada
   - Error "Eof" (End of File) menunjukkan tidak ada data untuk di-deserialize

---

## ✅ Fix Applied

### **1. Improved Error Handling in Service Layer**

**File:** `oracle-registry-v2/src/service.rs`

**Change:**
- Service layer sekarang handle error dengan lebih baik
- Return helpful error message jika state belum initialized
- Tidak panic, tapi return GraphQL error yang informatif

**Code:**
```rust
async fn handle_query(&self, request: Request) -> Response {
    // ... schema setup ...
    
    let response = schema.execute(request).await;
    
    // Check if response contains state initialization errors
    if let Some(errors) = response.errors.first() {
        if errors.message.contains("Failed to load state") || errors.message.contains("Eof") {
            return Response::from(
                async_graphql::Error::new("Contract state not initialized yet...")
            );
        }
    }
    
    response
}
```

---

## 🎯 Solution

### **Option 1: Wait for Instantiation (Recommended)**

Setelah deployment, tunggu beberapa detik sebelum menggunakan service:

```bash
# After deployment
sleep 5  # Wait for instantiation to complete

# Then use service
curl http://localhost:8080/health
```

### **Option 2: Verify Instantiation**

Pastikan contract benar-benar di-instantiate:

```bash
# Method 1: Cek melalui GraphQL query (Recommended)
# CHAIN_ID dan REGISTRY_APP_ID dari deployment terakhir
CHAIN_ID="9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec"
REGISTRY_APP_ID="1735c8a06c17b74918b614ba8b044a32ed30accc075e87ab836fefbf95c8c892"

# Pastikan linera service berjalan
curl -X POST http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_APP_ID \
  -H 'Content-Type: application/json' \
  -d '{"query": "{ parameters { minStake } }"}'

# Jika berhasil, berarti contract sudah di-instantiate
# Jika error "Failed to load state: BcsError(Eof)", berarti belum di-instantiate

# Method 2: Menggunakan CHAIN_ID dari deployment-info.txt
CHAIN_ID=$(grep "^CHAIN_ID=" alethea-contract/deployment-info.txt | cut -d'=' -f2)
REGISTRY_APP_ID=$(grep "^REGISTRY_APP_ID=" alethea-contract/deployment-info.txt | cut -d'=' -f2)

curl -X POST http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_APP_ID \
  -H 'Content-Type: application/json' \
  -d '{"query": "{ statistics { totalQueriesCreated } }"}'

# Method 3: Cek melalui linera wallet show
linera wallet show | grep -A 5 "$REGISTRY_APP_ID"
```

### **Option 3: Rebuild & Redeploy**

Jika masalah persist, rebuild kontrak:

```bash
cd alethea-contract/oracle-registry-v2
cargo build --release --target wasm32-unknown-unknown
cd ../scripts
./deploy-complete-system.sh
```

---

## 🔍 Verification

Setelah fix, verify service berfungsi:

```bash
# Test simple query
curl -X POST http://localhost:8080/chains/<CHAIN_ID>/applications/<REGISTRY_APP_ID> \
  -H 'Content-Type: application/json' \
  -d '{"query": "{ statistics { totalQueriesCreated } }"}'
```

**Expected:** Should return data or helpful error (not panic)

---

## 📝 Notes

- Error ini **normal** jika service dipanggil terlalu cepat setelah deployment
- Fix ini membuat error lebih informatif, bukan menghilangkan error
- **Best Practice:** Tunggu beberapa detik setelah deployment sebelum menggunakan service

---

## 🔧 Troubleshooting: "RuntimeError: unreachable"

Jika Anda melihat error `RuntimeError: unreachable` saat query GraphQL, ini berarti:

1. **Contract belum di-instantiate** - State belum di-save ke storage
2. **Instantiation belum selesai** - Perlu menunggu lebih lama
3. **State tidak tersinkronisasi** - Perlu sync dan process-inbox

### **Solusi Langkah-demi-Langkah:**

```bash
# 1. Sync chain
linera sync

# 2. Process inbox (penting untuk memproses instantiation)
linera process-inbox

# 3. Tunggu beberapa detik
sleep 5

# 4. Verifikasi dengan script otomatis
cd alethea-contract/scripts
./verify-and-fix-instantiation.sh
```

### **Jika Masih Error:**

1. **Cek apakah contract benar-benar di-deploy:**
   ```bash
   linera wallet show | grep -A 5 "$REGISTRY_APP_ID"
   ```

2. **Cek deployment logs** untuk error instantiation

3. **Redeploy jika perlu:**
   ```bash
   cd alethea-contract/scripts
   ./deploy-complete-system.sh
   ```

---

**Last Updated:** 1 Februari 2026  
**Status:** Fixed + Troubleshooting Guide Added
