'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { getVoters, getStatistics } from '@/lib/graphql';

interface Voter {
    address: string;
    stake: string;
    lockedStake: string;
    availableStake: string;
    reputation: number;
    reputationTier: string;
    reputationWeight: number;
    totalVotes: number;
    correctVotes: number;
    accuracyPercentage: number;
    registeredAt: string;
    isActive: boolean;
    name?: string;
    metadataUrl?: string;
}

interface Statistics {
    totalVoters: number;
    activeVoters: number;
    totalStake: string;
    totalLockedStake: string;
    averageStake: string;
    totalQueriesCreated: number;
    totalQueriesResolved: number;
    activeQueriesCount: number;
    totalVotesSubmitted: number;
    averageVotesPerQuery: number;
    totalRewardsDistributed: string;
    rewardPoolBalance: string;
    protocolTreasury: string;
    averageReputation: number;
    protocolStatus: string;
    resolutionRate: number;
}

export default function VotersPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [voters, setVoters] = useState<Voter[]>([]);
    const [stats, setStats] = useState<Statistics | null>(null);
    const [showRegisterForm, setShowRegisterForm] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [votersData, statsData] = await Promise.all([
                getVoters(50, 0, true), // Get top 50 active voters
                getStatistics(),
            ]);

            if (votersData?.voters) {
                // Sort by reputation (descending)
                const sortedVoters = [...votersData.voters].sort((a, b) => b.reputation - a.reputation);
                setVoters(sortedVoters);
            }

            if (statsData?.statistics) {
                setStats(statsData.statistics);
            }
        } catch (error) {
            console.error('Error loading voter data:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
            <Header />

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Hero Section */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
                    <div className="max-w-4xl">
                        <h1 className="text-4xl font-bold mb-4">Become an Oracle Voter</h1>
                        <p className="text-xl text-blue-100 mb-6">
                            Earn rewards by voting on queries. Join {stats?.totalVoters || 0} voters securing the Alethea Oracle Network.
                        </p>
                        <div className="bg-blue-700 bg-opacity-50 rounded-lg p-4 mb-6">
                            <p className="text-sm text-blue-100">
                                ✨ <strong>New Account-Based System:</strong> Register in 30 seconds with just one transaction!
                                No application deployment needed.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            <button
                                onClick={() => router.push('/register')}
                                className="px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg"
                            >
                                🚀 Register as Voter
                            </button>
                            <a
                                href="/docs/voter-guide"
                                className="px-8 py-3 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition-colors"
                            >
                                📚 Learn More
                            </a>
                        </div>
                    </div>
                </div>

                {/* Registration Form Modal */}
                {showRegisterForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-gray-900">Register as Voter</h2>
                                <button
                                    onClick={() => setShowRegisterForm(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-6">
                                <VoterRegistrationForm onSuccess={() => {
                                    setShowRegisterForm(false);
                                    loadData();
                                }} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-600 font-medium">Total Voters</h3>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stats?.totalVoters || 0}</p>
                        <p className="text-sm text-gray-500 mt-1">{stats?.activeVoters || 0} active</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-600 font-medium">Queries Resolved</h3>
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stats?.totalQueriesResolved || 0}</p>
                        <p className="text-sm text-gray-500 mt-1">{stats?.resolutionRate.toFixed(1) || 0}% rate</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-600 font-medium">Active Queries</h3>
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stats?.activeQueriesCount || 0}</p>
                        <p className="text-sm text-gray-500 mt-1">{stats?.totalQueriesCreated || 0} total</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-600 font-medium">Total Stake</h3>
                            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{parseFloat(stats?.totalStake || '0').toFixed(0)}</p>
                        <p className="text-sm text-gray-500 mt-1">tokens</p>
                    </div>
                </div>

                {/* Benefits Section */}
                <div className="bg-white rounded-xl shadow-md p-8 mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Why Become a Voter?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex gap-4">
                            <div className="flex-shrink-0">
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    💰
                                </div>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">Earn Rewards</h3>
                                <p className="text-gray-600">Get paid for accurate votes. Rewards are proportional to your reputation score.</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-shrink-0">
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    📈
                                </div>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">Build Reputation</h3>
                                <p className="text-gray-600">Increase your influence over time. Higher reputation (0-100) means better rewards and voting weight.</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-shrink-0">
                                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                    ⚡
                                </div>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">Instant Registration</h3>
                                <p className="text-gray-600">Register in 30 seconds with one transaction. No application deployment needed!</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-shrink-0">
                                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                                    🔒
                                </div>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">Low Barrier</h3>
                                <p className="text-gray-600">Start with just 100 tokens. Simple account-based system.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Leaderboard */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900">Voter Leaderboard</h2>
                        <button
                            onClick={loadData}
                            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            🔄 Refresh
                        </button>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading leaderboard...</p>
                        </div>
                    ) : voters.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-gray-600">No voters registered yet. Be the first!</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voter</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reputation</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stake</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Votes</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accuracy</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {voters.map((voter, index) => (
                                        <tr key={voter.address} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    {index < 3 ? (
                                                        <span className="text-2xl">
                                                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-500 font-medium">#{index + 1}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    {voter.name && (
                                                        <div className="text-sm font-semibold text-gray-900 mb-1">
                                                            {voter.name}
                                                        </div>
                                                    )}
                                                    <div className="text-xs font-mono text-gray-500">
                                                        {voter.address.substring(0, 10)}...{voter.address.substring(voter.address.length - 8)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="text-sm font-semibold text-gray-900">{voter.reputation}</div>
                                                    <div className="ml-2 text-xs text-gray-500">/100</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${voter.reputationTier === 'Master' ? 'bg-purple-100 text-purple-800' :
                                                    voter.reputationTier === 'Expert' ? 'bg-blue-100 text-blue-800' :
                                                        voter.reputationTier === 'Intermediate' ? 'bg-green-100 text-green-800' :
                                                            'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {voter.reputationTier}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{parseFloat(voter.stake).toFixed(0)}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{voter.totalVotes}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="text-sm font-semibold text-gray-900">
                                                        {voter.accuracyPercentage.toFixed(1)}%
                                                    </div>
                                                    {voter.accuracyPercentage >= 80 && (
                                                        <span className="ml-2 text-green-500">✓</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* How It Works */}
                <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">How It Works (Account-Based)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                                <span className="text-2xl">1️⃣</span>
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2">Register</h3>
                            <p className="text-sm text-gray-600">One transaction with 100+ tokens stake</p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                                <span className="text-2xl">2️⃣</span>
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2">Browse Queries</h3>
                            <p className="text-sm text-gray-600">View active queries and their details</p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                                <span className="text-2xl">3️⃣</span>
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2">Vote</h3>
                            <p className="text-sm text-gray-600">Submit votes directly on registry</p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                                <span className="text-2xl">4️⃣</span>
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2">Earn</h3>
                            <p className="text-sm text-gray-600">Get rewards based on reputation</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

// Voter Registration Form Component
function VoterRegistrationForm({ onSuccess }: { onSuccess: () => void }) {
    const [step, setStep] = useState<'info' | 'register' | 'success'>('info');
    const [stake, setStake] = useState('100');
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);

    return (
        <div className="space-y-6">
            {step === 'info' && (
                <>
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                        <h3 className="font-semibold text-blue-900 mb-2">✨ New Account-Based System</h3>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Minimum stake: 100 tokens</li>
                            <li>• Registration time: ~30 seconds</li>
                            <li>• No application deployment needed</li>
                            <li>• Your account address is your voter ID</li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900">Registration Steps:</h3>
                        <ol className="list-decimal list-inside space-y-2 text-gray-700">
                            <li>Submit registration with stake amount</li>
                            <li>Start voting immediately</li>
                            <li>Build reputation and earn rewards</li>
                        </ol>
                    </div>

                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                        <p className="text-sm text-green-800">
                            <strong>20x Faster:</strong> The new account-based system eliminates application deployment and cross-chain messages!
                        </p>
                    </div>

                    <button
                        onClick={() => setStep('register')}
                        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                    >
                        Continue to Registration
                    </button>
                </>
            )}

            {step === 'register' && (
                <>
                    <h3 className="font-semibold text-gray-900 text-lg">Register as Voter</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Stake Amount (tokens)
                            </label>
                            <input
                                type="number"
                                min="100"
                                value={stake}
                                onChange={(e) => setStake(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="100"
                            />
                            <p className="text-xs text-gray-500 mt-1">Minimum: 100 tokens</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Voter Name (optional)
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="My Voter Name"
                            />
                            <p className="text-xs text-gray-500 mt-1">Display name for leaderboard</p>
                        </div>
                    </div>

                    <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-green-400 text-sm">
                            {`# Load environment
source .env.fresh

# Register as voter
curl -X POST "http://localhost:8080/chains/\${ORACLE_REGISTRY_V2_CHAIN_ID}/applications/\${ORACLE_REGISTRY_V2_APP_ID}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "mutation {
      registerVoter(
        stake: \\"${stake}\\",
        name: ${name ? `\\"${name}\\"` : 'null'}
      ) {
        address
        stake
        reputation
        reputationTier
        isActive
      }
    }"
  }'

# Verify registration
curl -X POST "http://localhost:8080/chains/\${ORACLE_REGISTRY_V2_CHAIN_ID}/applications/\${ORACLE_REGISTRY_V2_APP_ID}" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "{ myVoterInfo { address stake reputation } }"}'`}
                        </pre>
                    </div>

                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                        <p className="text-sm text-blue-800">
                            <strong>Note:</strong> Copy and run the command above in your terminal. Your account address will be used as your voter ID.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setStep('info')}
                            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
                        >
                            Back
                        </button>
                        <button
                            onClick={() => {
                                setStep('success');
                                setTimeout(onSuccess, 2000);
                            }}
                            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors"
                        >
                            Complete Registration
                        </button>
                    </div>
                </>
            )}

            {step === 'success' && (
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Registration Complete!</h3>
                    <p className="text-gray-600 mb-6">
                        You&apos;re now registered as a voter. You&apos;ll start receiving vote requests soon.
                    </p>
                    <button
                        onClick={onSuccess}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                    >
                        View Leaderboard
                    </button>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}
        </div>
    );
}
