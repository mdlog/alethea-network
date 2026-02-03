# Alethea Network Explorer

A modern blockchain explorer for the Alethea Network built on Linera blockchain.

## 🌐 Live Demo

- **Production**: [https://alethea-explorer.vercel.app](https://alethea-explorer.vercel.app)
- **API Endpoint**: [https://evonft.xyz](https://evonft.xyz)

## ✨ Features

- 🔍 **Chain Search** - Search and explore chains by ID from header
- 📦 **Block Explorer** - View blocks with detailed information (messages, events, oracle responses)
- ⛓️ **Chain Explorer** - Browse all chains on the network
- 📊 **Network Status** - Real-time network monitoring
- 🎨 **Modern UI** - Responsive design with dark theme and Tailwind CSS
- ⚡ **Fast & Efficient** - Built with Vite and React
- 🔗 **Deep Linking** - Direct links to blocks and chains

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/mdlog/alethea-network.git
cd alethea-network/alethea-explorer-new

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

The explorer will be available at `http://localhost:3001`

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```bash
# API URL (Linera Service Endpoint)
VITE_API_URL=https://evonft.xyz

# Network Configuration
VITE_NETWORK=Conway Testnet

# Application IDs
VITE_REGISTRY_APP_ID=f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990

# Chain ID
VITE_CHAIN_ID=9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec
```

## 📦 Build for Production

```bash
# Build the project
npm run build

# Preview production build
npm run preview
```

## 🚢 Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Set **Root Directory** to `alethea-explorer-new`
4. Add environment variables:
   - `VITE_API_URL=https://evonft.xyz`
   - `VITE_CHAIN_ID=your_chain_id`
   - `VITE_REGISTRY_APP_ID=your_registry_app_id`
   - `VITE_NETWORK=Conway Testnet`
5. Deploy!

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed instructions.

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Blockchain**: Linera Protocol
- **API**: GraphQL

## 📖 Pages

### Home (/)
- Network connection status
- Statistics overview (blocks, chains)
- Latest block information
- Recent blocks preview
- Quick links to other sections
- **Chain search results** (when searching from header)

### Blocks (/blocks)
- List of all blocks
- Block height, hash, timestamp
- Epoch information
- Clickable to view details

### Block Detail (/block/:hash)
- Complete block information
- Block header details
- Messages, Events, Oracle Responses
- Operation results
- Collapsible sections

### Chains (/chains)
- List of all chains on the network
- Main chain highlighted
- Recent blocks per chain
- Chain statistics

## 🔍 Features Detail

### Chain Search
- Search bar in header (available on all pages)
- Paste chain ID to view details
- Shows: Height, Epoch, Timestamp, Block Hash
- Recent blocks for that chain
- Clear button to return to home

### Block Explorer
- Real-time block updates
- Detailed block information
- Navigate between blocks
- View all transactions and events

### Network Monitoring
- Connection status indicator
- Network name display
- Real-time updates

## 📚 Documentation

- [Deployment Guide](./VERCEL_DEPLOYMENT.md) - How to deploy to Vercel
- [Production Setup](./PRODUCTION_SETUP.md) - Production configuration
- [Enhancement Recommendations](./ENHANCEMENT_RECOMMENDATIONS.md) - Future improvements

## 🔗 Links

- **Main Repository**: [github.com/mdlog/alethea-network](https://github.com/mdlog/alethea-network)
- **Alethea Dashboard**: Oracle & Prediction Market interface
- **API Endpoint**: [evonft.xyz](https://evonft.xyz)
- **Linera Protocol**: [linera.io](https://linera.io)

## 🏗️ Architecture

```
Browser
  ↓
Vercel (Static Hosting)
  ↓
evonft.xyz (Linera Service)
  ↓
Linera Blockchain
  ↓
Alethea Applications (Registry, Token)
```

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Workflow

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review [ENHANCEMENT_RECOMMENDATIONS.md](./ENHANCEMENT_RECOMMENDATIONS.md)

## 🙏 Acknowledgments

- Built on [Linera Protocol](https://linera.io)
- UI inspired by modern blockchain explorers
- Community feedback and contributions

---

Built with ❤️ for the Alethea Network community
