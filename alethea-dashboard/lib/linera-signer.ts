// Linera Signer Implementation
// Based on: https://github.com/linera-io/linera-protocol/blob/testnet_conway/linera-web/docs/interfaces/Signer.md

/**
 * Linera Signer Interface
 * 
 * The Signer interface is used to sign operations and messages in Linera.
 * It provides methods for:
 * - Getting the public key
 * - Signing bytes
 * - Verifying signatures
 */

export interface LineraPublicKey {
    bytes: Uint8Array;
    toString(): string;
}

export interface LineraSignature {
    bytes: Uint8Array;
    toString(): string;
}

export interface LineraSigner {
    /**
     * Get the public key of the signer
     */
    publicKey(): Promise<LineraPublicKey>;

    /**
     * Sign a message (bytes)
     * @param message - The message to sign as Uint8Array
     * @returns The signature
     */
    sign(message: Uint8Array): Promise<LineraSignature>;

    /**
     * Verify a signature
     * @param message - The original message
     * @param signature - The signature to verify
     * @returns true if signature is valid
     */
    verify(message: Uint8Array, signature: LineraSignature): Promise<boolean>;
}

/**
 * Linera Chain Owner
 * Represents an owner of a chain in Linera
 */
export interface LineraChainOwner {
    publicKey: LineraPublicKey;
    toString(): string;
}

/**
 * Linera Operation
 * Represents an operation to be executed on a Linera application
 */
export interface LineraOperation {
    chainId: string;
    applicationId: string;
    operation: any;
    timestamp?: number;
}

/**
 * Check if Linera wallet is available
 */
export function isLineraWalletAvailable(): boolean {
    return typeof window !== 'undefined' &&
        'linera' in window &&
        typeof (window as any).linera !== 'undefined';
}

/**
 * Get Linera wallet instance
 */
export function getLineraWallet(): any {
    if (!isLineraWalletAvailable()) {
        throw new Error('Linera wallet not found. Please install Linera wallet extension.');
    }
    return (window as any).linera;
}

/**
 * Connect to Linera wallet
 */
export async function connectLineraWallet(): Promise<{
    signer: LineraSigner;
    publicKey: LineraPublicKey;
    address: string;
}> {
    const linera = getLineraWallet();

    // Request connection
    await linera.connect();

    // Get signer
    const signer: LineraSigner = await linera.getSigner();

    // Get public key
    const publicKey = await signer.publicKey();

    // Convert public key to address string
    const address = publicKey.toString();

    return {
        signer,
        publicKey,
        address,
    };
}

/**
 * Sign a Linera operation
 */
export async function signLineraOperation(
    signer: LineraSigner,
    operation: LineraOperation
): Promise<{
    operation: LineraOperation;
    signature: LineraSignature;
    publicKey: LineraPublicKey;
}> {
    // Serialize operation to bytes
    const operationJson = JSON.stringify(operation);
    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(operationJson);

    // Sign with Linera signer
    const signature = await signer.sign(messageBytes);

    // Get public key
    const publicKey = await signer.publicKey();

    return {
        operation,
        signature,
        publicKey,
    };
}

/**
 * Verify a signature
 */
export async function verifySignature(
    signer: LineraSigner,
    operation: LineraOperation,
    signature: LineraSignature
): Promise<boolean> {
    const operationJson = JSON.stringify(operation);
    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(operationJson);

    return await signer.verify(messageBytes, signature);
}

/**
 * Register voter with Linera signer
 */
export async function registerVoterWithLineraSigner(
    signer: LineraSigner,
    stake: string,
    name?: string,
    metadataUrl?: string
): Promise<any> {
    const chainId = process.env.NEXT_PUBLIC_CHAIN_ID!;
    const appId = process.env.NEXT_PUBLIC_APP_ID!;

    // Create operation
    const operation: LineraOperation = {
        chainId,
        applicationId: appId,
        operation: {
            RegisterVoter: {
                stake,
                ...(name && { name }),
                ...(metadataUrl && { metadata_url: metadataUrl }),
            },
        },
        timestamp: Date.now(),
    };

    // Sign operation
    const signed = await signLineraOperation(signer, operation);

    // Submit to backend
    const response = await fetch('http://localhost:3001/api/submit-linera-signed', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            operation: signed.operation,
            signature: signed.signature.toString(),
            publicKey: signed.publicKey.toString(),
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit operation');
    }

    return await response.json();
}

/**
 * Fallback: Use MetaMask as temporary signer
 * This is a temporary solution until Linera wallet is available
 */
export class MetaMaskLineraSigner implements LineraSigner {
    private provider: any;
    private signer: any;

    constructor(provider: any, signer: any) {
        this.provider = provider;
        this.signer = signer;
    }

    async publicKey(): Promise<LineraPublicKey> {
        const address = await this.signer.getAddress();
        const encoder = new TextEncoder();
        const bytes = encoder.encode(address);

        return {
            bytes,
            toString: () => address,
        };
    }

    async sign(message: Uint8Array): Promise<LineraSignature> {
        // Convert bytes to hex string for MetaMask
        const decoder = new TextDecoder();
        const messageStr = decoder.decode(message);

        // Sign with MetaMask
        const signature = await this.signer.signMessage(messageStr);

        // Convert signature to bytes
        const encoder = new TextEncoder();
        const bytes = encoder.encode(signature);

        return {
            bytes,
            toString: () => signature,
        };
    }

    async verify(message: Uint8Array, signature: LineraSignature): Promise<boolean> {
        // For MetaMask, we trust the signature
        // In production, this should verify using ethers.js
        return true;
    }
}

/**
 * Get signer (Linera or MetaMask fallback)
 */
export async function getSigner(): Promise<{
    signer: LineraSigner;
    address: string;
    isLinera: boolean;
}> {
    // Try Linera wallet first
    if (isLineraWalletAvailable()) {
        const { signer, address } = await connectLineraWallet();
        return {
            signer,
            address,
            isLinera: true,
        };
    }

    // Fallback to MetaMask
    if (typeof window !== 'undefined' && window.ethereum) {
        const { ethers } = await import('ethers');
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send('eth_requestAccounts', []);
        const ethersSigner = await provider.getSigner();
        const address = await ethersSigner.getAddress();

        const signer = new MetaMaskLineraSigner(provider, ethersSigner);

        return {
            signer,
            address,
            isLinera: false,
        };
    }

    throw new Error('No wallet found. Please install Linera wallet or MetaMask.');
}
