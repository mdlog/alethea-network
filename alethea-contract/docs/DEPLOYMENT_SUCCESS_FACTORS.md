# Faktor-Faktor yang Membuat Deployment & Instantiation Berhasil

## 📋 Ringkasan

Deployment dan instantiation berhasil karena kombinasi dari:
1. **2-Step Deployment Strategy** (mengatasi blob pruning)
2. **Format Init Argument yang Benar** (enum variant `"Hub"`)
3. **Sync & Process Inbox** (memproses instantiation message)
4. **Defensive Service Error Handling** (menghindari panic saat empty state)
5. **State Save Explicit** (memastikan state tersimpan setelah instantiate)

---

## 🔑 Faktor Kunci yang Membuat Deployment Berhasil

### 1. **2-Step Deployment Strategy**

**Masalah yang Diatasi:**
- `linera publish-and-create` tidak reliable di Conway testnet
- Blob bisa di-prune oleh validator sebelum instantiation message diproses
- Menyebabkan "Blob not found" errors

**Solusi:**
```bash
# Step 1: Publish module (upload bytecode)
linera publish-module contract.wasm service.wasm
# Output: Module ID (130 characters)

# Step 2: Wait untuk blob propagation
sleep 10

# Step 3: Create application dengan Module ID
linera create-application <MODULE_ID> --json-argument '"Hub"'
# Output: Application ID (64 characters)
```

**Mengapa Berhasil:**
- Module ID di-publish terlebih dahulu, memberikan waktu untuk blob propagation
- Application dibuat setelah blob tersedia di validators
- Mengurangi risiko "Blob not found" errors

---

### 2. **Format Init Argument yang Benar**

**Struktur Enum di `lib.rs`:**
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum InstantiationArgument {
    Hub,  // Unit variant
    Instance {
        hub_chain_id: ChainId,
    },
}
```

**Format JSON yang Benar:**
```bash
--json-argument '"Hub"'  # ✅ String literal untuk unit variant
```

**Format yang SALAH:**
```bash
--json-argument '{"Hub": null}'  # ❌ Object format
--json-argument 'Hub'           # ❌ Tanpa quotes
```

**Mengapa Penting:**
- Serde deserialization membutuhkan format yang tepat
- Format salah menyebabkan `Failed to deserialize instantiation argument`
- Contract tidak akan ter-instantiate jika argument salah

---

### 3. **Sync & Process Inbox**

**Proses di Deployment Script:**
```bash
# Step 6: Sync and Process Inbox
pkill -f "linera service" 2>/dev/null || true
sleep 2

linera sync          # Sync chain state dari validators
linera process-inbox # Process instantiation messages
```

**Mengapa Penting:**
- `create-application` mengirim instantiation message ke chain
- Message perlu di-process oleh `process-inbox`
- Tanpa `process-inbox`, `instantiate()` tidak pernah dipanggil
- State tidak akan ter-initialize

**Flow:**
```
create-application → Instantiation Message → process-inbox → instantiate() → state.save()
```

---

### 4. **Explicit State Save di Contract**

**Di `contract.rs` line 88-89:**
```rust
async fn instantiate(&mut self, argument: InstantiationArgument) {
    // ... initialization logic ...
    
    // Save state after initialization
    self.state.save().await.expect("Failed to save initial state");
}
```

**Mengapa Penting:**
- State harus di-save secara explicit setelah initialization
- Tanpa `save()`, state hanya ada di memory, tidak di storage
- Service akan gagal load state (BcsError(Eof)) jika tidak di-save
- Ini adalah best practice di Linera SDK

---

### 5. **Defensive Service Error Handling**

**Di `service.rs` line 474-497:**
```rust
async fn new(runtime: ServiceRuntime<Self>) -> Self {
    let state = match OracleRegistryV2::load(runtime.root_view_storage_context()).await {
        Ok(state) => state,
        Err(e) => {
            // Log detailed error dengan solusi
            eprintln!("❌ CRITICAL: Failed to load registry state: {:?}", e);
            eprintln!("   SOLUTION: Ensure contract is instantiated...");
            
            // Panic dengan message yang informatif
            panic!("Registry state not initialized...");
        }
    };
    // ...
}
```

**Mengapa Penting:**
- Memberikan error message yang jelas jika state belum ter-initialize
- Membantu debugging dengan informasi yang detail
- Mencegah silent failures
- Memberikan solusi yang jelas (run sync & process-inbox)

---

## 🔄 Alur Deployment yang Berhasil

### Step-by-Step Flow:

```
1. Build WASM
   ↓
