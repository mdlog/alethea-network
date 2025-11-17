# Oracle API Backend

Backend API untuk Oracle Registry v2 menggunakan Linera SDK (Rust).

## 🎯 Features

- ✅ Register voters via HTTP API
- ✅ Update stake
- ✅ Submit votes
- ✅ Claim rewards
- ✅ CORS enabled untuk frontend
- ✅ Error handling
- ✅ Logging

## 🚀 Quick Start

### 1. Build

```bash
cd oracle-api-backend
cargo build --release
```

### 2. Configure

```bash
# Set environment variables (Latest deployment - November 16, 2025)
export CHAIN_ID="95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4"
export APP_ID="99740274ffaa04d9ac49a6fe9af3763d7d9dbdf98379a6d68a7e04fcfb77a0e0"
export WALLET_PATH="$HOME/.config/linera/wallet.json"
export STORAGE_PATH="rocksdb:$HOME/.config/linera/client.db"

# Or use the provided .env file
cp .env.example .env
# Edit .env with your configuration
source .env
```

### 3. Run

**Option A - Using start script (Recommended):**
```bash
./start-backend.sh
```

**Option B - Manual:**
```bash
cargo run --release
```

Server akan berjalan di `http://0.0.0.0:3001`

**Note:** Make sure `linera service --port 8080` is running first!

## 📡 API Endpoints

### Health Check
```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "oracle-api-backend",
  "version": "0.1.0"
}
```

### Register Voter
```bash
POST /api/register-voter
Content-Type: application/json

{
  "stake": "1000",
  "name": "Alice",
  "metadata_url": null
}
```

Response:
```json
{
  "success": true,
  "data": "Voter registered successfully",
  "error": null
}
```

### Update Stake
```bash
POST /api/update-stake
Content-Type: application/json

{
  "additional_stake": "500"
}
```

### Submit Vote
```bash
POST /api/submit-vote
Content-Type: application/json

{
  "query_id": 1,
  "value": "Yes",
  "confidence": 90
}
```

### Claim Rewards
```bash
POST /api/claim-rewards
```

## 🧪 Testing

```bash
# Health check
curl http://localhost:3001/health

# Register voter
curl -X POST http://localhost:3001/api/register-voter \
  -H "Content-Type: application/json" \
  -d '{
    "stake": "1000",
    "name": "Alice",
    "metadata_url": null
  }'
```

## 🔧 Development

### Run with logging
```bash
RUST_LOG=info cargo run
```

### Run tests
```bash
cargo test
```

### Format code
```bash
cargo fmt
```

### Check code
```bash
cargo clippy
```

## 📊 Architecture

```
┌─────────────────────────────────────┐
│  Frontend (Dashboard)               │
│  - React/Next.js                    │
│  - User interface                   │
└──────────────┬──────────────────────┘
               │ HTTP POST
               ↓
┌─────────────────────────────────────┐
│  Backend API (This)                 │
│  - Axum web server                  │
│  - Linera SDK integration           │
│  - Operation execution              │
└──────────────┬──────────────────────┘
               │ Linera SDK
               ↓
┌─────────────────────────────────────┐
│  Linera Blockchain                  │
│  - Oracle Registry Contract         │
│  - State management                 │
│  - Validation                       │
└─────────────────────────────────────┘
```

## ⚠️ Current Status

### ✅ Implemented:
- HTTP API server
- Request validation
- Error handling
- CORS support
- Logging

### ⚠️ In Progress:
- Full Linera SDK integration
- Direct blockchain interaction
- Transaction signing

### 🔄 Temporary Solution:
Currently uses CLI subprocess as fallback until full SDK integration is complete.

## 🔐 Security Considerations

### For Production:

1. **Authentication**
   - Add JWT or API key authentication
   - Verify user identity

2. **Rate Limiting**
   - Limit requests per IP
   - Prevent spam

3. **Input Validation**
   - Validate all inputs
   - Sanitize data

4. **Wallet Security**
   - Secure wallet file
   - Use environment variables
   - Never commit wallet to git

5. **HTTPS**
   - Use TLS in production
   - Secure communication

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CHAIN_ID` | Linera chain ID | `95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4` |
| `APP_ID` | Application ID | `99740274ffaa04d9ac49a6fe9af3763d7d9dbdf98379a6d68a7e04fcfb77a0e0` |
| `WALLET_PATH` | Path to wallet file | `~/.config/linera/wallet.json` |
| `STORAGE_PATH` | Path to storage | `rocksdb:~/.config/linera/client.db` |
| `RUST_LOG` | Log level | `info` |

## 🐛 Troubleshooting

### Port already in use
```bash
# Kill existing process
lsof -ti:3001 | xargs kill -9

# Or use different port
# Edit main.rs: let addr = "0.0.0.0:3002";
```

### Wallet not found
```bash
# Check wallet exists
ls -la ~/.config/linera/wallet.json

# Set correct path
export WALLET_PATH="/path/to/your/wallet.json"
```

### Build errors
```bash
# Clean and rebuild
cargo clean
cargo build --release
```

## 📚 Dependencies

- `linera-sdk` - Linera blockchain SDK
- `axum` - Web framework
- `tokio` - Async runtime
- `serde` - Serialization
- `anyhow` - Error handling
- `tracing` - Logging

## 🚀 Deployment

### Docker (Coming Soon)
```dockerfile
FROM rust:1.75 as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
COPY --from=builder /app/target/release/oracle-api-backend /usr/local/bin/
CMD ["oracle-api-backend"]
```

### Systemd Service
```ini
[Unit]
Description=Oracle API Backend
After=network.target

[Service]
Type=simple
User=oracle
Environment="CHAIN_ID=..."
Environment="APP_ID=..."
ExecStart=/usr/local/bin/oracle-api-backend
Restart=always

[Install]
WantedBy=multi-user.target
```

## 📄 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Run tests
5. Submit pull request

## 📞 Support

For issues or questions:
- Check documentation
- Review logs
- Open GitHub issue

---

**Status:** 🚧 In Development  
**Version:** 0.1.0  
**Last Updated:** November 15, 2025
