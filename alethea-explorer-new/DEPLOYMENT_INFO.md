# Deployment Information

## Current Configuration

- **API Endpoint**: https://evonft.xyz
- **Network**: Conway Testnet
- **Last Updated**: February 3, 2026

## Environment Variables Required

```bash
VITE_API_URL=https://evonft.xyz
VITE_CHAIN_ID=9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec
VITE_REGISTRY_APP_ID=f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990
VITE_NETWORK=Conway Testnet
```

## Troubleshooting

If data is not showing:

1. Check browser console for errors
2. Verify environment variables in Vercel
3. Ensure API endpoint is accessible
4. Check CORS configuration on API server
5. Redeploy after adding env variables

## Testing

Test API endpoint:
```bash
curl -X POST https://evonft.xyz/linera \
  -H "Content-Type: application/json" \
  -d '{"query":"{ chains { list } }"}'
```
