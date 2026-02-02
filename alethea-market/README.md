# Alethea Market - Prediction Market Demo

A prediction market application demonstrating integration with Alethea Oracle for decentralized resolution.

## Overview

This app shows how prediction markets can use Alethea Oracle as a resolution layer:

1. **Market Creation** - Users create markets with Yes/No questions
2. **Betting** - Users place bets on outcomes
3. **Oracle Resolution** - When market expires, Alethea Oracle voters determine the outcome
4. **Payouts** - Winners claim their rewards

## Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│   Alethea Market    │         │   Alethea Oracle    │
│   (This App)        │         │   (Resolution)      │
├─────────────────────┤         ├─────────────────────┤
│ - Create Markets    │────────▶│ - Receive Query     │
│ - Accept Bets       │         │ - Voters Vote       │
│ - Request Resolution│◀────────│ - Send Callback     │
│ - Distribute Payouts│         │ - Reward/Slash      │
└─────────────────────┘         └─────────────────────┘
```

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:4004
```

## Environment Variables

Create `.env.local`:

```env
VITE_FAUCET_URL=https://faucet.testnet-conway.linera.net
VITE_CHAIN_ID=<registry_chain_id>
VITE_MARKET_APP_ID=<simple_market_app_id>
VITE_REGISTRY_APP_ID=<oracle_registry_app_id>
```

## Features

- 🎯 Create prediction markets with Yes/No outcomes
- 💰 Place bets with potential payout calculation
- 🔮 Oracle-based resolution (commit-reveal voting)
- 📊 Real-time odds display
- 🎨 Modern dark UI with Tailwind CSS

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS
- @linera/client (WASM)
- Lucide React (icons)

## Related

- [Alethea Dashboard](../alethea-dashboard-vite) - Oracle voter interface
- [Simple Market Contract](../alethea-contract/simple-market) - Smart contract

## License

MIT
