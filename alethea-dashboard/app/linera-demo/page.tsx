'use client';

import Header from '@/components/Header';
import LineraWalletConnect from '@/components/LineraWalletConnect';
import LineraCounterDemo from '@/components/LineraCounterDemo';

export default function LineraDemo() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
            <Header />

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Page Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">
                            Linera Integration Demo
                        </h1>
                        <p className="text-lg text-gray-600">
                            Connect to Linera blockchain and interact with applications
                        </p>
                    </div>

                    {/* Info Banner */}
                    <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-6 mb-8">
                        <div className="flex items-start gap-3">
                            <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <h3 className="font-semibold text-blue-900 mb-1">About This Demo</h3>
                                <p className="text-sm text-blue-800">
                                    This page demonstrates the integration of Linera client library with the Alethea dashboard.
                                    You can create a wallet from the testnet faucet or load an existing wallet to interact with
                                    Linera applications.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Wallet Connection */}
                        <div>
                            <LineraWalletConnect />
                        </div>

                        {/* Counter Demo */}
                        <div>
                            <LineraCounterDemo />
                        </div>
                    </div>

                    {/* Features Section */}
                    <div className="mt-8 bg-white rounded-xl shadow-md p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Features</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-1">WebAssembly Integration</h3>
                                    <p className="text-sm text-gray-600">
                                        Linera client runs directly in the browser using WebAssembly
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-1">Real-time Notifications</h3>
                                    <p className="text-sm text-gray-600">
                                        Receive instant updates when chain state changes
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-1">Wallet Management</h3>
                                    <p className="text-sm text-gray-600">
                                        Create new wallets or import existing ones
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-1">GraphQL Interface</h3>
                                    <p className="text-sm text-gray-600">
                                        Query and mutate application state using GraphQL
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Documentation Link */}
                    <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold mb-2">Learn More</h3>
                                <p className="text-blue-100">
                                    Check out the Linera documentation to learn more about building decentralized applications
                                </p>
                            </div>
                            <a
                                href="https://linera.dev"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-semibold transition-colors whitespace-nowrap"
                            >
                                View Docs →
                            </a>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
