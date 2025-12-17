import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useLinera } from './LineraContext';

const TOKEN_APP_ID = import.meta.env.VITE_TOKEN_APP_ID || '';
const SERVICE_URL = import.meta.env.VITE_SERVICE_URL || 'http://localhost:8080';
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
    balance: string;
    loading: boolean;
    error: string | null;
    loadTokenInfo: () => Promise<void>;
    loadBalance: (owner: string) => Promise<string>;
    refreshBalance: () => Promise<void>;
    transfer: (to: string, amount: string) => Promise<boolean>;
    transferToApplication: (appId: string, amount: string) => Promise<boolean>;
}

const TokenContext = createContext<TokenContextType>({
    tokenInfo: null,
    balance: '0',
    loading: false,
    error: null,
    loadTokenInfo: async () => { },
    loadBalance: async () => '0',
    refreshBalance: async () => { },
    transfer: async () => false,
    transferToApplication: async () => false,
});

export const useToken = () => useContext(TokenContext);

export const TokenProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { chainId, owner } = useLinera();
    const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
    const [balance, setBalance] = useState('0');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const executeTokenQuery = async (query: string): Promise<any> => {
        if (!TOKEN_APP_ID) {
            throw new Error('Token App ID not configured');
        }

        const graphqlUrl = `${SERVICE_URL}/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID}`;

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

    const loadTokenInfo = useCallback(async () => {
        if (!TOKEN_APP_ID) return;

        setLoading(true);
        setError(null);

        try {
            const data = await executeTokenQuery(`
                query {
                    tokenInfo {
                        name
                        symbol
                        decimals
                        totalSupply
                        totalMinted
                        totalBurned
                    }
                }
            `);

            setTokenInfo(data?.tokenInfo || null);
        } catch (err) {
            console.error('Failed to load token info:', err);
            setError(err instanceof Error ? err.message : 'Failed to load token info');
        } finally {
            setLoading(false);
        }
    }, []);

    const loadBalance = useCallback(async (ownerAddress: string): Promise<string> => {
        if (!TOKEN_APP_ID || !ownerAddress) return '0';

        try {
            const data = await executeTokenQuery(`
                query {
                    balance(owner: "${ownerAddress}")
                }
            `);

            const bal = data?.balance || '0';
            if (ownerAddress === owner || ownerAddress === chainId) {
                setBalance(bal);
            }
            return bal;
        } catch (err) {
            console.error('Failed to load balance:', err);
            return '0';
        }
    }, [owner, chainId]);

    const transfer = useCallback(async (to: string, amount: string): Promise<boolean> => {
        if (!TOKEN_APP_ID || !owner || !chainId) return false;

        try {
            await executeTokenQuery(`
                mutation {
                    transfer(
                        owner: "${owner}",
                        amount: "${amount}",
                        targetChain: "${chainId}",
                        targetOwner: "${to}"
                    )
                }
            `);
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
            await executeTokenQuery(`
                mutation {
                    transferToApplication(
                        owner: "${owner}",
                        amount: "${amount}",
                        targetApplication: "${appId}",
                        targetChain: "${chainId}"
                    )
                }
            `);
            return true;
        } catch (err) {
            console.error('Transfer to application failed:', err);
            setError(err instanceof Error ? err.message : 'Transfer failed');
            return false;
        }
    }, [owner, chainId]);

    // Refresh balance for current owner
    const refreshBalance = useCallback(async () => {
        if (owner) {
            await loadBalance(owner);
        }
    }, [owner, loadBalance]);

    return (
        <TokenContext.Provider value={{
            tokenInfo,
            balance,
            loading,
            error,
            loadTokenInfo,
            loadBalance,
            refreshBalance,
            transfer,
            transferToApplication,
        }}>
            {children}
        </TokenContext.Provider>
    );
};
