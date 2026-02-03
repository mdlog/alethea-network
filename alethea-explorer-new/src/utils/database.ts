import {
  Query,
  Voter,
  TokenInfo,
  TokenHolder,
  HealthStatus,
  BlockInfo
} from '../types/blockchain';

// Environment variables
const CHAIN_ID = import.meta.env.VITE_CHAIN_ID || '9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec';
const REGISTRY_APP_ID = import.meta.env.VITE_REGISTRY_APP_ID || 'f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990';
const NETWORK = import.meta.env.VITE_NETWORK || 'Conway Testnet';

// GraphQL endpoint for Linera service
// In production (Vercel), use VITE_API_URL environment variable
// In development, use Vite proxy (empty string)
// Default to evonft.xyz if no env variable is set
const LINERA_SERVICE_URL = import.meta.env.VITE_API_URL || 'https://evonft.xyz';

export class AletheaAPI {
  private chainId: string;
  private registryAppId: string;

  constructor() {
    this.chainId = CHAIN_ID;
    this.registryAppId = REGISTRY_APP_ID;
  }

  // Execute GraphQL query to an application
  private async appQuery(appId: string, query: string): Promise<any> {
    const url = `${LINERA_SERVICE_URL}/chains/${this.chainId}/applications/${appId}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors?.length > 0) {
      throw new Error(result.errors[0].message);
    }

    return result.data;
  }

  // ============================================================================
  // HEALTH & CONFIG
  // ============================================================================

  async getHealth(): Promise<HealthStatus> {
    try {
      // Use blocks query to check connection - this is more reliable than registry app query
      // because it queries the Linera service directly
      const query = `{ blocks(chainId: "${this.chainId}", limit: 1) { hash } }`;
      await this.rootQuery(query);
      return {
        status: 'OK',
        timestamp: new Date().toISOString(),
        network: NETWORK,
        chainId: this.chainId,
        connected: true,
      };
    } catch (error) {
      return {
        status: 'OK',
        timestamp: new Date().toISOString(),
        network: NETWORK,
        chainId: this.chainId,
        connected: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  // ============================================================================
  // LINERA BLOCKS
  // ============================================================================

  // Execute GraphQL query to the root Linera service
  private async rootQuery(query: string): Promise<any> {
    // Use direct URL for root queries (blocks, chains)
    const url = `${LINERA_SERVICE_URL}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors?.length > 0) {
      throw new Error(result.errors[0].message);
    }

    return result.data;
  }

  async getBlocks(limit: number = 20): Promise<BlockInfo[]> {
    const query = `
      query {
        blocks(chainId: "${this.chainId}", limit: ${limit}) {
          hash
          status
          block {
            header {
              height
              timestamp
              chainId
              epoch
              stateHash
              previousBlockHash
              authenticatedSigner
            }
          }
        }
      }
    `;

    const data = await this.rootQuery(query);
    return data.blocks || [];
  }

  async getBlockByHash(hash: string): Promise<BlockInfo | null> {
    const query = `
      query {
        block(hash: "${hash}", chainId: "${this.chainId}") {
          hash
          status
          block {
            header {
              height
              timestamp
              chainId
              epoch
              stateHash
              previousBlockHash
              authenticatedSigner
            }
            body {
              messages {
                destination
                kind
                grant
                message
              }
              events {
                index
                value
                streamId {
                  applicationId
                  streamName
                }
              }
              oracleResponses
              operationResults
            }
          }
        }
      }
    `;

    const data = await this.rootQuery(query);
    return data.block || null;
  }

  async getChains(): Promise<string[]> {
    const query = `
      query {
        chains {
          list
        }
      }
    `;

    const data = await this.rootQuery(query);
    return data.chains?.list || [];
  }

  async getChainBlocks(chainId: string, limit: number = 10): Promise<BlockInfo[]> {
    const query = `
      query {
        blocks(chainId: "${chainId}", limit: ${limit}) {
          hash
          status
          block {
            header {
              height
              timestamp
              chainId
              epoch
            }
          }
        }
      }
    `;

    const data = await this.rootQuery(query);
    return data.blocks || [];
  }



  // ============================================================================
  // ALETHEA REGISTRY (QUERIES/PREDICTIONS)
  // ============================================================================

  async getQueries(): Promise<Query[]> {
    const query = `
      query {
        queries {
          id
          description
          title
          category
          outcomes
          status
          phase
          strategy
          minVotes
          rewardAmount
          deadline
          commitEnd
          revealEnd
          voteCount
          commitCount
          result
          resolvedAt
          creator
          createdAt
          timeRemaining
        }
      }
    `;

    const data = await this.appQuery(this.registryAppId, query);
    return data.queries || [];
  }

  async getQueryById(id: number): Promise<Query | null> {
    const query = `
      query {
        queryWithVotes(id: ${id}) {
          id
          description
          title
          category
          outcomes
          status
          phase
          strategy
          minVotes
          rewardAmount
          deadline
          commitEnd
          revealEnd
          voteCount
          commitCount
          result
          resolvedAt
          creator
          createdAt
          timeRemaining
          votes {
            voter
            outcome
            stake
            timestamp
          }
        }
      }
    `;

    const data = await this.appQuery(this.registryAppId, query);
    return data.queryWithVotes || null;
  }

  async getVoters(): Promise<Voter[]> {
    const query = `
      query {
        voters {
          address
          name
          stake
          lockedStake
          availableStake
          pendingRewards
          reputation
          reputationTier
          totalVotes
          correctVotes
          accuracyPercentage
          isActive
          registeredAt
        }
      }
    `;

    const data = await this.appQuery(this.registryAppId, query);
    return data.voters || [];
  }

  async getStatistics(): Promise<any> {
    const query = `
      query {
        statistics {
          totalVoters
          activeVoters
          totalStake
          totalQueriesCreated
          totalQueriesResolved
          activeQueriesCount
          totalVotesSubmitted
          totalRewardsDistributed
          rewardPoolBalance
          averageReputation
          protocolStatus
        }
      }
    `;

    const data = await this.appQuery(this.registryAppId, query);
    return data.statistics || {};
  }

  // ============================================================================
  // ALETHEA TOKEN
  // ============================================================================

  async getTokenInfo(): Promise<TokenInfo> {
    // Use statistics from registry for now since token endpoint may be slow
    try {
      const stats = await this.getStatistics();
      return {
        name: 'ALTH',
        symbol: 'ALTH',
        decimals: 18,
        totalSupply: stats.totalStake || '0',
        rewardPool: stats.rewardPoolBalance || '0',
      };
    } catch (error) {
      return {
        name: 'ALTH',
        symbol: 'ALTH',
        decimals: 18,
        totalSupply: '0',
        rewardPool: '0',
      };
    }
  }

  async getTokenBalance(owner: string): Promise<{ owner: string; balance: string }> {
    // Try to get voter info for balance
    try {
      const query = `
        query {
          voter(address: "${owner}") {
            stake
            availableStake
          }
        }
      `;
      const data = await this.appQuery(this.registryAppId, query);
      return { owner, balance: data.voter?.stake || '0' };
    } catch (error) {
      return { owner, balance: '0' };
    }
  }

  async getTokenHolders(): Promise<TokenHolder[]> {
    // Use voters as token holders (stakers)
    try {
      const voters = await this.getVoters();
      return voters.map(v => ({
        owner: v.address,
        balance: v.stake || '0',
      }));
    } catch (error) {
      return [];
    }
  }
}

// Export singleton instance
export const api = new AletheaAPI();
