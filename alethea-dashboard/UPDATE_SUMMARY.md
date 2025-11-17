# Alethea Dashboard - Update Summary

## ✅ Updated to Latest Deployment

**Date:** November 16, 2025  
**New Application ID:** `640853a9c9d51e73d0e304d094d19bf5ff693cb16c178f4733312a55d73219f6`  
**Chain ID:** `95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4`

---

## What Was Updated

### ✅ Configuration Files
- **.env.local** - Updated with new App ID
  - `NEXT_PUBLIC_APP_ID` updated
  - `NEXT_PUBLIC_REGISTRY_ID` updated
  - `NEXT_PUBLIC_REGISTRY_URL` updated

### ✅ Source Code
- **lib/graphql.ts** - Updated default IDs
  - Default Chain ID: `95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4`
  - Default App ID: `640853a9c9d51e73d0e304d094d19bf5ff693cb16c178f4733312a55d73219f6`
  - Updated comments with deployment date

---

## Configuration

### Environment Variables (.env.local)

```bash
# Latest Deployment - Account-Based Registry (November 16, 2025)
NEXT_PUBLIC_CHAIN_ID=95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4
NEXT_PUBLIC_APP_ID=640853a9c9d51e73d0e304d094d19bf5ff693cb16c178f4733312a55d73219f6
NEXT_PUBLIC_REGISTRY_ID=640853a9c9d51e73d0e304d094d19bf5ff693cb16c178f4733312a55d73219f6
NEXT_PUBLIC_REGISTRY_URL=http://localhost:8080/chains/95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4/applications/640853a9c9d51e73d0e304d094d19bf5ff693cb16c178f4733312a55d73219f6
NEXT_PUBLIC_SERVICE_URL=http://localhost:8080

# Backend API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_USE_BACKEND_API=true

# Mock Mode for Testing
NEXT_PUBLIC_MOCK_MODE=false
```

### Default Values in Code (lib/graphql.ts)

```typescript
const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || 
  '95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4';

const REGISTRY_ID = process.env.NEXT_PUBLIC_REGISTRY_ID || 
  '640853a9c9d51e73d0e304d094d19bf5ff693cb16c178f4733312a55d73219f6';
```

---

## How to Use

### 1. Verify Configuration

```bash
cd alethea-dashboard
cat .env.local
```

Expected output should show the new App ID: `640853a9c9d51e73d0e304d094d19bf5ff693cb16c178f4733312a55d73219f6`

### 2. Install Dependencies (if needed)

```bash
npm install
# or
yarn install
```

### 3. Start Development Server

```bash
npm run dev
# or
yarn dev
```

Dashboard will be available at: `http://localhost:3000`

### 4. Prerequisites

Make sure these services are running:

**Terminal 1 - Linera Service:**
```bash
linera service --port 8080
```

**Terminal 2 - Oracle API Backend:**
```bash
cd oracle-api-backend
./start-backend.sh
```

**Terminal 3 - Dashboard:**
```bash
cd alethea-dashboard
npm run dev
```

---

## Verification

### 1. Check Configuration in Browser

Open browser console (F12) and look for:
```
🚀 Oracle Registry v2 Configuration:
CHAIN_ID: 95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4
REGISTRY_ID: 640853a9c9d51e73d0e304d094d19bf5ff693cb16c178f4733312a55d73219f6
```

### 2. Test GraphQL Connection

The dashboard should automatically connect to:
```
http://localhost:8080/chains/95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4/applications/640853a9c9d51e73d0e304d094d19bf5ff693cb16c178f4733312a55d73219f6
```

### 3. Test Features

- ✅ View statistics
- ✅ List voters
- ✅ Register as voter
- ✅ Submit votes
- ✅ View queries

---

## Previous Deployments (Reference)

| Date | Chain ID | App ID | Status |
|------|----------|--------|--------|
| Nov 16, 2025 | `95f032d7...` | `99740274...` | ✅ **ACTIVE** |
| Nov 15, 2025 | `95f032d7...` | `47c507d7...` | 📦 Archived |
| Nov 15, 2025 | `95f032d7...` | `8bc8c801...` | 📦 Archived |

---

## Troubleshooting

### Dashboard won't start

**Check Node version:**
```bash
node --version
# Should be v18 or higher
```

**Clear cache and reinstall:**
```bash
rm -rf node_modules .next
npm install
npm run dev
```

### Can't connect to GraphQL

**Check services are running:**
```bash
# Check Linera service
curl http://localhost:8080/

# Check backend API
curl http://localhost:3001/health
```

**Check .env.local:**
```bash
cat .env.local
```

### GraphQL errors

**Check browser console for:**
- Connection errors
- GraphQL query errors
- Configuration issues

**Enable debug mode:**
Open browser console to see detailed logs about:
- Configuration values
- GraphQL requests
- Response data

---

## Features

### Account-Based Registry
- ✅ Direct voter registration (no separate application needed)
- ✅ Reputation system with tiers
- ✅ Stake management
- ✅ Vote submission
- ✅ Reward claiming

### Dashboard Features
- ✅ Real-time statistics
- ✅ Voter management
- ✅ Query browsing
- ✅ Vote submission interface
- ✅ Reputation tracking

---

## Next Steps

1. ✅ Dashboard configuration updated
2. ✅ Source code updated
3. 🔄 **Start all services**
4. 🔄 **Test dashboard features**
5. 🔄 **Register as voter**
6. 🔄 **Submit test votes**
7. 🔄 **Verify reputation system**

---

## API Endpoints Used

### GraphQL (Linera Service)
```
http://localhost:8080/chains/95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4/applications/640853a9c9d51e73d0e304d094d19bf5ff693cb16c178f4733312a55d73219f6
```

### Backend API
```
http://localhost:3001/api/*
```

---

**Dashboard is ready to use with the latest deployment! 🎨**
