# Oracle API Backend - Configuration

## Current Deployment (November 16, 2025)

### Application Details

**Chain ID:** `95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4`  
**Application ID:** `99740274ffaa04d9ac49a6fe9af3763d7d9dbdf98379a6d68a7e04fcfb77a0e0`

### Environment Variables

The backend reads configuration from environment variables with fallback to these defaults:

```bash
# Required Configuration
CHAIN_ID=95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4
APP_ID=99740274ffaa04d9ac49a6fe9af3763d7d9dbdf98379a6d68a7e04fcfb77a0e0

# Optional (with defaults)
SENDER_CHAIN_ID=95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4
WALLET_PATH=/home/mdlog/.config/linera/wallet.json
STORAGE_PATH=rocksdb:/home/mdlog/.config/linera/client.db

# Server Configuration
PORT=3001
HOST=0.0.0.0

# Logging
RUST_LOG=info
```

### Setup

1. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Verify configuration:**
   ```bash
   cat .env
   ```

3. **Build and run:**
   ```bash
   cargo build --release
   cargo run
   ```

### Default Values in Code

If environment variables are not set, the application uses these defaults:

- **Chain ID:** `95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4`
- **App ID:** `99740274ffaa04d9ac49a6fe9af3763d7d9dbdf98379a6d68a7e04fcfb77a0e0`
- **Wallet Path:** `~/.config/linera/wallet.json`
- **Storage Path:** `rocksdb:~/.config/linera/client.db`
- **Server Port:** `3001`

### Testing

```bash
# Health check
curl http://localhost:3001/health

# List voters
curl http://localhost:3001/api/voters

# Register voter
curl -X POST http://localhost:3001/api/register-voter \
  -H "Content-Type: application/json" \
  -d '{
    "stake": "100",
    "name": "TestVoter",
    "metadata_url": "https://example.com/voter"
  }'
```

### Previous Deployments (Reference)

| Date | Chain ID | App ID | Status |
|------|----------|--------|--------|
| Nov 16, 2025 | `95f032d7...` | `99740274...` | ✅ **ACTIVE** |
| Nov 15, 2025 | `5007b650...` | `87240c0b...` | 📦 Archived |
| Nov 15, 2025 | `95f032d7...` | `8bc8c801...` | 📦 Archived |

### Updating Configuration

To use a different deployment:

1. Update `.env` file with new Chain ID and App ID
2. Restart the backend
3. Verify with health check

Or update the default values in `src/main.rs`:

```rust
let chain_id = std::env::var("CHAIN_ID")
    .unwrap_or_else(|_| "YOUR_CHAIN_ID".to_string());

let app_id = std::env::var("APP_ID")
    .unwrap_or_else(|_| "YOUR_APP_ID".to_string());
```

### GraphQL Endpoint

The backend connects to:
```
http://localhost:8080/chains/95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4/applications/99740274ffaa04d9ac49a6fe9af3763d7d9dbdf98379a6d68a7e04fcfb77a0e0
```

Make sure `linera service` is running on port 8080.

### Troubleshooting

**Backend won't start:**
- Check if port 3001 is available: `lsof -i :3001`
- Verify wallet path exists
- Check RUST_LOG level

**Can't connect to Linera:**
- Ensure `linera service --port 8080` is running
- Verify Chain ID and App ID are correct
- Check wallet has access to the chain

**Operations fail:**
- Verify account has sufficient balance
- Check minimum stake requirements (100 tokens)
- Review logs with `RUST_LOG=debug`

### API Endpoints

See `README.md` for complete API documentation.
