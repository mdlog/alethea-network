// Linera Wallet Integration
// Handles wallet connection and transaction signing for Linera blockchain

import { walletManager } from './wallet';

export interface LineraTransaction {
    chainId: string;
    applicationId: string;
    operation: any;
    timestamp: number;
}

export interface SignedTransaction {
    transaction: LineraTransaction;
    signature: string;
    signer: string;
}

/**
 * Sign a Linera transaction with connected wallet
 */
export async function signLineraTransaction(
    chainId: string,
    applicationId: string,
    operation: any
): Promise<SignedTransaction> {
    const walletState = walletManager.getState();

    if (!walletState.isConnected || !walletState.signer) {
        throw new Error('Wallet not connected');
    }

    // Create transaction object
    const transaction: LineraTransaction = {
        chainId,
        applicationId,
        operation,
        timestamp: Date.now(),
    };

    // Create message to sign
    const message = JSON.stringify(transaction);

    // Sign with wallet
    const signature = await walletManager.signMessage(message);

    return {
        transaction,
        signature,
        signer: walletState.address!,
    };
}

/**
 * Submit signed transaction to Linera backend
 */
export async function submitSignedTransaction(
    signedTx: SignedTransaction,
    backendUrl: string = 'http://localhost:3001'
): Promise<any> {
    const response = await fetch(`${backendUrl}/api/submit-signed`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(signedTx),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit transaction');
    }

    return await response.json();
}

/**
 * Register voter with wallet signature
 */
export async function registerVoterWithWallet(
    stake: string,
    name?: string,
    metadataUrl?: string
): Promise<any> {
    const chainId = process.env.NEXT_PUBLIC_CHAIN_ID!;
    const appId = process.env.NEXT_PUBLIC_APP_ID!;

    // Create operation
    const operation = {
        RegisterVoter: {
            stake,
            ...(name && { name }),
            ...(metadataUrl && { metadata_url: metadataUrl }),
        },
    };

    // Sign transaction
    const signedTx = await signLineraTransaction(chainId, appId, operation);

    // Submit to backend
    return await submitSignedTransaction(signedTx);
}

/**
 * Prepare transaction for wallet signing (without submitting)
 */
export async function prepareTransaction(
    operation: any,
    backendUrl: string = 'http://localhost:3001'
): Promise<LineraTransaction> {
    const response = await fetch(`${backendUrl}/api/prepare-transaction`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(operation),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to prepare transaction');
    }

    const result = await response.json();
    return result.data;
}
