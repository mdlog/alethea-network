import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { initialize as initLinera, Client, Faucet, Wallet, Application } from '@linera/client';
import { PrivateKey } from '@linera/signer';
import { ethers } from 'ethers';

const FAUCET_URL = import.meta.env.VITE_FAUCET_URL || 'https://faucet.testnet-conway.linera.net';
const MARKET_APP_ID = import.meta.env.VITE_MARKET_APP_ID || '';
const REGISTRY_APP_ID = import.meta.env.VITE_REGISTRY_APP_ID || '';
const APP_CHAIN_ID = import.meta.env.VITE_CHAIN_ID || '';
const DB_NAME = 'alethea_market_wallet';
const STORE_NAME = 'wallet_data';

interface WalletData {
    mnemonic: string;
    chainId: string;
    owner: string;
    createdAt: number;
}

interface LineraContextType {
    client?: Client;
    wallet?: Wallet;
    chainId?: string;
    owner?: string;
    marketApplication?: Application;
    registryApplication?: Application;
    loading: boolean;
    status: 'Initializing' | 'Idle' | 'Creating Wallet' | 'Claiming Chain' | 'Connecting' | 'Ready' | 'Error';
    error?: string;
    walletExists: boolean;
    createWallet: () => Promise<void>;
    resetWallet: () => void;
    reconnectMarketApp: () => Promise<void>;
    executeMarketQuery: (query: string) => Promise<any>;
    executeMarketMutation: (mutation: string) => Promise<any>;
    executeRegistryQuery: (query: string) => Promise<any>;
}

const LineraContext = createContext<LineraContextType>({
    loading: true,
    status: 'Initializing',
    walletExists: false,
    createWallet: async () => { },
    resetWallet: () => { },
    reconnectMarketApp: async () => { },
    executeMarketQuery: async () => null,
    executeMarketMutation: async () => null,
    executeRegistryQuery: async () => null,
});

export const useLinera = () => useContext(LineraContext);

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
};

const saveWalletData = async (data: WalletData): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put({ id: 'primary', ...data });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    });
};

const loadWalletData = async (): Promise<WalletData | null> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const request = tx.objectStore(STORE_NAME).get('primary');
            request.onsuccess = () => { db.close(); resolve(request.result || null); };
            request.onerror = () => { db.close(); reject(request.error); };
        });
    } catch { return null; }
};

const clearWalletData = async (): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).clear();
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });
    } catch { }
};

const checkWalletExists = async (): Promise<boolean> => {
    const data = await loadWalletData();
    return data !== null && !!data.mnemonic && !!data.chainId;
};

const withRetry = async <T,>(op: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
    let lastError: Error | undefined;
    for (let i = 0; i < retries; i++) {
        try { return await op(); }
        catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            if (i < retries - 1) await new Promise(r => setTimeout(r, delay));
        }
    }
    throw lastError;
};

