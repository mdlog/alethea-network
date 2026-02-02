# 📚 Alethea Network Documentation

**Complete documentation for Alethea Oracle Protocol**

---

## 🎯 Quick Navigation

### For New Users
1. **START HERE** → `START_HERE.md`
2. **Quick Guide** → `COMMUNICATION_FLOW_SIMPLE.md`
3. **Voter Guide** → `VOTER_QUICK_GUIDE.md`
4. **Testing** → `TESTING_QUICK_START.md`

### For Developers
1. **Architecture** → `COMMUNICATION_ARCHITECTURE_DETAILED.md`
2. **Voter Workflow** → `VOTER_WORKFLOW_DETAILED.md`
3. **Testing Guide** → `TESTING_WORKFLOW_COMPLETE.md`
4. **Deployment IDs** → `CURRENT_DEPLOYMENT_IDS.md`

---

## 📖 Documentation Index

### 🏗️ Architecture & Design

| Document | Description | Audience |
|----------|-------------|----------|
| `ARCHITECTURE_SUMMARY.md` | High-level architecture overview | Everyone |
| `ARCHITECTURE_AUDIT_COMPLETE.md` | Complete architecture audit | Developers |
| `COMMUNICATION_ARCHITECTURE_DETAILED.md` | Detailed message flow & communication | Developers |
| `COMMUNICATION_FLOW_SIMPLE.md` | Simple visual flow diagram | Everyone |

### 🗳️ Voter Documentation

| Document | Description | Audience |
|----------|-------------|----------|
| `VOTER_QUICK_GUIDE.md` | Quick guide for voters | Voters |
| `VOTER_WORKFLOW_DETAILED.md` | Complete voter workflow | Developers |

### 🧪 Testing & Deployment

| Document | Description | Audience |
|----------|-------------|----------|
| `TESTING_QUICK_START.md` | Quick testing guide | Everyone |
| `TESTING_WORKFLOW_COMPLETE.md` | Complete testing scenarios | Developers |
| `CURRENT_DEPLOYMENT_IDS.md` | Current deployment information | Everyone |
| `DEPLOYMENT_SUMMARY_NOV9_2025.md` | Deployment summary | Developers |

### 📝 Status & Updates

| Document | Description | Audience |
|----------|-------------|----------|
| `START_HERE.md` | Entry point & recent updates | Everyone |
| `FINAL_STATUS_AND_NEXT_STEPS.md` | Current status & roadmap | Everyone |
| `CLEANUP_COMPLETE_NOV9.md` | Cleanup summary | Developers |

### 🔧 Guides & References

| Document | Description | Audience |
|----------|-------------|----------|
| `SDK_INTEGRATION_GUIDE.md` | How to integrate Alethea SDK | Developers |
| `CREATE_MARKET_GUIDE.md` | How to create markets | Users |
| `QUICK_REFERENCE.md` | Quick command reference | Everyone |

---

## 🚀 Quick Start

### 1. Understand the System

**Read in this order:**
1. `START_HERE.md` - Overview
2. `COMMUNICATION_FLOW_SIMPLE.md` - How it works
3. `VOTER_QUICK_GUIDE.md` - How voters work

**Time:** 15 minutes

---

### 2. Run Tests

**Prerequisites:**
```bash
# Start Linera service
linera service --port 8080

# Load environment
source .env.conway
```

**Run automated test:**
```bash
./scripts/test-end-to-end.sh
```

**Time:** 5 minutes

---

### 3. Explore Details

**For deep understanding:**
1. `COMMUNICATION_ARCHITECTURE_DETAILED.md` - Complete message flow
2. `VOTER_WORKFLOW_DETAILED.md` - How voters work internally
3. `TESTING_WORKFLOW_COMPLETE.md` - All testing scenarios

**Time:** 1 hour

---

## 📊 System Overview

### Components

```
┌─────────────────────────────────────────────────────────┐
│                 Alethea Oracle Protocol                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐                                       │
│  │ Market Chain │ ← Prediction market dApp              │
│  └──────┬───────┘                                       │
│         │                                                │
│         ▼                                                │
│  ┌──────────────────┐                                   │
│  │ Oracle Registry  │ ← Coordinator                     │
│  └──────┬───────────┘                                   │
│         │                                                │
│         ▼                                                │
│  ┌─────────────────────────────┐                        │
│  │ Voter Pool (3 voters)       │ ← Resolution layer     │
│  └─────────────────────────────┘                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Current Deployment

**Network:** Conway Testnet  
**Chain ID:** `c8e5acd...`

**Applications:**
- Registry: `cf07075...`
- Market Chain: `944637...`
- Voter 1: `213097...`
- Voter 2: `0b688c...`
- Voter 3: `12c58b...`

See `CURRENT_DEPLOYMENT_IDS.md` for full IDs.

---

## 🔄 Complete Workflow

### Simple Flow

```
1. Create Market
   ↓
