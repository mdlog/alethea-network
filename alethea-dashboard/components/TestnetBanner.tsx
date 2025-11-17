'use client';

import { useState, useEffect } from 'react';

export function TestnetBanner() {
    const [dismissed, setDismissed] = useState(false);
    const [isTestnet, setIsTestnet] = useState(false);

    useEffect(() => {
        // Check if running on testnet (not localhost)
        const graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL || '';
        const isLocal = graphqlUrl.includes('localhost') || graphqlUrl.includes('127.0.0.1');
        setIsTestnet(!isLocal);
    }, []);

    // Don't show banner if dismissed or on localhost
    if (dismissed || !isTestnet) return null;

    return (
        <div className="bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 border-b-2 border-yellow-400 shadow-sm">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between py-3">
                    <div className="flex items-start flex-1">
                        <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                                <svg
                                    className="h-6 w-6 text-yellow-900"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </div>
                        </div>
                        <div className="ml-4 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-yellow-900">
                                    TESTNET
                                </span>
                                <h3 className="text-sm font-bold text-gray-900">
                                    Running on Linera Conway Testnet
                                </h3>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">
                                <strong>⏳ Slow confirmations expected:</strong> Testnet validators create blocks slowly.
                                Your transactions are submitted successfully (certificate hash proves this) and will be processed.
                                This may take several minutes. <strong>This is normal testnet behavior.</strong>
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                                <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Transactions submitted
                                </span>
                                <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                    </svg>
                                    Waiting for validators
                                </span>
                                <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                                    </svg>
                                    Certificate hash provided
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                        <button
                            onClick={() => setDismissed(true)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors"
                            aria-label="Dismiss banner"
                        >
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
