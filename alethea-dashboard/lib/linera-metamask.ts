// Linera MetaMask Integration
// Based on: https://github.com/linera-io/linera-protocol/tree/testnet_conway/examples/counter/metamask

import { ethers } from 'ethers';

/**
 * Linera Chain Configuration
 */
export interface LineraChainConfig {
    chainId: string;
    applicationId: string;
    serviceUrl: string;
}

/**
 * MetaMask Wallet State
 */
export interface MetaMaskWalletState {
    address: string;
    isConnected: boolean;
    provider: ethers.BrowserProvider;
    signer: ethers.JsonRpcSigner;
}

/**
 * Linera Operation
 */
export interface LineraOperation {
    [key: string]: any;
}

/**
 * Check if MetaMask is installed
 */
export function isMetaMaskInstalled(): boolean {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

/**
 * Connect to MetaMask
 */
export async function connectMetaMask(): Promise<MetaMaskWalletState> {
    if (!isMetaMaskInstalled()) {
        throw new Error('MetaMask is not installed. Please install MetaMask extension.');
    }

    try {
        if (!window.ethereum) {
            throw new Error('MetaMask ethereum object not found');
        }

        const provider = new ethers.BrowserProvider(window.ethereum);

        // Request account access
        await provider.send('eth_requestAccounts', []);

        // Get signer
        const signer = await provider.getSigner();

        // Get address
        const address = await signer.getAddress();

        return {
            address,
            isConnected: true,
            provider,
            signer,
        };
    } catch (error) {
        throw new Error(`Failed to connect to MetaMask: ${error}`);
    }
}

/**
 * Execute Linera operation via GraphQL mutation
 * This follows the pattern from the Counter example
 */
export async function executeLineraOperation(
    config: LineraChainConfig,
    operationName: string,
    operationArgs: Record<string, any>,
    wallet: MetaMaskWalletState
): Promise<any> {
    try {
        // Build GraphQL mutation
        const mutation = buildGraphQLMutation(operationName, operationArgs);

        console.log('Executing mutation:', mutation);

        // Send GraphQL request to Linera service
        const url = `${config.serviceUrl}/chains/${config.chainId}/applications/${config.applicationId}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: mutation,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.errors) {
            throw new Error(`GraphQL error: ${JSON.stringify(result.errors)}`);
        }

        return result.data;
    } catch (error) {
        console.error('Failed to execute operation:', error);
        throw error;
    }
}

/**
 * Build GraphQL mutation string
 */
function buildGraphQLMutation(
    operationName: string,
    args: Record<string, any>
): string {
    const argsString = Object.entries(args)
        .map(([key, value]) => {
            if (typeof value === 'string') {
                return `${key}: "${value}"`;
            } else if (typeof value === 'number') {
                return `${key}: ${value}`;
            } else if (value === null || value === undefined) {
                return null;
            } else {
                return `${key}: ${JSON.stringify(value)}`;
            }
        })
        .filter(Boolean)
        .join(', ');

    return `mutation { ${operationName}(${argsString}) }`;
}

/**
 * Register voter using MetaMask
 * Calls backend API to execute the operation
 */
export async function registerVoterWithMetaMask(
    config: LineraChainConfig,
    wallet: MetaMaskWalletState,
    stake: string,
    name?: string,
    metadataUrl?: string
): Promise<any> {
    try {
        // Call backend API to execute registration
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

        const requestBody: Record<string, any> = {
            stake,
        };

        if (name) {
            requestBody.name = name;
        }

        if (metadataUrl) {
            requestBody.metadata_url = metadataUrl;
        }

        // Build GraphQL mutation
        const args: string[] = [`stake: "${stake}"`];

        if (name) {
            args.push(`name: "${name}"`);
        }

        if (metadataUrl) {
            args.push(`metadataUrl: "${metadataUrl}"`);
        }

        const argsStr = args.join(', ');
        const mutation = `mutation { registerVoter(${argsStr}) }`;

        console.log('Executing GraphQL mutation:', mutation);

        // Send GraphQL request to Linera service
        const url = `${config.serviceUrl}/chains/${config.chainId}/applications/${config.applicationId}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: mutation,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.errors) {
            throw new Error(`GraphQL error: ${JSON.stringify(result.errors)}`);
        }

        // Parse the response - it returns instructions as a JSON string
        const data = result.data?.registerVoter;
        if (typeof data === 'string') {
            const parsed = JSON.parse(data);
            console.log('Registration instructions:', parsed);

            // In account-based Linera, mutations return instructions
            // The actual execution happens through operations/messages
            return {
                success: true,
                message: 'Registration request received. In account-based Linera, operations are queued for execution.',
                instructions: parsed
            };
        }

        return result.data;
    } catch (error) {
        console.error('Failed to register voter:', error);
        throw error;
    }
}

