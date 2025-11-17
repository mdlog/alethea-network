'use client';

import { useState, useEffect } from 'react';

interface WalletInfoProps {
    chainId?: string;
}

interface WalletData {
    address: string;
    balance: string;
    chainId: string;
}

export default function WalletInfo({ chainId }: WalletInfoProps) {
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        loadWalletInfo();
    }, [chainId]);

    const loadWalletInfo = async () => {
        setLoading(true);
        setError(null);

        try {
            const currentChainId = chainId || process.env.NEXT_PUBLIC_CHAIN_ID;

            if (!currentChainId) {
                throw new Error('Chain ID not configured');
            }

            // Query chain info to get owner address and balance
            const response = await fetch(
                `http://localhost:8080/chains/${currentChainId}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        query: `
                            query {
                                chain {
                                    chainId
                                    executionState {
                                        system {
                                            balance
                                            owner
                                        }
                                    }
                                }
                            }
                        `
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();

            if (result.errors) {
                throw new Error(result.errors[0].message);
            }

            const chainData = result.data?.chain;
            if (!chainData) {
                throw new Error('No chain data returned');
            }

            const owner = chainData.executionState?.system?.owner || 'Unknown';
            const balance = chainData.executionState?.system?.balance || '0';

            setWallet({
                address: owner,
                balance: balance,
                chainId: currentChainId,
            });
        } catch (err: any) {
            console.error('Error loading wallet info:', err);
            setError(err.message || 'Failed to load wallet info');
        } finally {
            setLoading(false);
        }
    };

    const formatAddress = (address: string) => {
        if (address.length <= 16) return address;
        return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
    };

    const formatBalance = (balance: string) => {
        try {
            const num = parseFloat(balance);
            if (isNaN(num)) return '0';
            return num.toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
            });
        } catch {
            return '0';
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // You could add a toast notification here
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 rounded-lg shadow-md p-4 border border-red-200">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-red-800">Wallet Error</p>
                        <p className="text-xs text-red-600">{error}</p>
                    </div>
                    <button
                        onClick={loadWalletInfo}
                        className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!wallet) {
        return null;
    }

    return (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow-md p-4 border border-blue-200">
            <div className="flex items-center gap-3">
                {/* Wallet Icon */}
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                </div>

                {/* Wallet Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs font-medium text-gray-600">Wallet Address</p>
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-blue-600 hover:text-blue-700 transition-colors"
                        >
                            <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-mono text-gray-900 truncate">
                            {isExpanded ? wallet.address : formatAddress(wallet.address)}
                        </p>
                        <button
                            onClick={() => copyToClipboard(wallet.address)}
                            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                            title="Copy address"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Balance */}
                <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium text-gray-600 mb-1">Balance</p>
                    <p className="text-lg font-bold text-gray-900">
                        {formatBalance(wallet.balance)}
                    </p>
                    <p className="text-xs text-gray-500">tokens</p>
                </div>

                {/* Refresh Button */}
                <button
                    onClick={loadWalletInfo}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex-shrink-0"
                    title="Refresh wallet info"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {/* Expanded Info */}
            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                    <div className="grid grid-cols-1 gap-2 text-xs">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Chain ID:</span>
                            <span className="font-mono text-gray-900">{formatAddress(wallet.chainId)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Network:</span>
                            <span className="text-gray-900">Conway Testnet</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
