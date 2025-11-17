// Linera Wallet Provider Integration
// Based on: https://linera.dev/developers/frontend/wallets.html
// Official Linera wallet provider interface

export interface LineraWalletProvider {
    // Connection
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;

    // Account
    getAccounts(): Promise<string[]>;
    getActiveAccount(): Promise<string | null>;

    // Signing
    signTransaction(transaction: any): Promise<any>;

    // Operations
    executeOperation(operation: any): Promise<any>;
}

export interface Operation {
    type: string;
    params: Record<string, any>;
}

export interface ExecutionResult {
    success: boolean;
    transactionHash?: string;
    blockHeight?: number;
    error?: string;
}

declare global {
    interface Window {
        linera?: LineraWalletProvider;
    }
}

/**
 * Check if Linera wallet is available
 */
export function isLineraWalletAvailable(): boolean {
    return typeof window !== 'undefined' &&
        typeof window.linera !== 'undefined';
}

/**
 * Get Linera wallet instance
 */
export function getLineraWallet(): LineraWalletProvider {
    if (!isLineraWalletAvailable()) {
        throw new Error('Linera wallet not found. Please install a Linera wallet extension.');
    }
    return window.linera!;
}

/**
 * Connect to Linera wallet
 */
export async function connectLineraWallet(): Promise<{
    accounts: string[];
    activeAccount: string;
}> {
    const wallet = getLineraWallet();

    // Request connection
    await wallet.connect();

    // Get accounts
    const accounts = await wallet.getAccounts();
    const activeAccount = await wallet.getActiveAccount();

    if (!activeAccount) {
        throw new Error('No active account found');
    }

    return {
        accounts,
        activeAccount,
    };
}

/**
 * Disconnect from wallet
 */
export async function disconnectLineraWallet(): Promise<void> {
    const wallet = getLineraWallet();
    await wallet.disconnect();
}

/**
 * Execute operation via Linera wallet
 */
export async function executeLineraOperation(
    operation: Operation
): Promise<ExecutionResult> {
    const wallet = getLineraWallet();

    if (!wallet.isConnected()) {
        throw new Error('Wallet not connected');
    }

    try {
        // Execute operation via wallet
        // The wallet will:
        // 1. Sign the operation
        // 2. Submit to chain
        // 3. Wait for confirmation
        const result = await wallet.executeOperation(operation);

        return {
            success: true,
            transactionHash: result.transactionHash,
            blockHeight: result.blockHeight,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Operation failed',
        };
    }
}

/**
 * Register voter with Linera wallet
 */
export async function registerVoterWithLineraWallet(
    stake: string,
    name?: string,
    metadataUrl?: string
): Promise<ExecutionResult> {
    const operation: Operation = {
        type: 'RegisterVoter',
        params: {
            stake,
            ...(name && { name }),
            ...(metadataUrl && { metadata_url: metadataUrl }),
        },
    };

    return await executeLineraOperation(operation);
}

/**
 * Update stake with Linera wallet
 */
export async function updateStakeWithLineraWallet(
    additionalStake: string
): Promise<ExecutionResult> {
    const operation: Operation = {
        type: 'UpdateStake',
        params: {
            additional_stake: additionalStake,
        },
    };

    return await executeLineraOperation(operation);
}

/**
 * Submit vote with Linera wallet
 */
export async function submitVoteWithLineraWallet(
    queryId: number,
    value: string,
    confidence?: number
): Promise<ExecutionResult> {
    const operation: Operation = {
        type: 'SubmitVote',
        params: {
            query_id: queryId,
            value,
            ...(confidence !== undefined && { confidence }),
        },
    };

    return await executeLineraOperation(operation);
}

/**
 * Claim rewards with Linera wallet
 */
export async function claimRewardsWithLineraWallet(): Promise<ExecutionResult> {
    const operation: Operation = {
        type: 'ClaimRewards',
        params: {},
    };

    return await executeLineraOperation(operation);
}

/**
 * Listen to account changes
 */
export function onAccountChanged(
    callback: (account: string | null) => void
): () => void {
    if (!isLineraWalletAvailable()) {
        return () => { };
    }

    const wallet = getLineraWallet();

    // Note: Actual event listener depends on wallet implementation
    // This is a placeholder for the standard interface
    const handleAccountChange = async () => {
        const account = await wallet.getActiveAccount();
        callback(account);
    };

    // Add event listener (implementation-specific)
    // wallet.on('accountChanged', handleAccountChange);

    return () => {
        // Remove event listener
        // wallet.off('accountChanged', handleAccountChange);
    };
}
