'use client';

import { useState } from 'react';
import { useRegisterVoter } from '@/hooks/useRegisterVoter';

interface VoterRegistrationWithPollingProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function VoterRegistrationWithPolling({
    onSuccess,
    onCancel
}: VoterRegistrationWithPollingProps) {
    const [address, setAddress] = useState('');
    const [stake, setStake] = useState('100');
    const [name, setName] = useState('');

    const { status, certificateHash, error, progress, register, reset } = useRegisterVoter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await register(address, stake, name);
    };

    const handleReset = () => {
        reset();
        if (status === 'confirmed' && onSuccess) {
            onSuccess();
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Register as Voter</h2>

            {/* Form - Idle State */}
            {status === 'idle' && (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Wallet Address *
                        </label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0x..."
                            required
                            pattern="0x[a-fA-F0-9]{64}"
                            title="Must be a valid hex address (0x followed by 64 hex characters)"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Enter your Linera wallet address
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Stake Amount (tokens) *
                        </label>
                        <input
                            type="number"
                            value={stake}
                            onChange={(e) => setStake(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="100"
                            required
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Minimum stake: 100 tokens
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Your name"
                            required
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                        >
                            Register
                        </button>
                        {onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            )}

            {/* Submitting State */}
            {status === 'submitting' && (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-lg font-medium text-gray-900">Submitting to blockchain...</p>
                    <p className="text-sm text-gray-500 mt-2">Please wait</p>
                </div>
            )}

            {/* Pending State */}
            {status === 'pending' && (
                <div className="text-center py-12">
                    <div className="text-green-600 text-6xl mb-4">✓</div>
                    <p className="text-lg font-medium text-gray-900 mb-2">Submitted!</p>
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <p className="text-xs text-gray-500 mb-1">Certificate Hash:</p>
                        <p className="text-sm font-mono text-gray-700 break-all">
                            {certificateHash}
                        </p>
                    </div>
                    <p className="text-sm text-gray-600">
                        Waiting for confirmation...
                    </p>
                </div>
            )}

            {/* Confirming State */}
            {status === 'confirming' && (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-lg font-medium text-gray-900 mb-2">Confirming...</p>

                    <div className="max-w-md mx-auto mb-4">
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                                className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                            {Math.round(progress)}% - Polling for confirmation
                        </p>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
                        <p className="text-xs text-yellow-800">
                            ⏳ This may take a few minutes on testnet due to slow block creation.
                            Your registration is queued and will be processed.
                        </p>
                    </div>
                </div>
            )}

            {/* Confirmed State */}
            {status === 'confirmed' && (
                <div className="text-center py-12">
                    <div className="text-green-600 text-6xl mb-4">🎉</div>
                    <p className="text-2xl font-bold text-gray-900 mb-2">Registration Confirmed!</p>
                    <p className="text-gray-600 mb-6">
                        You are now registered as a voter
                    </p>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
                        <p className="text-sm text-green-800">
                            <strong>Name:</strong> {name}<br />
                            <strong>Stake:</strong> {stake} tokens<br />
                            <strong>Status:</strong> Active
                        </p>
                    </div>
                    <button
                        onClick={handleReset}
                        className="bg-blue-600 text-white px-8 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                        Done
                    </button>
                </div>
            )}

            {/* Timeout State */}
            {status === 'timeout' && (
                <div className="text-center py-12">
                    <div className="text-yellow-600 text-6xl mb-4">⏳</div>
                    <p className="text-2xl font-bold text-gray-900 mb-2">Still Pending</p>
                    <p className="text-gray-600 mb-4">
                        Your registration is queued on the blockchain
                    </p>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 max-w-md mx-auto text-left">
                        <p className="text-sm text-yellow-800 mb-2">
                            <strong>What happened?</strong>
                        </p>
                        <p className="text-xs text-yellow-700 mb-3">
                            Your registration was submitted successfully (certificate hash proves this),
                            but testnet validators are slow to create blocks. Your registration will be
                            processed eventually.
                        </p>
                        <p className="text-xs text-gray-600 font-mono break-all">
                            Certificate: {certificateHash}
                        </p>
                    </div>

                    <p className="text-sm text-gray-600 mb-6">
                        You can check back later or continue using the app.
                    </p>

                    <button
                        onClick={handleReset}
                        className="bg-blue-600 text-white px-8 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                        OK
                    </button>
                </div>
            )}

            {/* Error State */}
            {status === 'error' && (
                <div className="text-center py-12">
                    <div className="text-red-600 text-6xl mb-4">✗</div>
                    <p className="text-2xl font-bold text-gray-900 mb-2">Registration Failed</p>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                    <button
                        onClick={handleReset}
                        className="bg-blue-600 text-white px-8 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            )}
        </div>
    );
}
