# Alethea Network Explorer

A modern explorer for the Alethea Network - Decentralized Oracle & Prediction Market on Linera.

## Features

- **Dashboard**: Network overview with key statistics
- **Prediction Queries**: Browse active and resolved oracle queries
- **ALTH Token**: View token info, supply, and top holders
- **Voters Leaderboard**: Track top voters, accuracy, and rewards
- **Real-time Updates**: Live data from the Linera network
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **Data Source**: Linera Service GraphQL API (via proxy)
- **Build Tool**: Vite
- **Icons**: Lucide React

## Prerequisites

- Node.js 18 or higher
- npm or pnpm
- **Linera Service running on localhost:8080**

## Installation

1. Navigate to the project directory:
   ```bash
   cd alethea-explorer-new
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment (optional):
   ```bash
   cp .env.example .env
   ```

## Configuration

Edit `.env` to customize application IDs and chain:

```bash
# Linera Network Configuration
VITE_NETWORK=Conway Testnet

# Alethea Application IDs
VITE_TOKEN_APP_ID=dac6b92743e8f02acd8367b75aef1dba6e91618c1c4fb863b73b87ec55a33ddd
VITE_REGISTRY_APP_ID=f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990

# Chain Configuration
VITE_CHAIN_ID=9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec
```

## Running

**Important**: Make sure Linera Service is running on `localhost:8080` before starting the explorer.

```bash
npm run dev
# or
npm start
```

The explorer will be available at `http://localhost:3001`

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Pages

### Home (/)
- Network connection status
- Key statistics (queries, voters, rewards)
- Token overview
- Quick links to other sections
- Active predictions preview

### Queries (/queries)
- All prediction queries
- Active vs resolved queries
- Vote distributions
- Rewards information

### Token (/token)
- ALTH token information
- Supply statistics (total, initial, inflation)
- Fee economics
- Top token holders

### Voters (/voters)
- Voters leaderboard
- Accuracy statistics
- Rewards tracking (total & pending)

## How It Works

The explorer connects to the Linera Service (running on localhost:8080) via Vite's proxy configuration. It queries the Alethea Registry and Token applications directly using GraphQL.

```
Browser -> Vite Dev Server (3001) -> Linera Service (8080) -> Alethea Apps
```

## License

This project follows the same license as the Linera protocol (Apache-2.0).
