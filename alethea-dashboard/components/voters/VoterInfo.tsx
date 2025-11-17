'use client';

import { useEffect, useState } from 'react';
import { getMyVoterInfo, getMyPendingRewards } from '@/lib/graphql';
import type { Voter } from '@/types';

export function VoterInfo() {
    const [voter, setVoter] = useState<Voter | null>(null);
    const [pendingRewards, setPendingRewards] = useState<string>('0');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadVoterInfo();
    }, []);

    const loadVoterInfo = async () => {
        setLoading(true);
        setError(null);
        try {
            const [voterData, rewardsData] = await Promise.all([
                getMyVoterInfo(),
                getMyPendingRewards(),
            ]);

            if (voterData?.myVoterInfo) {
                setVoter(voterData.myVoterInfo);
            }

            if (rewardsData?.myPendingRewards) {
                setPendingRewards(rewardsData.myPendingRewards);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load voter information');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-md p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
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

    if (!voter) {
        return (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="text-sm text-blue-800">
                    You are not registered as a voter yet. Register to start earning rewards!
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                <h2 className="text-xl font-bold text-white">Your Voter Profile</h2>
            </div>

            <div className="p-6 space-y-6">
                {/* Voter Name and Address */}
                <div>
                    {voter.name && (
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">{voter.name}</h3>
                    )}
                    <p className="text-sm font-mono text-gray-500">
                        {voter.address.substring(0, 16)}...{voter.address.substring(voter.address.length - 16)}
                    </p>
                </div>

                {/* Reputation */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Reputation</span>
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${voter.reputationTier === 'Master' ? 'bg-purple-100 text-purple-800' :
                                voter.reputationTier === 'Expert' ? 'bg-blue-100 text-blue-800' :
                                    voter.reputationTier === 'Intermediate' ? 'bg-green-100 text-green-800' :
                                        'bg-gray-100 text-gray-800'
                            }`}>
                            {voter.reputationTier}
                        </span>
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-bold text-gray-900">{voter.reputation}</span>
                        <span className="text-lg text-gray-500 mb-1">/100</span>
                    </div>
                    <div className="mt-2 bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${voter.reputation}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                        Weight: {voter.reputationWeight.toFixed(2)}x
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Total Stake</p>
                        <p className="text-2xl font-bold text-gray-900">{parseFloat(voter.stake).toFixed(0)}</p>
                        <p className="text-xs text-gray-500 mt-1">tokens</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Available</p>
                        <p className="text-2xl font-bold text-gray-900">{parseFloat(voter.availableStake).toFixed(0)}</p>
                        <p className="text-xs text-gray-500 mt-1">tokens</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Locked</p>
                        <p className="text-2xl font-bold text-gray-900">{parseFloat(voter.lockedStake).toFixed(0)}</p>
                        <p className="text-xs text-gray-500 mt-1">tokens</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Pending Rewards</p>
                        <p className="text-2xl font-bold text-green-600">{parseFloat(pendingRewards).toFixed(0)}</p>
                        <p className="text-xs text-gray-500 mt-1">tokens</p>
                    </div>
                </div>

                {/* Voting Stats */}
                <div className="border-t pt-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Voting Statistics</h4>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Total Votes</span>
                            <span className="font-semibold text-gray-900">{voter.totalVotes}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Correct Votes</span>
                            <span className="font-semibold text-green-600">{voter.correctVotes}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Accuracy</span>
                            <span className="font-semibold text-gray-900">
                                {voter.accuracyPercentage.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-sm text-gray-600">Status</span>
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${voter.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                        {voter.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                    <button
                        onClick={loadVoterInfo}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                    >
                        Refresh
                    </button>
                    {parseFloat(pendingRewards) > 0 && (
                        <button
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors"
                        >
                            Claim Rewards
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
