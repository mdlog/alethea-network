'use client';

import { useState, useEffect } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import Header from '@/components/Header';
import { StakeSection } from '@/components/voting/StakeSection';
import { VoteSection } from '@/components/voting/VoteSection';
import { RewardsSection } from '@/components/voting/RewardsSection';
import { ActiveVotesSection } from '@/components/voting/ActiveVotesSection';
import { getMyVoterInfo, claimRewards, getVoters, getActiveMarkets } from '@/lib/graphql';
import { lineraAdapter } from '@/lib/linera-adapter';

interface Query {
    id: number;
    question: string;
    deadline: number; // Original market deadline
    commitEndTime: number;
    revealEndTime: number;
    outcomes: string[];
    phase: 'commit' | 'reveal' | 'ended';
    category?: 'upcoming' | 'active' | 'past';
}

export default function VotingDashboard() {
    const { primaryWallet, user } = useDynamicContext();
    const isAuthenticated = !!user;

    const [loading, setLoading] = useState(true);
    const [voterInfo, setVoterInfo] = useState<any>(null);
    const [queries, setQueries] = useState<Query[]>([]);
    const [upcomingQueries, setUpcomingQueries] = useState<Query[]>([]);
    const [pastQueries, setPastQueries] = useState<Query[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'past'>('active');
    const [isUserRegistered, setIsUserRegistered] = useState(false);
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        if (isAuthenticated) {
            loadVoterData();
        } else {
            setLoading(false);
            setIsUserRegistered(false); // Reset registration status when not authenticated
            // Load real markets even for non-authenticated users
            loadRealMarkets();
        }
    }, [isAuthenticated]);

    // Re-check registration when primaryWallet changes
    useEffect(() => {
        if (isAuthenticated && primaryWallet) {
            console.log('🔄 [Home] Wallet changed, re-checking registration...');
            checkUserRegistration();
        }
    }, [primaryWallet?.address]);

    // Update current time every second for countdown timers
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const loadRealMarkets = async () => {
        try {
            console.log('📊 Loading real markets from Market Chain...');

            // Get active markets from Market Chain
            const marketsData = await getActiveMarkets();
            console.log('✅ Markets loaded:', marketsData);

            if (!marketsData?.activeMarkets || marketsData.activeMarkets.length === 0) {
                console.log('⚠️ No markets found, using empty state');
                setQueries([]);
                setUpcomingQueries([]);
                setPastQueries([]);
                return;
            }

            const now = Date.now();
            const markets = marketsData.activeMarkets;

            // Transform markets to Query format
            const transformedMarkets: Query[] = markets.map((market: any) => {
                // Convert deadline to milliseconds
                // Handle both formats: seconds (10 digits) and microseconds (16 digits)
                let deadlineStr = market.deadline.toString();
                let deadline: number;

                if (deadlineStr.length > 13) {
                    // Microseconds format (16 digits) - convert to milliseconds
                    deadline = parseInt(market.deadline) / 1000;
                    console.log(`Market ${market.id}: ${deadlineStr} (microseconds) → ${deadline} ms`);
                } else if (deadlineStr.length > 10) {
                    // Already in milliseconds
                    deadline = parseInt(market.deadline);
                    console.log(`Market ${market.id}: ${deadlineStr} (milliseconds)`);
                } else {
                    // Seconds format (10 digits) - convert to milliseconds
                    deadline = parseInt(market.deadline) * 1000;
                    console.log(`Market ${market.id}: ${deadlineStr} (seconds) → ${deadline} ms`);
                }

                // Voting phases for oracle resolution
                // If Oracle provides commitEnd/revealEnd, use them; otherwise calculate
                let commitEndTime: number;
                let revealEndTime: number;

                if (market.source === 'oracle' && market.commitEnd && market.revealEnd) {
                    // Oracle provides exact timestamps
                    commitEndTime = parseInt(market.commitEnd);
                    revealEndTime = parseInt(market.revealEnd);
                    console.log(`Market ${market.id}: Using Oracle timestamps - commit: ${commitEndTime}, reveal: ${revealEndTime}`);
                } else {
                    // Calculate from deadline (Market Chain)
                    commitEndTime = deadline + (24 * 60 * 60 * 1000); // 24 hours after deadline
                    revealEndTime = commitEndTime + (24 * 60 * 60 * 1000); // 24 hours after commit
                    console.log(`Market ${market.id}: Calculated timestamps - commit: ${commitEndTime}, reveal: ${revealEndTime}`);
                }

                // Determine phase based on deadline and market status
                // For Oracle Dashboard:
                // - UPCOMING: Market still running (before deadline)
                // - ACTIVE: Market expired, in voting phase (commit or reveal)
                // - PAST: Voting finished or market resolved
                const timeUntilDeadline = deadline - now;
                let phase: 'commit' | 'reveal' | 'ended' = 'ended';
                let category: 'upcoming' | 'active' | 'past' = 'past';

                // Check market status from Market Chain
                const marketStatus = market.status?.toUpperCase() || 'OPEN';

                // Grace period: Show markets that expired within last 365 days in Active tab
                // This allows testing with old queries (increased for development)
                const GRACE_PERIOD = 365 * 24 * 60 * 60 * 1000; // 365 days (1 year)
                const isWithinGracePeriod = now < (revealEndTime + GRACE_PERIOD);

                console.log(`🔍 Market ${market.id} grace period check:`, {
                    now: new Date(now).toISOString(),
                    revealEndTime: new Date(revealEndTime).toISOString(),
                    gracePeriodEnd: new Date(revealEndTime + GRACE_PERIOD).toISOString(),
                    isWithinGracePeriod,
                    marketStatus,
                    daysExpired: Math.floor((now - revealEndTime) / (1000 * 60 * 60 * 24))
                });

                if (marketStatus === 'RESOLVED') {
                    // Market already resolved - goes to Past tab
                    phase = 'ended';
                    category = 'past';
                } else if (now < deadline) {
                    // Market still running (before deadline) - goes to Upcoming tab
                    phase = 'ended'; // Not votable yet
                    category = 'upcoming';
                } else if (now >= deadline && now < commitEndTime) {
                    // Commit phase (deadline passed, within 24h) - goes to Active tab
                    phase = 'commit';
                    category = 'active';
                } else if (now >= commitEndTime && now < revealEndTime) {
                    // Reveal phase (commit ended, within next 24h) - goes to Active tab
                    phase = 'reveal';
                    category = 'active';
                } else if (isWithinGracePeriod && marketStatus !== 'RESOLVED') {
                    // Grace period: Show recently expired markets in Active tab for testing
                    // This allows voting on markets that expired recently
                    phase = 'commit'; // Default to commit phase for grace period
                    category = 'active';
                    console.log(`⚠️ Market ${market.id} in grace period - showing in Active tab`);
                } else {
                    // Voting phases ended (after reveal phase + grace period) - goes to Past tab
                    phase = 'ended';
                    category = 'past';
                }

                console.log(`Market ${market.id} "${market.question}":`, {
                    deadline: new Date(deadline).toISOString(),
                    commitEnd: new Date(commitEndTime).toISOString(),
                    revealEnd: new Date(revealEndTime).toISOString(),
                    status: marketStatus,
                    phase,
                    category,
                    hoursUntilDeadline: Math.round(timeUntilDeadline / (1000 * 60 * 60))
                });

                return {
                    id: market.id,
                    question: market.question,
                    deadline, // Store original deadline
                    commitEndTime,
                    revealEndTime,
                    outcomes: market.outcomes,
                    phase,
                    category,
                };
            });

            // Categorize markets based on Oracle Resolution flow
            // UPCOMING: Market still running (before deadline)
            // ACTIVE: Market expired, ready for oracle voting
            // PAST: Market resolved by voters
            const upcoming = transformedMarkets.filter((m: any) => m.category === 'upcoming');
            const active = transformedMarkets.filter((m: any) => m.category === 'active');
            const past = transformedMarkets.filter((m: any) => m.category === 'past');

            console.log('📋 Categorized markets:', {
                total: transformedMarkets.length,
                upcoming: upcoming.length,
                active: active.length,
                past: past.length
            });
            console.log('📋 Active markets:', active);
            console.log('📋 Upcoming markets:', upcoming);
            console.log('📋 Past markets:', past);

            setQueries(active);
            setUpcomingQueries(upcoming);
            setPastQueries(past);
        } catch (error) {
            console.error('❌ Failed to load markets:', error);
            // Fallback to empty state
            setQueries([]);
            setUpcomingQueries([]);
            setPastQueries([]);
        }
    };

    const loadVoterData = async () => {
        try {
            setLoading(true);

            // Load voter info
            const info = await getMyVoterInfo();
            setVoterInfo(info?.myVoterInfo || null);

            // Load real markets from Market Chain
            await loadRealMarkets();

            // Check registration AFTER markets are loaded
            // This ensures linera adapter is ready
            await checkUserRegistration();
        } catch (err) {
            console.error('Failed to load voter data:', err);
            setIsUserRegistered(false);
        } finally {
            setLoading(false);
        }
    };

    const checkUserRegistration = async () => {
        try {
            console.log('🔍 [Home] Checking user registration...');
            console.log('🔍 [Home] isAuthenticated:', isAuthenticated);
            console.log('🔍 [Home] primaryWallet:', primaryWallet?.address);

            // Wait a bit for linera adapter to be ready
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Check if linera adapter is connected
            if (!lineraAdapter.isChainConnected()) {
                console.log('⚠️ [Home] Linera adapter not connected, trying to connect...');

                // Try to connect if we have primaryWallet
                if (primaryWallet) {
                    try {
                        const FAUCET_URL = process.env.NEXT_PUBLIC_FAUCET_URL || 'https://faucet.testnet-conway.linera.net';
                        await lineraAdapter.connect(primaryWallet, FAUCET_URL);
                        console.log('✅ [Home] Linera adapter connected successfully');
                    } catch (connectError: any) {
                        console.error('❌ [Home] Failed to connect linera adapter:', connectError);

                        // If connection fails, user is not registered (can't check without connection)
                        // But don't block the UI - just show as not registered
                        console.log('💡 [Home] User will need to register to create chain');
                        setIsUserRegistered(false);
                        return;
                    }
                } else {
                    console.log('❌ [Home] No primaryWallet available');
                    setIsUserRegistered(false);
                    return;
                }
            }

            // Get user's chain ID
            const provider = lineraAdapter.getProvider();
            const userChainId = provider.chainId;
            console.log('⛓️ [Home] User chain ID:', userChainId);

            if (!userChainId) {
                console.log('❌ [Home] No chain ID available');
                setIsUserRegistered(false);
                return;
            }

            // Get voters list
            const votersData = await getVoters(100, 0, true);
            console.log('📊 [Home] Voters count:', votersData.voters?.length || 0);
            console.log('📊 [Home] Voters list:', votersData.voters?.map((v: any) => v.address));

            if (!votersData.voters || votersData.voters.length === 0) {
                console.log('❌ [Home] No voters found');
                setIsUserRegistered(false);
                return;
            }

            // Check if user's chain ID is in voters list
            const isRegistered = votersData.voters.some((voter: any) => {
                const voterAddr = voter.address.toLowerCase();
                const userChain = userChainId.toLowerCase();

                console.log(`  [Home] Comparing: ${voterAddr} === ${userChain}`);

                // Exact match
                if (voterAddr === userChain) {
                    console.log('  ✅ [Home] EXACT MATCH FOUND!');
                    return true;
                }

                // Partial match
                if (voterAddr.includes(userChain) || userChain.includes(voterAddr)) {
                    console.log('  ✅ [Home] PARTIAL MATCH FOUND!');
                    return true;
                }

                return false;
            });

            console.log('✅ [Home] Registration check result:', isRegistered ? 'REGISTERED' : 'NOT REGISTERED');
            console.log('📊 [Home] Setting isUserRegistered to:', isRegistered);
            setIsUserRegistered(isRegistered);
            console.log('📊 [Home] isUserRegistered state updated');

            // Force re-render
            if (isRegistered) {
                console.log('🔄 [Home] User is registered, forcing state update');
            }
        } catch (error) {
            console.error('❌ [Home] Error checking registration:', error);
            setIsUserRegistered(false);
        }
    };

    const handleStake = async (amount: string) => {
        // TODO: Implement stake
        console.log('Staking:', amount);
    };

    const handleUnstake = async (amount: string) => {
        // TODO: Implement unstake
        console.log('Unstaking:', amount);
    };

    const handleClaimRewards = async () => {
        try {
            await claimRewards();
            await loadVoterData();
        } catch (err) {
            console.error('Failed to claim rewards:', err);
        }
    };

    const handleCommitVote = async (queryId: number, answer: string) => {
        try {
            console.log('🗳️ Committing vote for query:', queryId, 'outcome:', answer);

            // Check if user is registered
            if (!isUserRegistered) {
                throw new Error('You must be registered as a voter first. Please visit the Voters page to register.');
            }

            // Check wallet connection
            if (!primaryWallet) {
                throw new Error('Please connect your wallet first');
            }

            // Find the query
            const query = queries.find(q => q.id === queryId);
            if (!query) {
                throw new Error('Query not found');
            }

            const outcomeIndex = query.outcomes.indexOf(answer);
            if (outcomeIndex === -1) {
                throw new Error('Invalid outcome');
            }

            console.log('📊 Submitting oracle vote for outcome index:', outcomeIndex);

            // Generate random salt for commit-reveal scheme
            const salt = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

            // Create commit hash: SHA-256(answer + salt)
            const encoder = new TextEncoder();
            const data = encoder.encode(answer + salt);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const commitHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            console.log('🔐 Generated commit hash:', commitHash);

            // Sign the commit with wallet
            console.log('✍️ Requesting wallet signature for commit...');
            const commitMessage = `Commit Vote\n\nQuery ID: ${queryId}\nCommit Hash: ${commitHash}\nTimestamp: ${Date.now()}`;

            let signature: string = '';
            try {
                const sig = await primaryWallet.signMessage(commitMessage);
                if (!sig) {
                    throw new Error('Signature is empty');
                }
                signature = sig;
                console.log('✅ Commit signed:', signature.substring(0, 20) + '...');
            } catch (signError) {
                console.error('❌ User rejected signature:', signError);
                throw new Error('You must sign the transaction to commit your vote');
            }

            // Call blockchain operation (NOT GraphQL mutation)
            const { commitVote } = await import('@/lib/linera-operations');
            const result = await commitVote(queryId, commitHash);

            if (!result.success) {
                throw new Error(result.error || 'Failed to commit vote');
            }

            console.log('✅ Blockchain response:', result.data);

            // Store salt, answer, and signature in localStorage for reveal phase
            localStorage.setItem(`vote_salt_${queryId}`, salt);
            localStorage.setItem(`vote_answer_${queryId}`, answer);
            localStorage.setItem(`vote_commit_signature_${queryId}`, signature);

            alert(`✅ Vote committed successfully!\n\nYour vote for "${answer}" has been committed to the blockchain.\n\nCommit Hash: ${commitHash.substring(0, 16)}...\nSignature: ${signature.substring(0, 16)}...\n\nRemember to reveal your vote during the reveal phase!`);

            console.log('✅ Vote committed successfully');
            console.log('🔐 Salt and signature stored for reveal phase');
        } catch (error) {
            console.error('❌ Failed to commit vote:', error);
            alert(`Failed to commit vote: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleRevealVote = async (queryId: number, answer: string, salt: string) => {
        try {
            console.log('🔓 Revealing vote for query:', queryId);

            // Check if user is registered
            if (!isUserRegistered) {
                throw new Error('You must be registered as a voter first.');
            }

            // Check wallet connection
            if (!primaryWallet) {
                throw new Error('Please connect your wallet first');
            }

            // Get stored salt and answer from commit phase
            const storedSalt = localStorage.getItem(`vote_salt_${queryId}`);
            const storedAnswer = localStorage.getItem(`vote_answer_${queryId}`);
            const storedCommitSignature = localStorage.getItem(`vote_commit_signature_${queryId}`);

            if (!storedSalt || !storedAnswer) {
                throw new Error('No committed vote found. Please commit your vote first.');
            }

            const query = queries.find(q => q.id === queryId);
            if (!query) {
                throw new Error('Query not found');
            }

            const outcomeIndex = query.outcomes.indexOf(storedAnswer);

            console.log('📊 Revealing oracle vote:', {
                queryId,
                outcome: storedAnswer,
                outcomeIndex,
                salt: storedSalt
            });

            // Sign the reveal with wallet
            console.log('✍️ Requesting wallet signature for reveal...');
            const revealMessage = `Reveal Vote\n\nQuery ID: ${queryId}\nValue: ${storedAnswer}\nSalt: ${storedSalt}\nTimestamp: ${Date.now()}`;

            let revealSignature: string = '';
            try {
                const sig = await primaryWallet.signMessage(revealMessage);
                if (!sig) {
                    throw new Error('Signature is empty');
                }
                revealSignature = sig;
                console.log('✅ Reveal signed:', revealSignature.substring(0, 20) + '...');
            } catch (signError) {
                console.error('❌ User rejected signature:', signError);
                throw new Error('You must sign the transaction to reveal your vote');
            }

            // Call blockchain operation (NOT GraphQL mutation)
            const { revealVote } = await import('@/lib/linera-operations');
            const result = await revealVote(queryId, storedAnswer, storedSalt, 100);

            if (!result.success) {
                throw new Error(result.error || 'Failed to reveal vote');
            }

            console.log('✅ Blockchain response:', result.data);

            alert(`✅ Vote revealed successfully!\n\nYour vote for "${storedAnswer}" has been revealed on the blockchain.\n\nReveal Signature: ${revealSignature.substring(0, 16)}...\n\nThe oracle network will now process your vote for resolution.`);

            // Clean up stored data
            localStorage.removeItem(`vote_salt_${queryId}`);
            localStorage.removeItem(`vote_answer_${queryId}`);
            localStorage.removeItem(`vote_commit_signature_${queryId}`);

            console.log('✅ Vote revealed successfully');
            console.log('🧹 Cleaned up localStorage');

            // Refresh data to show updated status
            await loadVoterData();
        } catch (error) {
            console.error('❌ Failed to reveal vote:', error);
            alert(`Failed to reveal vote: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="container mx-auto px-4 py-16 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header onRefresh={loadVoterData} isRefreshing={refreshing} />

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Hero Section */}
                <div className="bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 rounded-xl p-8 mb-8 text-white">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm">
                            <span className="text-2xl">🔮</span>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">
                                Decentralized Oracle Voting
                            </h1>
                            <p className="text-blue-200 text-sm">
                                Powered by Linera Blockchain
                            </p>
                        </div>
                    </div>
                    <p className="text-lg text-blue-100">
                        Participate in oracle queries, earn rewards for accurate predictions, and help secure the truth on-chain
                    </p>
                </div>

                {/* How it works */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">How it works:</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <StakeSection
                            stakedAmount={voterInfo?.stake || '0'}
                            totalStake={voterInfo?.stake || '0'}
                            onStake={handleStake}
                            onUnstake={handleUnstake}
                        />

                        <VoteSection
                            votesCount={voterInfo?.totalVotes || 0}
                            apr="0%"
                        />

                        <RewardsSection
                            unclaimedRewards="0"
                            onClaim={handleClaimRewards}
                        />
                    </div>
                </div>

                {/* Votes Section with Tabs */}
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Votes</h2>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-6 border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('active')}
                            className={`px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'active'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                            title="Markets in active voting phase"
                        >
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                Active ({queries.length})
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('upcoming')}
                            className={`px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'upcoming'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                            title="Markets still running (deadline not reached)"
                        >
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                                Upcoming ({upcomingQueries.length})
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('past')}
                            className={`px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'past'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                            title="Markets that have expired or been resolved"
                        >
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                                Past ({pastQueries.length})
                            </div>
                        </button>
                    </div>

                    {/* Warning Banners */}
                    {!isAuthenticated && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <div>
                                    <h4 className="font-semibold text-yellow-900 mb-1">Connect Wallet to Vote</h4>
                                    <p className="text-sm text-yellow-800">
                                        Connect your wallet to participate in voting and earn rewards
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {isAuthenticated && !isUserRegistered && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-blue-900 mb-1">Register as Voter</h4>
                                    <p className="text-sm text-blue-800 mb-3">
                                        You need to register as a voter before you can participate in voting
                                    </p>
                                    <a
                                        href="/voters"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                    >
                                        Register Now
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab Content */}
                    {activeTab === 'active' && (
                        <>
                            {queries.length === 0 ? (
                                <div className="bg-white rounded-lg p-12 text-center">
                                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Voting</h3>
                                    <p className="text-gray-600">
                                        Markets in active voting will appear here. Check Upcoming tab for markets that haven't expired yet, or Past tab for completed markets.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                                        <div className="flex items-start gap-3">
                                            <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div>
                                                <h4 className="font-semibold text-green-900 mb-1">Active Voting Phase</h4>
                                                <p className="text-sm text-green-800">
                                                    These markets have expired and are now in the voting phase. Commit your vote during the commit phase (24h), then reveal during the reveal phase (next 24h).
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <ActiveVotesSection
                                        queries={queries}
                                        onCommitVote={handleCommitVote}
                                        onRevealVote={handleRevealVote}
                                        isAuthenticated={isAuthenticated}
                                    />
                                </>
                            )}
                        </>
                    )}

                    {activeTab === 'upcoming' && (
                        <div className="space-y-3">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <h4 className="font-semibold text-yellow-900 mb-1">Markets Still Running</h4>
                                        <p className="text-sm text-yellow-800">
                                            These markets are still active and haven't reached their deadline yet. You cannot vote on them until they expire.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            {upcomingQueries.length === 0 ? (
                                <div className="bg-white rounded-lg p-12 text-center">
                                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Upcoming Markets</h3>
                                    <p className="text-gray-600">All markets have reached their deadline</p>
                                </div>
                            ) : (
                                upcomingQueries.map((query) => {
                                    // Calculate time until deadline (when voting starts)
                                    const timeUntilDeadline = query.deadline - currentTime;

                                    // Calculate days, hours, minutes, seconds
                                    const days = Math.floor(timeUntilDeadline / (1000 * 60 * 60 * 24));
                                    const hours = Math.floor((timeUntilDeadline % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                    const minutes = Math.floor((timeUntilDeadline % (1000 * 60 * 60)) / (1000 * 60));
                                    const seconds = Math.floor((timeUntilDeadline % (1000 * 60)) / 1000);

                                    return (
                                        <div key={query.id} className="bg-white rounded-lg border border-gray-200 p-6">
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-gray-900 mb-2">{query.question}</h4>
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span>Voting starts in:</span>
                                                        <span className="font-mono font-semibold text-yellow-700">
                                                            {days > 0 && `${days}d `}
                                                            {String(hours).padStart(2, '0')}h {String(minutes).padStart(2, '0')}m {String(seconds).padStart(2, '0')}s
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 flex gap-2">
                                                        {query.outcomes.map((outcome, idx) => (
                                                            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                                                {outcome}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                                                    Upcoming
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {activeTab === 'past' && (
                        <div className="space-y-3">
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-1">Expired & Resolved Markets</h4>
                                        <p className="text-sm text-gray-600">
                                            These markets have reached their deadline or have been resolved. Markets that expired are waiting for oracle resolution.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            {pastQueries.length === 0 ? (
                                <div className="bg-white rounded-lg p-12 text-center">
                                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Resolved Markets Yet</h3>
                                    <p className="text-gray-600">Resolved markets will appear here after oracle voting completes</p>
                                </div>
                            ) : (
                                pastQueries.map((query) => (
                                    <div key={query.id} className="bg-white rounded-lg border border-gray-200 p-6">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-gray-900 mb-2">{query.question}</h4>
                                                <p className="text-sm text-gray-500">
                                                    Ended {Math.floor((Date.now() - query.revealEndTime) / (1000 * 60 * 60))} hours ago
                                                </p>
                                            </div>
                                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                                Resolved
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
