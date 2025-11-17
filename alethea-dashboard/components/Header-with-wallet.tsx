'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import WalletInfo from './WalletInfo';

interface HeaderProps {
    onRefresh?: () => void;
    isRefreshing?: boolean;
    lastUpdate?: Date | null;
    onCreateMarket?: () => void;
}

export default function Header({ onRefresh, isRefreshing, lastUpdate, onCreateMarket }: HeaderProps) {
    const [showWallet, setShowWallet] = useState(false);

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
                            {/* Wallet Button */}
                            <button
                                onClick={() => setShowWallet(!showWallet)}
                                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                <span className="hidden sm:inline">Wallet</span>
                            </button>

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
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 animate-slide-down">
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
                    </div>
                </div>
            )}
        </>
    );
}
