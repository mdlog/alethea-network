# Manual Deployment Guide - Hub-and-Spoke Architecture

Panduan ini berisi langkah-langkah manual untuk deploy Alethea Oracle dengan arsitektur Hub-and-Spoke.

## Chain IDs (Existing Deployment)

| Component | Chain ID |
|-----------|----------|
| Registry (HUB) | `36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2` |
| Market | `268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f` |

## Prerequisites

- Linera CLI sudah terinstall
- Linera service sudah berjalan (`linera service`)
- Rust toolchain dengan target `wasm32-unknown-unknown`

---

## Step 1: Build WASM Contracts

```bash
# Build Oracle Registry
cargo build --release --target wasm32-unknown-unknown -p oracle-registry-v2

# Build Simple Market
cargo build --release --target wasm32-unknown-unknown -p simple-market
```

Verifikasi file WASM sudah ada:
```bash
ls -la target/wasm32-unknown-unknown/release/*.wasm
```

---

## Step 2: Cek Wallet Info

```bash
linera wallet show
```

---

## Step 3: Deploy Registry sebagai HUB

Switch ke Registry chain dulu:
```bash
linera wallet set-default 36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2
```

Deploy:
```bash
linera publish-and-create \
  target/wasm32-unknown-unknown/release/oracle_registry_v2_contract.wasm \
  target/wasm32-unknown-unknown/release/oracle_registry_v2_service.wasm \
  --json-argument '"Hub"'
```

**Catat output:**
- `HUB_APP_ID` = Application ID yang muncul (64 karakter hex)

---

## Step 4: Request Registry Instance di Market Chain

```bash
linera request-application <HUB_APP_ID> --target-chain-id 268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f
```

Ganti `<HUB_APP_ID>` dengan App ID dari Step 3.

**Catat:**
- `INSTANCE_APP_ID` = App ID yang di-return (biasanya sama dengan HUB_APP_ID)

---

## Step 5: Switch Default Chain ke Market Chain

```bash
linera wallet set-default 268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f
```

Verifikasi:
```bash
linera wallet show
```

---

## Step 6: Deploy Simple Market

Deploy market (ganti `<INSTANCE_APP_ID>` dengan nilai dari Step 4):

```bash
linera publish-and-create \
  target/wasm32-unknown-unknown/release/simple_market_contract.wasm \
  target/wasm32-unknown-unknown/release/simple_market_service.wasm \
  --json-argument '{"registry_app_id":"<INSTANCE_APP_ID>","registry_chain_id":"268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f","use_local_instance":true}'
```

**Catat output:**
- `MARKET_APP_ID` = Application ID yang muncul

---

## Step 7: Simpan Konfigurasi

Buat file `.env.hub-and-spoke` (ganti `<HUB_APP_ID>`, `<INSTANCE_APP_ID>`, `<MARKET_APP_ID>` dengan nilai dari deployment):

```bash
cat > .env.hub-and-spoke << 'EOF'
# Hub-and-Spoke Architecture Deployment

# HUB (Registry Chain)
export HUB_CHAIN_ID="36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2"
export HUB_APP_ID="<HUB_APP_ID>"

# INSTANCE (Market Chain)
export INSTANCE_CHAIN_ID="268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f"
export INSTANCE_APP_ID="<INSTANCE_APP_ID>"

# MARKET (Market Chain)
export MARKET_CHAIN_ID="268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f"
export MARKET_APP_ID="<MARKET_APP_ID>"
EOF
```

---

## Step 8: Verifikasi Deployment

### 8.1 Load Environment
```bash
source .env.hub-and-spoke
```

### 8.2 Test Hub Registry
```bash
curl -s "http://localhost:8080/chains/36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2/applications/$HUB_APP_ID" \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ registryInfo { mode totalQueries totalVoters } }"}'
```

### 8.3 Test Instance Registry
```bash
curl -s "http://localhost:8080/chains/268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f/applications/$INSTANCE_APP_ID" \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ registryInfo { mode totalQueries totalVoters } }"}'
```

### 8.4 Test Market
```bash
curl -s "http://localhost:8080/chains/268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f/applications/$MARKET_APP_ID" \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ markets { id question status } }"}'
```

---

## Step 9: Test Consumer App Registration (Opsional)

### 9.1 Query Consumer Apps di Hub
```bash
curl -s "http://localhost:8080/chains/36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2/applications/$HUB_APP_ID" \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ consumerApps { chainId name category tier isActive } }"}'
```

### 9.2 Query Consumer App Stats
```bash
curl -s "http://localhost:8080/chains/36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2/applications/$HUB_APP_ID" \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ consumerAppStats { totalApps activeApps totalQueriesFromApps } }"}'
```

---

## Arsitektur Hasil Deployment

```
┌─────────────────────────────────────────────────────────┐
│              REGISTRY CHAIN (HUB)                       │
│  36dd869563b74586a953019006de56c838fae5731af5cd6fb...   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │   Registry (HUB MODE)                           │   │
│  │   - Global voter registry                       │   │
│  │   - Voting happens HERE                         │   │
│  │   - Resolution authority                        │   │
│  │   - Consumer App Registry                       │   │
│  └─────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────┘
                            │
           Cross-chain messaging
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 MARKET CHAIN                            │
│  268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f...  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │   Registry (INSTANCE MODE)                      │   │
│  │   - Forwards queries to Hub                     │   │
│  │   - Receives resolution callbacks               │   │
│  └──────────────────────┬──────────────────────────┘   │
│                         │                               │
│              call_application()                         │
│                         │                               │
│                         ▼                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │   Simple Market                                 │   │
│  │   - Creates prediction markets                  │   │
│  │   - Requests oracle resolution                  │   │
│  │   - Auto-registered as Consumer App             │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### Error: "Application not found"
- Pastikan `linera service` sudah berjalan
- Verifikasi App ID dan Chain ID sudah benar

### Error: "Chain not found"
- Jalankan `linera sync` untuk sinkronisasi chain

### Error saat deploy market
- Pastikan sudah switch ke market chain (`linera wallet set-default`)
- Verifikasi Instance sudah ter-request di market chain

### Consumer App tidak terdaftar
- Simple Market akan auto-register saat instantiate jika `use_local_instance=true`
- Cek logs untuk error registrasi
