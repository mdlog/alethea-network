/**
 * Composite Signer for Linera
 *
 * A signer implementation that tries multiple signers in series.
 * Used for auto-signing pattern where:
 * - An in-memory auto-signer handles background operations automatically
 * - MetaMask signer handles user-initiated mutations with approval
 */

import { Signer } from '@linera/client';

/**
 * A signer that combines multiple signers and uses the first one that has the requested key.
 *
 * Usage:
 * ```typescript
 * const autoSigner = PrivateKey.fromMnemonic(randomMnemonic);
 * const metamaskSigner = new MetaMaskSigner();
 * const composite = new CompositeSigner(autoSigner, metamaskSigner);
 *
 * // For background ops - uses autoSigner (if it's added as owner)
 * // For user mutations - pass { owner: metamaskAddress } to use MetaMask
 * ```
 */
export class CompositeSigner implements Signer {
    private signers: Signer[];

    constructor(...signers: Signer[]) {
        this.signers = signers;
    }

    /**
     * Sign a message using the first signer that contains the owner's key
     */
    async sign(owner: string, value: Uint8Array): Promise<string> {
        for (const signer of this.signers) {
            if (await signer.containsKey(owner)) {
                return await signer.sign(owner, value);
            }
        }
        throw new Error(`No signer found for owner ${owner}`);
    }

    /**
     * Check if any of the signers contain the owner's key
     */
    async containsKey(owner: string): Promise<boolean> {
        for (const signer of this.signers) {
            if (await signer.containsKey(owner)) {
                return true;
            }
        }
        return false;
    }
}

export default CompositeSigner;
