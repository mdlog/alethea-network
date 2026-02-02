import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useLinera } from './LineraContext';

const TOKEN_APP_ID = import.meta.env.VITE_TOKEN_APP_ID || '';
const SERVICE_URL = import.meta.env.VITE_SERVICE_URL || '';
const TOKEN_CHAIN_ID = import.meta.env.VITE_TOKEN_CHAIN_ID || import.meta.env.VITE_CHAIN_ID;

interface TokenInfo {
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: string;
    totalMinted: string;
    totalBurned: string;
}

interface TokenContextType {
    tokenInfo: TokenInfo | null;
    balance: number;
    loading: boolean;
    error: string | null;
    loadTokenInfo: () => Promise<void>;
    loadBalance: (owner: string) => Promise<string>;
    refreshBalance: () => Promise<void>;
    addToBalance: (amount: number) => void;
    transfer: (to: string, amount: string) => Promise<boolean>;
    transferToApplication: (appId: string, amount: string) => Promise<boolean>;
    processInbox: (targetChainId: string) => Promise<void>;
}

const TokenContext = createContext<TokenContextType>({
    tokenInfo: null,
    balance: 0,
    loading: false,
    error: null,
    loadTokenInfo: async () => { },
    loadBalance: async () => '0',
    refreshBalance: async () => { },
    addToBalance: () => { },
    transfer: async () => false,
    transferToApplication: async () => false,
    processInbox: async () => { },
});

export const useToken = () => useContext(TokenContext);