export const LineraProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<Omit<LineraContextType, 'createWallet' | 'resetWallet' | 'executeMarketQuery' | 'executeMarketMutation' | 'executeRegistryQuery'>>({
        loading: true,
        status: 'Initializing',
        walletExists: false,
    });
    const initRef = useRef(false);
    const clientRef = useRef<Client | null>(null);
    const marketAppRef = useRef<Application | null>(null);
    const registryAppRef = useRef<Application | null>(null);

    useEffect(() => {
        if (initRef.current) return;
        initRef.current = true;

        const init = async () => {
            try {
                console.log('🔧 Initializing Linera WASM...');
                await initLinera();
                console.log('✅ Linera WASM initialized');

                const exists = await checkWalletExists();
                if (exists) {
                    setState(prev => ({ ...prev, status: 'Connecting', walletExists: true }));
                    await connectExistingWallet();
                } else {
                    setState(prev => ({ ...prev, loading: false, status: 'Idle', walletExists: false }));
                }
            } catch (err) {
                console.error('❌ Init error:', err);
                setState(prev => ({ ...prev, loading: false, status: 'Error', error: err instanceof Error ? err.message : 'Failed to initialize' }));
            }
        };
        init();

        return () => {
            if (clientRef.current) {
                try { clientRef.current.stop(); clientRef.current.free(); } catch { }
            }
        };
    }, []);

    const connectExistingWallet = async () => {
        try {
            const walletData = await loadWalletData();
            if (!walletData) throw new Error('No wallet data');

            const signer = PrivateKey.fromMnemonic(walletData.mnemonic);
            setState(prev => ({ ...prev, chainId: walletData.chainId, owner: walletData.owner, loading: false, status: 'Ready', walletExists: true }));

            try {
                const faucet = new Faucet(FAUCET_URL);
                const wallet = await faucet.createWallet();
                const newChainId = await faucet.claimChain(wallet, signer.address());
                await saveWalletData({ ...walletData, chainId: newChainId });

                const client = await new Client(wallet, signer, false);
                clientRef.current = client;

                let marketApp: Application | undefined;
                let registryApp: Application | undefined;

                if (MARKET_APP_ID) {
                    try {
                        console.log('📥 Connecting to market application...');
                        console.log('   MARKET_APP_ID:', MARKET_APP_ID);
                        console.log('   Client available:', !!client);
                        console.log('   Frontend available:', !!client.frontend());
                        
                        // Try to connect with retry
                        let retries = 3;
                        let lastError: any = null;
                        
                        while (retries > 0) {
                            try {
                                marketApp = await client.frontend().application(MARKET_APP_ID);
                                marketAppRef.current = marketApp;
                                console.log('✅ Market application connected:', !!marketApp);
                                break;
                            } catch (err) {
                                lastError = err;
                                retries--;
                                console.warn(`⚠️ Market app connection attempt failed (${3 - retries}/3):`, err);
                                if (retries > 0) {
                                    console.log('   Retrying in 1 second...');
                                    await new Promise(resolve => setTimeout(resolve, 1000));
                                }
                            }
                        }
                        
                        if (!marketApp) {
                            console.error('❌ Market app connection failed after retries:', lastError);
                            console.error('   This may be because:');
                            console.error('   1. Market App ID is incorrect');
                            console.error('   2. Market contract not deployed on this chain');
                            console.error('   3. Linera service needs to sync');
                        }
                    } catch (err) { 
                        console.error('❌ Market app connection failed:', err);
                        console.warn('⚠️ Market app not connected:', err); 
                    }
                } else {
                    console.warn('⚠️ MARKET_APP_ID not configured');
                }

                if (REGISTRY_APP_ID) {
                    try {
                        registryApp = await client.frontend().application(REGISTRY_APP_ID);
                        registryAppRef.current = registryApp;
                    } catch (err) { console.warn('⚠️ Registry app not connected:', err); }
                }

                setState(prev => ({ ...prev, client, wallet, chainId: newChainId, marketApplication: marketApp, registryApplication: registryApp }));
                
                // If market app failed to connect, try again with multiple retries
                if (!marketApp && MARKET_APP_ID) {
                    console.log('⏳ Scheduling market app reconnection attempts...');
                    
                    // Retry multiple times with increasing delays
                    const retryDelays = [1000, 2000, 3000, 5000]; // 1s, 2s, 3s, 5s
                    
                    retryDelays.forEach((delay, index) => {
                        setTimeout(async () => {
                            if (!marketAppRef.current && clientRef.current) {
                                try {
                                    console.log(`🔄 Retry ${index + 1}/${retryDelays.length}: Attempting to connect market app...`);
                                    const retryApp = await clientRef.current.frontend().application(MARKET_APP_ID);
                                    if (retryApp) {
                                        marketAppRef.current = retryApp;
                                        setState(prev => ({ ...prev, marketApplication: retryApp }));
                                        console.log('✅ Market application connected on retry', index + 1);
                                    }
                                } catch (err) {
                                    console.warn(`⚠️ Market app retry ${index + 1} failed:`, err);
                                    if (index === retryDelays.length - 1) {
                                        console.error('❌ All market app reconnection attempts failed');
                                        console.error('   Market App ID:', MARKET_APP_ID);
                                        console.error('   This may be because:');
                                        console.error('   1. Market contract not yet synced in Linera service');
                                        console.error('   2. Wrong Market App ID');
                                        console.error('   3. Linera service needs restart');
                                    }
                                }
                            }
                        }, delay);
                    });
                }
            } catch (err) { 
                console.warn('⚠️ Blockchain connection failed:', err); 
            }
        } catch (err) {
            console.error('❌ Failed to load wallet:', err);
            await clearWalletData();
            setState(prev => ({ ...prev, loading: false, status: 'Idle', walletExists: false }));
        }
    };

    const createWallet = async () => {
        try {
            setState(prev => ({ ...prev, loading: true, status: 'Creating Wallet', error: undefined }));

            const mnemonic = ethers.Wallet.createRandom().mnemonic!.phrase;
            const signer = PrivateKey.fromMnemonic(mnemonic);
            const owner = signer.address().toString();

            setState(prev => ({ ...prev, status: 'Claiming Chain' }));

            const faucet = new Faucet(FAUCET_URL);
            const wallet = await withRetry(() => faucet.createWallet());
            const chainId = await withRetry(() => faucet.claimChain(wallet, signer.address()));

            await saveWalletData({ mnemonic, chainId, owner, createdAt: Date.now() });
            setState(prev => ({ ...prev, chainId, owner, loading: false, status: 'Ready', walletExists: true }));

            try {
                const client = await new Client(wallet, signer, false);
                clientRef.current = client;

                let marketApp: Application | undefined;
                let registryApp: Application | undefined;

                if (MARKET_APP_ID) {
                    try {
                        console.log('📥 Connecting to market application...');
                        console.log('   MARKET_APP_ID:', MARKET_APP_ID);
                        
                        // Try to connect with retry
                        let retries = 3;
                        let lastError: any = null;
                        
                        while (retries > 0) {
                            try {
                                marketApp = await client.frontend().application(MARKET_APP_ID);
                                marketAppRef.current = marketApp;
                                console.log('✅ Market application connected:', !!marketApp);
                                break;
                            } catch (err) {
                                lastError = err;
                                retries--;
                                console.warn(`⚠️ Market app connection attempt failed (${3 - retries}/3):`, err);
                                if (retries > 0) {
                                    console.log('   Retrying in 1 second...');
                                    await new Promise(resolve => setTimeout(resolve, 1000));
                                }
                            }
                        }
                        
                        if (!marketApp) {
                            console.error('❌ Market app connection failed after retries:', lastError);
                        }
                    } catch (err) { 
                        console.error('❌ Market app connection failed:', err);
                    }
                } else {
                    console.warn('⚠️ MARKET_APP_ID not configured');
                }

                if (REGISTRY_APP_ID) {
                    try {
                        registryApp = await client.frontend().application(REGISTRY_APP_ID);
                        registryAppRef.current = registryApp;
                    } catch { }
                }

                setState(prev => ({ ...prev, client, wallet, marketApplication: marketApp, registryApplication: registryApp }));
                
                // If market app failed to connect, try again with multiple retries
                if (!marketApp && MARKET_APP_ID) {
                    console.log('⏳ Scheduling market app reconnection attempts...');
                    
                    // Retry multiple times with increasing delays
                    const retryDelays = [1000, 2000, 3000, 5000]; // 1s, 2s, 3s, 5s
                    
                    retryDelays.forEach((delay, index) => {
                        setTimeout(async () => {
                            if (!marketAppRef.current && clientRef.current) {
                                try {
                                    console.log(`🔄 Retry ${index + 1}/${retryDelays.length}: Attempting to connect market app...`);
                                    const retryApp = await clientRef.current.frontend().application(MARKET_APP_ID);
                                    if (retryApp) {
                                        marketAppRef.current = retryApp;
                                        setState(prev => ({ ...prev, marketApplication: retryApp }));
                                        console.log('✅ Market application connected on retry', index + 1);
                                    }
                                } catch (err) {
                                    console.warn(`⚠️ Market app retry ${index + 1} failed:`, err);
                                    if (index === retryDelays.length - 1) {
                                        console.error('❌ All market app reconnection attempts failed');
                                        console.error('   Market App ID:', MARKET_APP_ID);
                                    }
                                }
                            }
                        }, delay);
                    });
                }
            } catch { }
        } catch (err) {
            console.error('❌ Failed to create wallet:', err);
            setState(prev => ({ ...prev, loading: false, status: 'Error', error: err instanceof Error ? err.message : 'Failed to create wallet' }));
        }
    };

    const resetWallet = async () => {
        if (clientRef.current) {
            try { clientRef.current.stop(); clientRef.current.free(); } catch { }
            clientRef.current = null;
        }
        marketAppRef.current = null;
        registryAppRef.current = null;
        await clearWalletData();
        setState({ loading: false, status: 'Idle', walletExists: false });
    };

    const executeMarketQuery = async (query: string): Promise<any> => {
        const app = marketAppRef.current || state.marketApplication;
        if (!app) throw new Error('Market application not connected');
        const response = await app.query(JSON.stringify({ query }));
        const result = typeof response === 'string' ? JSON.parse(response) : response;
        if (result.errors?.length > 0) throw new Error(result.errors[0].message);
        return result.data;
    };

    const reconnectMarketApp = async (): Promise<void> => {
        if (!MARKET_APP_ID || !clientRef.current) {
            console.warn('⚠️ Cannot reconnect: MARKET_APP_ID or client not available');
            return;
        }
        
        try {
            console.log('🔄 Attempting to reconnect market application...');
            const marketApp = await clientRef.current.frontend().application(MARKET_APP_ID);
            marketAppRef.current = marketApp;
            setState(prev => ({ ...prev, marketApplication: marketApp }));
            console.log('✅ Market application reconnected successfully');
        } catch (err) {
            console.error('❌ Failed to reconnect market application:', err);
            throw err;
        }
    };

    const executeMarketMutation = async (mutation: string): Promise<any> => {
        let app = marketAppRef.current || state.marketApplication;
        
        // Try to reconnect if app is not available
        if (!app && MARKET_APP_ID && clientRef.current) {
            console.log('⚠️ Market app not connected, attempting reconnect...');
            try {
                await reconnectMarketApp();
                app = marketAppRef.current || state.marketApplication;
            } catch (err) {
                console.error('❌ Failed to reconnect market app:', err);
                throw new Error('Market application not connected and reconnect failed');
            }
        }
        
        if (!app) {
            throw new Error('Market application not connected');
        }
        
        try {
            const response = await app.query(JSON.stringify({ query: mutation }));
            const result = typeof response === 'string' ? JSON.parse(response) : response;
            if (result.errors?.length > 0) throw new Error(result.errors[0].message);
            return result.data;
        } catch (err) {
            console.error('❌ Market mutation error:', err);
            throw err;
        }
    };

    const executeRegistryQuery = async (query: string): Promise<any> => {
        const app = registryAppRef.current || state.registryApplication;
        if (!app) throw new Error('Registry application not connected');
        const response = await app.query(JSON.stringify({ query }));
        const result = typeof response === 'string' ? JSON.parse(response) : response;
        if (result.errors?.length > 0) throw new Error(result.errors[0].message);
        return result.data;
    };

    return (
        <LineraContext.Provider value={{ ...state, createWallet, resetWallet, executeMarketQuery, executeMarketMutation, executeRegistryQuery }}>
            {children}
        </LineraContext.Provider>
    );
};
