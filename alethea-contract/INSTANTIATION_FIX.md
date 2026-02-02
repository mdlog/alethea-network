# 🔧 Fix: Contract Not Instantiated - "Failed to load state: BcsError(Eof)"

**Error:** `Failed to load state: BcsError(Eof)` di `service.rs:468`  
**Root Cause:** Contract belum di-instantiate atau instantiation belum selesai

---

## 🔍 Diagnosis

Error ini terjadi karena:
1. **Contract di-deploy tapi belum di-instantiate**
   - `publish-and-create` berhasil, tapi `instantiate()` belum dipanggil
   - State belum di-save ke storage

2. **Instantiation message belum diproses**
   - Message instantiation ada di inbox tapi belum diproses
   - Perlu `linera process-inbox` untuk memprosesnya

3. **State tidak tersinkronisasi**
   - Chain state tidak sync dengan storage
   - Perlu `linera sync` untuk sinkronisasi

4. **Linera service memegang lock database**
   - `linera service` sedang berjalan dan memegang lock
   - `linera sync` dan `linera process-inbox` tidak bisa mengakses database
   - **Solusi:** Stop `linera service` dulu, process inbox, lalu start lagi

---

## ✅ Solusi Step-by-Step

### **⚠️ IMPORTANT: Handle Linera Service Lock**

Jika Anda melihat error:
```
RocksDB error: IO error: While lock file: .../LOCK: Resource temporarily unavailable
```

Ini berarti `linera service` sedang berjalan dan memegang lock. Ikuti langkah ini:

### **Step 0: Stop Linera Service (Jika Running)**

```bash
# Cek apakah linera service berjalan
curl -s http://localhost:8080/health > /dev/null 2>&1 && echo "Service running" || echo "Service not running"

# Jika running, stop dulu
pkill -f "linera service"
sleep 2
```

### **Step 1: Sync Chain**

```bash
linera sync
```

Ini akan sync chain state dengan storage.

### **Step 2: Process Inbox (CRITICAL!)**

```bash
linera process-inbox
```

**PENTING:** Ini adalah langkah yang paling penting! `process-inbox` akan memproses semua pending messages termasuk instantiation message.

### **Step 3: Tunggu Beberapa Detik**

```bash
sleep 5
```

Memberi waktu untuk state di-save ke storage.

### **Step 4: Start Linera Service Lagi**

```bash
linera service --port 8080 > /dev/null 2>&1 &
sleep 3
```

**Note:** Versi Linera terbaru memerlukan `--port` untuk di-specify secara eksplisit.

### **Step 5: Verifikasi**

```bash
# Load IDs dari deployment-info.txt
CHAIN_ID=$(grep "^CHAIN_ID=" alethea-contract/deployment-info.txt | cut -d'=' -f2)
REGISTRY_APP_ID=$(grep "^REGISTRY_APP_ID=" alethea-contract/deployment-info.txt | cut -d'=' -f2)

# Test GraphQL query
curl -X POST http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_APP_ID \
  -H 'Content-Type: application/json' \
  -d '{"query": "{ parameters { minStake } }"}'
```

**Expected Success:**
```json
{"data": {"parameters": {"minStake": "100000000000000000000"}}}
```

**Expected Error (jika masih belum instantiate):**
```json
{"error": ["...Failed to load state: BcsError(Eof)..."]}
```

---

## 🚀 Script Otomatis

Saya sudah membuat script untuk melakukan semua langkah di atas:

```bash
cd alethea-contract/scripts
./quick-fix-instantiation.sh
```

Script ini akan:
1. ✅ Cek apakah `linera service` berjalan
2. ✅ Stop service jika perlu (dengan konfirmasi)
3. ✅ Sync chain
4. ✅ Process inbox
5. ✅ Wait untuk state save
6. ✅ Restart service
7. ✅ Test GraphQL query
8. ✅ Berikan solusi jika masih error

---

## 🔄 Jika Masih Error Setelah Semua Langkah

### **Option 1: Cek Deployment Logs**

```bash
# Cek apakah contract benar-benar di-deploy
linera wallet show | grep -A 10 "$REGISTRY_APP_ID"
```

Jika contract tidak muncul, berarti deployment gagal.

### **Option 2: Cek Instantiation Message**

```bash
# Stop service dulu
pkill -f "linera service"

# Cek inbox untuk instantiation message
linera wallet show | grep -i "instantiate\|create"

# Process inbox lagi
linera process-inbox

# Start service lagi
linera service &
```

### **Option 3: Redeploy Contract**

Jika semua langkah di atas tidak membantu, redeploy contract:

```bash
cd alethea-contract/scripts

# Stop service dulu
pkill -f "linera service"

# Redeploy
./deploy-complete-system.sh

# Setelah deployment selesai, WAJIB jalankan:
linera sync
linera process-inbox
sleep 5

# Start service lagi
linera service &
```

---

## 📝 Best Practices

### **Setelah Deployment:**

1. **Stop linera service (jika running):**
   ```bash
   pkill -f "linera service"
   ```

2. **Selalu sync dan process inbox:**
   ```bash
   linera sync
   linera process-inbox
   ```

3. **Tunggu beberapa detik sebelum test:**
   ```bash
   sleep 5
   ```

4. **Start service lagi:**
   ```bash
   linera service --port 8080 &
   ```

5. **Verifikasi dengan GraphQL query:**
   ```bash
   curl -X POST http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_APP_ID \
     -H 'Content-Type: application/json' \
     -d '{"query": "{ parameters { minStake } }"}'
   ```

### **Troubleshooting Checklist:**

- [ ] Apakah `linera service` di-stop sebelum sync/process-inbox?
- [ ] Apakah `linera sync` berhasil?
- [ ] Apakah `linera process-inbox` berhasil?
- [ ] Apakah sudah menunggu beberapa detik setelah process-inbox?
- [ ] Apakah `linera service` di-start lagi?
- [ ] Apakah contract muncul di `linera wallet show`?
- [ ] Apakah GraphQL query masih error?

---

## 🎯 Quick Fix Command

Jika Anda ingin langsung fix tanpa membaca detail:

```bash
# Quick fix - jalankan semua langkah sekaligus
cd alethea-contract/scripts && \
pkill -f "linera service" ; \
sleep 2 && \
linera sync && \
linera process-inbox && \
sleep 5 && \
linera service > /dev/null 2>&1 & \
sleep 3 && \
./quick-fix-instantiation.sh
```

---

## ⚠️ Common Issues

### **Issue 1: "Resource temporarily unavailable"**

**Cause:** `linera service` sedang berjalan dan memegang lock database

**Solution:**
```bash
pkill -f "linera service"
# Then run sync and process-inbox
linera sync
linera process-inbox
# Then start service again
linera service &
```

### **Issue 2: "No messages to process"**

**Cause:** Inbox sudah kosong atau sudah diproses

**Solution:** Ini sebenarnya OK jika contract sudah di-instantiate. Cek dengan GraphQL query.

### **Issue 3: Contract tidak muncul di wallet**

**Cause:** Deployment gagal atau contract tidak benar-benar dibuat

**Solution:** Redeploy contract dengan `./deploy-complete-system.sh`

---

**Last Updated:** 1 Februari 2026  
**Status:** Complete Guide + Lock Handling