export const TokenProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { chainId, owner, tokenApplication } = useLinera();
    const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
    const [balance, setBalance] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Execute query on specific chain (for Linera standard fungible token)
    const executeTokenQueryOnChain = async (query: string, targetChainId: string): Promise<any> => {
        if (!TOKEN_APP_ID) {
            throw new Error('Token App ID not configured');
        }

        const graphqlUrl = `${SERVICE_URL}/chains/${targetChainId}/applications/${TOKEN_APP_ID}`;

        const response = await fetch(graphqlUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
            body: JSON.stringify({ query }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const result = await response.json();
        if (result.errors?.length > 0) {
            throw new Error(result.errors[0].message);
        }

        return result.data;
    };

    // Execute query on token's main chain (for token info)
    const executeTokenQuery = async (query: string): Promise<any> => {
        return executeTokenQueryOnChain(query, TOKEN_CHAIN_ID);
    };

    const loadTokenInfo = useCallback(async () => {
        if (!TOKEN_APP_ID) return;

        setLoading(true);
        setError(null);

        try {
            // Linera standard fungible token only has tickerSymbol
            const data = await executeTokenQuery(`
                query {
                    tickerSymbol
                }
            `);

            // Create minimal token info from Linera standard
            setTokenInfo({
                name: 'Alethea Token',
                symbol: data?.tickerSymbol || 'ALTH',
                decimals: 18,
                totalSupply: '1000000',
                totalMinted: '1000000',
                totalBurned: '0',
            });
        } catch (err) {
            console.error('Failed to load token info:', err);
            setError(err instanceof Error ? err.message : 'Failed to load token info');
        } finally {
            setLoading(false);
        }
    }, []);

    const loadBalance = useCallback(async (ownerAddress: string): Promise<string> => {
        if (!TOKEN_APP_ID || !ownerAddress || !chainId) return '0';

        try {
            const queryOwner = (ownerAddress.startsWith('0x') ? ownerAddress : `0x${ownerAddress}`).toLowerCase();
            console.log(`🔍 Loading balance for owner ${queryOwner} on chain ${chainId}`);

            let bal = '0';

            // Try WASM first (triggers inbox processing)
            if (tokenApplication) {
                try {
                    const balanceQuery = `{ accounts { entry(key: "${queryOwner}") { value } } }`;
                    const response = await tokenApplication.query(JSON.stringify({ query: balanceQuery }));
                    const result = typeof response === 'string' ? JSON.parse(response) : response;
                    bal = result?.data?.accounts?.entry?.value || '0';
                    console.log(`💰 Balance via WASM: ${bal}`);
                } catch (wasmErr) {
                    console.warn('WASM balance query failed, falling back to HTTP:', wasmErr);
                }
            }

            // Fallback to HTTP if WASM failed or not available
            if (bal === '0') {
                const data = await executeTokenQueryOnChain(`
                    query {
                        accounts {
                            entry(key: "${queryOwner}") {
                                value
                            }
                        }
                    }
                `, chainId);
                bal = data?.accounts?.entry?.value || '0';
                console.log(`💰 Balance via HTTP: ${bal}`);
            }

            // Parse balance (remove trailing dot if present)
            const numBalance = parseFloat(bal.replace(/\.$/, '')) || 0;

            if (ownerAddress === owner) {
                setBalance(numBalance);
            }
            return bal;
        } catch (err) {
            console.error('Failed to load balance:', err);
            return '0';
        }
    }, [owner, chainId, tokenApplication]);

    const transfer = useCallback(async (to: string, amount: string): Promise<boolean> => {
        if (!TOKEN_APP_ID || !owner || !chainId) return false;

        try {
            // Linera standard transfer format
            const targetOwner = to.startsWith('0x') ? to : `0x${to}`;
            const sourceOwner = owner.startsWith('0x') ? owner : `0x${owner}`;

            await executeTokenQueryOnChain(`
                mutation {
                    transfer(
                        owner: "${sourceOwner}",
                        amount: "${amount}",
                        targetAccount: {
                            chainId: "${chainId}",
                            owner: "${targetOwner}"
                        }
                    )
                }
            `, chainId);
            return true;
        } catch (err) {
            console.error('Transfer failed:', err);
            setError(err instanceof Error ? err.message : 'Transfer failed');
            return false;
        }
    }, [owner, chainId]);

    const transferToApplication = useCallback(async (appId: string, amount: string): Promise<boolean> => {
        if (!TOKEN_APP_ID || !owner || !chainId) return false;

        try {
            // For Linera standard, transfer to application uses same transfer
            // but with application as owner (application ID as owner)
            const sourceOwner = owner.startsWith('0x') ? owner : `0x${owner}`;

            await executeTokenQueryOnChain(`
                mutation {
                    transfer(
                        owner: "${sourceOwner}",
                        amount: "${amount}",
                        targetAccount: {
                            chainId: "${chainId}",
                            owner: "${appId}"
                        }
                    )
                }
            `, chainId);
            return true;
        } catch (err) {
            console.error('Transfer to application failed:', err);
            setError(err instanceof Error ? err.message : 'Transfer failed');
            return false;
        }
    }, [owner, chainId]);

    // Refresh balance for current user - query on user's chain with owner
    const refreshBalance = useCallback(async () => {
        if (owner && chainId) {
            await loadBalance(owner);
        }
    }, [owner, chainId, loadBalance]);

    // Add amount to current balance
    const addToBalance = useCallback((amount: number) => {
        setBalance(prev => {
            const newBalance = prev + amount;
            console.log(`💰 Balance updated: ${prev} + ${amount} = ${newBalance}`);
            return newBalance;
        });
    }, []);

    // Process inbox on a chain to receive cross-chain transfers
    const processInbox = useCallback(async (targetChainId: string) => {
        try {
            console.log('📥 Processing inbox for chain:', targetChainId);
            // Use /inbox which proxies to root endpoint at localhost:8080
            const url = SERVICE_URL || '/inbox';

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Bypass-Tunnel-Reminder': 'true',
                },
                body: JSON.stringify({
                    query: `mutation { processInbox(chainId: "${targetChainId}") }`,
                }),
            });

            console.log('📥 Response status:', response.status);

            if (!response.ok) {
                const text = await response.text();
                console.error('❌ Process inbox HTTP error:', response.status, text);
                throw new Error(`HTTP error: ${response.status}`);
            }

            const result = await response.json();
            console.log('📥 Process inbox result:', JSON.stringify(result));

            if (result.errors?.length > 0) {
                console.error('❌ Process inbox GraphQL error:', result.errors);
                throw new Error(result.errors[0].message);
            }

            return result;
        } catch (err) {
            console.error('❌ Failed to process inbox:', err);
            throw err;
        }
    }, []);

    return (
        <TokenContext.Provider value={{
            tokenInfo,
            balance,
            loading,
            error,
            loadTokenInfo,
            loadBalance,
            refreshBalance,
            addToBalance,
            transfer,
            transferToApplication,
            processInbox,
        }}>
            {children}
        </TokenContext.Provider>
    );
};
