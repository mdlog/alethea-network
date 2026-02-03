import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/database';
import {
  Query,
  Voter,
  TokenInfo,
  TokenHolder,
  HealthStatus,
  Statistics,
  BlockInfo
} from '../types/blockchain';

// Connection hook - singleton pattern to avoid multiple instances
let globalIsConnected = false;
let globalHealth: HealthStatus | null = null;
let connectionCheckPromise: Promise<void> | null = null;

const checkGlobalConnection = async () => {
  try {
    const healthData = await api.getHealth();
    globalHealth = healthData;
    globalIsConnected = healthData.connected;
  } catch (err) {
    globalIsConnected = false;
  }
};

export const useAPI = () => {
  const [isConnected, setIsConnected] = useState(globalIsConnected);
  const [health, setHealth] = useState<HealthStatus | null>(globalHealth);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      const healthData = await api.getHealth();
      globalHealth = healthData;
      globalIsConnected = healthData.connected;
      setHealth(healthData);
      setIsConnected(healthData.connected);
      setError(healthData.connected ? null : healthData.error || 'Not connected');
    } catch (err) {
      globalIsConnected = false;
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    // Initial check
    if (!connectionCheckPromise) {
      connectionCheckPromise = checkConnection();
    } else {
      // Sync with global state
      setIsConnected(globalIsConnected);
      setHealth(globalHealth);
    }

    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  return { isConnected, health, error, checkConnection };
};

// Generic polling hook
const usePollingData = <T>(
  fetcher: () => Promise<T>,
  dependencies: any[],
  options: {
    refreshInterval?: number;
    logPrefix?: string;
    errorMessage?: string;
    enabled?: boolean;
  } = {}
) => {
  const {
    refreshInterval = 10000,
    logPrefix = '🔄',
    errorMessage = 'Failed to fetch data',
    enabled = true
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const fetchData = async (isPolling = false) => {
      try {
        if (!isPolling) {
          setLoading(true);
        }

        const result = await fetcher();

        if (mounted) {
          if (isPolling) {
            console.log(`${logPrefix} Refreshed data`);
          }

          setData(result);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          const errMsg = err instanceof Error ? err.message : errorMessage;
          setError(errMsg);
          console.warn(`${logPrefix} Error:`, errMsg);
        }
      } finally {
        if (mounted && !isPolling) {
          setLoading(false);
        }
      }
    };

    fetchData();

    const pollInterval = setInterval(() => {
      fetchData(true);
    }, refreshInterval);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
    };
  }, [enabled, refreshInterval, ...dependencies]);

  return { data, loading, error };
};

// ============================================================================
// LINERA BLOCKS HOOKS
// ============================================================================

export const useBlocks = (limit: number = 20, refreshInterval: number = 5000) => {
  const { data: blocks, loading, error } = usePollingData<BlockInfo[]>(
    () => api.getBlocks(limit),
    [limit],
    {
      refreshInterval,
      logPrefix: '📦',
      errorMessage: 'Failed to fetch blocks',
      enabled: true
    }
  );

  const latestBlock = blocks && blocks.length > 0 ? blocks[0] : null;

  return { blocks: blocks || [], latestBlock, loading, error };
};

export const useBlock = (hash: string) => {
  const [block, setBlock] = useState<BlockInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hash) {
      setLoading(false);
      return;
    }

    const fetchBlock = async () => {
      try {
        setLoading(true);
        const result = await api.getBlockByHash(hash);
        setBlock(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch block');
      } finally {
        setLoading(false);
      }
    };

    fetchBlock();
  }, [hash]);

  return { block, loading, error };
};

export const useChains = (refreshInterval: number = 30000) => {
  const { data: chains, loading, error } = usePollingData<string[]>(
    () => api.getChains(),
    [],
    {
      refreshInterval,
      logPrefix: '⛓️',
      errorMessage: 'Failed to fetch chains',
      enabled: true
    }
  );

  return { chains: chains || [], loading, error };
};

export const useChainBlocks = (chainId: string, limit: number = 10) => {
  const [blocks, setBlocks] = useState<BlockInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chainId) {
      setLoading(false);
      return;
    }

    const fetchBlocks = async () => {
      try {
        setLoading(true);
        const result = await api.getChainBlocks(chainId, limit);
        setBlocks(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch chain blocks');
      } finally {
        setLoading(false);
      }
    };

    fetchBlocks();
  }, [chainId, limit]);

  return { blocks, loading, error };
};



// ============================================================================
// ALETHEA REGISTRY HOOKS (QUERIES/PREDICTIONS)
// ============================================================================

export const useQueries = (refreshInterval: number = 10000) => {
  const { data: queries, loading, error } = usePollingData<Query[]>(
    () => api.getQueries(),
    [],
    {
      refreshInterval,
      logPrefix: '❓',
      errorMessage: 'Failed to fetch queries',
      enabled: true  // Always enabled, let API handle errors
    }
  );

  return { queries: queries || [], loading, error };
};

export const useQuery = (id: number) => {
  const [query, setQuery] = useState<Query | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id === undefined) {
      setLoading(false);
      return;
    }

    const fetchQuery = async () => {
      try {
        setLoading(true);
        const result = await api.getQueryById(id);
        setQuery(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch query');
      } finally {
        setLoading(false);
      }
    };

    fetchQuery();
  }, [id]);

  return { query, loading, error };
};

export const useVoters = (refreshInterval: number = 15000) => {
  const { data: voters, loading, error } = usePollingData<Voter[]>(
    () => api.getVoters(),
    [],
    {
      refreshInterval,
      logPrefix: '🗳️',
      errorMessage: 'Failed to fetch voters',
      enabled: true  // Always enabled
    }
  );

  return { voters: voters || [], loading, error };
};

// ============================================================================
// ALETHEA TOKEN HOOKS
// ============================================================================

export const useTokenInfo = (refreshInterval: number = 15000) => {
  const { data: tokenInfo, loading, error } = usePollingData<TokenInfo>(
    () => api.getTokenInfo(),
    [],
    {
      refreshInterval,
      logPrefix: '🪙',
      errorMessage: 'Failed to fetch token info',
      enabled: true  // Always enabled
    }
  );

  return { tokenInfo, loading, error };
};

export const useTokenHolders = (refreshInterval: number = 30000) => {
  const { data: holders, loading, error } = usePollingData<TokenHolder[]>(
    () => api.getTokenHolders(),
    [],
    {
      refreshInterval,
      logPrefix: '👥',
      errorMessage: 'Failed to fetch token holders',
      enabled: true  // Always enabled
    }
  );

  return { holders: holders || [], loading, error };
};

// ============================================================================
// STATISTICS HOOK
// ============================================================================

export const useStatistics = (refreshInterval: number = 15000) => {
  const { data: statistics, loading, error } = usePollingData<Statistics>(
    () => api.getStatistics(),
    [],
    {
      refreshInterval,
      logPrefix: '📊',
      errorMessage: 'Failed to fetch statistics',
      enabled: true
    }
  );

  return { statistics, loading, error };
};

// ============================================================================
// STATS HOOK (combines token and registry data)
// ============================================================================

export const useStats = (refreshInterval: number = 15000) => {
  const { health } = useAPI();
  const { statistics } = useStatistics(refreshInterval);
  const { queries } = useQueries(refreshInterval);

  return {
    statistics,
    queries,
    network: health?.network || 'Conway Testnet',
    loading: false,
    error: null
  };
};
