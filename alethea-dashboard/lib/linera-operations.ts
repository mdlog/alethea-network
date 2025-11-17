/**
 * Linera Operations Client
 * 
 * This module provides functions to execute operations on Linera applications.
 * Since Linera SDK for JavaScript is not yet available, we use direct HTTP calls
 * to the Linera service to submit operations.
 */

// Latest deployment with Voter Selection
const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || '8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef';
const REGISTRY_ID = process.env.NEXT_PUBLIC_REGISTRY_ID || '9936172d5d1f3fb3ae65ea2bb51391afc561d9f8b80927c9e8e32c1efe9380d2';

// Backend API endpoint
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const USE_BACKEND_API = process.env.NEXT_PUBLIC_USE_BACKEND_API === 'true';

// Linera service endpoint
const LINERA_SERVICE_URL = process.env.NEXT_PUBLIC_LINERA_SERVICE_URL || 'http://localhost:8080';

// Mock mode for testing without wallet (set NEXT_PUBLIC_MOCK_MODE=true in .env.local)
const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

/**
 * Operation types for Oracle Registry v2
 */
export type RegisterVoterOperation = {
    RegisterVoter: {
        stake: string;
        name: string | null;
        metadata_url: string | null;
    };
};

export type CreateQueryOperation = {
    CreateQuery: {
        description: string;
        outcomes: string[];
        strategy: 'Majority' | 'Weighted' | 'Consensus';
        min_votes: number | null;
        reward_amount: string;
        deadline: string | null;
    };
};

export type SubmitVoteOperation = {
    SubmitVote: {
        query_id: number;
        value: string;
        confidence: number;
    };
};

export type Operation = RegisterVoterOperation | CreateQueryOperation | SubmitVoteOperation;

/**
 * Result of an operation execution
 */
export interface OperationResult {
    success: boolean;
    data?: any;
    error?: string;
    transactionHash?: string;
}

/**
 * Execute an operation on the Linera chain
 * 
 * Note: This is a simplified implementation. In production, you would:
 * 1. Use proper Linera SDK when available
 * 2. Handle wallet integration for signing
 * 3. Implement proper error handling
 * 4. Add transaction confirmation
 * 
 * @param operation - The operation to execute
 * @returns Result of the operation
 */
export async function executeOperation(operation: Operation): Promise<OperationResult> {
    try {
        // Mock mode for testing without wallet integration
        if (MOCK_MODE) {
            console.log('🧪 MOCK MODE: Simulating operation execution:', operation);

            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Return mock success response
            if ('RegisterVoter' in operation) {
                return {
                    success: true,
                    data: {
                        address: '0x88a3c9c9e4e1ece59dfe3acf520b5c88eee441a09343c9a2fb535a273028ed91',
                        stake: operation.RegisterVoter.stake,
                        name: operation.RegisterVoter.name,
                        reputation: 50,
                        reputationTier: 'Novice',
                        reputationWeight: 1.0,
                        totalVotes: 0,
                        correctVotes: 0,
                        isActive: true,
                        registeredAt: Date.now(),
                    },
                    transactionHash: 'mock-tx-' + Date.now(),
                };
            }

            // Generic mock response for other operations
            return {
                success: true,
                data: { message: 'Operation executed successfully (mock)' },
                transactionHash: 'mock-tx-' + Date.now(),
            };
        }

        // In a real implementation, this would:
        // 1. Connect to user's Linera wallet
        // 2. Sign the operation with user's private key
        // 3. Submit the signed transaction to the chain
        // 4. Wait for confirmation

        console.log('Operation to execute:', operation);

        // Attempt to call Linera service (this will likely fail without proper auth)
        const response = await fetch(`${LINERA_SERVICE_URL}/chains/${CHAIN_ID}/applications/${REGISTRY_ID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                operation: operation,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        return {
            success: true,
            data: data,
            transactionHash: 'mock-tx-hash', // Would be real tx hash in production
        };
    } catch (error) {
        console.error('Operation execution failed:', error);

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Register as a voter
 * 
 * @param stake - Amount to stake (in tokens)
 * @param name - Optional voter name
 * @returns Result of the registration
 */
export async function registerVoter(
    stake: string,
    name?: string
): Promise<OperationResult> {
    const operation: RegisterVoterOperation = {
        RegisterVoter: {
            stake,
            name: name || null,
            metadata_url: null,
        },
    };

    return executeOperation(operation);
}

/**
 * Create a new query
 * 
 * @param description - Query description
 * @param outcomes - Possible outcomes
 * @param strategy - Resolution strategy
 * @param rewardAmount - Reward for correct voters
 * @param minVotes - Minimum votes required (optional)
 * @returns Result of the query creation
 */
export async function createQuery(
    description: string,
    outcomes: string[],
    strategy: 'Majority' | 'Weighted' | 'Consensus',
    rewardAmount: string,
    minVotes?: number
): Promise<OperationResult> {
    const operation: CreateQueryOperation = {
        CreateQuery: {
            description,
            outcomes,
            strategy,
            min_votes: minVotes || null,
            reward_amount: rewardAmount,
            deadline: null, // Use default deadline
        },
    };

    return executeOperation(operation);
}

/**
 * Submit a vote on a query
 * 
 * @param queryId - Query ID to vote on
 * @param value - Vote value (must match one of the outcomes)
 * @param confidence - Confidence level (0-100)
 * @returns Result of the vote submission
 */
export async function submitVote(
    queryId: number,
    value: string,
    confidence: number
): Promise<OperationResult> {
    const operation: SubmitVoteOperation = {
        SubmitVote: {
            query_id: queryId,
            value,
            confidence,
        },
    };

    return executeOperation(operation);
}

/**
 * Check if Linera wallet is available
 * 
 * In production, this would check for browser wallet extension
 */
export function isWalletAvailable(): boolean {
    // Check if window.linera exists (hypothetical wallet extension)
    if (typeof window !== 'undefined') {
        return !!(window as any).linera;
    }
    return false;
}

/**
 * Connect to Linera wallet
 * 
 * In production, this would prompt user to connect their wallet
 */
export async function connectWallet(): Promise<{ address: string; chainId: string } | null> {
    // Mock implementation
    // In production, this would:
    // 1. Check for wallet extension
    // 2. Request connection
    // 3. Get user's address and chain

    if (typeof window !== 'undefined' && (window as any).linera) {
        try {
            const wallet = (window as any).linera;
            const accounts = await wallet.request({ method: 'linera_requestAccounts' });

            if (accounts && accounts.length > 0) {
                return {
                    address: accounts[0],
                    chainId: CHAIN_ID,
                };
            }
        } catch (error) {
            console.error('Wallet connection failed:', error);
        }
    }

    return null;
}
