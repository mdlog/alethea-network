// Linera Client Service
// Implementasi integrasi dengan @linera/client library

import * as linera from '@linera/client';

// Configuration
const FAUCET_URL = process.env.NEXT_PUBLIC_FAUCET_URL || 'https://faucet.testnet-conway.linera.net';
const COUNTER_APP_ID = process.env.NEXT_PUBLIC_COUNTER_APP_ID || '2b1a0df8868206a4b7d6c2fdda911e4355d6c0115b896d4947ef8e535ee3e6b8';

// Registry App Configuration
const REGISTRY_APP_ID = process.env.NEXT_PUBLIC_REGISTRY_ID || '8393789dd5c9b3fe5ac9aa9cee606993769feee666925058f07e0a9882a3396b';

export interface LineraClientState {
    client: any | null;
    wallet: any | null;
    chainId: string | null;
    backend: any | null;
    initialized: boolean;
}

class LineraClientService {
    private state: LineraClientState = {
        client: null,
        wallet: null,
        chainId: null,
        backend: null,
        initialized: false,
    };

    private notificationCallbacks: Array<(notification: any) => void> = [];

    /**
     * Initialize Linera WebAssembly and client
     */
    async initialize(): Promise<void> {
        if (this.state.initialized) {
            console.log('Linera client already initialized');
            return;
        }

        try {
            console.log('Initializing Linera WebAssembly...');
            await linera.default();
            this.state.initialized = true;
            console.log('Linera WebAssembly initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Linera:', error);
            throw new Error('Failed to initialize Linera WebAssembly');
        }
    }

    /**
     * Create wallet from faucet (for testing)
     */
    async createWalletFromFaucet(): Promise<{ wallet: any; chainId: string }> {
        if (!this.state.initialized) {
            await this.initialize();
        }

        try {
            console.log('Connecting to faucet:', FAUCET_URL);
            const faucet = await new linera.Faucet(FAUCET_URL);

            console.log('Creating wallet from faucet...');
            const wallet = await faucet.createWallet();

            console.log('Creating client...');
            const client = await new (linera as any).Client(wallet);

            console.log('Claiming chain...');
            const chainId = await (faucet as any).claimChain(client);

            this.state.wallet = wallet;
            this.state.client = client;
            this.state.chainId = chainId;

            // Setup notification handler
            this.setupNotifications();

            console.log('Wallet created successfully. Chain ID:', chainId);
            return { wallet, chainId };
        } catch (error) {
            console.error('Failed to create wallet from faucet:', error);
            throw new Error('Failed to create wallet from faucet');
        }
    }

    /**
     * Load wallet from JSON
     */
    async loadWalletFromJson(walletJson: string): Promise<void> {
        if (!this.state.initialized) {
            await this.initialize();
        }

        try {
            console.log('Loading wallet from JSON...');
            const wallet = await (linera.Wallet as any).fromJson(walletJson);
            const client = await new (linera as any).Client(wallet);

            this.state.wallet = wallet;
            this.state.client = client;

            // Get default chain ID from wallet
            // Note: You may need to adjust this based on actual wallet structure
            const chains = wallet.chains || [];
            this.state.chainId = chains.length > 0 ? chains[0].chainId : null;

            // Setup notification handler
            this.setupNotifications();

            console.log('Wallet loaded successfully');
        } catch (error) {
            console.error('Failed to load wallet:', error);
            throw new Error('Failed to load wallet from JSON');
        }
    }

    /**
     * Get application backend
     */
    async getApplicationBackend(applicationId: string = REGISTRY_APP_ID): Promise<any> {
        if (!this.state.client) {
            throw new Error('Client not initialized. Please create or load a wallet first.');
        }

        try {
            console.log('Getting application backend for:', applicationId);
            const backend = await this.state.client.frontend().application(applicationId);
            this.state.backend = backend;
            return backend;
        } catch (error) {
            console.error('Failed to get application backend:', error);
            throw new Error('Failed to get application backend');
        }
    }

    /**
     * Query application backend
     */
    async query(queryString: string, applicationId?: string): Promise<any> {
        let backend = this.state.backend;

        if (applicationId) {
            backend = await this.getApplicationBackend(applicationId);
        }

        if (!backend) {
            throw new Error('Backend not initialized. Please get application backend first.');
        }

        try {
            console.log('Querying backend:', queryString);
            const response = await backend.query(queryString);
            const parsed = JSON.parse(response);
            console.log('Query response:', parsed);
            return parsed;
        } catch (error) {
            console.error('Query failed:', error);
            throw new Error(`Query failed: ${error}`);
        }
    }

    /**
     * Execute GraphQL query
     */
    async graphqlQuery(query: string, applicationId?: string): Promise<any> {
        const queryString = JSON.stringify({ query });
        return this.query(queryString, applicationId);
    }

    /**
     * Execute GraphQL mutation
     */
    async graphqlMutation(mutation: string, applicationId?: string): Promise<any> {
        const mutationString = JSON.stringify({ query: mutation });
        return this.query(mutationString, applicationId);
    }

    /**
     * Setup notification handler
     */
    private setupNotifications(): void {
        if (!this.state.client) {
            console.warn('Cannot setup notifications: client not initialized');
            return;
        }

        this.state.client.onNotification((notification: any) => {
            console.log('Received notification:', notification);

            // Call all registered callbacks
            this.notificationCallbacks.forEach(callback => {
                try {
                    callback(notification);
                } catch (error) {
                    console.error('Error in notification callback:', error);
                }
            });
        });
    }

    /**
     * Register notification callback
     */
    onNotification(callback: (notification: any) => void): () => void {
        this.notificationCallbacks.push(callback);

        // Return unsubscribe function
        return () => {
            const index = this.notificationCallbacks.indexOf(callback);
            if (index > -1) {
                this.notificationCallbacks.splice(index, 1);
            }
        };
    }

    /**
     * Get current state
     */
    getState(): LineraClientState {
        return { ...this.state };
    }

    /**
     * Check if client is ready
     */
    isReady(): boolean {
        return this.state.initialized && this.state.client !== null;
    }

    /**
     * Reset client state
     */
    reset(): void {
        this.state = {
            client: null,
            wallet: null,
            chainId: null,
            backend: null,
            initialized: false,
        };
        this.notificationCallbacks = [];
    }
}

// Export singleton instance
export const lineraClient = new LineraClientService();
