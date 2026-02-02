import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import initLinera, { Client, Faucet, Wallet, Application } from '@linera/client';
import { PrivateKey } from '@linera/signer';
import { ethers } from 'ethers';

// Constants - Conway Testnet Deployment (2026-01-31 - Fixed Escrow & Reward Minting)
const FAUCET_URL = import.meta.env.VITE_FAUCET_URL || 'https://faucet.testnet-conway.linera.net';
const REGISTRY_APP_ID = import.meta.env.VITE_REGISTRY_APP_ID || 'b08bd0587eb941b8db83fd7dffa32ad0ebd1a55eed0f9e0789b7cf02c402b9ff';
const TOKEN_APP_ID = import.meta.env.VITE_TOKEN_APP_ID || '5e98e799a48a40ac37d5bed51581892acc31030d6ce24b1cfb142c8835af27c2';
const APP_CHAIN_ID = import.meta.env.VITE_CHAIN_ID || '9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec';
// Use relative URL for Vite proxy, or explicit URL if set
const SERVICE_URL = import.meta.env.VITE_SERVICE_URL || '';
const DB_NAME = 'alethea_wallet';
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
    application?: Application;
    tokenApplication?: Application;
    loading: boolean;
    status: 'Initializing' | 'Idle' | 'Creating Wallet' | 'Claiming Chain' | 'Connecting' | 'Ready' | 'Error';
    error?: string;
    walletExists: boolean;
    createWallet: () => Promise<void>;
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
    createWallet: async () => { },
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
            request.onsuccess = () => { db.close(); resolve(request.result || null); };
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
    return data !== null && !!data.mnemonic && !!data.chainId;
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
            console.warn(`⚠️ Attempt ${i + 1}/${maxRetries} failed:`, lastError.message);
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }
    throw lastError;
};

