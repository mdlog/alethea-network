/**
 * MetaMask Signer for Linera
 * Based on @linera/metamask from linera-protocol
 *
 * This signer uses MetaMask browser extension for signing transactions.
 * It follows the EIP-191 standard for message signing.
 */

import { ethers } from 'ethers';
import { Signer } from '@linera/client';

// Type for the ethereum provider injected by MetaMask
interface EthereumProvider {
    isMetaMask?: boolean;
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    on: (event: string, callback: (...args: unknown[]) => void) => void;
    removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
}

// Get the ethereum provider from window
function getEthereum(): EthereumProvider | undefined {
    if (typeof window === 'undefined') return undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).ethereum as EthereumProvider | undefined;
}

/**
 * Check if MetaMask is installed and available
 */
export function isMetaMaskAvailable(): boolean {
    const ethereum = getEthereum();
    return !!ethereum?.isMetaMask;
}

/**
 * MetaMask Signer implementation for Linera
 * Uses EIP-191 personal_sign for message signing
 */
export class MetaMaskSigner implements Signer {
    private provider: ethers.BrowserProvider;
    private _address: string | null = null;

    constructor() {
        const ethereum = getEthereum();
        if (!ethereum?.isMetaMask) {
            throw new Error('MetaMask is not available');
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.provider = new ethers.BrowserProvider(ethereum as any);
    }

    /**
     * Sign a message using MetaMask
     * @param owner - The address that should sign (must be connected to MetaMask)
     * @param value - The message bytes to sign
     * @returns The signature as a hex string
     */
    async sign(owner: string, value: Uint8Array): Promise<string> {
        const ethereum = getEthereum();
        if (!ethereum) {
            throw new Error('MetaMask is not available');
        }

        // Request accounts if not already connected
        const accounts = (await ethereum.request({
            method: 'eth_requestAccounts',
        })) as string[] | undefined;

        if (!accounts || accounts.length === 0) {
            throw new Error('No MetaMask accounts connected');
        }

        // Verify the requested signer is connected
        const connected = accounts.find(
            (acc) => acc.toLowerCase() === owner.toLowerCase()
        );
        if (!connected) {
            throw new Error(
                `MetaMask is not connected with the requested owner: ${owner}`
            );
        }

        // Encode message as hex string
        const msgHex = `0x${uint8ArrayToHex(value)}`;

        try {
            const signature = (await ethereum.request({
                method: 'personal_sign',
                params: [msgHex, owner],
            })) as string;

            if (!signature) {
                throw new Error('No signature returned');
            }

            return signature;
        } catch (err: unknown) {
            const error = err as { message?: string };
            throw new Error(
                `MetaMask signature request failed: ${error?.message || err}`
            );
        }
    }

    /**
     * Check if the specified address is connected to MetaMask
     */
    async containsKey(owner: string): Promise<boolean> {
        try {
            const accounts = await this.provider.send('eth_requestAccounts', []);
            return accounts.some(
                (acc: string) => acc.toLowerCase() === owner.toLowerCase()
            );
        } catch {
            return false;
        }
    }

    /**
     * Get the currently connected MetaMask account address
     */
    async address(): Promise<string> {
        if (this._address) {
            return this._address;
        }
        const signer = await this.provider.getSigner();
        this._address = await signer.getAddress();
        return this._address;
    }

    /**
     * Connect to MetaMask and return the connected address
     */
    static async connect(): Promise<MetaMaskSigner> {
        const ethereum = getEthereum();
        if (!ethereum?.isMetaMask) {
            throw new Error('MetaMask is not installed. Please install MetaMask extension.');
        }

        // Request account access
        const accounts = (await ethereum.request({
            method: 'eth_requestAccounts',
        })) as string[];

        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found. Please connect to MetaMask.');
        }

        const signer = new MetaMaskSigner();
        signer._address = accounts[0];
        return signer;
    }

    /**
     * Listen for account changes
     */
    static onAccountsChanged(callback: (accounts: string[]) => void): void {
        const ethereum = getEthereum();
        if (ethereum) {
            ethereum.on('accountsChanged', callback as (...args: unknown[]) => void);
        }
    }

    /**
     * Remove account change listener
     */
    static removeAccountsChangedListener(callback: (accounts: string[]) => void): void {
        const ethereum = getEthereum();
        if (ethereum) {
            ethereum.removeListener('accountsChanged', callback as (...args: unknown[]) => void);
        }
    }

    /**
     * Listen for chain/network changes
     */
    static onChainChanged(callback: (chainId: string) => void): void {
        const ethereum = getEthereum();
        if (ethereum) {
            ethereum.on('chainChanged', callback as (...args: unknown[]) => void);
        }
    }

    /**
     * Remove chain change listener
     */
    static removeChainChangedListener(callback: (chainId: string) => void): void {
        const ethereum = getEthereum();
        if (ethereum) {
            ethereum.removeListener('chainChanged', callback as (...args: unknown[]) => void);
        }
    }
}

/**
 * Convert Uint8Array to hex string
 */
function uint8ArrayToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map((b: number) => b.toString(16).padStart(2, '0'))
        .join('');
}

export default MetaMaskSigner;
