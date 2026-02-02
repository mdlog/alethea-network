# Linera Cross-Chain Communication Analysis

## Key Findings

### 1. Message Type Constraint
- `prepare_message().send_to(chain_id)` hanya bisa mengirim message dari tipe `Self::Message`
- Tidak bisa mengirim message dengan tipe berbeda ke aplikasi lain di chain lain

### 2. Cross-App Call Constraint
- `call_application()` hanya bekerja di chain yang sama
- Tidak bisa call aplikasi di chain berbeda

### 3. Application Instance per Chain
- Setiap aplikasi punya instance terpisah per chain
- State tidak otomatis sync antar chain
- `application_creator_chain_id()` mengembalikan chain tempat app pertama di-deploy

## Patterns dari Linera Examples

### Fungible Token Pattern
- Setiap chain punya instance token yang sama
- Transfer cross-chain: debit di source chain, kirim message, credit di target chain
- Message diterima oleh instance aplikasi yang sama di chain tujuan

### AMM Pattern
- Operasi hanya bisa dijalankan di creator chain
- Remote chain mengirim message ke creator chain
- Creator chain memproses dan mengirim response

### RFQ Pattern
- Membuat temporary chain baru untuk exchange
- Semua pihak punya akses ke temporary chain
- Setelah selesai, chain ditutup

## Solusi untuk Alethea Oracle

### Option 1: Same Chain Deployment (MVP)
- Deploy Market di chain yang sama dengan Registry
- Gunakan `call_application()` untuk cross-app call
- Paling sederhana, cocok untuk demo

### Option 2: Event Subscription (Production)
- Market subscribe ke Registry events
- Registry emit event saat query resolved
- Market listen dan process event
- Memerlukan setup subscription

### Option 3: Shared Application Instance
- Market request Registry app ke chain-nya
- Registry instance ada di setiap market chain
- State sync via cross-chain messaging
- Kompleks tapi scalable

### Option 4: Hub-and-Spoke
- Semua market deploy di Registry chain (hub)
- Atau Registry deploy instance di setiap market chain
- Centralized tapi simple

## Rekomendasi

Untuk MVP: **Option 1 (Same Chain Deployment)**
- Deploy Simple Market di chain yang sama dengan Registry
- Gunakan cross-app call untuk create query
- Registry callback via cross-app call juga

Untuk Production: **Option 2 (Event Subscription)** atau **Option 3 (Shared Instance)**
- Lebih scalable
- Market bisa di chain sendiri
- Memerlukan implementasi lebih kompleks