2. Register with Registry
   ↓
3. Registry selects 3 voters
   ↓
4. Voters receive VoteRequest
   ↓
5. Voters commit votes (hash only)
   ↓
6. Voters reveal votes (outcome + salt)
   ↓
7. Registry aggregates votes
   ↓
8. Market resolved
   ↓
9. Voters receive rewards
```

**Time:** ~30 seconds (with auto-vote)

---

## 🎯 Key Features

### ✅ What Works

- ✅ Market creation
- ✅ Market queries
- ✅ Voter registration
- ✅ Vote requests
- ✅ Commit-reveal voting
- ✅ Vote aggregation
- ✅ Market resolution
- ✅ Reward distribution
- ✅ Reputation tracking
- ✅ Auto-voting

### ❌ Known Issues

- ❌ Market Chain → Registry communication (`call_application` doesn't work)
  - **Workaround:** Manual registration via GraphQL
- ❌ Voter manual voting mutations
  - **Workaround:** Use auto-vote mode

See `FINAL_STATUS_AND_NEXT_STEPS.md` for details.

---

## 📝 Testing Checklist

### Basic Test
- [ ] Services running
- [ ] Create market
- [ ] Register with Registry
- [ ] Voters receive VoteRequest
- [ ] Votes committed
- [ ] Votes revealed
- [ ] Market resolved
- [ ] Rewards distributed

### Advanced Test
- [ ] Multiple concurrent markets
- [ ] Manual voting
- [ ] Auto-voting
- [ ] Wrong votes (no rewards)
- [ ] High volume (10+ markets)

See `TESTING_WORKFLOW_COMPLETE.md` for detailed tests.

---

## 🔗 External Resources

### Linera Documentation
- [Linera Docs](https://linera.dev/)
- [GraphQL API](https://linera.dev/developers/backend/service.html)
- [Cross-chain Messages](https://linera.dev/developers/advanced_topics/cross-chain.html)

### Alethea Resources
- Main README: `../../README.md`
- SDK Guide: `SDK_INTEGRATION_GUIDE.md`
- Architecture Spec: `../../.kiro/specs/oracle-protocol-transformation/`

---

## 🆘 Getting Help

### Common Issues

**Issue:** Voters not receiving VoteRequest
- **Solution:** Check `TESTING_WORKFLOW_COMPLETE.md` → Troubleshooting

**Issue:** Market not resolving
- **Solution:** Check `COMMUNICATION_ARCHITECTURE_DETAILED.md` → Current Issues

**Issue:** Mutations not working
- **Solution:** Use auto-vote mode or check `VOTER_WORKFLOW_DETAILED.md`

### Documentation

For specific topics, use the index above to find the right document.

---

## 📅 Recent Updates

### November 9, 2025

**Documentation Created:**
- ✅ Complete communication architecture
- ✅ Voter workflow guides
- ✅ Testing guides
- ✅ Automated test script

**Cleanup:**
- ✅ Removed obsolete files
- ✅ Organized documentation
- ✅ Updated deployment IDs

**Status:**
- ✅ Core functionality working
- ⚠️ Known issues documented
- ✅ Workarounds available

---

## 🎓 Learning Path

### Beginner (30 minutes)
1. Read `START_HERE.md`
2. Read `COMMUNICATION_FLOW_SIMPLE.md`
3. Run `./scripts/test-end-to-end.sh`

### Intermediate (2 hours)
1. Read `VOTER_QUICK_GUIDE.md`
2. Read `TESTING_QUICK_START.md`
3. Run manual tests
4. Explore dashboard

### Advanced (1 day)
1. Read `COMMUNICATION_ARCHITECTURE_DETAILED.md`
2. Read `VOTER_WORKFLOW_DETAILED.md`
3. Read `TESTING_WORKFLOW_COMPLETE.md`
4. Study source code
5. Run all test scenarios

---

## 📊 Documentation Stats

- **Total Documents:** 20+
- **Total Pages:** 100+
- **Code Examples:** 50+
- **Diagrams:** 10+
- **Test Scripts:** 1 automated script

---

## 🤝 Contributing

When adding new documentation:

1. **Follow naming convention:** `TOPIC_TYPE.md`
2. **Add to this index**
3. **Include examples**
4. **Keep it concise**
5. **Update date**

---

## 📜 License

MIT License - See main repository for details

---

**Documentation Last Updated:** November 9, 2025  
**Status:** ✅ Complete & Ready for Use

---

**Happy Building! 🚀**
