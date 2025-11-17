'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import WalletInfo from './WalletInfo';
import { useWallet } from '@/hooks/useWallet';

interface HeaderProps {
    onRefresh?: () => void;
    isRefreshing?: boolean;
    lastUpdate?: Date | null;
    onCreateMarket?: () => void;
}

export default function Header({ onRefresh, isRefreshing, lastUpdate, onCreateMarket }: HeaderProps) {
    const [showWallet, setShowWallet] = useState(false);
    const { address, isConnected, connect, disconnect, isConnecting } = useWallet();

    const formatTimeAgo = (date: Date) => {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <>
            <header className="bg-white/90 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo & Title */}
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="relative">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center transform group-hover:scale-110 transition-transform">
                                    <span className="text-white font-bold text-xl">Α</span>
                                </div>
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-amber-600 bg-clip-text text-transparent">
                                    ALETHEA ORACLE
                                </h1>
                                <p className="text-xs text-gray-500 font-medium">Decentralized Truth</p>
                            </div>
                        </Link>

                        {/* Navigation */}
                        <nav className="hidden md:flex items-center gap-6">
                            <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                                Markets
                            </Link>
                            <Link href="/voters" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                                Voters
                            </Link>
                            <Link href="/wallet" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                                Wallet
                            </Link>
                            <Link href="/linera-demo" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                                Linera Demo
                            </Link>
                            <Link href="/analytics" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                                Analytics
                            </Link>
                            <a
                                href="https://github.com/mdlog/alethea-docs"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-700 hover:text-blue-600 font-medium transition-colors flex items-center gap-1"
                            >
                                Docs
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                        </nav>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            {/* MetaMask Connect Button */}
                            {!isConnected ? (
                                <button
                                    onClick={connect}
                                    disabled={isConnecting}
                                    className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg hover:from-orange-600 hover:to-amber-700 font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    <span className="hidden sm:inline">{isConnecting ? 'Connecting...' : 'Connect MetaMask'}</span>
                                </button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowWallet(!showWallet)}
                                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                                    >
                                        <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                                        <span className="hidden sm:inline">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                                    </button>
                                </div>
                            )}

                            {onCreateMarket && (
                                <button
                                    onClick={onCreateMarket}
                                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span className="hidden sm:inline">Create Market</span>
                                </button>
                            )}
                            {lastUpdate && (
                                <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                    <span>{formatTimeAgo(lastUpdate)}</span>
                                </div>
                            )}
                            {onRefresh && (
                                <button
                                    onClick={onRefresh}
                                    disabled={isRefreshing}
                                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <svg
                                        className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Wallet Info Dropdown */}
            {showWallet && (
                <div className="fixed top-20 right-4 z-40 w-full max-w-md">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Wallet Information</h3>
                            <button
                                onClick={() => setShowWallet(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <WalletInfo />
                        {isConnected && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">MetaMask Connected</span>
                                    <button
                                        onClick={disconnect}
                                        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                                    >
                                        Disconnect
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1 font-mono">{address}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
