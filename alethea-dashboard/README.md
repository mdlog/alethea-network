# 🎯 Alethea Dashboard

**Professional Dashboard for Alethea Decentralized Oracle**

Modern, responsive, and feature-rich dashboard built with Next.js 14, TypeScript, and Tailwind CSS.

---

## ✨ Features

### 🎨 Modern UI/UX
- **Gradient Backgrounds** - Beautiful color schemes
- **Smooth Animations** - Polished transitions and effects
- **Responsive Design** - Works on all devices
- **Dark Mode Ready** - Prepared for dark theme

### 📊 Real-time Data
- **Live Updates** - Auto-refresh every 30 seconds
- **Protocol Stats** - Total markets, active markets, voters
- **Market Cards** - Beautiful market display
- **Search & Filter** - Find markets easily

### 🚀 Performance
- **Next.js 14** - Latest features and optimizations
- **TypeScript** - Type-safe code
- **Tailwind CSS** - Utility-first styling
- **Optimized Images** - Fast loading

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Linera service running on port 8080
- Alethea Oracle deployed

### Installation

```bash
# Navigate to dashboard
cd alethea-dashboard

# Install dependencies
npm install

# Start development server
npm run dev
```

Dashboard will be available at: **http://localhost:3333**

---

## 📁 Project Structure

```
alethea-dashboard/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main dashboard
│   └── globals.css         # Global styles
├── components/
│   ├── Header.tsx          # Navigation header
│   ├── StatsCard.tsx       # Statistics card
│   └── MarketCard.tsx      # Market display card
├── lib/
│   └── graphql.ts          # GraphQL client
├── types/
│   └── index.ts            # TypeScript types
├── public/                 # Static assets
├── .env.local              # Environment variables
└── package.json            # Dependencies
```

---

## 🔧 Configuration

### Environment Variables

Edit `.env.local`:

```bash
# Oracle Registry
NEXT_PUBLIC_REGISTRY_URL=http://localhost:8080/chains/<CHAIN_ID>/applications/<APP_ID>

# Voter Template
NEXT_PUBLIC_VOTER_URL=http://localhost:8080/chains/<CHAIN_ID>/applications/<APP_ID>

# Market Chain (for creating markets and querying Market Chain markets)
NEXT_PUBLIC_MARKET_CHAIN_URL=http://localhost:8080/chains/<CHAIN_ID>/applications/<MARKET_CHAIN_APP_ID>

# Registry Application ID (for operations)
NEXT_PUBLIC_ALETHEA_REGISTRY_ID=<REGISTRY_APP_ID>

# Network
NEXT_PUBLIC_NETWORK=Conway Testnet
NEXT_PUBLIC_CHAIN_ID=<YOUR_CHAIN_ID>
```

**Current Configuration:**
- Chain ID: `a2c0349ae6add80c92e26bb383aca8d98f9f3441c3097fec99111199c7f1e221`
- App ID: `948a0e49dc424b3cfb0a997d7c7ef05b048c5f4184a2a4d546d6d7abae823261`
- Network: Conway Testnet

---

## 🎨 UI Components

### Header
- Logo and branding
- Navigation menu
- Refresh button
- Last update indicator

### Stats Cards
- Total Markets
- Active Markets
- Resolved Markets
- Total Voters

### Market Cards
- Market question
- Status badge
- Outcomes display
- Deadline information
- View details link

### Search & Filter
- Real-time search
- Status filter (All, Open, Resolved)
- Responsive layout

---

## 📊 Features in Detail

### Real-time Updates
- Auto-refresh every 30 seconds
- Manual refresh button
- Loading states
- Error handling

### Search Functionality
- Search by market question
- Case-insensitive
- Instant results

### Filter Options
- All markets
- Open markets only
- Resolved markets only

### Responsive Design
- Mobile: 1 column
- Tablet: 2 columns
- Desktop: 3 columns
- Large screens: 4 columns

---

## 🔌 API Integration

### GraphQL Queries

**Protocol Stats:**
```graphql
query {
  protocolStats {
    totalMarkets
    activeMarkets
    resolvedMarkets
    totalVoters
  }
}
```

**Active Markets:**
```graphql
query {
  activeMarkets {
    id
    question
    outcomes
    status
    createdAt
    deadline
  }
}
```

---

## 🚀 Deployment

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Docker Deployment

```bash
# Build image
docker build -t alethea-dashboard .

# Run container
docker run -p 3333:3000 alethea-dashboard
```

---

## 🐛 Troubleshooting

### Issue: Dashboard not loading

**Solution:**
1. Check if Linera service is running: `ps aux | grep linera`
2. Verify GraphQL endpoint: `curl http://localhost:8080`
3. Check `.env.local` configuration
4. Restart dashboard: `npm run dev`

### Issue: No markets showing

**Solution:**
1. Verify Application ID is correct
2. Test GraphQL query manually
3. Check browser console for errors
4. Ensure markets exist in the oracle

### Issue: Connection timeout

**Solution:**
1. Wait 1-2 minutes for blob sync
2. Check service logs: `tail -f /tmp/linera-service.log`
3. Restart Linera service
4. Refresh dashboard

---

## 🎯 Roadmap

### Phase 1 (Current)
- [x] Dashboard homepage
- [x] Protocol stats
- [x] Market cards
- [x] Search & filter
- [x] Real-time updates

### Phase 2 (Next)
- [ ] Market detail page
- [ ] Voter dashboard
- [ ] Analytics page
- [ ] Charts & graphs
- [ ] Activity feed

### Phase 3 (Future)
- [ ] Trading interface
- [ ] Wallet integration
- [ ] User profiles
- [ ] Notifications
- [ ] Mobile app

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create feature branch
3. Make your changes
4. Test thoroughly
5. Submit pull request

---

## 📄 License

MIT License - Same as Alethea Network

---

## 📞 Support

For issues or questions:

- Check documentation
- Review troubleshooting guide
- Open GitHub issue
- Join Discord community

---

## 🏆 Credits

Built with:
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Linera Protocol** - Blockchain
- **GraphQL** - API queries

---

**Status:** ✅ PRODUCTION READY  
**Version:** 2.1.0  
**Updated:** November 15, 2025

🚀 **Ready to explore decentralized truth with Account-Based Registry v2!**

---

## 📚 Additional Documentation

- **[UPDATE_SUMMARY.md](./UPDATE_SUMMARY.md)** - Quick summary of v2.1 updates
- **[DASHBOARD_SYNC_STATUS.md](./DASHBOARD_SYNC_STATUS.md)** - Detailed synchronization status
- **[ACCOUNT_BASED_UPDATE.md](./ACCOUNT_BASED_UPDATE.md)** - Complete update guide
- **[DASHBOARD_UPDATE_COMPLETE.md](./.kiro/specs/account-based-registry/DASHBOARD_UPDATE_COMPLETE.md)** - Completion report
