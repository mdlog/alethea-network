'use client';

import { useEffect, useState } from 'react';
import { getActiveQueries } from '@/lib/graphql';
import type { Query } from '@/types';

export function ActiveQueries() {
    const [queries, setQueries] = useState<Query[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadQueries();
    }, []);

    const loadQueries = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getActiveQueries(20);
            if (data?.activeQueries) {
                setQueries(data.activeQueries);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load queries');
        } finally {
            setLoading(false);
        }
    };

    const formatTimeRemaining = (seconds: number): string => {
        if (seconds <= 0) return 'Expired';

        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-md p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="text-sm text-red-800">{error}</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Active Queries</h2>
                <button
                    onClick={loadQueries}
                    className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-semibold"
                >
                    🔄 Refresh
                </button>
            </div>

            {queries.length === 0 ? (
                <div className="p-12 text-center">
                    <p className="text-gray-600">No active queries at the moment.</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-200">
                    {queries.map((query) => (
                        <div key={query.id} className="p-6 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-sm font-semibold text-gray-500">
                                            Query #{query.id}
                                        </span>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${query.strategy === 'Majority' ? 'bg-blue-100 text-blue-800' :
                                                query.strategy === 'Median' ? 'bg-green-100 text-green-800' :
                                                    query.strategy === 'WeightedByStake' ? 'bg-purple-100 text-purple-800' :
                                                        'bg-amber-100 text-amber-800'
                                            }`}>
                                            {query.strategy}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        {query.description}
                                    </h3>
                                </div>
                                <div className="text-right ml-4">
                                    <div className="text-sm text-gray-500 mb-1">Reward</div>
                                    <div className="text-lg font-bold text-green-600">
                                        {parseFloat(query.rewardAmount).toFixed(0)}
                                    </div>
                                </div>
                            </div>

                            {/* Outcomes */}
                            <div className="mb-3">
                                <div className="text-sm text-gray-600 mb-2">Possible Outcomes:</div>
                                <div className="flex flex-wrap gap-2">
                                    {query.outcomes.map((outcome, idx) => (
                                        <span
                                            key={idx}
                                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                                        >
                                            {outcome}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                                <div className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                    <span>{query.voteCount} / {query.minVotes} votes</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>{formatTimeRemaining(query.timeRemaining)}</span>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-3">
                                <div className="bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${Math.min((query.voteCount / query.minVotes) * 100, 100)}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Action Button */}
                            <button
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                            >
                                Vote on Query
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
