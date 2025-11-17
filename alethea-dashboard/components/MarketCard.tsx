'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Market } from '@/types';
import { useCountdown, formatCountdownDetailed } from '@/hooks/useCountdown';
import { useOracleResolution } from '@/lib/hooks/useOracleResolution';

interface MarketCardProps {
    market: Market;
}

const statusColors = {
    OPEN: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
    RESOLVED: 'bg-blue-100 text-blue-800 border-blue-200',
    CLOSED: 'bg-gray-100 text-gray-800 border-gray-200',
};

export default function MarketCard({ market }: MarketCardProps) {
    const [showResolutionModal, setShowResolutionModal] = useState(false);
    const { requestResolution, loading, error, currentStep, reset } = useOracleResolution();

    // Convert deadline to milliseconds if needed
    const deadlineMs = market.deadline > 1000000000000
        ? market.deadline
        : market.deadline * 1000;

    const { timeRemaining, isExpired } = useCountdown(deadlineMs);
    const countdown = formatCountdownDetailed(timeRemaining, isExpired);

    const handleRequestResolution = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowResolutionModal(true);

        const success = await requestResolution(market.id);
        if (success) {
            setTimeout(() => {
                setShowResolutionModal(false);
                reset();
                window.location.reload();
            }, 2000);
        }
    };

    const handleCloseModal = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowResolutionModal(false);
        reset();
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000);
        if (date.getFullYear() < 2020 || date.getFullYear() > 2100) return 'Far future';
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Create unique market identifier using source and id
    const marketKey = market.source ? `${market.source}-${market.id}` : `registry-${market.id}`;
    const marketUrl = market.source ? `/market/${market.source}/${market.id}` : `/market/${market.id}`;

    return (
        <Link href={marketUrl}>
            <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-300 cursor-pointer transform hover:-translate-y-1">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                            {market.question}
                        </h3>
                        {/* Countdown Timer */}
                        {market.status === 'OPEN' && !isExpired && timeRemaining && (
                            <div className="mb-2">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                                    <svg className="w-4 h-4 text-blue-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-sm font-bold text-blue-700">
                                            {countdown.primary}
                                        </span>
                                        {countdown.secondary && (
                                            <span className="text-xs text-blue-600">
                                                {countdown.secondary}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        {market.status === 'OPEN' && isExpired && (
                            <div className="mb-2">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg border border-red-200">
                                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-sm font-semibold text-red-700">
                                        Expired
                                    </span>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Deadline: {formatDate(market.deadline)}</span>
                        </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[market.status]}`}>
                        {market.status}
                    </span>
                </div>

                <div className="flex items-center gap-2 mb-4">
                    {market.outcomes.map((outcome, idx) => (
                        <div key={idx} className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-center">
                            <div className="text-xs text-gray-500 mb-1">{outcome}</div>
                            <div className="text-sm font-semibold text-gray-900">
                                {market.status === 'OPEN' ? '50%' : '-'}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span>Market #{market.id}</span>
                        {/* Source Badge */}
                        {market.source && (
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${market.source === 'registry'
                                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                    : 'bg-blue-100 text-blue-700 border border-blue-200'
                                }`}>
                                {market.source === 'registry' ? 'Registry' : 'Market Chain'}
                            </span>
                        )}
                    </div>
                    <div className="text-blue-600 font-medium flex items-center gap-1">
                        View Details
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </div>

                {/* Request Resolution Button - Only show for OPEN markets that are expired */}
                {/* Note: Auto-resolution is now handled by useAutoResolution hook */}
                {market.status === 'OPEN' && isExpired && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="text-sm text-gray-600 mb-2">
                                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Resolution will be requested automatically
                                </div>
                            </div>
                            <button
                                onClick={handleRequestResolution}
                                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 font-semibold transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Request Now
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Resolution Modal */}
            {showResolutionModal && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={handleCloseModal}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center">
                            {currentStep?.status === 'processing' && (
                                <>
                                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                                        Requesting Oracle Resolution
                                    </h3>
                                    <p className="text-gray-600 mb-4">
                                        Step {currentStep.step} of {currentStep.total}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {currentStep.message}
                                    </p>
                                </>
                            )}

                            {currentStep?.status === 'completed' && (
                                <>
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                                        Success!
                                    </h3>
                                    <p className="text-gray-600">
                                        {currentStep.message}
                                    </p>
                                </>
                            )}

                            {currentStep?.status === 'error' && (
                                <>
                                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                                        Error
                                    </h3>
                                    <p className="text-red-600 mb-4">
                                        {error || currentStep.message}
                                    </p>
                                    <button
                                        onClick={handleCloseModal}
                                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold"
                                    >
                                        Close
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Link>
    );
}