export const LineraProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<Omit<LineraContextType, 'createWallet' | 'resetWallet' | 'executeQuery' | 'executeMutation'>>({
        loading: true,
        status: 'Initializing',
        walletExists: false,
    });
    const initRef = useRef(false);
    const clientRef = useRef<Client | null>(null);
    const applicationRef = useRef<Application | null>(null);
    const tokenApplicationRef = useRef<Application | null>(null);

    // Initialize WASM and check for existing wallet
    useEffect(() => {
        if (initRef.current) return;
        initRef.current = true;

        const init = async () => {
            try {
                console.log('🔧 Initializing Linera WASM...');
                await initLinera();
                console.log('✅ Linera WASM initialized successfully');

                const exists = await checkWalletExists();
                console.log('💼 Wallet exists:', exists);

                if (exists) {
                    setState(prev => ({ ...prev, status: 'Connecting', walletExists: true }));
                    await connectExistingWallet();
                } else {
                    setState(prev => ({
                        ...prev,
                        loading: false,
                        status: 'Idle',
                        walletExists: false,
                    }));
                }
            } catch (err) {
                console.error('❌ Initialization error:', err);
                setState(prev => ({
                    ...prev,
                    loading: false,
                    status: 'Error',
                    error: err instanceof Error ? err.message : 'Failed to initialize',
                }));
            }
        };

        init();

        return () => {
            if (clientRef.current) {
                try {
                    clientRef.current.stop();
                    clientRef.current.free();
                } catch { }
            }
        };
    }, []);

    const connectExistingWallet = async () => {
        try {
            const walletData = await loadWalletData();
            if (!walletData) throw new Error('No wallet data found');

            console.log('═══════════════════════════════════════════════════════════');
            console.log('🔗 [connectExistingWallet] Starting...');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('  Stored chainId:', walletData.chainId);
            console.log('  Stored owner:', walletData.owner);
            console.log('  FAUCET_URL:', FAUCET_URL);
            console.log('  REGISTRY_APP_ID:', REGISTRY_APP_ID);
            console.log('  TOKEN_APP_ID:', TOKEN_APP_ID);

            const signer = PrivateKey.fromMnemonic(walletData.mnemonic);
            console.log('  Signer address:', signer.address().toString());

            // Set UI ready with stored data first (so user sees something)
            setState(prev => ({
                ...prev,
                chainId: walletData.chainId,
                owner: walletData.owner,
                loading: false,
                status: 'Ready' as const,
                walletExists: true,
            }));

            // Connect blockchain in background with retry
            const connectBlockchain = async (retryCount = 0): Promise<void> => {
                const maxRetries = 3;
                try {
                    console.log(`🔄 [connectBlockchain] Attempt ${retryCount + 1}/${maxRetries}...`);

                    // Step 1: Create faucet connection
                    console.log('  Step 1: Creating faucet connection...');
                    console.log('    FAUCET_URL:', FAUCET_URL);

                    // Test faucet connectivity first
                    try {
                        console.log('    Testing faucet HTTP connectivity...');
                        const testResponse = await fetch(FAUCET_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ query: '{ version }' })
                        });
                        console.log('    Faucet HTTP status:', testResponse.status);
                        if (testResponse.ok) {
                            const testData = await testResponse.json();
                            console.log('    Faucet response:', JSON.stringify(testData));
                        }
                    } catch (httpErr) {
                        console.warn('    ⚠️ Faucet HTTP test failed:', httpErr);
                    }

                    const faucet = new Faucet(FAUCET_URL);
                    console.log('  ✅ Faucet object created');

                    // Step 2: Create wallet (in-memory structure)
                    console.log('  Step 2: Creating wallet...');
                    const startWallet = performance.now();
                    const wallet = await faucet.createWallet();
                    console.log(`  ✅ Wallet created (${(performance.now() - startWallet).toFixed(0)}ms)`);

                    // Step 3: Claim a new chain (NOTE: This creates a NEW chain each time!)
                    // This is a known limitation - ideally we'd reuse the existing chain
                    console.log('  Step 3: Claiming chain from faucet...');
                    console.log('    Signer address:', signer.address().toString());
                    const startClaim = performance.now();
                    const newChainId = await faucet.claimChain(wallet, signer.address());
                    console.log(`  ✅ Chain claimed (${(performance.now() - startClaim).toFixed(0)}ms):`, newChainId);
                    console.log('  ⚠️ Note: This is a NEW chain, not the stored one');

                    // Save the new chain ID
                    await saveWalletData({ ...walletData, chainId: newChainId });

                    // Step 4: Create client
                    console.log('  Step 4: Creating Linera client...');
                    const startClient = performance.now();
                    const client = await new Client(wallet, signer, false);
                    clientRef.current = client;
                    console.log(`  ✅ Client created (${(performance.now() - startClient).toFixed(0)}ms)`);

                    let application: Application | undefined;
                    let tokenApplication: Application | undefined;

                    // Step 5: Connect to Registry Application
                    // Note: @linera/client 0.15.6 doesn't have requestApplication()
                    // We directly use frontend().application() instead
                    if (REGISTRY_APP_ID) {
                        try {
                            console.log('  Step 5a: Connecting to registry application...');
                            console.log('    REGISTRY_APP_ID:', REGISTRY_APP_ID);
                            const startFrontendReg = performance.now();
                            application = await client.frontend().application(REGISTRY_APP_ID);
                            applicationRef.current = application;
                            console.log(`    ✅ Registry Application connected! (${(performance.now() - startFrontendReg).toFixed(0)}ms)`);
                        } catch (err) {
                            console.error('    ❌ Could not connect to registry application:', err);
                            console.error('    Error type:', err?.constructor?.name);
                            console.error('    Error message:', err instanceof Error ? err.message : String(err));
                            if (err instanceof Error && err.stack) {
                                console.error('    Stack:', err.stack);
                            }
                        }
                    } else {
                        console.log('  Step 5a: Skipped - no REGISTRY_APP_ID');
                    }

                    // Step 6: Connect to Token Application
                    if (TOKEN_APP_ID) {
                        try {
                            console.log('  Step 5b: Connecting to token application...');
                            console.log('    TOKEN_APP_ID:', TOKEN_APP_ID);
                            const startFrontendToken = performance.now();
                            tokenApplication = await client.frontend().application(TOKEN_APP_ID);
                            tokenApplicationRef.current = tokenApplication;
                            console.log(`    ✅ Token Application connected! (${(performance.now() - startFrontendToken).toFixed(0)}ms)`);
                        } catch (err) {
                            console.error('    ❌ Could not connect to token application:', err);
                            console.error('    Error type:', err?.constructor?.name);
                            console.error('    Error message:', err instanceof Error ? err.message : String(err));
                            if (err instanceof Error && err.stack) {
                                console.error('    Stack:', err.stack);
                            }
                        }
                    } else {
                        console.log('  Step 5b: Skipped - no TOKEN_APP_ID');
                    }

                    // Update state with connected applications
                    setState(prev => ({
                        ...prev,
                        client,
                        wallet,
                        chainId: newChainId,
                        application,
                        tokenApplication,
                    }));

                    console.log('═══════════════════════════════════════════════════════════');
                    console.log('✅ [connectBlockchain] SUCCESS!');
                    console.log('  application:', !!application);
                    console.log('  tokenApplication:', !!tokenApplication);
                    console.log('═══════════════════════════════════════════════════════════');
                } catch (blockchainErr) {
                    console.error('═══════════════════════════════════════════════════════════');
                    console.error(`❌ [connectBlockchain] Attempt ${retryCount + 1}/${maxRetries} FAILED`);
                    console.error('═══════════════════════════════════════════════════════════');
                    console.error('  Error:', blockchainErr);
                    console.error('  Error type:', blockchainErr?.constructor?.name);
                    console.error('  Error message:', blockchainErr instanceof Error ? blockchainErr.message : String(blockchainErr));
                    if (blockchainErr instanceof Error && blockchainErr.stack) {
                        console.error('  Stack trace:', blockchainErr.stack);
                    }

                    // Check for specific error types
                    const errMsg = blockchainErr instanceof Error ? blockchainErr.message : String(blockchainErr);
                    if (errMsg.includes('network') || errMsg.includes('fetch')) {
                        console.error('  🔍 Diagnosis: Network connectivity issue');
                    } else if (errMsg.includes('SSL') || errMsg.includes('certificate')) {
                        console.error('  🔍 Diagnosis: SSL/Certificate issue');
                    } else if (errMsg.includes('CORS')) {
                        console.error('  🔍 Diagnosis: CORS policy blocking request');
                    } else if (errMsg.includes('timeout')) {
                        console.error('  🔍 Diagnosis: Request timeout');
                    }

                    if (retryCount < maxRetries - 1) {
                        const delay = 2000 * (retryCount + 1);
                        console.log(`  Retrying in ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        return connectBlockchain(retryCount + 1);
                    }
                    console.error('❌ All blockchain connection attempts failed!');
                    console.error('  WASM features will not work.');
                    console.error('  Possible causes:');
                    console.error('    1. Linera testnet validators are down');
                    console.error('    2. Network/firewall blocking WebSocket connections');
                    console.error('    3. Browser blocking mixed content or invalid certificates');
                }
            };

            // Start background connection (don't await - let UI be responsive)
            console.log('🚀 Starting background blockchain connection...');
            connectBlockchain();
        } catch (err) {
            console.error('❌ [connectExistingWallet] Failed:', err);
            await clearWalletData();
            setState(prev => ({
                ...prev,
                loading: false,
                status: 'Idle',
                walletExists: false,
            }));
        }
    };

    const createWallet = async () => {
        try {
            setState(prev => ({ ...prev, loading: true, status: 'Creating Wallet', error: undefined }));

            const mnemonic = ethers.Wallet.createRandom().mnemonic!.phrase;
            const signer = PrivateKey.fromMnemonic(mnemonic);
            const owner = signer.address().toString();

            console.log('🔑 Generated new wallet');
            setState(prev => ({ ...prev, status: 'Claiming Chain' }));

            const faucet = new Faucet(FAUCET_URL);
            const wallet = await withRetry(() => faucet.createWallet(), 3, 2000);
            const chainId = await withRetry(() => faucet.claimChain(wallet, signer.address()), 3, 2000);

            console.log('⛓️ Claimed chain:', chainId);

            await saveWalletData({ mnemonic, chainId, owner, createdAt: Date.now() });

            setState(prev => ({
                ...prev,
                chainId,
                owner,
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
                        // Connect to registry application directly (no requestApplication in this SDK version)
                        console.log('📥 Connecting to registry application...');
                        application = await client.frontend().application(REGISTRY_APP_ID);
                        applicationRef.current = application;
                        console.log('📱 Registry Application connected');
                    } catch (err) {
                        console.warn('⚠️ Could not connect to registry application:', err);
                    }
                }

                if (TOKEN_APP_ID) {
                    try {
                        // Connect to token application directly (no requestApplication in this SDK version)
                        console.log('📥 Connecting to token application...');
                        console.log('  TOKEN_APP_ID:', TOKEN_APP_ID);
                        tokenApplication = await client.frontend().application(TOKEN_APP_ID);
                        tokenApplicationRef.current = tokenApplication;
                        console.log('🪙 Token Application connected');
                        console.log('  tokenApplicationRef.current set:', !!tokenApplicationRef.current);
                    } catch (err) {
                        console.warn('⚠️ Could not connect to token application:', err);
                        console.warn('  This may cause token transfers to fail');
                    }
                }

                setState(prev => ({ ...prev, client, wallet, application, tokenApplication }));
            } catch (clientErr) {
                console.warn('⚠️ Client connection failed:', clientErr);
            }
        } catch (err) {
            console.error('❌ Failed to create wallet:', err);
            setState(prev => ({
                ...prev,
                loading: false,
                status: 'Error',
                error: err instanceof Error ? err.message : 'Failed to create wallet',
            }));
        }
    };

    const resetWallet = async () => {
        if (clientRef.current) {
            try {
                clientRef.current.stop();
                clientRef.current.free();
            } catch { }
            clientRef.current = null;
        }
        applicationRef.current = null;
        tokenApplicationRef.current = null;
        await clearWalletData();
        setState({ loading: false, status: 'Idle', walletExists: false });
        console.log('🗑️ Wallet reset');
    };

    // Execute query via WASM application.query()
    const executeQuery = async (query: string): Promise<any> => {
        const app = applicationRef.current || state.application;
        if (!app) {
            throw new Error('Application not connected');
        }

        console.log('🔍 [executeQuery] Query:', query.substring(0, 100) + '...');
        const response = await app.query(JSON.stringify({ query }));
        const result = typeof response === 'string' ? JSON.parse(response) : response;

        if (result.errors?.length > 0) {
            throw new Error(result.errors[0].message);
        }

        console.log('✅ [executeQuery] Success');
        return result.data;
    };

    // Execute mutation via WASM application.query()
    // Note: In Linera, GraphQL mutations are also sent via query() method
    const executeMutation = async (mutation: string): Promise<any> => {
        const app = applicationRef.current || state.application;
        if (!app) {
            throw new Error('Application not connected');
        }

        console.log('═══════════════════════════════════════════════════════════');
        console.log('🔄 [executeMutation] WASM Mutation Request');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📍 Browser Chain:', state.chainId);
        console.log('📝 Full Mutation:', mutation);
        console.log('📦 Payload:', JSON.stringify({ query: mutation }));

        try {
            const response = await app.query(JSON.stringify({ query: mutation }));
            console.log('📥 Raw WASM Response:', response);
            console.log('📥 Response Type:', typeof response);

            const result = typeof response === 'string' ? JSON.parse(response) : response;
            console.log('📊 Parsed Result:', JSON.stringify(result, null, 2));

            if (result.errors?.length > 0) {
                console.error('❌ WASM Mutation Error:', result.errors);
                throw new Error(result.errors[0].message);
            }

            console.log('✅ [executeMutation] Success - Data:', result.data);
            console.log('═══════════════════════════════════════════════════════════');
            return result.data;
        } catch (err) {
            console.error('❌ [executeMutation] Exception:', err);
            console.log('═══════════════════════════════════════════════════════════');
            throw err;
        }
    };

    // Execute query langsung ke Application Chain via HTTP
    // Ini memungkinkan semua browser melihat data yang sama (voters, queries, dll)
    const executeAppChainQuery = async (query: string): Promise<any> => {
        const graphqlUrl = `${SERVICE_URL}/chains/${APP_CHAIN_ID}/applications/${REGISTRY_APP_ID}`;

        console.log('🔍 [Linera HTTP] Query to Application Chain');
        console.log('📍 Chain:', APP_CHAIN_ID.substring(0, 16) + '...');
        console.log('🌐 URL:', graphqlUrl);

        try {
            const response = await fetch(graphqlUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Bypass-Tunnel-Reminder': 'true', // For localtunnel
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

            console.log('✅ [Linera HTTP] Query success');
            return result.data;
        } catch (err) {
            console.error('❌ [Linera HTTP] Query failed:', err);
            // Fallback ke WASM query jika HTTP gagal
            console.log('🔄 Falling back to WASM query...');
            return executeQuery(query);
        }
    };

    // Execute mutation langsung ke Application Chain via HTTP
    // Ini memastikan semua voters/queries tersimpan di chain yang sama
    const executeAppChainMutation = async (mutation: string): Promise<any> => {
        const graphqlUrl = `${SERVICE_URL}/chains/${APP_CHAIN_ID}/applications/${REGISTRY_APP_ID}`;

        // Detailed logging similar to WASM DEBUG
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🔗 [Linera HTTP] Sending mutation to Application Chain');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📍 Target Chain:', APP_CHAIN_ID);
        console.log('📱 Application:', REGISTRY_APP_ID);
        console.log('🌐 URL:', graphqlUrl);
        console.log('📤 Mutation:', mutation);
        console.log('═══════════════════════════════════════════════════════════');

        const startTime = performance.now();

        try {
            const response = await fetch(graphqlUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Bypass-Tunnel-Reminder': 'true', // For localtunnel
                },
                body: JSON.stringify({ query: mutation }),
            });

            const endTime = performance.now();
            const duration = (endTime - startTime).toFixed(2);

            if (!response.ok) {
                console.error('❌ [Linera HTTP] Error:', response.status, response.statusText);
                throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();

            console.log('═══════════════════════════════════════════════════════════');
            console.log('📥 [Linera HTTP] Response received');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('⏱️ Duration:', duration, 'ms');
            console.log('📦 Result:', JSON.stringify(result, null, 2));
            console.log('═══════════════════════════════════════════════════════════');

            if (result.errors?.length > 0) {
                console.error('❌ [Linera HTTP] GraphQL Error:', result.errors[0].message);
                throw new Error(result.errors[0].message);
            }

            console.log('✅ [Linera HTTP] Mutation executed successfully on blockchain');
            return result.data;
        } catch (err) {
            console.error('═══════════════════════════════════════════════════════════');
            console.error('❌ [Linera HTTP] Mutation FAILED');
            console.error('═══════════════════════════════════════════════════════════');
            console.error('Error:', err);
            throw err;
        }
    };

    // Execute mutation on token application via WASM
    // This allows authenticated token transfers using the user's private key
    const executeTokenMutation = async (mutation: string): Promise<any> => {
        const app = tokenApplicationRef.current || state.tokenApplication;

        console.log('🪙 [executeTokenMutation] Starting...');
        console.log('  tokenApplicationRef.current:', !!tokenApplicationRef.current);
        console.log('  state.tokenApplication:', !!state.tokenApplication);
        console.log('  clientRef.current:', !!clientRef.current);

        if (!app) {
            console.error('❌ Token application not connected');
            console.log('  Hint: Check browser console for WASM connection errors');
            throw new Error('Token application not connected');
        }

        console.log('🪙 [executeTokenMutation] Mutation:', mutation.substring(0, 100) + '...');

        try {
            const response = await app.query(JSON.stringify({ query: mutation }));
            console.log('📥 Raw response:', response);
            const result = typeof response === 'string' ? JSON.parse(response) : response;

            if (result.errors?.length > 0) {
                console.error('❌ GraphQL errors:', result.errors);
                throw new Error(result.errors[0].message);
            }

            console.log('✅ [executeTokenMutation] Success');
            return result.data;
        } catch (err) {
            console.error('❌ [executeTokenMutation] Exception:', err);
            throw err;
        }
    };

    return (
        <LineraContext.Provider value={{ ...state, createWallet, resetWallet, executeQuery, executeMutation, executeAppChainQuery, executeAppChainMutation, executeTokenMutation }}>
            {children}
        </LineraContext.Provider>
    );
};
