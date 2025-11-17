# Quick Start - Dashboard (November 17, 2025)

## 🚀 Start Dashboard dalam 3 Langkah

### 1. Start Backend
```bash
cd oracle-api-backend
cargo run --release
```

Tunggu sampai muncul:
```
🚀 ALETHEA ORACLE BACKEND
📡 Listening on: http://0.0.0.0:3001
✅ Server ready!
```

### 2. Start Dashboard
```bash
cd alethea-dashboard
./restart-with-new-deployment.sh
```

Atau manual:
```bash
cd alethea-dashboard
npm run dev
```

### 3. Open Browser
```
http://localhost:3000
```

---

## 📋 Current Configuration

```bash
Chain ID: 8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef
App ID:   9936172d5d1f3fb3ae65ea2bb51391afc561d9f8b80927c9e8e32c1efe9380d2
GraphQL:  http://localhost:8080
Backend:  http://localhost:3001
Frontend: http://localhost:3000
```

---

## ✅ Quick Test

### Test GraphQL
```bash
curl -X POST "http://localhost:8080/chains/8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef/applications/9936172d5d1f3fb3ae65ea2bb51391afc561d9f8b80927c9e8e32c1efe9380d2" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ voterCount }"}'
```

Expected: `{"data":{"voterCount":0}}`

### Test Backend
```bash
curl http://localhost:3001/health
```

Expected: `{"status":"ok"}`

### Test Dashboard
Open: http://localhost:3000

Check console for:
```
🚀 Oracle Registry v2 Configuration:
CHAIN_ID: 8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef
REGISTRY_ID: 9936172d5d1f3fb3ae65ea2bb51391afc561d9f8b80927c9e8e32c1efe9380d2
```

---

## 🎯 Quick Actions

### Register as Voter
1. Go to http://localhost:3000/voters
2. Click "Register as Voter"
3. Enter stake (minimum 100)
4. Enter name (optional)
5. Copy and run the command

### View Voters
```
http://localhost:3000/voters
```

### View Markets
```
http://localhost:3000
```

---

## 🛑 Stop Services

### Stop Dashboard
```bash
pkill -f "next dev"
```

### Stop Backend
```bash
pkill -f "oracle-api-backend"
```

### Stop All
```bash
pkill -f "next dev"
pkill -f "oracle-api-backend"
```

---

## 📚 More Info

- **Full Update Details:** DASHBOARD_UPDATE_COMPLETE.md
- **Deployment Info:** DEPLOYMENT_SUCCESS.md
- **Voter Guide:** CARA_MENDAFTAR_VOTER.md
- **Architecture:** ALETHEA_CORRECT_ARCHITECTURE.md

---

**Ready to go! 🚀**
