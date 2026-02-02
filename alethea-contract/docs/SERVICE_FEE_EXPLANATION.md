# 💰 Penjelasan Service Fee: Bond + Service Fee Model

**Tanggal:** 25 Januari 2026  
**Tujuan:** Penjelasan detail tentang model pembayaran untuk query creation

---

## ✅ Jawaban Singkat

**Ya, setiap kali membuat query, creator HARUS membayar:**
1. **Bond** (refundable) - untuk security
2. **Service Fee** (non-refundable) - untuk payment

---

## 📋 Model Pembayaran Lengkap

### **Setiap Query Creation:**

```
┌─────────────────────────────────────────────────────────┐
│         COST STRUCTURE PER QUERY CREATION                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Bond: 100 ALTH                                      │
│     └─> Refundable (jika tidak ada dispute)            │
│     └─> Slashed (jika ada dispute yang menang)         │
│     └─> Purpose: Economic security                      │
│                                                          │
│  2. Service Fee: 10 ALTH                                │
│     └─> NON-REFUNDABLE (selalu dibayar)                │
│     └─> Masuk ke Protocol Treasury                      │
│     └─> Purpose: Payment untuk oracle service           │
│                                                          │
│  3. Priority Fee: 1 ALTH (OPTIONAL)                     │
│     └─> NON-REFUNDABLE (jika digunakan)                │
│     └─> Menambah prioritas query                        │
│     └─> Masuk ke voter rewards                          │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  TOTAL UPFRONT COST: 111 ALTH (dengan priority)        │
│  TOTAL UPFRONT COST: 110 ALTH (tanpa priority)         │
│                                                          │
│  REFUNDABLE: 100 ALTH (bond)                            │
│  NET COST: 10-11 ALTH per query                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Alur Pembayaran Lengkap

### **Phase 1: Query Creation**

```
Creator (Prediction Market)
    │
    │ Membuat query dengan:
    │ - Bond: 100 ALTH
    │ - Service Fee: 10 ALTH
    │ - Priority Fee: 1 ALTH (optional)
    │
    ▼
┌─────────────────────────────────────┐
│      Alethea Oracle Registry         │
│                                      │
│  1. Lock Bond: 100 ALTH             │
│     └─> Masuk ke bond pool           │
│     └─> Refundable setelah dispute   │
│                                      │
│  2. Collect Service Fee: 10 ALTH     │
│     └─> Masuk ke Protocol Treasury   │
│     └─> NON-REFUNDABLE               │
│                                      │
│  3. Collect Priority Fee: 1 ALTH    │
│     └─> Masuk ke voter rewards        │
│     └─> NON-REFUNDABLE               │
│                                      │
│  Query Status: Active                │
└─────────────────────────────────────┘
```

---

### **Phase 2: Query Resolution**

```
Query di-resolve oleh voters
    │
    │ Reward di-mint dari inflation:
    │ - Query reward: 100 ALTH
    │ - Inflation reward: 50 ALTH
    │ - Total: 150 ALTH
    │
    ▼
┌─────────────────────────────────────┐
│      Reward Distribution             │
│                                      │
│  1. Protocol Fee: 15 ALTH (10%)     │
│     └─> Masuk ke Protocol Treasury   │
│                                      │
│  2. Voter Rewards: 135 ALTH (90%)   │
│     └─> + Priority Fee: 1 ALTH      │
│     └─> Total: 136 ALTH             │
│     └─> Didistribusikan ke voters   │
└─────────────────────────────────────┘
```

---

### **Phase 3: Dispute Window (1 hour)**

```
Setelah query resolved, ada dispute window 1 jam
    │
    │ Jika TIDAK ada dispute:
    │ └─> Bond bisa di-refund
    │
    │ Jika ADA dispute:
    │ └─> Dispute resolution process
    │ └─> Winner dapat bond
    │
    ▼
