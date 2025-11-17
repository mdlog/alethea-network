# 🚀 Alethea Dashboard - Setup Guide

**Quick setup guide for Alethea Dashboard**

---

## ⚡ Quick Setup (5 minutes)

### Step 1: Install Dependencies

```bash
cd alethea-dashboard
npm install
```

### Step 2: Verify Configuration

Check `.env.local` file:

```bash
cat .env.local
```

Should show:
- ✅ NEXT_PUBLIC_REGISTRY_URL
- ✅ NEXT_PUBLIC_CHAIN_ID
- ✅ Application IDs

### Step 3: Start Dashboard

```bash
npm run dev
```

### Step 4: Open Browser

```
http://localhost:3333
```

---

## ✅ Verification Checklist

- [ ] Node.js 18+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env.local` configured
- [ ] Linera service running (port 8080)
- [ ] Dashboard accessible (port 3333)
- [ ] Markets loading correctly

---

## 🔧 Configuration

### Current Deployment

```
Chain ID:     a2c0349ae6add80c92e26bb383aca8d98f9f3441c3097fec99111199c7f1e221
App ID:       948a0e49dc424b3cfb0a997d7c7ef05b048c5f4184a2a4d546d6d7abae823261
Network:      Conway Testnet
GraphQL:      http://localhost:8080
Dashboard:    http://localhost:3333
```

### Update Configuration

If you have new deployment:

1. Edit `.env.local`
2. Update `NEXT_PUBLIC_REGISTRY_URL`
3. Update `NEXT_PUBLIC_CHAIN_ID`
4. Restart dashboard

---

## 🐛 Troubleshooting

### Dashboard won't start

```bash
# Clean install
rm -rf node_modules .next
npm install
npm run dev
```

### No data showing

```bash
# Test GraphQL endpoint
curl -X POST "http://localhost:8080/chains/a2c0349ae6add80c92e26bb383aca8d98f9f3441c3097fec99111199c7f1e221/applications/948a0e49dc424b3cfb0a997d7c7ef05b048c5f4184a2a4d546d6d7abae823261" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'

# Should return: {"data":{"__typename":"QueryRoot"}}
```

### Port already in use

```bash
# Use different port
PORT=3334 npm run dev
```

---

## 📊 Features

- ✅ Real-time market data
- ✅ Protocol statistics
- ✅ Search & filter
- ✅ Responsive design
- ✅ Auto-refresh (30s)
- ✅ Error handling
- ✅ Loading states

---

## 🎯 Next Steps

1. **Explore Dashboard** - Browse markets and stats
2. **Test Search** - Try searching for markets
3. **Check Filters** - Filter by status
4. **Monitor Updates** - Watch auto-refresh
5. **View Details** - Click on market cards

---

**Status:** ✅ READY TO USE  
**Support:** See README.md for detailed documentation

