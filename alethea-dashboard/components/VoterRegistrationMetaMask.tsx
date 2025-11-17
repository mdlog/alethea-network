'use client';

import { useState, useEffect } from 'react';
import {
    connectMetaMask,
    registerVoterWithMetaMask,
    getChainConfig,
    isMetaMaskInstalled,
    onAccountsChanged,
    type MetaMaskWalletState
} from '@/lib/linera-metamask';

interface VoterRegistrationProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function VoterRegistrationMetaMask({ onSuccess, onCancel }: VoterRegistrationProps) {
    const [stake, setStake] = useState('1000');
    const [name, setName] = useState('');
    const [metadataUrl, setMetadataUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [certificateHash, setCertificateHash] = useState<string | null>(null);
    const [walletConnected, setWalletConnected] = useState(false);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [wallet, setWallet] = useState<MetaMaskWalletState | null>(null);
    const [hasMetaMask, setHasMetaMask] = useState(false);

    // Check MetaMask availability on mount
    useEffect(() => {
        setHasMetaMask(isMetaMaskInstalled());
    }, []);

    // Listen to account changes
    useEffect(() => {
        if (!hasMetaMask) return;

        const unsubscribe = onAccountsChanged((accounts) => {
            if (accounts.length === 0) {
                // User disconnected
                setWalletConnected(false);
                setWalletAddress(null);
                setWallet(null);
            } else {
                // Account changed
                setWalletAddress(accounts[0]);
            }
        });

        return unsubscribe;
    }, [hasMetaMask]);

    const handleConnectWallet = async () => {
        try {
            const walletState = await connectMetaMask();

            setWallet(walletState);
            setWalletAddress(walletState.address);
            setWalletConnected(true);
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
            if (!walletConnected || !wallet) {
                throw new Error('Please connect your wallet first');
            }

            // Validate inputs
            const stakeAmount = parseFloat(stake);
            if (isNaN(stakeAmount) || stakeAmount < 100) {
                throw new Error('Stake must be at least 100 tokens');
            }

            // Get chain configuration
            const config = getChainConfig();

            console.log('Registering voter with config:', config);
            console.log('Wallet address:', walletAddress);

            // Use backend API if available, otherwise show account-based message
            const useBackendAPI = process.env.NEXT_PUBLIC_USE_BACKEND_API === 'true';
            const backendURL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

            if (useBackendAPI) {
                // Register via backend API (handles account-based execution)
                // Use transaction executor endpoint (requires contract with executeRegisterVoterFor mutation)
                // If you get "Unknown field" error, run: ./redeploy_registry_with_admin_voter.sh
                console.log('Registering via backend API (transaction executor):', backendURL);

                const response = await fetch(`${backendURL}/api/transaction/register-voter`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        voter_address: walletAddress,
                        stake: stake,
                        name: name || undefined,
                        metadata_url: metadataUrl || undefined,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                    throw new Error(errorData.error || `Backend API error: ${response.status}`);
                }

                const result = await response.json();
                console.log('Backend API result:', result);

                // Transaction executor returns: 
                // { success: true, data: { success: true, certificate_hash: "...", message: "...", voter_address: "..." }, error: null }
                if (result.success && result.data) {
                    const txResult = result.data;
                    if (txResult.certificate_hash) {
                        console.log('Registration successful! Certificate:', txResult.certificate_hash);
                        setCertificateHash(txResult.certificate_hash);
                        setSuccess(true);
                        setError(null);
                        if (onSuccess) {
                            setTimeout(() => onSuccess(), 2000);
                        }
                    } else {
                        throw new Error('Registration completed but no certificate hash received');
                    }
                } else if (result.error) {
                    throw new Error(result.error);
                } else {
                    throw new Error('Registration completed but no certificate hash received');
                }
            } else {
                // Fallback: Direct GraphQL (will show account-based message)
                const result = await registerVoterWithMetaMask(
                    config,
                    wallet,
                    stake,
                    name || undefined,
                    metadataUrl || undefined
                );

                console.log('Registration result:', result);

                // Check if result contains instructions (account-based pattern)
                if (result.instructions) {
                    console.log('Account-based operation prepared:', result.instructions);
                    setError(
                        `⚠️ Account-Based Execution: Your registration has been prepared but not yet executed. ` +
                        `Backend API is not available. Please enable backend API in .env.local: ` +
                        `NEXT_PUBLIC_USE_BACKEND_API=true and start the backend server on port 3001.`
                    );
                    return;
                }

                setSuccess(true);
                if (onSuccess) {
                    setTimeout(() => onSuccess(), 2000);
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed');
            console.error('Registration error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Register as Voter
            </h2>

            {/* MetaMask Status */}
            {!hasMetaMask && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800 mb-2">
                        ❌ <strong>MetaMask Not Found</strong>
                    </p>
                    <p className="text-xs text-red-600">
                        Please install MetaMask extension to continue.
                    </p>
                    <a
                        href="https://metamask.io/download/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs text-red-700 hover:text-red-900 underline"
                    >
                        Download MetaMask →
                    </a>
                </div>
            )}

            {/* Wallet Connection Status */}
            <div className="mb-6">
                {!walletConnected ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800 mb-3">
                            🔐 <strong>Wallet Required:</strong> Connect MetaMask to register as a voter.
                        </p>
                        <button
                            onClick={handleConnectWallet}
                            disabled={!hasMetaMask}
                            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            Connect MetaMask
                        </button>
                        <p className="text-xs text-yellow-600 mt-2">
                            Following Linera Counter example pattern
                        </p>
                    </div>
                ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-green-800 font-medium">
                                ✅ MetaMask Connected
                            </p>
                        </div>
                        <p className="text-xs text-green-600 font-mono truncate">
                            {walletAddress}
                        </p>
                        <button
                            onClick={() => {
                                setWalletConnected(false);
                                setWalletAddress(null);
                                setWallet(null);
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
                        disabled={isSubmitting || !walletConnected}
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
                    </div>
                )}

                {/* Success Message */}
                {success && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-800 font-semibold mb-2">
                            ✅ Registration successful!
                        </p>
                        {certificateHash && (
                            <div className="mt-2 bg-white rounded p-2 border border-green-300">
                                <p className="text-xs text-gray-600 mb-1">Certificate Hash:</p>
                                <p className="text-xs font-mono text-gray-800 break-all">
                                    {certificateHash}
                                </p>
                            </div>
                        )}
                        <p className="text-xs text-green-700 mt-2">
                            Redirecting to voters page...
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
                        {isSubmitting ? 'Registering...' : walletConnected ? 'Register Voter' : 'Connect Wallet First'}
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
                    ℹ️ About This Implementation
                </h3>
                <ul className="text-xs text-blue-800 space-y-1">
                    <li>• Uses Backend API for account-based execution</li>
                    <li>• Backend handles transaction signing and submission</li>
                    <li>• Returns certificate hash as proof</li>
                    <li>• Follows Linera account-based model</li>
                </ul>
            </div>

            {/* Backend Status */}
            <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-xs text-purple-800">
                    <strong>🔧 Backend API:</strong> {process.env.NEXT_PUBLIC_USE_BACKEND_API === 'true' ? (
                        <span className="text-green-700">✓ Enabled</span>
                    ) : (
                        <span className="text-red-700">✗ Disabled</span>
                    )}
                    {' '}({process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'})
                </p>
                {process.env.NEXT_PUBLIC_USE_BACKEND_API !== 'true' && (
                    <p className="text-xs text-purple-700 mt-1">
                        Enable backend API in .env.local for account-based execution
                    </p>
                )}
            </div>
        </div>
    );
}