┌─────────────────────────────────────┐
│      Bond Refund (Jika No Dispute)  │
│                                      │
│  Creator claim bond refund:          │
│  └─> Bond: 100 ALTH dikembalikan    │
│                                      │
│  Service Fee: TETAP TIDAK DI-REFUND │
│  Priority Fee: TETAP TIDAK DI-REFUND │
└─────────────────────────────────────┘
```

---

## 💡 Mengapa Perlu Keduanya?

### **1. Bond (Refundable) - Untuk Security**

**Tujuan:**
- Mencegah spam queries
- Economic security untuk dispute mechanism
- Memastikan creator serius dengan query mereka

**Karakteristik:**
- ✅ Refundable jika tidak ada dispute
- ✅ Slashed jika ada dispute yang menang
- ✅ Minimum 100 ALTH

**Contoh:**
```
Creator membuat query dengan bond 100 ALTH
    │
    ├─> Jika tidak ada dispute → Bond di-refund
    │
    └─> Jika ada dispute yang menang → Bond di-slash ke winner
```

---

### **2. Service Fee (Non-Refundable) - Untuk Payment**

**Tujuan:**
- Membayar oracle service
- Sustainable income untuk protocol
- Cover operational costs

**Karakteristik:**
- ❌ NON-REFUNDABLE (selalu dibayar)
- ✅ Masuk ke Protocol Treasury
- ✅ Minimum 10 ALTH

**Contoh:**
```
Creator membuat query dengan service fee 10 ALTH
    │
    └─> Service fee SELALU masuk ke Protocol Treasury
        (tidak pernah di-refund, tidak peduli hasil query)
```

---

## 📊 Perbandingan: Dengan vs Tanpa Service Fee

### **Tanpa Service Fee (Model Saat Ini):**

```
Cost per Query:
├─ Bond: 100 ALTH (refundable)
└─ Priority Fee: 1 ALTH (optional)

Net Cost: 0-1 ALTH (hampir gratis!)

Masalah:
❌ Protocol tidak dapat income yang konsisten
❌ Tidak sustainable untuk jangka panjang
❌ Hanya bergantung pada protocol_fee dari reward
```

---

### **Dengan Service Fee (Model Ideal):**

```
Cost per Query:
├─ Bond: 100 ALTH (refundable)
├─ Service Fee: 10 ALTH (non-refundable) ⭐
└─ Priority Fee: 1 ALTH (optional)

Net Cost: 10-11 ALTH per query

Keuntungan:
✅ Protocol dapat income yang konsisten
✅ Sustainable untuk jangka panjang
✅ Income dari service fee + protocol fee
```

---

## 🎯 Contoh Skenario Lengkap

### **Skenario: Prediction Market Membuat 10 Queries**

#### **Tanpa Service Fee:**

```
Query 1: Bond 100 ALTH → Refund → Net Cost: 0 ALTH
Query 2: Bond 100 ALTH → Refund → Net Cost: 0 ALTH
Query 3: Bond 100 ALTH → Refund → Net Cost: 0 ALTH
...
Query 10: Bond 100 ALTH → Refund → Net Cost: 0 ALTH

Total Net Cost: 0 ALTH
Protocol Income: Hanya dari protocol_fee (tidak konsisten)
```

---

#### **Dengan Service Fee:**

```
Query 1: Bond 100 ALTH + Service Fee 10 ALTH → Refund Bond → Net Cost: 10 ALTH
Query 2: Bond 100 ALTH + Service Fee 10 ALTH → Refund Bond → Net Cost: 10 ALTH
Query 3: Bond 100 ALTH + Service Fee 10 ALTH → Refund Bond → Net Cost: 10 ALTH
...
Query 10: Bond 100 ALTH + Service Fee 10 ALTH → Refund Bond → Net Cost: 10 ALTH

