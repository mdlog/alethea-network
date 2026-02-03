import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import LineraClient from './linera-client.js';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Linera client
const linera = new LineraClient();

// Error handler
const handleError = (res, error, message = 'Internal server error') => {
  console.error(error);
  res.status(500).json({ error: message, details: error.message });
};

// ============================================================================
// NETWORK & CHAIN ENDPOINTS
// ============================================================================

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const chainInfo = await linera.getChainInfo();
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      network: process.env.VITE_NETWORK || 'Conway Testnet',
      chainId: linera.chainId,
      connected: !!chainInfo
    });
  } catch (error) {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      network: process.env.VITE_NETWORK || 'Conway Testnet',
      chainId: linera.chainId,
      connected: false,
      error: error.message
    });
  }
});

// Get network stats
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await linera.getNetworkStats();
    res.json(stats);
  } catch (error) {
    handleError(res, error, 'Failed to fetch network stats');
  }
});

// Get chain info
app.get('/api/chain', async (req, res) => {
  try {
    const chainId = req.query.chainId || linera.chainId;
    const data = await linera.getChainInfo(chainId);
    res.json(data.chain);
  } catch (error) {
    handleError(res, error, 'Failed to fetch chain info');
  }
});

// Get blocks
app.get('/api/blocks', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const chainId = req.query.chainId || linera.chainId;
    const data = await linera.getBlocks(chainId, limit);
    
    // Transform blocks data
    const blocks = data.chain?.blocks?.edges?.map(edge => ({
      hash: edge.node.hash,
      height: edge.node.height,
      timestamp: edge.node.timestamp,
      chain_id: chainId,
      operationsCount: edge.node.operations?.length || 0,
      bundlesCount: edge.node.incomingBundles?.length || 0,
    })) || [];
    
    res.json(blocks);
  } catch (error) {
    handleError(res, error, 'Failed to fetch blocks');
  }
});

// Get block by hash
app.get('/api/blocks/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const chainId = req.query.chainId || linera.chainId;
    const data = await linera.getBlock(chainId, hash);
    
    if (!data.chain?.block) {
      return res.status(404).json({ error: 'Block not found' });
    }
    
    const block = data.chain.block;
    res.json({
      hash: block.hash,
      height: block.height,
      timestamp: block.timestamp,
      chain_id: chainId,
      operations: block.operations || [],
      incomingBundles: block.incomingBundles || [],
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch block');
  }
});

// ============================================================================
// ALETHEA REGISTRY ENDPOINTS (Queries/Predictions)
// ============================================================================

// Get all queries
app.get('/api/queries', async (req, res) => {
  try {
    const data = await linera.getQueries();
    res.json(data.queries || []);
  } catch (error) {
    handleError(res, error, 'Failed to fetch queries');
  }
});

// Get specific query
app.get('/api/queries/:id', async (req, res) => {
  try {
    const queryId = parseInt(req.params.id);
    const data = await linera.getQuery(queryId);
    
    if (!data.query) {
      return res.status(404).json({ error: 'Query not found' });
    }
    
    res.json(data.query);
  } catch (error) {
    handleError(res, error, 'Failed to fetch query');
  }
});

// Get voters
app.get('/api/voters', async (req, res) => {
  try {
    const data = await linera.getVoters();
    res.json(data.voters || []);
  } catch (error) {
    handleError(res, error, 'Failed to fetch voters');
  }
});

// ============================================================================
// ALETHEA TOKEN ENDPOINTS
// ============================================================================

// Get token info
app.get('/api/token', async (req, res) => {
  try {
    const data = await linera.getTokenInfo();
    res.json(data);
  } catch (error) {
    handleError(res, error, 'Failed to fetch token info');
  }
});

// Get token balance
app.get('/api/token/balance/:owner', async (req, res) => {
  try {
    const { owner } = req.params;
    const data = await linera.getTokenBalance(owner);
    res.json({ owner, balance: data.balance || '0' });
  } catch (error) {
    handleError(res, error, 'Failed to fetch token balance');
  }
});

// Get all token holders
app.get('/api/token/holders', async (req, res) => {
  try {
    const data = await linera.getTokenHolders();
    res.json(data.allBalances || []);
  } catch (error) {
    handleError(res, error, 'Failed to fetch token holders');
  }
});

// ============================================================================
// CONFIGURATION ENDPOINT
// ============================================================================

// Get app configuration (public info only)
app.get('/api/config', (req, res) => {
  res.json({
    network: process.env.VITE_NETWORK || 'Conway Testnet',
    chainId: linera.chainId,
    registryAppId: linera.registryAppId,
    tokenAppId: linera.tokenAppId,
    rpcUrl: linera.rpcUrl,
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         Alethea Network Explorer API Server                  ║
╠═══════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                   ║
║  Network: ${(process.env.VITE_NETWORK || 'Conway Testnet').padEnd(47)}║
║  Chain: ${linera.chainId.slice(0, 16)}...                          ║
║  RPC: ${linera.rpcUrl.padEnd(49)}║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                   ║
║  - GET /api/health          Health check                      ║
║  - GET /api/stats           Network stats                     ║
║  - GET /api/blocks          Get blocks                        ║
║  - GET /api/blocks/:hash    Get block by hash                 ║
║  - GET /api/queries         Get all prediction queries        ║
║  - GET /api/queries/:id     Get query by ID                   ║
║  - GET /api/voters          Get voters leaderboard            ║
║  - GET /api/token           Get ALTH token info               ║
║  - GET /api/token/holders   Get token holders                 ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});
