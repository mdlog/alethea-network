'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import StatsCard from '@/components/StatsCard';
import MarketCard from '@/components/MarketCard';
import CreateMarketForm from '@/components/CreateMarketForm';
import { getProtocolStats, getActiveMarkets, getStatistics } from '@/lib/graphql';
import { Market, ProtocolStats, Statistics } from '@/types';
import { useAutoResolution } from '@/lib/hooks/useAutoResolution';

export default function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<ProtocolStats | null>(null);
    const [markets, setMarkets] = useState<Market[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'OPEN' | 'RESOLVED'>('all');
    const [showCreateForm, setShowCreateForm] = useState(false);

    const loadData = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setError(null);

        try {
            // Load stats with timeout and error handling
            try {
                const statsData = await Promise.race([
                    getProtocolStats(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Stats request timeout')), 10000))
                ]) as any;

                if (statsData?.protocolStats) {
                    setStats(statsData.protocolStats);
                } else {
                    // Set default stats if no data
                    setStats({
                        totalMarkets: 0,
                        activeMarkets: 0,
                        resolvedMarkets: 0,
                        totalVoters: 0,
                    });
                }
            } catch (statsErr: any) {
                console.warn('Failed to load stats:', statsErr);
                // Set default stats on error
                setStats({
                    totalMarkets: 0,
                    activeMarkets: 0,
                    resolvedMarkets: 0,
                    totalVoters: 0,
                });
            }

            // Load markets with timeout and error handling
            try {
                const marketsData = await Promise.race([
                    getActiveMarkets(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Markets request timeout')), 10000))
                ]) as any;

                if (marketsData?.activeMarkets && Array.isArray(marketsData.activeMarkets)) {
                    setMarkets(marketsData.activeMarkets);
                } else {
                    setMarkets([]);
                }
            } catch (marketsErr: any) {
                console.warn('Failed to load markets:', marketsErr);
                setMarkets([]);
            }

            setLastUpdate(new Date());
            setError(null); // Clear any previous errors if we got here
        } catch (err: any) {
            console.error('Error loading data:', err);
            setError(err.message || 'Failed to load data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Auto-request resolution for expired markets
    // DISABLED: Conway testnet has validator sync issues causing stuck messages
    useAutoResolution({
        markets,
        enabled: false, // Disabled to prevent stuck messages
        checkInterval: 10000, // Check every 10 seconds
        onResolutionRequested: (marketId) => {
            console.log(`Resolution requested for market ${marketId}, refreshing data...`);
            // Refresh data after resolution request
            setTimeout(() => {
                loadData(true);
            }, 2000);
        },
    });

    useEffect(() => {
        loadData();

        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            loadData(true);
        }, 30000);

        return () => clearInterval(interval);
    }, [loadData]);

    const filteredMarkets = markets.filter((market) => {
        const matchesSearch = market.question.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'all' || market.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const handleMarketCreated = () => {
        setShowCreateForm(false);
        // Reload data after market creation
        setTimeout(() => {
            loadData(true);
        }, 2000);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
                <Header />
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Oracle Data</h2>
                            <p className="text-gray-600">Connecting to blockchain...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50">
                <Header onRefresh={() => loadData()} isRefreshing={refreshing} />
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-white rounded-2xl shadow-xl p-8">
                            <div className="text-center mb-6">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Connection Error</h2>
                                <p className="text-gray-600">Unable to connect to the oracle service</p>
                            </div>
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
                                <p className="text-red-800 font-semibold mb-2">Error Details:</p>
                                <pre className="text-sm text-red-700 whitespace-pre-wrap break-words">{error}</pre>
                            </div>
                            <button
                                onClick={() => loadData()}
                                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                            >
                                🔄 Retry Connection
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
            <Header
                onRefresh={() => loadData(true)}
                isRefreshing={refreshing}
                lastUpdate={lastUpdate || undefined}
                onCreateMarket={() => setShowCreateForm(true)}
            />

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Create Market Form Modal */}
                {showCreateForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-gray-900">Create New Market</h2>
                                <button
                                    onClick={() => setShowCreateForm(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-6">
                                <CreateMarketForm onSuccess={handleMarketCreated} />
                            </div>
                        </div>
                    </div>
                )}
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatsCard
                        title="Total Markets"
                        value={stats?.totalMarkets || 0}
                        color="blue"
                        icon={
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        }
                    />
                    <StatsCard
                        title="Active Markets"
                        value={stats?.activeMarkets || 0}
                        color="emerald"
                        icon={
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        }
                    />
                    <StatsCard
                        title="Resolved Markets"
                        value={stats?.resolvedMarkets || 0}
                        color="purple"
                        icon={
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                    <StatsCard
                        title="Total Voters"
                        value={stats?.totalVoters || 0}
                        color="amber"
                        icon={
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        }
                    />
                </div>

                {/* Search and Filter */}
                <div className="bg-white rounded-xl shadow-md p-6 mb-8">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search markets..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-4 py-3 pl-12 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {(['all', 'OPEN', 'RESOLVED'] as const).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className={`px-4 py-3 rounded-lg font-medium transition-all ${filterStatus === status
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {status === 'all' ? 'All' : status}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Markets Grid */}
                {filteredMarkets.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-md p-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Markets Found</h3>
                        <p className="text-gray-600">
                            {searchQuery ? 'Try adjusting your search query' : 'No markets available at the moment'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredMarkets.map((market) => (
                            <MarketCard key={market.id} market={market} />
                        ))}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">ALETHEA NETWORK</h3>
                        <p className="text-gray-600 text-sm mb-4">Decentralized Oracle Infrastructure on Linera</p>
                        <p className="text-gray-500 text-xs">
                            Alethea (Ἀλήθεια) - Greek goddess of truth, daughter of Zeus
                        </p>
                        <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-500">
                            <span>Conway Testnet</span>
                            <span>•</span>
                            <span>SDK v0.15.5</span>
                            <span>•</span>
                            <a href="https://github.com/mdlog/alethea-docs" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                                Documentation
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
