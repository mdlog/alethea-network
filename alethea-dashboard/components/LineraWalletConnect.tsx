'use client';

import { useState } from 'react';
import { useLineraClient } from '@/hooks/useLineraClient';

export default function LineraWalletConnect() {
    const { state, initialize, createWallet, loadWallet, isReady, error, loading } = useLineraClient();
    const [walletJson, setWalletJson] = useState('');
    const [showJsonInput, setShowJsonInput] = useState(false);

    const handleCreateWallet = async () => {
        try {
            const { chainId } = await createWallet();
            console.log('Connected to chain:', chainId);
        } catch (err) {
            console.error('Failed to connect:', err);
            alert('Failed to connect: ' + (err as Error).message);
        }
    };

    const handleLoadWallet = async () => {
        if (!walletJson.trim()) {
            alert('Please enter wallet JSON');
            return;
        }

        try {
            await loadWallet(walletJson);
            alert('Wallet loaded successfully!');
            setShowJsonInput(false);
            setWalletJson('');
        } catch (err) {
            console.error('Failed to load wallet:', err);
        }
    };

    const handleInitialize = async () => {
        try {
            await initialize();
        } catch (err) {
            console.error('Failed to initialize:', err);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Linera Wallet</h2>

            {/* Status */}
            <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${isReady ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-sm font-medium text-gray-700">
                        {isReady ? 'Connected' : 'Not Connected'}
                    </span>
                </div>

                {state.chainId && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                        <p className="text-xs text-gray-600 mb-1">Chain ID:</p>
                        <p className="text-sm font-mono text-blue-900 break-all">{state.chainId}</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}
            </div>

            {/* Actions */}
            {!state.initialized && (
                <button
                    onClick={handleInitialize}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors mb-2"
                >
                    {loading ? 'Initializing...' : 'Initialize Linera'}
                </button>
            )}

            {state.initialized && !state.wallet && (
                <>
                    <button
                        onClick={handleCreateWallet}
                        disabled={loading}
                        className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors mb-2"
                    >
                        {loading ? 'Connecting...' : 'Connect to Linera Service'}
                    </button>

                    <button
                        onClick={() => setShowJsonInput(!showJsonInput)}
                        className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors"
                    >
                        {showJsonInput ? 'Cancel' : 'Load Wallet from JSON'}
                    </button>

                    {showJsonInput && (
                        <div className="mt-4">
                            <textarea
                                value={walletJson}
                                onChange={(e) => setWalletJson(e.target.value)}
                                placeholder="Paste wallet JSON here..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                rows={6}
                            />
                            <button
                                onClick={handleLoadWallet}
                                disabled={loading || !walletJson.trim()}
                                className="w-full mt-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
                            >
                                {loading ? 'Loading...' : 'Load Wallet'}
                            </button>
                        </div>
                    )}
                </>
            )}

            {state.wallet && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium text-green-900">Wallet Connected</span>
                    </div>
                    <p className="text-sm text-green-700">
                        You can now interact with Linera applications
                    </p>
                </div>
            )}

            {/* Info */}
            <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                    Linera is a decentralized blockchain platform. Connect your wallet to interact with applications.
                </p>
            </div>
        </div>
    );
}
