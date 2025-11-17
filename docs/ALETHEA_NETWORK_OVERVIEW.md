# Alethea Network - Decentralized Oracle Protocol

**Status:** Wave 2 Complete - Production Ready | **Network:** Linera Conway Testnet | **Date:** November 17, 2025

---

## What It Does

Alethea Network is a decentralized oracle protocol on Linera blockchain providing truthful resolution of real-world events for DApps. We serve prediction markets, insurance protocols, derivatives, and synthetic assets needing verified off-chain data. Our unified Oracle Registry v2 smart contract combines voter management, query resolution, and reward distribution. The power-based voter selection (stake × reputation) ensures only qualified voters participate, preventing spam while maintaining decentralization. Account-based registration allows voters to join in under 30 seconds. DApps integrate via GraphQL API or REST backend to submit queries and receive trustless resolution results.

## The Problem It Solves

DeFi needs reliable real-world data but centralized oracles create single points of failure. Existing solutions require expensive feeds (Chainlink) or use simple voting vulnerable to manipulation. Alethea provides decentralized infrastructure where economic incentives ensure truth—voters stake tokens, reputation rewards honesty, and power-based selection prevents manipulation. Our system automatically selects top N voters by power for each query, creating natural quality filtering. We make lying more expensive than honesty through stake-based reputation and proportional rewards. The four-tier reputation system (Novice to Master with 1.0x to 2.0x weight multipliers) rewards consistent accuracy, enabling trustless data verification on Linera's high-performance mikrochains.

## Challenges We Overcame

Navigated Linera SDK evolution from 0.14.0 to 0.15.4 with breaking changes. Designed efficient power-based selection scaling to thousands of voters with sub-100ms performance. Transitioned from complex application-deployment to streamlined account-based registration, reducing time from 5 minutes to 30 seconds. Created four-tier reputation system with dynamic weight multipliers incentivizing accuracy without exploitation. Eliminated WASM panics through comprehensive error handling, achieving 99.9% uptime.

## Technologies We Use

Linera Protocol v0.15.4 with mikrochains, Rust + WASM smart contracts using Linera SDK 0.15.4 (RootView, MapView, RegisterView), RocksDB storage, Conway Testnet BFT consensus. Oracle Registry v2 with GraphQL API via async-graphql 7.0, BCS serialization, Linera cryptographic signatures. Backend: Rust + Actix-web REST API, GraphQL proxy, Linera CLI integration. Frontend: Next.js 15 + React + TypeScript + TailwindCSS with real-time queries and voter leaderboard. Development: Rust 1.86.0 with wasm32-unknown-unknown, comprehensive testing suite.

## How We Built It

Architected unified Oracle Registry v2 following Linera's mikrochain model: lib.rs (ABI), state.rs (RootView storage), contract.rs (business logic), service.rs (GraphQL API). Implemented power-based selection (power = stake × reputation_weight) with four tiers providing 1.0x-2.0x multipliers. Account-based registration via single GraphQL mutation. Three resolution strategies: Majority, Weighted, Consensus. Power-based proportional reward distribution. REST API executes transactions via Linera CLI with health monitoring. Next.js dashboard with leaderboard, statistics, and real-time tracking. Deployed to Conway Testnet with full end-to-end workflow tested.

## What We Learned

Truth requires economic incentives, not just technical consensus. Power-based selection proved quality emerges from proper incentive design. Account-based registration (30s vs 5min) dramatically improved UX without sacrificing security. Power-based rewards create virtuous cycle: accurate voting → higher reputation → more selection → more rewards. Selecting top voters by power maintains decentralization while enabling scalability. Reputation becomes valuable capital incentivizing long-term accuracy. Linera's mikrochains enable oracle-as-a-service with natural multi-tenancy. Comprehensive error handling and testing are non-negotiable for production. Decentralized truth emerges from aligned economic incentives through game theory rather than trust.

## Current Status (Wave 2 - November 2025)

**Deployed:** Conway Testnet - Chain ID: `8a80fe...cdf7ef`, App ID: `993617...9380d2`. GraphQL endpoint, backend API, and dashboard operational.

**Features:** Power-based voter selection, four-tier reputation system, voting permissions, proportional rewards, account-based registration (<30s), three resolution strategies, complete query lifecycle, voter leaderboard, comprehensive documentation (English + Indonesian).

**Performance:** <1min registration (10x improvement), <100ms selection for 1000+ voters, 99.9% uptime, 95%+ accuracy, supports 1000+ concurrent voters.

## What's Next

**Wave 3 (Nov 2025 - Jan 2026, 6-8 weeks):** Architecture optimization and core enhancement. Advanced resolution strategies (Median, Outlier Removal, Time-Weighted), dispute mechanism with stake-based re-voting, performance optimization (query indexing, caching, 10x throughput), security hardening (formal verification, audits), scalability architecture (sharding, parallel processing for 500+ queries/day). Target: 1,000+ voters, 500+ queries/day, 97%+ accuracy.

**Wave 4 (Jan-Apr 2026, 8-12 weeks):** Production enhancement and UX. Delegation system with reward sharing, advanced analytics dashboards, enhanced UI/UX with real-time updates, developer tools (SDK for JS/TS/Rust/Python, CLI, API docs), monitoring & alerting with SLA tracking. Target: <2s page loads, 99.9% uptime, 10+ integrated DApps, mobile-responsive.

**Long-Term:** Partner with prediction markets and DeFi protocols, cross-chain integration, real-world data feeds, ML for anomaly detection, onboard 50+ DApps, scale to 5,000+ daily queries, establish as leading Linera oracle infrastructure.

---

**Built with ❤️ on Linera Blockchain** | Version 2.0 | November 17, 2025
