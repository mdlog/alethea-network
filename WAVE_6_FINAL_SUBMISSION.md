# Alethea Network - Wave 6 Final Submission

**Linera Hackathon on Akindo Platform**
**Wave 6 (Final Wave) | February 2026 | Team MDLabs**

---

## FORM 1: Updates in This Wave (Copy this)

Wave 6 focuses on production readiness and comprehensive documentation. We rewrote README.md with version 3.4.0, updated architecture diagrams, and deployed latest contracts on Conway Testnet.

**Oracle Registry v2 (Protocol Backbone):**
The registry implements Hub-and-Spoke architecture where Hub chain stores all voters, processes votes, and determines resolution. Key operations include:
- `RegisterVoter/RegisterVoterFor`: Voter registration with minimum 100 ALTH stake
- `CreateQuery/CreateQueryWithCallback`: Query creation with outcomes, rewards, and consumer callback
- `CommitVote/RevealVote`: Two-phase commit-reveal voting using keccak256 hash
- `ResolveQuery`: Automatic resolution with weighted consensus
- `ClaimRewards`: Reward distribution to correct voters
- `SendMessage` variants: Cross-chain messaging via Linera protocol

**Technical Features:**
- 4-tier reputation system (Novice→Intermediate→Expert→Master) with 0.5x-2.0x weight multipliers
- Stake-weighted reward distribution: `voter_reward = (stake/total_stake) × reward_pool`
- 5% slashing for incorrect votes
- Cross-chain event streaming via `runtime.emit()` for real-time notifications
- Consumer app integration via `call_application()` for oracle callbacks

**Dashboard & Market:**
Oracle Dashboard provides WASM wallet connection, token faucet, voter registration, query creation, commit-reveal voting, and reward claiming. Prediction Market demonstrates oracle integration with betting, resolution requests, and automated payouts.

**URLs:**
- Oracle Dashboard: http://localhost:4002
- Prediction Market: http://localhost:4004
- GitHub: https://github.com/anthropics/alethea-network

---

## FORM 2: Milestone for 7th Wave (Copy this)

We are committed to continuing Alethea Network beyond this hackathon. For Wave 7, we focus on mainnet preparation and ecosystem expansion.

We will conduct security audits for all smart contracts (Oracle Registry, Simple Market, ALTH Token) and optimize performance for higher transaction volumes. An SDK package will enable third-party developers to integrate Alethea oracle services into their Linera applications.

We will implement multi-outcome markets beyond Yes/No questions, add dispute resolution for challenging oracle results, and create API documentation for new builders.

Our goal is to position Alethea Network as foundational oracle infrastructure for Linera.

---

## FORM 3: Milestone for 8th Wave (Copy this)

For Wave 8, we envision Alethea Network becoming a decentralized autonomous organization with community governance.

We will launch a governance token (ALETH-GOV) for voting on protocol parameters and upgrades. A DAO structure will handle treasury management. Liquidity pools and AMM functionality will enable passive income for market makers.

Mobile application using React Native will expand accessibility to iOS and Android. Integration with external data sources will provide price feeds, sports results, and weather data.

Enterprise features including private oracle networks, API tiers, and analytics dashboards will attract institutional users.

Our vision: Alethea Network as the standard oracle solution powering Linera's decentralized ecosystem.

---

## Deliverables

The Oracle Dashboard is accessible at http://localhost:4002 and provides the main interface for voters to register, stake tokens, vote on queries, and claim rewards. The Prediction Market is accessible at http://localhost:4004 and demonstrates oracle integration for real-world use cases like prediction markets. All source code is available in our GitHub repository with comprehensive documentation including the main README.md, architecture documentation in alethea-architecture-complete.md, and individual README files for each application.

The current deployment on Conway Testnet uses Chain ID 9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec with all three contracts (Oracle Registry, ALTH Token, and Simple Market) deployed and operational. Users can obtain test tokens from the Linera faucet at https://faucet.testnet-conway.linera.net.

---

## Our Vision & Future

This hackathon may be ending, but for us it marks the beginning of a larger journey. Throughout six waves, we poured our passion into building not just a project, but the foundation for what we hope becomes a cornerstone of the Linera ecosystem.

We are committed to continuing Alethea Network development. Our roadmap includes mainnet deployment, security audits, SDK for third-party integrations, mobile app, and governance token. We dream of Alethea becoming the trusted oracle infrastructure that powers DeFi, prediction markets, and enterprise solutions on Linera.

We will actively contribute to the Linera community, help developers integrate oracle services, and continuously improve based on feedback. This is not goodbye—this is the beginning.

## Conclusion

Wave 6 marks the culmination of our Linera Hackathon journey, but not the end of Alethea Network. We have built a fully functional decentralized oracle platform featuring: Oracle Dashboard with voter registration and staking; Prediction Market with oracle-powered resolution; and robust Hub-and-Spoke smart contracts for cross-chain scalability.

Alethea Network showcases Linera's potential for real-world decentralized applications. The combination of commit-reveal voting, stake-weighted rewards, and reputation-based trust creates a robust oracle foundation for the ecosystem.

Thank you to Linera and Akindo for this opportunity. To fellow participants—let's continue building together. See you on mainnet.

---

*Alethea Network - Decentralized Truth Through Consensus*

**Built on Linera Blockchain | Wave 6 Final Submission | February 2026**
