import React, { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import initLinera, { Client, Faucet, Wallet, Application } from '@linera/client';
import { PrivateKey } from '@linera/signer';
import { ethers } from 'ethers';
import { MetaMaskSigner, isMetaMaskAvailable } from '../utils/metamask-signer';

// Constants - Conway Testnet Deployment (2026-02-01 - v3.4.0 Decreasing Inflation + Service Fee)
const FAUCET_URL = import.meta.env.VITE_FAUCET_URL || 'https://faucet.testnet-conway.linera.net';
const REGISTRY_APP_ID = import.meta.env.VITE_REGISTRY_APP_ID || 'f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990';
const TOKEN_APP_ID = import.meta.env.VITE_TOKEN_APP_ID || 'dac6b92743e8f02acd8367b75aef1dba6e91618c1c4fb863b73b87ec55a33ddd';
const APP_CHAIN_ID = import.meta.env.VITE_CHAIN_ID || '9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec';
// Use relative URL for Vite proxy, or explicit URL if set
const SERVICE_URL = import.meta.env.VITE_SERVICE_URL || '';
const DB_NAME = 'alethea_wallet';
const STORE_NAME = 'wallet_data';

// Wallet types
export type WalletType = 'local' | 'metamask';

interface WalletData {
    mnemonic?: string; // Only for local wallets
    chainId: string;
    owner: string;
    createdAt: number;
    walletType: WalletType;
}

interface LineraContextType {
    client?: Client;
    wallet?: Wallet;
    chainId?: string;
    owner?: string;
    application?: Application;
    tokenApplication?: Application;
    loading: boolean;
    status: 'Initializing' | 'Idle' | 'Creating Wallet' | 'Claiming Chain' | 'Connecting' | 'Connecting MetaMask' | 'Ready' | 'Error';
    error?: string;
    walletExists: boolean;
    walletType?: WalletType;
    isMetaMaskAvailable: boolean;
    createWallet: () => Promise<void>;
    connectWithMetaMask: () => Promise<void>;
    resetWallet: () => void;
    executeQuery: (query: string) => Promise<any>;
    executeMutation: (mutation: string) => Promise<any>;
    // Query/Mutation ke application chain (untuk melihat semua voters/queries)
    executeAppChainQuery: (query: string) => Promise<any>;
    executeAppChainMutation: (mutation: string) => Promise<any>;
    // Token application mutations via WASM
    executeTokenMutation: (mutation: string) => Promise<any>;
}

const LineraContext = createContext<LineraContextType>({
    loading: true,
    status: 'Initializing',
    walletExists: false,
    isMetaMaskAvailable: false,
    createWallet: async () => { },
    connectWithMetaMask: async () => { },
    resetWallet: () => { },
    executeQuery: async () => null,
    executeMutation: async () => null,
    executeAppChainQuery: async () => null,
    executeAppChainMutation: async () => null,
    executeTokenMutation: async () => null,
});

export const useLinera = () => useContext(LineraContext);

// IndexedDB helpers
const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 2); // Bump version for schema update
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
        const store = tx.objectStore(STORE_NAME);
        store.put({ id: 'primary', ...data });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    });
};

const loadWalletData = async (): Promise<WalletData | null> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get('primary');
            request.onsuccess = () => {
                db.close();
                const data = request.result;
                if (data) {
                    // Migration: add walletType if missing (old wallets are 'local')
                    if (!data.walletType) {
                        data.walletType = 'local';
                    }
                }
                resolve(data || null);
            };
            request.onerror = () => { db.close(); reject(request.error); };
        });
    } catch {
        return null;
    }
};

const clearWalletData = async (): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.clear();
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });
    } catch {
        // Ignore errors on clear
    }
};

const checkWalletExists = async (): Promise<boolean> => {
    const data = await loadWalletData();
    return data !== null && !!data.chainId && !!data.owner;
};

// Helper to retry faucet operations
const withRetry = async <T,>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 2000
): Promise<T> => {
    let lastError: Error | undefined;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            console.warn(`Attempt ${i + 1}/${maxRetries} failed:`, lastError.message);
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }
    throw lastError;
};

