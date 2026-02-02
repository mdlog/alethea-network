/**
 * Inflation Scheduler for Alethea Network Hybrid Model
 * 
 * This script periodically mints inflation tokens to the inflation pool
 * based on the configured inflation rate.
 * 
 * Run this as a cron job or background process to maintain the reward pool.
 * 
 * Usage:
 *   node inflation-scheduler.js
 * 
 * Environment Variables:
 *   ORACLE_GRAPHQL_ENDPOINT - GraphQL endpoint for the oracle registry
 *   INFLATION_AMOUNT - Amount to mint per interval (in ALTH tokens)
 *   MINT_INTERVAL_MS - Interval between mints in milliseconds (default: 1 hour)
 *   ADMIN_CHAIN_ID - Admin chain ID for authentication
 */

const http = require('http');
const https = require('https');

// Configuration
const config = {
  oracleEndpoint: process.env.ORACLE_GRAPHQL_ENDPOINT || 'http://localhost:8080/graphql',
  inflationAmount: process.env.INFLATION_AMOUNT || '1000.', // 1000 ALTH per interval
  mintIntervalMs: parseInt(process.env.MINT_INTERVAL_MS) || 3600000, // 1 hour
  adminChainId: process.env.ADMIN_CHAIN_ID || '',
};

console.log('========================================');
console.log('Alethea Inflation Scheduler');
console.log('========================================');
console.log(`Oracle Endpoint: ${config.oracleEndpoint}`);
console.log(`Inflation Amount: ${config.inflationAmount} ALTH per interval`);
console.log(`Mint Interval: ${config.mintIntervalMs / 1000 / 60} minutes`);
console.log('========================================');

/**
 * Execute a GraphQL mutation
 */
async function executeGraphQL(query) {
  return new Promise((resolve, reject) => {
    const url = new URL(config.oracleEndpoint);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const postData = JSON.stringify({ query });

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.errors) {
            reject(new Error(json.errors[0]?.message || 'GraphQL error'));
          } else {
            resolve(json.data);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Get current hybrid model stats
 */
async function getHybridStats() {
  const query = `
    query {
      hybridModelStats {
        inflationPool
        totalInflationDistributed
        bondPool
        totalBondsRefunded
        totalBondsSlashed
      }
    }
  `;

  return await executeGraphQL(query);
}

/**
 * Mint inflation tokens
 */
async function mintInflation(amount) {
  const mutation = `
    mutation {
      mintInflation(amount: "${amount}")
    }
  `;

  return await executeGraphQL(mutation);
}

/**
 * Auto-resolve queries that are ready
 */
async function autoResolveQueries() {
  const mutation = `
    mutation {
      executeAutoResolveQueries
    }
  `;

  return await executeGraphQL(mutation);
}

/**
 * Check expired queries
 */
async function checkExpiredQueries() {
  const mutation = `
    mutation {
      executeCheckExpiredQueries
    }
  `;

  return await executeGraphQL(mutation);
}

/**
 * Format amount for display
 */
function formatAmount(amount) {
  const value = parseFloat(amount) / 1e18;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/**
 * Main scheduler loop
 */
async function runScheduler() {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] Running scheduled tasks...`);

  try {
    // 1. Get current stats
    console.log('  📊 Fetching current stats...');
    const stats = await getHybridStats();
    console.log(`     Inflation Pool: ${formatAmount(stats.hybridModelStats.inflationPool)} ALTH`);
    console.log(`     Bond Pool: ${formatAmount(stats.hybridModelStats.bondPool)} ALTH`);

    // 2. Mint inflation
    console.log(`  💰 Minting ${config.inflationAmount} ALTH...`);
    const mintResult = await mintInflation(config.inflationAmount);
    console.log(`     Result: ${mintResult.mintInflation ? 'Success' : 'Failed'}`);

    // 3. Auto-resolve queries
    console.log('  ⏱️  Auto-resolving ready queries...');
    const resolveResult = await autoResolveQueries();
    console.log(`     Result: ${resolveResult.executeAutoResolveQueries ? 'Success' : 'Failed'}`);

    // 4. Check expired queries
    console.log('  📅 Checking expired queries...');
    const expireResult = await checkExpiredQueries();
    console.log(`     Result: ${expireResult.executeCheckExpiredQueries ? 'Success' : 'Failed'}`);

    // 5. Get updated stats
    const newStats = await getHybridStats();
    console.log('  ✅ Tasks completed');
    console.log(`     New Inflation Pool: ${formatAmount(newStats.hybridModelStats.inflationPool)} ALTH`);
    console.log(`     Total Distributed: ${formatAmount(newStats.hybridModelStats.totalInflationDistributed)} ALTH`);

  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
  }
}

/**
 * Calculate inflation amounts based on annual rate
 */
function calculateInflationSchedule() {
  // These values should come from protocol parameters
  const annualInflationRate = 0.05; // 5%
  const totalSupply = 100000000; // 100M ALTH
  const intervalsPerYear = (365 * 24 * 60 * 60 * 1000) / config.mintIntervalMs;
  
  const annualInflation = totalSupply * annualInflationRate;
  const perIntervalInflation = annualInflation / intervalsPerYear;
  
  console.log('\n📈 Inflation Schedule:');
  console.log(`   Annual Rate: ${annualInflationRate * 100}%`);
  console.log(`   Intervals/Year: ${intervalsPerYear.toFixed(0)}`);
  console.log(`   Per Interval: ${perIntervalInflation.toFixed(2)} ALTH`);
  console.log('');
}

/**
 * Start the scheduler
 */
async function start() {
  console.log('\n🚀 Starting Inflation Scheduler...\n');
  
  // Show inflation schedule
  calculateInflationSchedule();
  
  // Run immediately on start
  await runScheduler();
  
  // Schedule recurring runs
  setInterval(runScheduler, config.mintIntervalMs);
  
  console.log(`\n⏰ Scheduler running. Next mint in ${config.mintIntervalMs / 1000 / 60} minutes.\n`);
  console.log('Press Ctrl+C to stop.\n');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down inflation scheduler...\n');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down inflation scheduler...\n');
  process.exit(0);
});

// Start the scheduler
start().catch((error) => {
  console.error('Failed to start scheduler:', error);
  process.exit(1);
});
