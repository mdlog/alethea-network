'use client';

import { useRouter } from 'next/navigation';
import VoterRegistrationMetaMask from '@/components/VoterRegistrationMetaMask';

export default function RegisterPage() {
    const router = useRouter();

    const handleSuccess = () => {
        // Redirect to voters page after successful registration
        router.push('/voters');
    };

    const handleCancel = () => {
        // Go back to previous page
        router.back();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        🗳️ Become a Voter
                    </h1>
                    <p className="text-lg text-gray-600">
                        Join the Alethea Oracle Network and earn rewards for accurate predictions
                    </p>
                </div>

                {/* Registration Component */}
                <VoterRegistrationMetaMask onSuccess={handleSuccess} onCancel={handleCancel} />

                {/* Benefits Section */}
                <div className="mt-12 grid md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-3xl mb-3">⚡</div>
                        <h3 className="font-semibold text-gray-900 mb-2">Fast Registration</h3>
                        <p className="text-sm text-gray-600">
                            Register in ~30 seconds. No complex setup or waiting periods.
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-3xl mb-3">💰</div>
                        <h3 className="font-semibold text-gray-900 mb-2">Earn Rewards</h3>
                        <p className="text-sm text-gray-600">
                            Get 10% rewards for correct votes. Build reputation for higher rewards.
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-3xl mb-3">📈</div>
                        <h3 className="font-semibold text-gray-900 mb-2">Build Reputation</h3>
                        <p className="text-sm text-gray-600">
                            Climb through 4 reputation tiers. Master tier gets 2x voting weight.
                        </p>
                    </div>
                </div>

                {/* How It Works */}
                <div className="mt-12 bg-white rounded-lg shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                        How It Works
                    </h2>

                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                                1
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-1">Connect Wallet</h3>
                                <p className="text-sm text-gray-600">
                                    Connect your Linera wallet to authenticate and sign transactions.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                                2
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-1">Stake Tokens</h3>
                                <p className="text-sm text-gray-600">
                                    Stake at least 100 tokens to register. Your stake is locked during active votes.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                                3
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-1">Start Voting</h3>
                                <p className="text-sm text-gray-600">
                                    Vote on active queries. Submit your prediction with confidence level.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                                4
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-1">Earn Rewards</h3>
                                <p className="text-sm text-gray-600">
                                    Get rewards for correct votes. Build reputation for higher rewards and voting weight.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reputation Tiers */}
                <div className="mt-12 bg-white rounded-lg shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                        Reputation Tiers
                    </h2>

                    <div className="grid md:grid-cols-4 gap-4">
                        <div className="border-2 border-gray-300 rounded-lg p-4">
                            <div className="text-2xl mb-2">🌱</div>
                            <h3 className="font-semibold text-gray-900 mb-1">Novice</h3>
                            <p className="text-xs text-gray-600 mb-2">0-40 reputation</p>
                            <p className="text-sm text-gray-700">0.5x voting weight</p>
                        </div>

                        <div className="border-2 border-blue-300 rounded-lg p-4">
                            <div className="text-2xl mb-2">⭐</div>
                            <h3 className="font-semibold text-blue-900 mb-1">Intermediate</h3>
                            <p className="text-xs text-blue-600 mb-2">41-70 reputation</p>
                            <p className="text-sm text-blue-700">1.0x voting weight</p>
                        </div>

                        <div className="border-2 border-purple-300 rounded-lg p-4">
                            <div className="text-2xl mb-2">💎</div>
                            <h3 className="font-semibold text-purple-900 mb-1">Expert</h3>
                            <p className="text-xs text-purple-600 mb-2">71-90 reputation</p>
                            <p className="text-sm text-purple-700">1.5x voting weight</p>
                        </div>

                        <div className="border-2 border-yellow-300 rounded-lg p-4">
                            <div className="text-2xl mb-2">👑</div>
                            <h3 className="font-semibold text-yellow-900 mb-1">Master</h3>
                            <p className="text-xs text-yellow-600 mb-2">91-100 reputation</p>
                            <p className="text-sm text-yellow-700">2.0x voting weight</p>
                        </div>
                    </div>
                </div>

                {/* Back Link */}
                <div className="mt-8 text-center">
                    <button
                        onClick={() => router.push('/voters')}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                        ← Back to Voters
                    </button>
                </div>
            </div>
        </div>
    );
}