export const LineraProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<Omit<LineraContextType, 'createWallet' | 'connectWithMetaMask' | 'resetWallet' | 'executeQuery' | 'executeMutation' | 'executeAppChainQuery' | 'executeAppChainMutation' | 'executeTokenMutation'>>({
        loading: true,
        status: 'Initializing',
        walletExists: false,
        isMetaMaskAvailable: false,
    });
    const initRef = useRef(false);
    const clientRef = useRef<Client | null>(null);
    const applicationRef = useRef<Application | null>(null);
    const tokenApplicationRef = useRef<Application | null>(null);
    const metamaskSignerRef = useRef<MetaMaskSigner | null>(null);

    // Initialize WASM and check for existing wallet
    useEffect(() => {
        if (initRef.current) return;
        initRef.current = true;

        const init = async () => {
            try {
                console.log('Initializing Linera WASM...');
                await initLinera();
                console.log('Linera WASM initialized successfully');

                const metamaskAvailable = isMetaMaskAvailable();
                console.log('MetaMask available:', metamaskAvailable);

                const exists = await checkWalletExists();
                console.log('Wallet exists:', exists);

                if (exists) {
                    setState(prev => ({
                        ...prev,
                        status: 'Connecting',
                        walletExists: true,
                        isMetaMaskAvailable: metamaskAvailable,
                    }));
                    await connectExistingWallet();
                } else {
                    setState(prev => ({
                        ...prev,
                        loading: false,
                        status: 'Idle',
                        walletExists: false,
                        isMetaMaskAvailable: metamaskAvailable,
                    }));
                }
            } catch (err) {
                console.error('Initialization error:', err);
                setState(prev => ({
                    ...prev,
                    loading: false,
                    status: 'Error',
                    error: err instanceof Error ? err.message : 'Failed to initialize',
                    isMetaMaskAvailable: isMetaMaskAvailable(),
                }));
            }
        };

        init();

        return () => {
            if (clientRef.current) {
                try {
                    // Client may or may not have stop/free methods depending on version
                    const client = clientRef.current as unknown as { stop?: () => void; free?: () => void };
                    client.stop?.();
                    client.free?.();
                } catch { }
            }
        };
    }, []);

    // Handle MetaMask account changes
    const handleAccountsChanged = useCallback(async (accounts: string[]) => {
        const walletData = await loadWalletData();
        if (walletData?.walletType !== 'metamask') return;

        if (accounts.length === 0) {
            console.log('MetaMask disconnected');
            await resetWalletInternal();
        } else {
            const newOwner = accounts[0];
            if (newOwner.toLowerCase() !== walletData.owner.toLowerCase()) {
                console.log('MetaMask account changed, reconnecting...');
                // Reset and let user reconnect
                await resetWalletInternal();
            }
        }
    }, []);

    // Setup MetaMask listeners
    useEffect(() => {
        if (isMetaMaskAvailable()) {
            MetaMaskSigner.onAccountsChanged(handleAccountsChanged);
        }
        return () => {
            if (isMetaMaskAvailable()) {
                MetaMaskSigner.removeAccountsChangedListener(handleAccountsChanged);
            }
        };
    }, [handleAccountsChanged]);

    const connectExistingWallet = async () => {
        try {
            const walletData = await loadWalletData();
            if (!walletData) throw new Error('No wallet data found');

            console.log('Connecting existing wallet...');
            console.log('  Wallet type:', walletData.walletType);
            console.log('  Stored chainId:', walletData.chainId);
            console.log('  Stored owner:', walletData.owner);

            let signer: PrivateKey | MetaMaskSigner;

            if (walletData.walletType === 'metamask') {
                // Reconnect to MetaMask
                try {
                    signer = await MetaMaskSigner.connect();
                    const currentAddress = await signer.address();

                    // Verify the same account is connected
                    if (currentAddress.toLowerCase() !== walletData.owner.toLowerCase()) {
                        console.warn('MetaMask account changed, please reconnect');
                        await clearWalletData();
                        setState(prev => ({
                            ...prev,
                            loading: false,
                            status: 'Idle',
                            walletExists: false,
                            error: 'MetaMask account changed. Please reconnect.',
                        }));
                        return;
                    }

                    metamaskSignerRef.current = signer as MetaMaskSigner;
                    console.log('MetaMask reconnected:', currentAddress);
                } catch (err) {
                    console.error('Failed to reconnect MetaMask:', err);
                    await clearWalletData();
                    setState(prev => ({
                        ...prev,
                        loading: false,
                        status: 'Idle',
                        walletExists: false,
                        error: 'Failed to reconnect MetaMask. Please connect again.',
                    }));
                    return;
                }
            } else {
                // Local wallet - use mnemonic
                if (!walletData.mnemonic) {
                    throw new Error('No mnemonic found for local wallet');
                }
                signer = PrivateKey.fromMnemonic(walletData.mnemonic);
                console.log('Local signer address:', signer.address().toString());
            }

            // Set UI ready with stored data first (so user sees something)
            setState(prev => ({
                ...prev,
                chainId: walletData.chainId,
                owner: walletData.owner,
                walletType: walletData.walletType,
                loading: false,
                status: 'Ready' as const,
                walletExists: true,
            }));

            // Connect blockchain in background with retry
            const connectBlockchain = async (retryCount = 0): Promise<void> => {
                const maxRetries = 3;
                try {
                    console.log(`Blockchain connection attempt ${retryCount + 1}/${maxRetries}...`);

                    const faucet = new Faucet(FAUCET_URL);
                    const wallet = await faucet.createWallet();

                    // Get owner address based on wallet type
                    const ownerAddress = walletData.walletType === 'metamask'
                        ? await (signer as MetaMaskSigner).address()
                        : (signer as PrivateKey).address();

                    const newChainId = await faucet.claimChain(wallet, ownerAddress);
                    console.log('Chain claimed:', newChainId);

                    // Save the new chain ID
                    await saveWalletData({ ...walletData, chainId: newChainId });

                    const client = await new Client(wallet, signer, false);
                    clientRef.current = client;

                    let application: Application | undefined;
                    let tokenApplication: Application | undefined;

                    if (REGISTRY_APP_ID) {
                        try {
                            application = await client.frontend().application(REGISTRY_APP_ID);
                            applicationRef.current = application;
                            console.log('Registry Application connected');
                        } catch (err) {
                            console.error('Could not connect to registry application:', err);
                        }
                    }

                    if (TOKEN_APP_ID) {
                        try {
                            tokenApplication = await client.frontend().application(TOKEN_APP_ID);
                            tokenApplicationRef.current = tokenApplication;
                            console.log('Token Application connected');
                        } catch (err) {
                            console.error('Could not connect to token application:', err);
                        }
                    }

                    setState(prev => ({
                        ...prev,
                        client,
                        wallet,
                        chainId: newChainId,
                        application,
                        tokenApplication,
                    }));

                    console.log('Blockchain connection SUCCESS');
                } catch (blockchainErr) {
                    console.error(`Blockchain connection attempt ${retryCount + 1}/${maxRetries} FAILED:`, blockchainErr);

                    if (retryCount < maxRetries - 1) {
                        const delay = 2000 * (retryCount + 1);
                        console.log(`Retrying in ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        return connectBlockchain(retryCount + 1);
                    }
                    console.error('All blockchain connection attempts failed');
                }
            };

            console.log('Starting background blockchain connection...');
            connectBlockchain();
        } catch (err) {
            console.error('connectExistingWallet failed:', err);
            await clearWalletData();
            setState(prev => ({
                ...prev,
                loading: false,
                status: 'Idle',
                walletExists: false,
            }));
        }
    };

    // Create a new local wallet (mnemonic-based)
    const createWallet = async () => {
        try {
            setState(prev => ({ ...prev, loading: true, status: 'Creating Wallet', error: undefined }));

            const mnemonic = ethers.Wallet.createRandom().mnemonic!.phrase;
            const signer = PrivateKey.fromMnemonic(mnemonic);
            const owner = signer.address().toString();

            console.log('Generated new local wallet');
            setState(prev => ({ ...prev, status: 'Claiming Chain' }));

            const faucet = new Faucet(FAUCET_URL);
            const wallet = await withRetry(() => faucet.createWallet(), 3, 2000);
            const chainId = await withRetry(() => faucet.claimChain(wallet, signer.address()), 3, 2000);

            console.log('Claimed chain:', chainId);

            await saveWalletData({
                mnemonic,
                chainId,
                owner,
                createdAt: Date.now(),
                walletType: 'local',
            });

            setState(prev => ({
                ...prev,
                chainId,
                owner,
                walletType: 'local',
                loading: false,
                status: 'Ready' as const,
                walletExists: true,
            }));

            // Connect client in background
            try {
                const client = await new Client(wallet, signer, false);
                clientRef.current = client;

                let application: Application | undefined;
                let tokenApplication: Application | undefined;

                if (REGISTRY_APP_ID) {
                    try {
                        application = await client.frontend().application(REGISTRY_APP_ID);
                        applicationRef.current = application;
                        console.log('Registry Application connected');
                    } catch (err) {
                        console.warn('Could not connect to registry application:', err);
                    }
                }

                if (TOKEN_APP_ID) {
                    try {
                        tokenApplication = await client.frontend().application(TOKEN_APP_ID);
                        tokenApplicationRef.current = tokenApplication;
                        console.log('Token Application connected');
                    } catch (err) {
                        console.warn('Could not connect to token application:', err);
                    }
                }

                setState(prev => ({ ...prev, client, wallet, application, tokenApplication }));
            } catch (clientErr) {
                console.warn('Client connection failed:', clientErr);
            }
        } catch (err) {
            console.error('Failed to create wallet:', err);
            setState(prev => ({
                ...prev,
                loading: false,
                status: 'Error',
                error: err instanceof Error ? err.message : 'Failed to create wallet',
            }));
        }
    };

    // Connect with MetaMask
    const connectWithMetaMask = async () => {
        try {
            setState(prev => ({ ...prev, loading: true, status: 'Connecting MetaMask', error: undefined }));

            if (!isMetaMaskAvailable()) {
                throw new Error('MetaMask is not installed. Please install the MetaMask browser extension.');
            }

            // Connect to MetaMask
            const signer = await MetaMaskSigner.connect();
            const owner = await signer.address();
            metamaskSignerRef.current = signer;

            console.log('MetaMask connected:', owner);
            setState(prev => ({ ...prev, status: 'Claiming Chain' }));

            // Create wallet and claim chain from faucet
            const faucet = new Faucet(FAUCET_URL);
            const wallet = await withRetry(() => faucet.createWallet(), 3, 2000);
            const chainId = await withRetry(() => faucet.claimChain(wallet, owner), 3, 2000);

            console.log('Claimed chain with MetaMask:', chainId);

            // Save wallet data (no mnemonic for MetaMask)
            await saveWalletData({
                chainId,
                owner,
                createdAt: Date.now(),
                walletType: 'metamask',
            });

            setState(prev => ({
                ...prev,
                chainId,
                owner,
                walletType: 'metamask',
                loading: false,
                status: 'Ready' as const,
                walletExists: true,
            }));

            // Connect client in background
            try {
                const client = await new Client(wallet, signer, false);
                clientRef.current = client;

                let application: Application | undefined;
                let tokenApplication: Application | undefined;

                if (REGISTRY_APP_ID) {
                    try {
                        application = await client.frontend().application(REGISTRY_APP_ID);
                        applicationRef.current = application;
                        console.log('Registry Application connected');
                    } catch (err) {
                        console.warn('Could not connect to registry application:', err);
                    }
                }

                if (TOKEN_APP_ID) {
                    try {
                        tokenApplication = await client.frontend().application(TOKEN_APP_ID);
                        tokenApplicationRef.current = tokenApplication;
                        console.log('Token Application connected');
                    } catch (err) {
                        console.warn('Could not connect to token application:', err);
                    }
                }

                setState(prev => ({ ...prev, client, wallet, application, tokenApplication }));
            } catch (clientErr) {
                console.warn('Client connection failed:', clientErr);
            }
        } catch (err) {
            console.error('Failed to connect MetaMask:', err);
            setState(prev => ({
                ...prev,
                loading: false,
                status: 'Error',
                error: err instanceof Error ? err.message : 'Failed to connect MetaMask',
            }));
        }
    };

    const resetWalletInternal = async () => {
        if (clientRef.current) {
            try {
                // Client may or may not have stop/free methods depending on version
                const client = clientRef.current as unknown as { stop?: () => void; free?: () => void };
                client.stop?.();
                client.free?.();
            } catch { }
            clientRef.current = null;
        }
        applicationRef.current = null;
        tokenApplicationRef.current = null;
        metamaskSignerRef.current = null;
        await clearWalletData();
        setState({
            loading: false,
            status: 'Idle',
            walletExists: false,
            isMetaMaskAvailable: isMetaMaskAvailable(),
        });
        console.log('Wallet reset');
    };

    const resetWallet = async () => {
        await resetWalletInternal();
    };

    // Execute query via WASM application.query()
    const executeQuery = async (query: string): Promise<any> => {
        const app = applicationRef.current || state.application;
        if (!app) {
            throw new Error('Application not connected');
        }

        const response = await app.query(JSON.stringify({ query }));
        const result = typeof response === 'string' ? JSON.parse(response) : response;

        if (result.errors?.length > 0) {
            throw new Error(result.errors[0].message);
        }

        return result.data;
    };

    // Execute mutation via WASM application.query()
    const executeMutation = async (mutation: string): Promise<any> => {
        const app = applicationRef.current || state.application;
        if (!app) {
            throw new Error('Application not connected');
        }

        try {
            const response = await app.query(JSON.stringify({ query: mutation }));
            const result = typeof response === 'string' ? JSON.parse(response) : response;

            if (result.errors?.length > 0) {
                throw new Error(result.errors[0].message);
            }

            return result.data;
        } catch (err) {
            console.error('executeMutation error:', err);
            throw err;
        }
    };

    // Execute query langsung ke Application Chain via HTTP
    const executeAppChainQuery = async (query: string): Promise<any> => {
        const graphqlUrl = `${SERVICE_URL}/chains/${APP_CHAIN_ID}/applications/${REGISTRY_APP_ID}`;

        try {
            const response = await fetch(graphqlUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Bypass-Tunnel-Reminder': 'true',
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
        } catch (err) {
            console.error('executeAppChainQuery failed:', err);
            // Fallback ke WASM query jika HTTP gagal
            return executeQuery(query);
        }
    };

    // Execute mutation langsung ke Application Chain via HTTP
    const executeAppChainMutation = async (mutation: string): Promise<any> => {
        const graphqlUrl = `${SERVICE_URL}/chains/${APP_CHAIN_ID}/applications/${REGISTRY_APP_ID}`;

        try {
            const response = await fetch(graphqlUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Bypass-Tunnel-Reminder': 'true',
                },
                body: JSON.stringify({ query: mutation }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();

            if (result.errors?.length > 0) {
                throw new Error(result.errors[0].message);
            }

            return result.data;
        } catch (err) {
            console.error('executeAppChainMutation failed:', err);
            throw err;
        }
    };

    // Execute mutation on token application via WASM
    const executeTokenMutation = async (mutation: string): Promise<any> => {
        const app = tokenApplicationRef.current || state.tokenApplication;

        if (!app) {
            throw new Error('Token application not connected');
        }

        try {
            const response = await app.query(JSON.stringify({ query: mutation }));
            const result = typeof response === 'string' ? JSON.parse(response) : response;

            if (result.errors?.length > 0) {
                throw new Error(result.errors[0].message);
            }

            return result.data;
        } catch (err) {
            console.error('executeTokenMutation error:', err);
            throw err;
        }
    };

    return (
        <LineraContext.Provider value={{
            ...state,
            createWallet,
            connectWithMetaMask,
            resetWallet,
            executeQuery,
            executeMutation,
            executeAppChainQuery,
            executeAppChainMutation,
            executeTokenMutation
        }}>
            {children}
        </LineraContext.Provider>
    );
};
