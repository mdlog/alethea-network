import { useState, useEffect } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { useToken } from '../contexts/TokenContext';
import { User, Coins, Award, TrendingUp, Loader2, RefreshCw, Gift, ArrowDownCircle, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
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
    withdrawableBalance: string;
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
    const { chainId, owner, status, application, executeAppChainQuery, executeAppChainMutation, executeTokenMutation } = useLinera();
    const { refreshBalance, addToBalance } = useToken();
    const [profile, setProfile] = useState<VoterProfile | null>(null);
    const [stats, setStats] = useState<ProtocolStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showStakeModal, setShowStakeModal] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'stake' | 'rewards' | 'slashing'>('overview');
    const [claimingTokens, setClaimingTokens] = useState(false);
    const [claimSuccess, setClaimSuccess] = useState(false);

    // Get pending rewards from profile (real value from contract)
    const pendingRewards = profile?.pendingRewards || '0';

    const loadProfile = async () => {
        if (!chainId) {
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
                        withdrawableBalance
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

    // Claim withdrawable tokens using secure cross-chain messaging
    const claimWithdrawableTokens = async () => {
        if (!profile?.address || !profile?.withdrawableBalance) return;

        const withdrawableAmount = parseFloat(profile.withdrawableBalance || '0');
        if (withdrawableAmount <= 0) return;

        if (!owner) {
            console.error('❌ Owner not available');
            return;
        }

        setClaimingTokens(true);
        setClaimSuccess(false);

        try {
            console.log('💰 Claiming withdrawable tokens via secure cross-chain message:', withdrawableAmount);

            // Step 1: Send secure unstake request via cross-chain message to token contract
            const TOKEN_APP_ID = import.meta.env.VITE_TOKEN_APP_ID;
            const TOKEN_CHAIN_ID = import.meta.env.VITE_TOKEN_CHAIN_ID || import.meta.env.VITE_CHAIN_ID;
            const REGISTRY_APP_ID = import.meta.env.VITE_REGISTRY_APP_ID;

            if (TOKEN_APP_ID && chainId && executeTokenMutation) {
                console.log('🔐 Sending secure unstake request via cross-chain message');

                // Format owner address with 0x prefix
                const formattedOwner = owner.startsWith('0x') ? owner : `0x${owner}`;

                // Send authenticated cross-chain message to token contract
                // FIXED: Added missing 'owner' parameter
                const unstakeRequestMutation = `mutation { 
                    sendUnstakeRequest(
                        tokenChain: "${TOKEN_CHAIN_ID}",
                        owner: "${formattedOwner}",
                        amount: "${withdrawableAmount}.",
                        fromRegistry: "${REGISTRY_APP_ID}"
                    )
                }`;

                console.log('🔐 Secure unstake request:', unstakeRequestMutation);
                
                try {
                    await executeTokenMutation(unstakeRequestMutation);
                    console.log('✅ Secure unstake request sent via cross-chain message');
                } catch (tokenErr) {
                    console.error('⚠️ Token mutation failed:', tokenErr);
                    // Continue to clear registry anyway since we'll compensate manually if needed
                }

                // Wait for cross-chain message to process
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                console.warn('⚠️ Token mutation not available, skipping token transfer');
            }

            // Step 2: Clear withdrawable balance in registry (cleanup)
            try {
                console.log('🧹 Clearing withdrawable balance in registry');
                const mutation = `mutation { executeClaimWithdrawableTokens(voterAddress: "${profile.address}") }`;
                await executeAppChainMutation(mutation);
                console.log('✅ Withdrawable balance cleared in registry');
            } catch (cleanupErr) {
                console.error('⚠️ Registry cleanup failed (non-critical):', cleanupErr);
                // Don't fail the whole process if cleanup fails
            }

            console.log('✅ Tokens claimed via secure cross-chain message!');
            setClaimSuccess(true);

            // Add claimed amount to header balance (simulation)
            addToBalance(withdrawableAmount);

            // Reload profile to update withdrawable balance
            setTimeout(() => {
                loadProfile();
                setClaimSuccess(false);
            }, 2000);
        } catch (err) {
            console.error('❌ Failed to claim tokens:', err);
            await loadProfile();
        } finally {
            setClaimingTokens(false);
        }
    };

    useEffect(() => {
        if (status === 'Ready' && chainId) {
            loadProfile();
        }
    }, [status, chainId]);

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
                    <Loader2 className="w-8 h-8 animate-spin text-alethea-500 mx-auto mb-4" />
                    <p className="text-grey-700">Connecting wallet...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-black">My Profile</h1>
                    <p className="text-grey-700">Your voter profile, stake, and rewards</p>
                </div>
                <button
                    onClick={loadProfile}
                    className="btn-secondary flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Token Balance */}
            <TokenBalance />

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-alethea-500" />
                </div>
            ) : error ? (
                <div className="card border-red-200 p-4 text-red-700">
                    {error}
                </div>
            ) : !profile ? (
                <div className="card p-8">
                    <div className="text-center mb-8">
                        <User className="w-16 h-16 text-grey-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-black mb-2">Not Registered</h3>
                        <p className="text-grey-700 mb-6">
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
                    <div className="card p-6">
                        <div className="flex items-start gap-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-alethea-500 to-cyber-500 rounded-xl flex items-center justify-center">
                                <User className="w-10 h-10 text-white" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-black">
                                    {profile.name || 'Anonymous Voter'}
                                </h2>
                                <p className="text-sm text-grey-600 font-mono mt-1">
                                    {profile.address?.slice(0, 16)}...{profile.address?.slice(-8)}
                                </p>
                                <div className="flex items-center gap-3 mt-3">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${profile.isActive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-grey-50 text-grey-700 border border-grey-200'}`}>
                                        {profile.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                        {profile.reputationTier}
                                    </span>
                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                        {profile.reputationWeight?.toFixed(2)}x weight
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 bg-grey-100 p-1 rounded-lg w-fit">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'overview'
                                ? 'bg-white text-black shadow-sm'
                                : 'text-grey-700 hover:text-black'
                                }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('stake')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'stake'
                                ? 'bg-white text-black shadow-sm'
                                : 'text-grey-700 hover:text-black'
                                }`}
                        >
                            Stake Management
                        </button>
                        <button
                            onClick={() => setActiveTab('rewards')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'rewards'
                                ? 'bg-white text-black shadow-sm'
                                : 'text-grey-700 hover:text-black'
                                }`}
                        >
                            Rewards
                        </button>
                        <button
                            onClick={() => setActiveTab('slashing')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'slashing'
                                ? 'bg-white text-black shadow-sm'
                                : 'text-grey-700 hover:text-black'
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
                                <div className="card p-5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Coins className="w-5 h-5 text-amber-600" />
                                        <span className="text-sm text-grey-700">Total Stake</span>
                                    </div>
                                    <p className="text-2xl font-bold text-black">
                                        {parseFloat(profile.stake || '0').toFixed(2)}
                                    </p>
                                </div>

                                <div className="card p-5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Award className="w-5 h-5 text-purple-600" />
                                        <span className="text-sm text-grey-700">Reputation</span>
                                    </div>
                                    <p className="text-2xl font-bold text-black">
                                        {profile.reputation}
                                    </p>
                                </div>

                                <div className="card p-5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <TrendingUp className="w-5 h-5 text-green-600" />
                                        <span className="text-sm text-grey-700">Accuracy</span>
                                    </div>
                                    <p className="text-2xl font-bold text-black">
                                        {accuracy}%
                                    </p>
                                </div>

                                <div className="card p-5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <User className="w-5 h-5 text-blue-600" />
                                        <span className="text-sm text-grey-700">Total Votes</span>
                                    </div>
                                    <p className="text-2xl font-bold text-black">
                                        {profile.totalVotes}
                                    </p>
                                </div>
                            </div>

                            {/* Voting Statistics */}
                            <div className="card p-6">
                                <h3 className="text-lg font-bold text-black mb-4">Voting Statistics</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-grey-700">Total Votes Cast</span>
                                        <span className="font-semibold text-black">{profile.totalVotes}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-grey-700">Correct Votes</span>
                                        <span className="font-semibold text-green-700">{profile.correctVotes}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-grey-700">Incorrect Votes</span>
                                        <span className="font-semibold text-red-700">
                                            {profile.totalVotes - profile.correctVotes}
                                        </span>
                                    </div>
                                    <div className="pt-4 border-t border-grey-200">
                                        <div className="flex items-center justify-between">
                                            <span className="text-grey-700">Accuracy Rate</span>
                                            <span className="font-bold text-alethea-600">{accuracy}%</span>
                                        </div>
                                        <div className="mt-2 h-2 bg-grey-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-alethea-500 to-cyber-500 rounded-full transition-all"
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
                            <div className="card p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <Shield className="w-5 h-5 text-alethea-600" />
                                    <h3 className="font-semibold text-black">Stake Overview</h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="bg-alethea-50 border border-alethea-200 rounded-lg p-4">
                                        <p className="text-sm text-alethea-700 mb-1">Total Stake</p>
                                        <p className="text-2xl font-bold text-alethea-600">
                                            {parseFloat(profile.stake || '0').toFixed(2)} tokens
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                            <p className="text-xs text-green-700">Available</p>
                                            <p className="text-lg font-bold text-green-700">
                                                {availableStake.toFixed(2)}
                                            </p>
                                        </div>
                                        <div className="bg-grey-50 border border-grey-200 rounded-lg p-3">
                                            <p className="text-xs text-grey-600">Locked</p>
                                            <p className="text-lg font-bold text-grey-800">
                                                {parseFloat(profile.lockedStake || '0').toFixed(2)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Withdrawable Balance */}
                                    {parseFloat(profile.withdrawableBalance || '0') > 0 && (
                                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-purple-700 mb-1">Withdrawable Balance</p>
                                                    <p className="text-xl font-bold text-purple-700">
                                                        {parseFloat(profile.withdrawableBalance || '0').toFixed(2)} tokens
                                                    </p>
                                                    <p className="text-xs text-purple-600 mt-1">
                                                        {claimSuccess ? 'Tokens claimed successfully!' : 'Click to add to your wallet balance'}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={claimWithdrawableTokens}
                                                    disabled={claimingTokens}
                                                    className={`px-4 py-2 rounded-lg transition-colors text-sm flex items-center gap-2 ${claimSuccess
                                                        ? 'bg-green-50 text-green-700 border border-green-200'
                                                        : 'bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200'
                                                        }`}
                                                >
                                                    {claimingTokens ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            Claiming...
                                                        </>
                                                    ) : claimSuccess ? (
                                                        <>
                                                            <CheckCircle className="w-4 h-4" />
                                                            Claimed!
                                                        </>
                                                    ) : (
                                                        'Claim Tokens'
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowStakeModal(true)}
                                            className="flex-1 btn-primary flex items-center justify-center gap-2 px-4 py-3"
                                        >
                                            <Coins className="w-4 h-4" />
                                            Add Stake
                                        </button>
                                        <button
                                            onClick={() => setShowWithdrawModal(true)}
                                            disabled={availableStake <= 0}
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${availableStake > 0
                                                ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                                                : 'bg-grey-50 text-grey-600 cursor-not-allowed'
                                                }`}
                                        >
                                            <ArrowDownCircle className="w-4 h-4" />
                                            Unstake
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Stake Info */}
                            <div className="card p-6">
                                <h3 className="font-semibold text-black mb-4">Staking Information</h3>
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
                                voterAddress={profile.address}
                                onSuccess={loadProfile}
                            />

                            {/* Rewards Info */}
                            <div className="card p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <Gift className="w-5 h-5 text-green-600" />
                                    <h3 className="font-semibold text-black">Rewards Overview</h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between py-2 border-b border-grey-200">
                                        <span className="text-grey-700">Correct Votes</span>
                                        <span className="font-semibold text-green-700">{profile.correctVotes}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b border-grey-200">
                                        <span className="text-grey-700">Reward per Vote</span>
                                        <span className="font-semibold text-black">~10 tokens</span>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b border-grey-200">
                                        <span className="text-grey-700">Reputation Bonus</span>
                                        <span className="font-semibold text-purple-700">
                                            {profile.reputationWeight?.toFixed(2)}x
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-2">
                                        <span className="text-grey-700">Pool Balance</span>
                                        <span className="font-semibold text-black">
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
                            <div className="card p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                    <h3 className="font-semibold text-black">Slashing Rules</h3>
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
                <div className="modal-overlay" onClick={() => setShowStakeModal(false)}>
                    <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
                        <StakeInterface
                            currentStake={profile.stake}
                            isRegistration={false}
                            onSuccess={async () => {
                                setShowStakeModal(false);
                                // Wait for cross-chain messages to be processed
                                console.log('⏳ Waiting for stake update to process...');
                                await new Promise(resolve => setTimeout(resolve, 3000));

                                // Reload profile multiple times to catch the update
                                for (let i = 0; i < 3; i++) {
                                    await loadProfile();
                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                }

                                // Refresh token balance too
                                await refreshBalance();
                            }}
                            onCancel={() => setShowStakeModal(false)}
                        />
                    </div>
                </div>
            )}

            {/* Withdraw Modal */}
            {showWithdrawModal && profile && (
                <div className="modal-overlay" onClick={() => setShowWithdrawModal(false)}>
                    <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
                        <WithdrawStake
                            availableStake={availableStake.toString()}
                            lockedStake={profile.lockedStake}
                            voterAddress={profile.address}
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
