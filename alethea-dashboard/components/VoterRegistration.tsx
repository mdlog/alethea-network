'use client';

import { useState, useEffect } from 'react';
import {
    getSigner,
    registerVoterWithLineraSigner,
    isLineraWalletAvailable,
    type LineraSigner
} from '@/lib/linera-signer';

interface VoterRegistrationProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function VoterRegistration({ onSuccess, onCancel }: VoterRegistrationProps) {
    const [stake, setStake] = useState('1000');
    const [name, setName] = useState('');
    const [metadataUrl, setMetadataUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [walletConnected, setWalletConnected] = useState(false);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [signer, setSigner] = useState<LineraSigner | null>(null);
    const [isLineraWallet, setIsLineraWallet] = useState(false);

    // Check wallet availability on mount
    useEffect(() => {
        const hasLinera = isLineraWalletAvailable();
        setIsLineraWallet(hasLinera);
    }, []);

    const handleConnectWallet = async () => {
        try {
            const { signer: newSigner, address, isLinera } = await getSigner();

            setSigner(newSigner);
            setWalletAddress(address);
            setWalletConnected(true);
            setIsLineraWallet(isLinera);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to connect wallet');
            console.error(err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        setIsSubmitting(true);

        try {
            // Check wallet connection
            if (!walletConnected || !signer) {
                throw new Error('Please connect your wallet first');
            }

            // Validate inputs
            const stakeAmount = parseFloat(stake);
            if (isNaN(stakeAmount) || stakeAmount < 100) {
                throw new Error('Stake must be at least 100 tokens');
            }

            // Register voter with Linera signer
            const result = await registerVoterWithLineraSigner(
                signer,
                stake,
                name || undefined,
                metadataUrl || undefined
            );

            if (result.success) {
                setSuccess(true);
                if (onSuccess) {
                    setTimeout(() => onSuccess(), 2000);
                }
            } else {
                throw new Error(result.error || 'Registration failed');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Register as Voter
            </h2>

            {/* Wallet Connection Status */}
            <div className="mb-6">
                {!walletConnected ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800 mb-3">
                            🔐 <strong>Wallet Required:</strong> Connect your wallet to register as a voter.
                        </p>
                        <button
                            onClick={handleConnectWallet}
                            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            {isLineraWallet ? 'Connect Linera Wallet' : 'Connect Wallet (MetaMask Fallback)'}
                        </button>
                        <p className="text-xs text-yellow-600 mt-2">
                            {isLineraWallet
                                ? 'Linera wallet detected. Click to connect.'
                                : 'Linera wallet not found. Will use MetaMask as fallback.'}
                        </p>
                    </div>
                ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-green-800 font-medium">
                                ✅ {isLineraWallet ? 'Linera Wallet' : 'MetaMask (Fallback)'} Connected
                            </p>
                            {!isLineraWallet && (
                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                    Fallback Mode
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-green-600 font-mono truncate">
                            {walletAddress}
                        </p>
                        <button
                            onClick={() => {
                                setWalletConnected(false);
                                setWalletAddress(null);
                                setSigner(null);
                            }}
                            className="mt-2 text-xs text-green-700 hover:text-green-900 underline"
                        >
                            Disconnect
                        </button>
                    </div>
                )}
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="stake" className="block text-sm font-medium text-gray-700 mb-1">
                        Stake Amount (tokens) *
                    </label>
                    <input
                        type="number"
                        id="stake"
                        value={stake}
                        onChange={(e) => setStake(e.target.value)}
                        min="100"
                        step="1"
                        required
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="1000"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Minimum: 100 tokens
                    </p>
                </div>

                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Voter Name (optional)
                    </label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isSubmitting || !walletConnected}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="e.g., Alice"
                        maxLength={50}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Display name for leaderboard
                    </p>
                </div>

                <div>
                    <label htmlFor="metadataUrl" className="block text-sm font-medium text-gray-700 mb-1">
                        Metadata URL (optional)
                    </label>
                    <input
                        type="url"
                        id="metadataUrl"
                        value={metadataUrl}
                        onChange={(e) => setMetadataUrl(e.target.value)}
                        disabled={isSubmitting || !walletConnected}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="https://example.com/profile"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Link to your profile or additional information
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800">
                            ❌ {error}
                        </p>
                        {error.includes('wallet') && (
                            <p className="text-xs text-red-600 mt-2">
                                Note: Linera wallet extension is not yet available. This is a demonstration of the UI.
                                In production, users would connect their Linera wallet to register.
                            </p>
                        )}
                    </div>
                )}

                {/* Success Message */}
                {success && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-800">
                            ✅ Registration successful! Redirecting...
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={isSubmitting || success || !walletConnected}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                    >
                        {isSubmitting ? 'Signing & Submitting...' : walletConnected ? 'Sign & Register' : 'Connect Wallet First'}
                    </button>
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isSubmitting}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>

            {/* Information Box */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                    ℹ️ About Voter Registration
                </h3>
                <ul className="text-xs text-blue-800 space-y-1">
                    <li>• Registration takes ~30 seconds</li>
                    <li>• Minimum stake: 100 tokens</li>
                    <li>• Start with 50 reputation (Novice tier)</li>
                    <li>• Earn rewards for correct votes</li>
                    <li>• Build reputation over time</li>
                </ul>
            </div>

            {/* Wallet Integration Note */}
            <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-xs text-purple-800">
                    <strong>🔐 Wallet Integration:</strong> This registration uses MetaMask for transaction signing.
                    Your wallet signature proves ownership and authorizes the registration on the Linera blockchain.
                </p>
            </div>
        </div>
    );
}
