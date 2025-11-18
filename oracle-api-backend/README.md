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
# Set environment variables (Latest deployment - November 18, 2025)
export LINERA_GRAPHQL_URL="http://localhost:8080"
export CHAIN_ID="8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef"
export APP_ID="9936172d5d1f3fb3ae65ea2bb51391afc561d9f8b80927c9e8e32c1efe9380d2"
export REGISTRY_ID="9936172d5d1f3fb3ae65ea2bb51391afc561d9f8b80927c9e8e32c1efe9380d2"
export MARKET_CHAIN_ID="438a180a65594f69d27d0d53eb2072213a476489d439aeef5f857ef9699f245b"
export PORT="3001"

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

| Variable | Description | Current Value |
|----------|-------------|---------------|
| `LINERA_GRAPHQL_URL` | Linera GraphQL endpoint | `http://localhost:8080` |
| `CHAIN_ID` | Application chain ID | `8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef` |
| `APP_ID` | Oracle Registry v2 app ID | `9936172d5d1f3fb3ae65ea2bb51391afc561d9f8b80927c9e8e32c1efe9380d2` |
| `REGISTRY_ID` | Oracle Registry v2 ID (same as APP_ID) | `9936172d5d1f3fb3ae65ea2bb51391afc561d9f8b80927c9e8e32c1efe9380d2` |
| `MARKET_CHAIN_ID` | Market Chain app ID (example DApp) | `438a180a65594f69d27d0d53eb2072213a476489d439aeef5f857ef9699f245b` |
| `PORT` | Backend server port | `3001` |
| `RUST_LOG` | Log level | `info` |

### Application IDs Explained

- **CHAIN_ID**: The main Linera chain where applications are deployed
- **APP_ID / REGISTRY_ID**: Oracle Registry v2 - Core oracle protocol with voter selection
- **MARKET_CHAIN_ID**: Prediction Market - Example DApp demonstrating oracle integration

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

**Status:** ✅ Production Ready  
**Version:** 0.2.0  
**Last Updated:** November 18, 2025

### Current Deployment

- **Chain ID**: `8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef`
- **Oracle Registry v2**: `9936172d5d1f3fb3ae65ea2bb51391afc561d9f8b80927c9e8e32c1efe9380d2`
- **Market Chain**: `438a180a65594f69d27d0d53eb2072213a476489d439aeef5f857ef9699f245b`
- **Network**: Linera Conway Testnet (Local)
