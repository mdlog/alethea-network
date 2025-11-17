// Mock Linera Client Service for Demo
// This is a simplified version that doesn't require actual blockchain connection

export interface LineraClientState {
    client: any | null;
    wallet: any | null;
    chainId: string | null;
    backend: any | null;
    initialized: boolean;
}

class MockLineraClientService {
    private state: LineraClientState = {
        client: null,
        wallet: null,
        chainId: null,
        backend: null,
        initialized: false,
    };

    private notificationCallbacks: Array<(notification: any) => void> = [];
    private mockCounter = 0;

    /**
     * Initialize (mock)
     */
    async initialize(): Promise<void> {
        if (this.state.initialized) {
            console.log('Mock Linera client already initialized');
            return;
        }

        try {
            console.log('Initializing Mock Linera client...');
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading
            this.state.initialized = true;
            console.log('Mock Linera client initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Mock Linera:', error);
            throw new Error('Failed to initialize Mock Linera client');
        }
    }

    /**
     * Create mock wallet
     */
    async createWalletFromFaucet(): Promise<{ wallet: any; chainId: string }> {
        if (!this.state.initialized) {
            await this.initialize();
        }

        try {
            console.log('Creating mock wallet...');
            await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate faucet delay

            // Use real chain ID from environment if available (for demo purposes)
            const mockChainId = process.env.NEXT_PUBLIC_CHAIN_ID ||
                'mock_' + Math.random().toString(36).substring(2, 15);
            const mockWallet = { type: 'mock', id: mockChainId };
            const mockClient = { type: 'mock', wallet: mockWallet };

            this.state.wallet = mockWallet;
            this.state.client = mockClient;
            this.state.chainId = mockChainId;
            this.state.backend = { type: 'mock' };

            console.log('Mock wallet created successfully. Chain ID:', mockChainId);
            return { wallet: mockWallet, chainId: mockChainId };
        } catch (error) {
            console.error('Failed to create mock wallet:', error);
            throw new Error('Failed to create mock wallet');
        }
    }

    /**
     * Load wallet from JSON (mock)
     */
    async loadWalletFromJson(walletJson: string): Promise<void> {
        if (!this.state.initialized) {
            await this.initialize();
        }

        try {
            console.log('Loading mock wallet from JSON...');
            const wallet = JSON.parse(walletJson);

            this.state.wallet = wallet;
            this.state.client = { type: 'mock', wallet };
            this.state.chainId = wallet.chainId || 'mock_loaded';
            this.state.backend = { type: 'mock' };

            console.log('Mock wallet loaded successfully');
        } catch (error) {
            console.error('Failed to load mock wallet:', error);
            throw new Error('Failed to load wallet from JSON');
        }
    }

    /**
     * Get application backend (mock)
     */
    async getApplicationBackend(applicationId: string): Promise<any> {
        if (!this.state.client) {
            throw new Error('Client not initialized. Please create or load a wallet first.');
        }

        console.log('Getting mock application backend for:', applicationId);
        return this.state.backend;
    }

    /**
     * Query (mock)
     */
    async query(queryString: string, applicationId?: string): Promise<any> {
        if (!this.state.backend) {
            throw new Error('Backend not initialized. Please get application backend first.');
        }

        try {
            console.log('Mock query:', queryString);

            // Parse query to determine response
            const parsed = JSON.parse(queryString);
            const query = parsed.query || '';

            // Mock counter query
            if (query.includes('value')) {
                return {
                    data: {
                        value: this.mockCounter
                    }
                };
            }

            // Mock markets query
            if (query.includes('markets')) {
                return {
                    data: {
                        markets: [
                            {
                                id: 1,
                                question: 'Will Bitcoin reach $100k in 2025?',
                                outcomes: ['Yes', 'No'],
                                status: 'OPEN',
                                deadline: Date.now() + 86400000
                            }
                        ]
                    }
                };
            }

            return { data: {} };
        } catch (error) {
            console.error('Mock query failed:', error);
            throw new Error(`Query failed: ${error}`);
        }
    }

    /**
     * Execute GraphQL query (mock)
     */
    async graphqlQuery(query: string, applicationId?: string): Promise<any> {
        const queryString = JSON.stringify({ query });
        return this.query(queryString, applicationId);
    }

    /**
     * Execute GraphQL mutation (mock)
     */
    async graphqlMutation(mutation: string, applicationId?: string): Promise<any> {
        const mutationString = JSON.stringify({ query: mutation });

        // Handle increment mutation
        if (mutation.includes('increment')) {
            this.mockCounter++;
            console.log('Mock counter incremented to:', this.mockCounter);

            // Simulate notification after a short delay
            setTimeout(() => {
                this.triggerNotification({
                    reason: { NewBlock: { height: this.mockCounter } }
                });
            }, 500);

            return {
                data: {
                    increment: this.mockCounter
                }
            };
        }

        return this.query(mutationString, applicationId);
    }

    /**
     * Trigger notification (mock)
     */
    private triggerNotification(notification: any): void {
        console.log('Mock notification:', notification);
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
        this.state = {
            client: null,
            wallet: null,
            chainId: null,
            backend: null,
            initialized: false,
        };
        this.notificationCallbacks = [];
        this.mockCounter = 0;
    }
}

// Export singleton instance
export const lineraClient = new MockLineraClientService();
