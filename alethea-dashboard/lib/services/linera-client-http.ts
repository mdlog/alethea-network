// Real Linera Client Service using HTTP GraphQL
// For production use with local Linera service

export interface LineraClientState {
    client: any | null;
    wallet: any | null;
    chainId: string | null;
    backend: any | null;
    initialized: boolean;
}

const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || '';
const APP_ID = process.env.NEXT_PUBLIC_REGISTRY_ID || '';
const SERVICE_URL = process.env.NEXT_PUBLIC_LINERA_SERVICE || 'http://localhost:8080';

class HttpLineraClientService {
    private state: LineraClientState = {
        client: null,
        wallet: null,
        chainId: null,
        backend: null,
        initialized: false,
    };

    private notificationCallbacks: Array<(notification: any) => void> = [];
    private notificationInterval: NodeJS.Timeout | null = null;
    private lastBlockHeight: number = 0;

    /**
     * Initialize HTTP client
     */
    async initialize(): Promise<void> {
        if (this.state.initialized) {
            console.log('HTTP Linera client already initialized');
            return;
        }

        try {
            console.log('Initializing HTTP Linera client...');
            console.log('Service URL:', SERVICE_URL);
            console.log('Chain ID:', CHAIN_ID);
            console.log('App ID:', APP_ID);

            // Check if service is available
            const response = await fetch(SERVICE_URL, {
                method: 'GET',
            }).catch(() => null);

            if (!response || !response.ok) {
                throw new Error('Linera service not available at ' + SERVICE_URL);
            }

            this.state.initialized = true;
            console.log('HTTP Linera client initialized successfully');
        } catch (error) {
            console.error('Failed to initialize HTTP Linera:', error);
            throw new Error('Failed to initialize HTTP Linera client: ' + error);
        }
    }

    /**
     * Create wallet (for HTTP client, this just sets up the connection)
     */
    async createWalletFromFaucet(): Promise<{ wallet: any; chainId: string }> {
        if (!this.state.initialized) {
            await this.initialize();
        }

        try {
            console.log('Setting up HTTP client connection...');

            if (!CHAIN_ID) {
                throw new Error('NEXT_PUBLIC_CHAIN_ID not configured');
            }

            const wallet = {
                type: 'http',
                chainId: CHAIN_ID,
                serviceUrl: SERVICE_URL
            };

            const client = {
                type: 'http',
                wallet,
                serviceUrl: SERVICE_URL
            };

            this.state.wallet = wallet;
            this.state.client = client;
            this.state.chainId = CHAIN_ID;
            this.state.backend = {
                type: 'http',
                url: this.getApplicationUrl()
            };

            // Start polling for notifications
            this.startNotificationPolling();

            console.log('HTTP client connected successfully. Chain ID:', CHAIN_ID);
            return { wallet, chainId: CHAIN_ID };
        } catch (error) {
            console.error('Failed to setup HTTP client:', error);
            throw new Error('Failed to setup HTTP client: ' + error);
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
            const walletData = JSON.parse(walletJson);

            // Extract chain ID from wallet
            let chainId = CHAIN_ID; // Default from env

            // Try to get chain ID from wallet structure
            if (walletData.default_chain) {
                chainId = walletData.default_chain;
            } else if (walletData.chains && walletData.chains.length > 0) {
                // Get first chain from chains array
                const firstChain = walletData.chains[0];
                if (typeof firstChain === 'string') {
                    chainId = firstChain;
                } else if (firstChain.chain_id) {
                    chainId = firstChain.chain_id;
                }
            } else if (walletData.chainId) {
                chainId = walletData.chainId;
            }

            console.log('Extracted chain ID from wallet:', chainId);

            const wallet = {
                type: 'http',
                chainId: chainId,
                serviceUrl: SERVICE_URL,
                data: walletData
            };

            const client = {
                type: 'http',
                wallet,
                serviceUrl: SERVICE_URL
            };

            this.state.wallet = wallet;
            this.state.client = client;
            this.state.chainId = chainId;
            this.state.backend = {
                type: 'http',
                url: `${SERVICE_URL}/chains/${chainId}/applications/${APP_ID}`
            };

            // Start polling for notifications
            this.startNotificationPolling();

            console.log('Wallet loaded successfully. Chain ID:', chainId);
        } catch (error) {
            console.error('Failed to load wallet:', error);
            throw new Error('Failed to load wallet from JSON: ' + error);
        }
    }

    /**
     * Get application backend URL
     */
    private getApplicationUrl(applicationId?: string): string {
        const appId = applicationId || APP_ID;
        const chainId = this.state.chainId || CHAIN_ID;
        return `${SERVICE_URL}/chains/${chainId}/applications/${appId}`;
    }

    /**
     * Get application backend
     */
    async getApplicationBackend(applicationId?: string): Promise<any> {
        if (!this.state.client) {
            throw new Error('Client not initialized. Please create connection first.');
        }

        const url = this.getApplicationUrl(applicationId);
        console.log('Getting application backend:', url);

        this.state.backend = {
            type: 'http',
            url
        };

        return this.state.backend;
    }

    /**
     * Query via HTTP GraphQL
     */
    async query(queryString: string, applicationId?: string): Promise<any> {
        if (!this.state.initialized) {
            throw new Error('Client not initialized. Please initialize first.');
        }

        const url = this.getApplicationUrl(applicationId);

        try {
            console.log('HTTP Query to:', url);
            console.log('Query:', queryString);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: queryString,
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text}`);
            }

            const result = await response.json();
            console.log('Query response:', result);

            return result;
        } catch (error) {
            console.error('HTTP Query failed:', error);
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
        const result = await this.query(mutationString, applicationId);

        // Trigger notification after mutation (simulate new block)
        setTimeout(() => {
            this.triggerNotification({
                reason: { NewBlock: { height: Date.now() } }
            });
        }, 1000);

        return result;
    }

    /**
     * Start polling for notifications
     */
    private startNotificationPolling(): void {
        if (this.notificationInterval) {
            return;
        }

        // Poll every 5 seconds for new blocks
        this.notificationInterval = setInterval(async () => {
            try {
                // Query for latest block height or changes
                const result = await this.graphqlQuery(`
          query {
            voterCount
          }
        `).catch(() => null);

                if (result?.data) {
                    // If data changed, trigger notification
                    this.triggerNotification({
                        reason: { NewBlock: { height: Date.now() } }
                    });
                }
            } catch (error) {
                // Ignore polling errors
            }
        }, 5000);
    }

    /**
     * Stop notification polling
     */
    private stopNotificationPolling(): void {
        if (this.notificationInterval) {
            clearInterval(this.notificationInterval);
            this.notificationInterval = null;
        }
    }

    /**
     * Trigger notification
     */
    private triggerNotification(notification: any): void {
        console.log('Notification:', notification);
        this.notificationCallbacks.forEach(callback => {
            try {
                callback(notification);
            } catch (error) {
                console.error('Error in notification callback:', error);
            }
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
        this.stopNotificationPolling();
        this.state = {
            client: null,
            wallet: null,
            chainId: null,
            backend: null,
            initialized: false,
        };
        this.notificationCallbacks = [];
        this.lastBlockHeight = 0;
    }
}

// Export singleton instance
export const lineraClient = new HttpLineraClientService();