/**
 * Update stake using MetaMask
 */
export async function updateStakeWithMetaMask(
    config: LineraChainConfig,
    wallet: MetaMaskWalletState,
    additionalStake: string
): Promise<any> {
    return await executeLineraOperation(
        config,
        'updateStake',
        { additionalStake },
        wallet
    );
}

/**
 * Submit vote using MetaMask
 * Calls backend API to execute the operation
 */
export async function submitVoteWithMetaMask(
    config: LineraChainConfig,
    wallet: MetaMaskWalletState,
    queryId: number,
    value: string,
    confidence?: number
): Promise<any> {
    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

        const requestBody: Record<string, any> = {
            query_id: queryId,
            value,
        };

        if (confidence !== undefined) {
            requestBody.confidence = confidence;
        }

        const response = await fetch(`${backendUrl}/api/execute/submit-vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Backend API error (${response.status}): ${errorText}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Vote submission failed');
        }

        return result.data;
    } catch (error) {
        console.error('Failed to submit vote:', error);
        throw error;
    }
}

/**
 * Claim rewards using MetaMask
 */
export async function claimRewardsWithMetaMask(
    config: LineraChainConfig,
    wallet: MetaMaskWalletState
): Promise<any> {
    return await executeLineraOperation(
        config,
        'claimRewards',
        {},
        wallet
    );
}

/**
 * Query voters
 */
export async function queryVoters(
    config: LineraChainConfig
): Promise<any> {
    const url = `${config.serviceUrl}/chains/${config.chainId}/applications/${config.applicationId}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query: `{
        voters {
          address
          name
          stake
          reputation
          totalVotes
          correctVotes
        }
      }`,
        }),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
        throw new Error(`GraphQL error: ${JSON.stringify(result.errors)}`);
    }

    return result.data.voters;
}

/**
 * Query voter by address
 */
export async function queryVoter(
    config: LineraChainConfig,
    address: string
): Promise<any> {
    const url = `${config.serviceUrl}/chains/${config.chainId}/applications/${config.applicationId}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query: `{
        voter(address: "${address}") {
          address
          name
          stake
          lockedStake
          availableStake
          reputation
          reputationTier
          reputationWeight
          totalVotes
          correctVotes
          accuracyPercentage
        }
      }`,
        }),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
        throw new Error(`GraphQL error: ${JSON.stringify(result.errors)}`);
    }

    return result.data.voter;
}

/**
 * Get chain configuration from environment
 */
export function getChainConfig(): LineraChainConfig {
    return {
        chainId: process.env.NEXT_PUBLIC_CHAIN_ID || '',
        applicationId: process.env.NEXT_PUBLIC_APP_ID || '',
        serviceUrl: process.env.NEXT_PUBLIC_SERVICE_URL || 'http://localhost:8080',
    };
}

/**
 * Listen to MetaMask account changes
 */
export function onAccountsChanged(callback: (accounts: string[]) => void): () => void {
    if (!isMetaMaskInstalled()) {
        return () => { };
    }

    const handler = (accounts: string[]) => {
        callback(accounts);
    };

    if (window.ethereum) {
        window.ethereum.on('accountsChanged', handler);
    }

    return () => {
        if (window.ethereum) {
            window.ethereum.removeListener('accountsChanged', handler);
        }
    };
}

/**
 * Listen to MetaMask chain changes
 */
export function onChainChanged(callback: (chainId: string) => void): () => void {
    if (!isMetaMaskInstalled()) {
        return () => { };
    }

    const handler = (chainId: string) => {
        callback(chainId);
    };

    if (window.ethereum) {
        window.ethereum.on('chainChanged', handler);
    }

    return () => {
        if (window.ethereum) {
            window.ethereum.removeListener('chainChanged', handler);
        }
    };
}
