# Alethea Website Content Structure

## Hero Section
- Title: "DECENTRALIZED ORACLE FOR LINERA PROTOCOL"
- Subtitle: "Committee-based consensus with reputation-weighted voting"
- CTA: "GET_STARTED" → vote.alethea.network

## Section 1: What is Alethea?
- Decentralized oracle platform for DApps
- Provides consensus-based data verification
- Built on Linera blockchain
- 3 key features:
  1. Decentralized Oracle - Consensus-based data verification
  2. Parallel Optimized - Built for Linera's microchain architecture
  3. Reputation Based - Accuracy-weighted voting with slashing

## Section 2: Architecture
- Hub-and-Spoke Model
  - Central registry chain (hub)
  - Multiple market chains (spokes)
  - Cross-chain messaging
  
- Smart Contracts (3):
  1. Oracle Registry - Voter management, reputation tracking
  2. ALTH Token - Stake management, rewards distribution
  3. Market Chain - Query creation, voting, resolution

- Data Flow:
  1. DApp creates query on market chain
  2. Query propagates to registry
  3. Voters commit votes (encrypted)
  4. Voters reveal votes
  5. Consensus reached
  6. Result sent back to DApp

## Section 3: Use Cases
- Prediction Markets
- Price Feeds
- Event Resolution
- Cross-chain Data Verification
- DeFi Oracle Services

## Section 4: How It Works
1. CREATE_QUERY - DApp submits query with outcomes and rewards
2. COMMIT_REVEAL - Voters participate in two-phase voting
3. GET_RESULT - Consensus reached, rewards distributed

## Section 5: Key Features
- Secure Voting: Two-phase commit-reveal with cryptography
- Reputation System: Accuracy-based voter scoring
- Stake Requirements: 100 ALTH minimum
- Slashing: 5% penalty for incorrect votes
- Rewards: Distributed to correct voters

## Section 6: Technical Specs
- Network: Linera Conway Testnet
- Token: ALTH
- Minimum Stake: 100 ALTH
- Voting Phases: Commit → Reveal → Resolution
- Response Time: <1 second

## Section 7: CTA
- "READY_TO_BUILD?" 
- "Start creating prediction markets with secure oracle voting"
- Button: "LAUNCH_APP" → vote.alethea.network
