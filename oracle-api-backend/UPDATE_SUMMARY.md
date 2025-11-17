# Oracle API Backend - Update Summary

## ✅ Updated to Latest Deployment

**Date:** November 16, 2025  
**New Application ID:** `99740274ffaa04d9ac49a6fe9af3763d7d9dbdf98379a6d68a7e04fcfb77a0e0`  
**Chain ID:** `95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4`

---

## What Was Updated

### ✅ Source Code
- **src/main.rs** - Updated default Chain ID and App ID
  - Default Chain ID: `95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4`
  - Default App ID: `99740274ffaa04d9ac49a6fe9af3763d7d9dbdf98379a6d68a7e04fcfb77a0e0`
  - Updated transaction preparation endpoint

### ✅ Configuration Files
- **.env** - New environment configuration
- **.env.example** - Updated example configuration
- **CONFIG.md** - New configuration documentation

### ✅ Documentation
- **README.md** - Updated with new IDs and start script
- **UPDATE_SUMMARY.md** - This file

### ✅ Scripts
- **start-backend.sh** - New startup script with auto-configuration

---

## Configuration

### Environment Variables

```bash
CHAIN_ID=95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4
APP_ID=99740274ffaa04d9ac49a6fe9af3763d7d9dbdf98379a6d68a7e04fcfb77a0e0
SENDER_CHAIN_ID=95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4
WALLET_PATH=/home/mdlog/.config/linera/wallet.json
STORAGE_PATH=rocksdb:/home/mdlog/.config/linera/client.db
RUST_LOG=info
```

### Default Values in Code

If environment variables are not set, the backend will use these defaults:

```rust
// src/main.rs
let chain_id = std::env::var("CHAIN_ID")
    .unwrap_or_else(|_| "95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4".to_string());

let app_id = std::env::var("APP_ID")
    .unwrap_or_else(|_| "99740274ffaa04d9ac49a6fe9af3763d7d9dbdf98379a6d68a7e04fcfb77a0e0".to_string());
```

---

## How to Use

### Option 1: Using Start Script (Recommended)

```bash
cd oracle-api-backend
./start-backend.sh
```

The script will:
- Load configuration from parent `.env.fresh` or `.env.production`
- Load local `.env` if available
- Set default values if not configured
- Check if port 3001 is available
- Build if needed
- Start the backend

### Option 2: Manual Start

```bash
cd oracle-api-backend

# Load configuration
source .env

# Build
cargo build --release

# Run
cargo run --release
```

### Option 3: Using Parent Configuration

```bash
cd oracle-api-backend

# Load from parent directory
source ../.env.fresh

# Run
cargo run --release
```

---

## Verification

### 1. Check Configuration

```bash
cd oracle-api-backend
cat .env
```

Expected output:
```
CHAIN_ID=95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4
APP_ID=99740274ffaa04d9ac49a6fe9af3763d7d9dbdf98379a6d68a7e04fcfb77a0e0
...
```

### 2. Test Backend

```bash
# Health check
curl http://localhost:3001/health

# Expected response:
# {"status":"healthy","service":"oracle-api-backend","version":"0.1.0"}
```

### 3. Test API

```bash
# List voters
curl http://localhost:3001/api/voters

# Register voter
curl -X POST http://localhost:3001/api/register-voter \
  -H "Content-Type: application/json" \
  -d '{
    "stake": "100",
    "name": "TestVoter",
    "metadata_url": "https://example.com"
  }'
```

---

## Previous Deployments (Reference)

| Date | Chain ID | App ID | Status |
|------|----------|--------|--------|
| Nov 16, 2025 | `95f032d7...` | `99740274...` | ✅ **ACTIVE** |
| Nov 15, 2025 | `5007b650...` | `87240c0b...` | 📦 Archived |
| Nov 15, 2025 | `95f032d7...` | `8bc8c801...` | 📦 Archived |

---

## Troubleshooting

### Backend won't start

**Check port availability:**
```bash
lsof -i :3001
```

**Kill existing process:**
```bash
lsof -ti:3001 | xargs kill -9
```

### Can't connect to Linera

**Make sure service is running:**
```bash
linera service --port 8080
```

**Verify configuration:**
```bash
echo $CHAIN_ID
echo $APP_ID
```

### Operations fail

**Check wallet:**
```bash
linera wallet show
```

**Check balance:**
```bash
linera query-balance
```

**Check logs:**
```bash
RUST_LOG=debug cargo run
```

---

## API Endpoints

See `README.md` for complete API documentation.

### Quick Reference

- `GET /health` - Health check
- `POST /api/register-voter` - Register new voter
- `POST /api/update-stake` - Update stake
- `POST /api/submit-vote` - Submit vote
- `POST /api/withdraw-stake` - Withdraw stake
- `POST /api/claim-rewards` - Claim rewards
- `POST /api/create-query` - Create query
- `POST /api/resolve-query` - Resolve query
- `GET /api/voters` - List all voters
- `GET /api/queries` - List all queries

---

## Next Steps

1. ✅ Backend updated with new App ID
2. ✅ Configuration files updated
3. ✅ Documentation updated
4. 🔄 **Start backend:** `./start-backend.sh`
5. 🔄 **Test endpoints**
6. 🔄 **Integrate with frontend**
7. 🔄 **Full integration testing**

---

**Backend is ready to use with the latest deployment! 🚀**