2. Publish Module (publish-module)
   → Module ID returned
   ↓
3. Wait 10 seconds (blob propagation)
   ↓
4. Create Application (create-application)
   → Application ID returned
   → Instantiation message sent to chain
   ↓
5. Stop Service (unlock database)
   ↓
6. Sync Chain (linera sync)
   → Download latest chain state
   ↓
7. Process Inbox (linera process-inbox)
   → Process instantiation message
   → Call contract.instantiate()
   → Initialize state
   → Save state to storage
   ↓
8. Start Service
   ↓
9. Service.load() → Success ✅
   → State available for queries
```

---

## ✅ Checklist Deployment yang Berhasil

### Pre-Deployment:
- [ ] Build berhasil tanpa error
- [ ] WASM files generated di `target/wasm32-unknown-unknown/release/`
- [ ] Init argument format sudah benar (`"Hub"` untuk enum variant)

### Deployment:
- [ ] Module ID berhasil di-extract (130 characters)
- [ ] Delay 10 detik setelah publish-module
- [ ] Application ID berhasil di-extract (64 characters)
- [ ] Init argument format benar (`--json-argument '"Hub"'`)

### Post-Deployment:
- [ ] Service di-stop sebelum sync
- [ ] `linera sync` berhasil (tidak ada database lock error)
- [ ] `linera process-inbox` berhasil (memproses messages)
- [ ] Service di-start kembali
- [ ] GraphQL query berhasil (tidak ada BcsError(Eof))

---

## 🐛 Masalah yang Diatasi

### 1. **BcsError(Eof) - State Not Initialized**
**Penyebab:**
- Service dipanggil sebelum `instantiate()` diproses
- State tidak pernah di-save setelah initialization

**Solusi:**
- Defensive error handling di service.rs
- Explicit `state.save()` di contract.rs
- Pastikan `process-inbox` dipanggil setelah deployment

### 2. **Blob Not Found**
**Penyebab:**
- `publish-and-create` tidak reliable di testnet
- Validators prune blob sebelum instantiation

**Solusi:**
- 2-step deployment (publish-module → create-application)
- Delay 10 detik untuk blob propagation

### 3. **Failed to Deserialize Instantiation Argument**
**Penyebab:**
- Format JSON argument salah
- Enum variant tidak sesuai dengan struct

**Solusi:**
- Gunakan format yang benar: `'"Hub"'` untuk unit variant
- Pastikan format sesuai dengan `InstantiationArgument` enum

---

## 📊 Perbandingan: Sebelum vs Sesudah

### Sebelum Perbaikan:
```
❌ publish-and-create → Blob not found
❌ Service panic dengan BcsError(Eof)
❌ Tidak ada error message yang jelas
❌ Instantiation tidak reliable
```

### Sesudah Perbaikan:
```
✅ 2-step deployment → Blob tersedia
✅ Defensive error handling → Error message jelas
✅ Explicit state save → State tersimpan
✅ Sync & process-inbox → Instantiation reliable
✅ Query berhasil → Application berfungsi
```

---

## 🎯 Kesimpulan

Deployment dan instantiation berhasil karena:

1. **Strategi yang Tepat**: 2-step deployment mengatasi blob pruning
2. **Format yang Benar**: Init argument sesuai dengan enum structure
3. **Proses yang Lengkap**: Sync & process-inbox memastikan instantiation diproses
4. **Error Handling yang Baik**: Defensive handling memberikan feedback yang jelas
5. **State Management yang Benar**: Explicit save memastikan state tersimpan

**Kunci Sukses:**
- Mengikuti best practices Linera SDK
- Memahami flow deployment dan instantiation
- Menangani edge cases (blob pruning, empty state)
- Memberikan error messages yang informatif

---

## 📚 Referensi

- [Linera Documentation - Deployment](https://linera.io/docs)
- [BLOB_PRUNING_FIX.md](./BLOB_PRUNING_FIX.md)
- [deploy-2step-stable.sh](../scripts/deploy-2step-stable.sh)
- [service.rs](../oracle-registry-v2/src/service.rs) - Line 465-497
- [contract.rs](../oracle-registry-v2/src/contract.rs) - Line 41-90