Total Net Cost: 100 ALTH (10 queries × 10 ALTH)
Protocol Income: 100 ALTH (konsisten) + protocol_fee dari reward (bonus)
```

---

## 💰 Protocol Treasury Income

### **Income Sources:**

```
┌─────────────────────────────────────────────────────────┐
│           PROTOCOL TREASURY INCOME SOURCES               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Service Fee (Konsisten)                            │
│     └─> 10 ALTH per query                               │
│     └─> Dari setiap query creation                      │
│     └─> NON-REFUNDABLE                                  │
│                                                          │
│  2. Protocol Fee (Bonus)                                │
│     └─> 10% dari reward                                 │
│     └─> Dari setiap query resolution                    │
│     └─> Tidak konsisten (tergantung volume)             │
│                                                          │
│  3. Slashed Bonds (Bonus)                               │
│     └─> Dari dispute yang menang                        │
│     └─> Tidak konsisten                                 │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  Total Income: Service Fee (konsisten) + Bonus          │
│  Sustainable: ✅ Ya (karena service fee konsisten)     │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Flow Diagram Lengkap

```
┌─────────────────────────────────────────────────────────┐
│         COMPLETE PAYMENT FLOW PER QUERY                  │
└─────────────────────────────────────────────────────────┘

1. QUERY CREATION
   │
   Creator membayar:
   ├─> Bond: 100 ALTH ──────────────┐
   ├─> Service Fee: 10 ALTH ────────┼─> Protocol Treasury
   └─> Priority Fee: 1 ALTH ───────┘
       │
       ▼
   Query Active
       │
       ▼
2. QUERY RESOLUTION
   │
   Reward di-mint:
   ├─> Query Reward: 100 ALTH
   ├─> Inflation Reward: 50 ALTH
   └─> Total: 150 ALTH
       │
       ├─> Protocol Fee: 15 ALTH ──> Protocol Treasury
       └─> Voter Rewards: 135 ALTH + 1 ALTH (priority)
       │
       ▼
3. DISPUTE WINDOW (1 hour)
   │
   ├─> Jika TIDAK ada dispute:
   │   └─> Bond 100 ALTH ──────────> Refund ke Creator
   │   └─> Service Fee: TETAP di Treasury
   │
   └─> Jika ADA dispute:
       └─> Dispute resolution
       └─> Winner dapat bond
       │
       ▼
4. FINAL STATE
   │
   Creator Net Cost: 10-11 ALTH (service fee + priority)
   Protocol Income: 10 ALTH (service fee) + 15 ALTH (protocol fee) = 25 ALTH
   Voters Rewards: 136 ALTH
```

---

## ✅ Kesimpulan

### **Jawaban untuk Pertanyaan:**

**"Jadi service fee ini digunakan setiap meminta query market harus bond + bayar fee?"**

**Jawaban: YA, BENAR!**

Setiap kali membuat query, creator HARUS membayar:
1. ✅ **Bond** (100 ALTH) - refundable, untuk security
2. ✅ **Service Fee** (10 ALTH) - non-refundable, untuk payment
3. ⚠️ **Priority Fee** (1 ALTH) - optional, untuk prioritas

**Net Cost per Query:** 10-11 ALTH (setelah bond di-refund)

**Alasan:**
- Bond untuk security (mencegah spam, dispute mechanism)
- Service fee untuk payment (sustainable income untuk protocol)
- Keduanya diperlukan untuk model yang sustainable

---

## 📝 Summary

| Item | Amount | Refundable? | Purpose |
|------|--------|-------------|---------|
| **Bond** | 100 ALTH | ✅ Ya | Security (spam prevention, dispute) |
| **Service Fee** | 10 ALTH | ❌ Tidak | Payment (protocol income) |
| **Priority Fee** | 1 ALTH | ❌ Tidak | Priority (optional) |
| **Net Cost** | 10-11 ALTH | - | Per query |

**Setiap query = Bond + Service Fee (wajib) + Priority Fee (optional)**

---

**Dokumen ini menjelaskan model pembayaran yang ideal untuk production** 🚀
