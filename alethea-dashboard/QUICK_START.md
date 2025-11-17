# 🚀 Quick Start - Alethea Dashboard

## Cara Termudah

```bash
cd alethea-dashboard
./start.sh
```

Atau:

```bash
cd alethea-dashboard
npm run dev
```

Buka browser: **http://localhost:3333**

---

## Troubleshooting

### Port sudah digunakan

```bash
# Kill process di port 3333
lsof -ti:3333 | xargs kill -9

# Atau gunakan port lain
PORT=3334 npm run dev
```

### Dependencies belum terinstall

```bash
npm install
```

### Error saat build

```bash
# Clean install
rm -rf node_modules .next
npm install
npm run dev
```

---

## Verifikasi

1. **Check service running:**
   ```bash
   curl http://localhost:3333
   ```

2. **Check GraphQL endpoint:**
   ```bash
   curl -X POST "http://localhost:8080/chains/a2c0349ae6add80c92e26bb383aca8d98f9f3441c3097fec99111199c7f1e221/applications/948a0e49dc424b3cfb0a997d7c7ef05b048c5f4184a2a4d546d6d7abae823261" \
     -H "Content-Type: application/json" \
     -d '{"query":"{ __typename }"}'
   ```

3. **Open browser:**
   ```
   http://localhost:3333
   ```

---

**Status:** ✅ Ready to use!
