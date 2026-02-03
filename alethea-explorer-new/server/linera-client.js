/**
 * Linera GraphQL Client for Alethea Network Explorer
 * Connects to Linera RPC to fetch blockchain data
 */

const LINERA_RPC = process.env.VITE_LINERA_RPC || 'https://rpc.testnet-conway.linera.net';
const CHAIN_ID = process.env.VITE_CHAIN_ID || '9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec';
const REGISTRY_APP_ID = process.env.VITE_REGISTRY_APP_ID || 'f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990';
const TOKEN_APP_ID = process.env.VITE_TOKEN_APP_ID || 'dac6b92743e8f02acd8367b75aef1dba6e91618c1c4fb863b73b87ec55a33ddd';

export class LineraClient {
  constructor() {
    this.rpcUrl = LINERA_RPC;
    this.chainId = CHAIN_ID;
    this.registryAppId = REGISTRY_APP_ID;
    this.tokenAppId = TOKEN_APP_ID;
  }

  /**
   * Execute a GraphQL query against the Linera RPC
   */
  async query(query, variables = {}) {
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`Linera RPC error: ${response.statusText}`);
    }

    const result = await response.json();
    if (result.errors) {
      throw new Error(`GraphQL error: ${result.errors[0].message}`);
    }

    return result.data;
  }

  /**
   * Execute a GraphQL query against a specific application
   */
  async appQuery(appId, query, variables = {}) {
    const url = `${this.rpcUrl}/chains/${this.chainId}/applications/${appId}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`Application query error: ${response.statusText}`);
    }

    const result = await response.json();
    if (result.errors) {
      throw new Error(`GraphQL error: ${result.errors[0].message}`);
    }

    return result.data;
  }

  /**
   * Get chain info
   */
  async getChainInfo(chainId = this.chainId) {
    const query = `
      query {
        chain(chainId: "${chainId}") {
          chainId
          balance
          timestamp
          nextBlockHeight
        }
      }
    `;
    return this.query(query);
  }

  /**
   * Get blocks for a chain
   */
  async getBlocks(chainId = this.chainId, limit = 50) {
    const query = `
      query {
        chain(chainId: "${chainId}") {
          blocks(first: ${limit}) {
            edges {
              node {
                hash
                height
                timestamp
                incomingBundles {
                  origin
                  bundle {
                    messages {
                      message
                    }
                  }
                }
                operations {
                  operation
                }
              }
            }
          }
        }
      }
    `;
    return this.query(query);
  }

  /**
   * Get a specific block by hash
   */
  async getBlock(chainId, hash) {
    const query = `
      query {
        chain(chainId: "${chainId}") {
          block(hash: "${hash}") {
            hash
            height
            timestamp
            incomingBundles {
              origin
              bundle {
                messages {
                  message
                }
              }
            }
            operations {
              operation
            }
          }
        }
      }
    `;
    return this.query(query);
  }

  /**
   * Get all queries from Alethea Registry
   */
  async getQueries() {
    const query = `
      query {
        queries {
          id
          description
          outcomes
          status
          strategy
          minVotes
          rewardAmount
          endTime
          totalVotes
          votes {
            voter
            outcome
            stake
            timestamp
          }
          voteCounts
          result
        }
      }
    `;
    return this.appQuery(this.registryAppId, query);
  }

  /**
   * Get a specific query by ID
   */
  async getQuery(queryId) {
    const query = `
      query {
        query(id: ${queryId}) {
          id
          description
          outcomes
          status
          strategy
          minVotes
          rewardAmount
          endTime
          totalVotes
          votes {
            voter
            outcome
            stake
            timestamp
          }
          voteCounts
          result
        }
      }
    `;
    return this.appQuery(this.registryAppId, query);
  }

  /**
   * Get token info from Alethea Token
   */
  async getTokenInfo() {
    const query = `
      query {
        name
        symbol
        decimals
        totalSupply
        initialSupply
        inflationRate
        lastInflationTime
        serviceFeeRate
        totalFees
        burnedFees
      }
    `;
    return this.appQuery(this.tokenAppId, query);
  }

  /**
   * Get token balance for an owner
   */
  async getTokenBalance(owner) {
    const query = `
      query {
        balance(owner: "${owner}")
      }
    `;
    return this.appQuery(this.tokenAppId, query);
  }

  /**
   * Get all token holders (top balances)
   */
  async getTokenHolders() {
    const query = `
      query {
        allBalances {
          owner
          balance
        }
      }
    `;
    return this.appQuery(this.tokenAppId, query);
  }

  /**
   * Get voter stats from registry
   */
  async getVoters() {
    const query = `
      query {
        voters {
          address
          totalVotes
          correctVotes
          totalRewards
          pendingRewards
        }
      }
    `;
    return this.appQuery(this.registryAppId, query);
  }

  /**
   * Get network stats
   */
  async getNetworkStats() {
    const [tokenInfo, chainInfo] = await Promise.all([
      this.getTokenInfo().catch(() => null),
      this.getChainInfo().catch(() => null),
    ]);

    return {
      tokenInfo,
      chainInfo,
      network: process.env.VITE_NETWORK || 'Conway Testnet',
    };
  }
}

export default LineraClient;
