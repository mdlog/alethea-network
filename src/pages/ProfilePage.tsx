import { useState, useEffect } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { User, Coins, Award, TrendingUp, Loader2, RefreshCw, Gift, ArrowDownCircle, Shield, AlertTriangle } from 'lucide-react';
import StakeInterface from '../components/StakeInterface';
import ClaimRewards from '../components/ClaimRewards';
import WithdrawStake from '../components/WithdrawStake';
import TokenBalance from '../components/TokenBalance';
import SlashingInfo from '../components/SlashingInfo';

interface VoterProfile {
    address: string;
    stake: string;
    lockedStake: string;
    availableStake: string;
    pendingRewards: string;
    reputation: number;
    reputationTier: string;
    reputationWeight: number;
    totalVotes: number;
    correctVotes: number;
    isActive: boolean;
    name?: string;
}

interface ProtocolStats {
    rewardPoolBalance: string;
    totalRewardsDistributed: string;
}

export default function ProfilePage() {
    const { chainId, owner, status, application, executeAppChainQuery } = useLinera();
    const [profile, setProfile] = useState<VoterProfile | null>(null);
    const [stats, setStats] = useState<ProtocolStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showStakeModal, setShowStakeModal] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'stake' | 'rewards' | 'slashing'>('overview');

    // Get pending rewards from profile (real value from contract)
    const pendingRewards = profile?.pendingRewards || '0';

    const loadProfile = async () => {
        if (!application || !chainId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            console.log('👤 Loading profile for chainId:', chainId);
            const data = await executeAppChainQuery(`
                query {
                    voters(limit: 100, offset: 0, activeOnly: false) {
                        address
                        stake
                        lockedStake
                        availableStake
                        pendingRewards
                        reputation
                        reputationTier
                        reputationWeight
                        totalVotes
                        correctVotes
                        isActive
                        name
                    }
                    statistics {
                        rewardPoolBalance
                        totalRewardsDistributed
                    }
                }
            `);

            const voters = data?.voters || [];
            console.log('👤 All voters:', voters);

            // Match by chainId - voters register with chain_id in contract
            // Address format from contract: "ChainId(xxx)" or just "xxx"
            const myProfile = voters.find((v: VoterProfile) => {
                const addr = v.address || '';
                // Handle both formats: "ChainId(xxx)" and raw "xxx"
                const cleanAddr = addr.replace('ChainId(', '').replace(')', '').toLowerCase();
                return cleanAddr === chainId?.toLowerCase();
            });

            console.log('👤 Profile found:', myProfile);
            setProfile(myProfile || null);
            setStats(data?.statistics || null);
        } catch (err) {
            console.error('❌ Failed to load profile:', err);
            setError(err instanceof Error ? err.message : 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (status === 'Ready' && application) {
            loadProfile();
        }
    }, [status, application, chainId]);

    const accuracy = profile && profile.totalVotes > 0
        ? ((profile.correctVotes / profile.totalVotes) * 100).toFixed(1)
        : '0';

    const availableStake = profile
        ? Math.max(0, parseFloat(profile.stake || '0') - parseFloat(profile.lockedStake || '0'))
        : 0;

    if (status !== 'Ready') {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Connecting wallet...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
                    <p className="text-gray-500">Your voter profile, stake, and rewards</p>
                </div>
                <button
                    onClick={loadProfile}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Token Balance */}
            <TokenBalance />

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                    {error}
                </div>
            ) : !profile ? (
                <div className="bg-white rounded-xl p-8 border border-gray-200">
                    <div className="text-center mb-8">
                        <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Not Registered</h3>
                        <p className="text-gray-500 mb-6">
                            You haven't registered as a voter yet. Register to start voting and earning rewards!
                        </p>
                    </div>
                    <StakeInterface
                        isRegistration={true}
                        onSuccess={loadProfile}
                    />
                </div>
            ) : (
                <>
                    {/* Profile Card */}
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                        <div className="flex items-start gap-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                                <User className="w-10 h-10 text-white" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {profile.name || 'Anonymous Voter'}
                                </h2>
                                <p className="text-sm text-gray-500 font-mono mt-1">
                                    {profile.address?.slice(0, 16)}...{profile.address?.slice(-8)}
                                </p>
                                <div className="flex items-center gap-3 mt-3">
                                    <span className={`px-3 py-1 text-sm rounded-full ${profile.isActive
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-500'
                                        }`}>
                                        {profile.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                    <span className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full">
                                        {profile.reputationTier}
                                    </span>
                                    <span className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-full">
                                        {profile.reputationWeight?.toFixed(2)}x weight
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'overview'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('stake')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'stake'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Stake Management
                        </button>
                        <button
                            onClick={() => setActiveTab('rewards')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'rewards'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Rewards
                        </button>
                        <button
                            onClick={() => setActiveTab('slashing')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'slashing'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <span className="flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Slashing
                            </span>
                        </button>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'overview' && (
                        <>
                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white rounded-xl p-5 border border-gray-200">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Coins className="w-5 h-5 text-yellow-500" />
                                        <span className="text-sm text-gray-500">Total Stake</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {parseFloat(profile.stake || '0').toFixed(0)}
                                    </p>
                                </div>

                                <div className="bg-white rounded-xl p-5 border border-gray-200">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Award className="w-5 h-5 text-purple-500" />
                                        <span className="text-sm text-gray-500">Reputation</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {profile.reputation}
                                    </p>
                                </div>

                                <div className="bg-white rounded-xl p-5 border border-gray-200">
                                    <div className="flex items-center gap-3 mb-3">
                                        <TrendingUp className="w-5 h-5 text-green-500" />
                                        <span className="text-sm text-gray-500">Accuracy</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {accuracy}%
                                    </p>
                                </div>

                                <div className="bg-white rounded-xl p-5 border border-gray-200">
                                    <div className="flex items-center gap-3 mb-3">
                                        <User className="w-5 h-5 text-blue-500" />
                                        <span className="text-sm text-gray-500">Total Votes</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {profile.totalVotes}
                                    </p>
                                </div>
                            </div>

                            {/* Voting Statistics */}
                            <div className="bg-white rounded-xl p-6 border border-gray-200">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Voting Statistics</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Total Votes Cast</span>
                                        <span className="font-semibold text-gray-900">{profile.totalVotes}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Correct Votes</span>
                                        <span className="font-semibold text-green-600">{profile.correctVotes}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Incorrect Votes</span>
                                        <span className="font-semibold text-red-600">
                                            {profile.totalVotes - profile.correctVotes}
                                        </span>
                                    </div>
                                    <div className="pt-4 border-t border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-600">Accuracy Rate</span>
                                            <span className="font-bold text-blue-600">{accuracy}%</span>
                                        </div>
                                        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-600 rounded-full transition-all"
                                                style={{ width: `${accuracy}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'stake' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Stake Overview */}
                            <div className="bg-white rounded-xl p-6 border border-gray-200">
                                <div className="flex items-center gap-3 mb-4">
                                    <Shield className="w-5 h-5 text-blue-600" />
                                    <h3 className="font-semibold text-gray-900">Stake Overview</h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <p className="text-sm text-blue-600 mb-1">Total Stake</p>
                                        <p className="text-2xl font-bold text-blue-700">
                                            {parseFloat(profile.stake || '0').toFixed(0)} tokens
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                            <p className="text-xs text-green-600">Available</p>
                                            <p className="text-lg font-bold text-green-700">
                                                {availableStake.toFixed(0)}
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                            <p className="text-xs text-gray-500">Locked</p>
                                            <p className="text-lg font-bold text-gray-700">
                                                {parseFloat(profile.lockedStake || '0').toFixed(0)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowStakeModal(true)}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            <Coins className="w-4 h-4" />
                                            Add Stake
                                        </button>
                                        <button
                                            onClick={() => setShowWithdrawModal(true)}
                                            disabled={availableStake <= 0}
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${availableStake > 0
                                                ? 'bg-orange-600 text-white hover:bg-orange-700'
                                                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                }`}
                                        >
                                            <ArrowDownCircle className="w-4 h-4" />
                                            Withdraw
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Stake Info */}
                            <div className="bg-white rounded-xl p-6 border border-gray-200">
                                <h3 className="font-semibold text-gray-900 mb-4">Staking Information</h3>
                                <div className="space-y-4 text-sm">
                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <p className="font-medium text-blue-800 mb-1">Why Stake?</p>
                                        <p className="text-blue-700">
                                            Staking increases your voting weight and potential rewards.
                                            Higher stake = more influence on query outcomes.
                                        </p>
                                    </div>
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                        <p className="font-medium text-amber-800 mb-1">Locked Stake</p>
                                        <p className="text-amber-700">
                                            Stake is locked when you have active votes.
                                            It unlocks after queries are resolved.
                                        </p>
                                    </div>
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <p className="font-medium text-red-800 mb-1">Slashing Risk</p>
                                        <p className="text-red-700">
                                            Voting incorrectly may result in stake slashing.
                                            Vote carefully to protect your stake.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'rewards' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Claim Rewards */}
                            <ClaimRewards
                                pendingRewards={pendingRewards}
                                onSuccess={loadProfile}
                            />

                            {/* Rewards Info */}
                            <div className="bg-white rounded-xl p-6 border border-gray-200">
                                <div className="flex items-center gap-3 mb-4">
                                    <Gift className="w-5 h-5 text-green-600" />
                                    <h3 className="font-semibold text-gray-900">Rewards Overview</h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                        <span className="text-gray-600">Correct Votes</span>
                                        <span className="font-semibold text-green-600">{profile.correctVotes}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                        <span className="text-gray-600">Reward per Vote</span>
                                        <span className="font-semibold text-gray-900">~10 tokens</span>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                        <span className="text-gray-600">Reputation Bonus</span>
                                        <span className="font-semibold text-purple-600">
                                            {profile.reputationWeight?.toFixed(2)}x
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-2">
                                        <span className="text-gray-600">Pool Balance</span>
                                        <span className="font-semibold text-gray-900">
                                            {stats?.rewardPoolBalance || '0'}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-sm text-green-700">
                                        <strong>Tip:</strong> Higher reputation gives you bonus rewards.
                                        Vote accurately to increase your reputation!
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'slashing' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Slashing Info */}
                            <SlashingInfo
                                voterAddress={profile.address}
                                totalVotes={profile.totalVotes}
                                correctVotes={profile.correctVotes}
                                stake={profile.stake}
                            />

                            {/* Slashing Rules */}
                            <div className="bg-white rounded-xl p-6 border border-gray-200">
                                <div className="flex items-center gap-3 mb-4">
                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                    <h3 className="font-semibold text-gray-900">Slashing Rules</h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <p className="font-medium text-red-800 mb-1">Incorrect Voting</p>
                                        <p className="text-sm text-red-700">
                                            Voting against the consensus result may result in
                                            up to 10% stake slash per incorrect vote.
                                        </p>
                                    </div>

                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                        <p className="font-medium text-amber-800 mb-1">Maximum Slash</p>
                                        <p className="text-sm text-amber-700">
                                            Maximum slash is capped at 50% of your total stake
                                            to prevent complete loss.
                                        </p>
                                    </div>

                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <p className="font-medium text-blue-800 mb-1">Reputation Impact</p>
                                        <p className="text-sm text-blue-700">
                                            Incorrect votes also decrease your reputation score,
                                            reducing future voting weight and rewards.
                                        </p>
                                    </div>

                                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <p className="font-medium text-green-800 mb-1">Protection</p>
                                        <p className="text-sm text-green-700">
                                            Maintain 80%+ accuracy to stay in the "Low Risk" zone
                                            and protect your stake from slashing.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Stake Modal */}
            {showStakeModal && profile && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full">
                        <StakeInterface
                            currentStake={profile.stake}
                            isRegistration={false}
                            onSuccess={() => {
                                setShowStakeModal(false);
                                loadProfile();
                            }}
                            onCancel={() => setShowStakeModal(false)}
                        />
                    </div>
                </div>
            )}

            {/* Withdraw Modal */}
            {showWithdrawModal && profile && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full">
                        <WithdrawStake
                            availableStake={availableStake.toString()}
                            lockedStake={profile.lockedStake}
                            onSuccess={() => {
                                setShowWithdrawModal(false);
                                loadProfile();
                            }}
                            onCancel={() => setShowWithdrawModal(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
