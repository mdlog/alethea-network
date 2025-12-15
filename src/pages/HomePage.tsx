import { useState, useEffect, useCallback } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { useGlobalRefresh } from '../contexts/TokenContext';
import { Users, Activity, Award, TrendingUp, Loader2, Clock, Eye, ChevronRight, Bell, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import VoteModal from '../components/VoteModal';

interface Stats {
    totalVoters: number;
    activeVoters: number;
    totalQueriesCreated: number;
    totalQueriesResolved: number;
    totalStake: string;
}

interface Query {
    id: string;
    description: string;
    outcomes: string[];
    deadline: string;
    commitEnd: string;
    revealEnd: string;
    status: string;
    voteCount: number;
    result?: string;
}

// Format time remaining with full detail (days, hours, minutes, seconds)
function formatTimeRemaining(ms: number): string {
    if (ms <= 0) return 'Ended';

    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(' ');
}

// Get current phase
function getCurrentPhase(commitEnd: number, revealEnd: number): 'commit' | 'reveal' | 'ended' {
    const now = Date.now() * 1000;
    if (now < commitEnd) return 'commit';
    if (now < revealEnd) return 'reveal';
    return 'ended';
}

// Calculate progress percentage
function calculateProgress(start: number, end: number): number {
    const now = Date.now() * 1000;
    if (now >= end) return 100;
    if (now <= start) return 0;
    return ((now - start) / (end - start)) * 100;
}

export default function HomePage() {
    const { chainId, walletExists, application, executeAppChainQuery } = useLinera();
    const [stats, setStats] = useState<Stats | null>(null);
    const [queries, setQueries] = useState<Query[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
    const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'past'>('active');
    const [, setTick] = useState(0);

    // Timer update
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        loadData();
    }, []);

    // Listen for global refresh events (triggered after stake/register/transfer)
    const handleGlobalRefresh = useCallback(() => {
        console.log('🔄 HomePage: Global refresh triggered');
        loadData();
    }, []);
    useGlobalRefresh(handleGlobalRefresh);

    const loadData = async () => {
        try {
            const data = await executeAppChainQuery(`
                query {
                    statistics {
                        totalVoters
                        activeVoters
                        totalQueriesCreated
                        totalQueriesResolved
                    }
                    totalStake
                    queries {
                        id
                        description
                        outcomes
                        deadline
                        commitEnd
                        revealEnd
                        status
                        voteCount
                        result
                    }
                }
            `);

            setStats({
                totalVoters: data?.statistics?.totalVoters || 0,
                activeVoters: data?.statistics?.activeVoters || 0,
                totalQueriesCreated: data?.statistics?.totalQueriesCreated || 0,
                totalQueriesResolved: data?.statistics?.totalQueriesResolved || 0,
                totalStake: data?.totalStake || '0',
            });
            setQueries(data?.queries || []);
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            setLoading(false);
        }
    };

    const now = Date.now() * 1000;

    // Filter queries by tab
    const activeQueries = queries.filter(q => {
        if (q.status !== 'Active') return false;
        const revealEnd = parseInt(q.revealEnd);
        return now < revealEnd; // Still in voting period
    });

    const upcomingQueries = queries.filter(q => {
        // Queries in early commit phase (less than 10% elapsed)
        if (q.status !== 'Active') return false;
        const commitEnd = parseInt(q.commitEnd);
        const revealEnd = parseInt(q.revealEnd);
        const totalDuration = revealEnd - commitEnd;
        const elapsed = now - (commitEnd - totalDuration);
        return elapsed < totalDuration * 0.1 && now < commitEnd;
    });

    const pastQueries = queries.filter(q =>
        q.status === 'Resolved' || q.status === 'Expired' ||
        (q.status === 'Active' && now >= parseInt(q.revealEnd))
    );

    // Get queries for current tab
    const displayQueries = activeTab === 'active' ? activeQueries :
        activeTab === 'upcoming' ? upcomingQueries :
            pastQueries;

    // Calculate global phase timing (use first active query or defaults)
    const firstActive = activeQueries[0];
    const commitEnd = firstActive ? parseInt(firstActive.commitEnd) : 0;
    const revealEnd = firstActive ? parseInt(firstActive.revealEnd) : 0;

    const globalPhase = firstActive ? getCurrentPhase(commitEnd, revealEnd) : 'ended';
    const commitTimeRemaining = Math.max(0, (commitEnd - now) / 1000);
    const revealTimeRemaining = Math.max(0, (revealEnd - now) / 1000);

    return (
        <div className="space-y-8">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 left-0 w-72 h-72 bg-blue-500 rounded-full filter blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500 rounded-full filter blur-3xl translate-x-1/3 translate-y-1/3"></div>
                    <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-400 rounded-full filter blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
                </div>

                {/* Grid Pattern Overlay */}
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                    backgroundSize: '50px 50px'
                }}></div>

                <div className="relative px-8 py-12 md:py-16">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        {/* Left Content */}
                        <div className="flex-1 text-center md:text-left">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                <span className="text-sm text-blue-200 font-medium">Live on Linera Testnet</span>
                            </div>

                            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                                Alethea <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Network</span>
                            </h1>

                            <p className="text-xl md:text-2xl text-blue-200 mb-8 max-w-xl">
                                Decentralized Oracle Protocol powered by Linera's microchain architecture.
                                Secure, scalable, and community-driven truth verification.
                            </p>

                            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                                {walletExists && chainId ? (
                                    <div className="flex items-center gap-3 px-5 py-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                                        <div>
                                            <p className="text-xs text-blue-300">Connected</p>
                                            <p className="font-mono text-sm text-white">{chainId.slice(0, 8)}...{chainId.slice(-6)}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <Link to="/voters" className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:from-cyan-400 hover:to-blue-400 transition-all shadow-lg shadow-cyan-500/25">
                                        Get Started
                                    </Link>
                                )}
                                <Link to="/queries" className="px-6 py-3 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-all">
                                    Explore Queries
                                </Link>
                            </div>
                        </div>

                        {/* Right Stats */}
                        <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 text-center">
                                <p className="text-4xl font-bold text-white">{stats?.totalVoters || 0}</p>
                                <p className="text-base text-blue-300">Active Voters</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 text-center">
                                <p className="text-4xl font-bold text-white">{activeQueries.length}</p>
                                <p className="text-base text-blue-300">Live Queries</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 text-center">
                                <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                                    {formatStake(stats?.totalStake || '0')}
                                </p>
                                <p className="text-base text-blue-300">Total Staked</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 text-center">
                                <p className="text-4xl font-bold text-white">{stats?.totalQueriesResolved || 0}</p>
                                <p className="text-base text-blue-300">Resolved</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                            icon={<Users className="w-5 h-5" />}
                            label="Total Voters"
                            value={stats?.totalVoters?.toString() || '0'}
                            color="blue"
                        />
                        <StatCard
                            icon={<Activity className="w-5 h-5" />}
                            label="Active Queries"
                            value={activeQueries.length.toString()}
                            color="green"
                        />
                        <StatCard
                            icon={<Award className="w-5 h-5" />}
                            label="Total Staked"
                            value={formatStake(stats?.totalStake || '0')}
                            color="purple"
                        />
                        <StatCard
                            icon={<TrendingUp className="w-5 h-5" />}
                            label="Resolved"
                            value={stats?.totalQueriesResolved?.toString() || '0'}
                            color="orange"
                        />
                    </div>

                    {/* Votes Section with Tabs */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            {/* Tabs */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                                    <button
                                        onClick={() => setActiveTab('active')}
                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'active'
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        Active ({activeQueries.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('upcoming')}
                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'upcoming'
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        Upcoming ({upcomingQueries.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('past')}
                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'past'
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        Past ({pastQueries.length})
                                    </button>
                                </div>
                                <Link to="/queries" className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1">
                                    <Bell className="w-4 h-4" />
                                    Remind me
                                </Link>
                            </div>

                            {/* Phase Progress Bar - only show for active tab */}
                            {activeTab === 'active' && activeQueries.length > 0 && (
                                <div className="flex items-center gap-4">
                                    {globalPhase === 'commit' ? (
                                        <>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500 text-white">
                                                    <Clock className="w-4 h-4" />
                                                    <span className="text-sm font-medium">
                                                        Commit Phase: {formatTimeRemaining(commitTimeRemaining)} remaining
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Eye className="w-4 h-4" />
                                                <span className="text-sm">
                                                    Reveal starts in: <strong>{formatTimeRemaining(commitTimeRemaining)}</strong>
                                                </span>
                                            </div>
                                        </>
                                    ) : globalPhase === 'reveal' ? (
                                        <>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500 text-white">
                                                    <Eye className="w-4 h-4" />
                                                    <span className="text-sm font-medium">
                                                        Reveal Phase: {formatTimeRemaining(revealTimeRemaining)} remaining
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Clock className="w-4 h-4" />
                                                <span className="text-sm">
                                                    Voting ends in: <strong>{formatTimeRemaining(revealTimeRemaining)}</strong>
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-400 text-white">
                                                <Clock className="w-4 h-4" />
                                                <span className="text-sm font-medium">
                                                    Voting Ended
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-base font-medium text-gray-500 border-b border-gray-100">
                            <div className="col-span-6">Vote</div>
                            <div className="col-span-3">{activeTab === 'past' ? 'Result' : 'Your vote'}</div>
                            <div className="col-span-3">{activeTab === 'past' ? 'Status' : 'Vote status'}</div>
                        </div>

                        {/* Query List */}
                        {displayQueries.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p>
                                    {activeTab === 'active' && 'No active votes at the moment'}
                                    {activeTab === 'upcoming' && 'No upcoming votes'}
                                    {activeTab === 'past' && 'No past votes yet'}
                                </p>
                                {activeTab === 'active' && (
                                    <Link to="/queries" className="text-blue-600 hover:underline mt-2 inline-block">
                                        Create a new query
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {displayQueries.map((query) => (
                                    <QueryRow
                                        key={query.id}
                                        query={query}
                                        onVote={() => setSelectedQuery(query)}
                                        isPast={activeTab === 'past'}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick Links */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link
                            to="/voters"
                            className="bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Become a Voter</h3>
                                    <p className="text-base text-gray-500">Register to participate and earn rewards</p>
                                </div>
                                <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-blue-600" />
                            </div>
                        </Link>
                        <Link
                            to="/queries"
                            className="bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Create Query</h3>
                                    <p className="text-base text-gray-500">Submit questions for the oracle network</p>
                                </div>
                                <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-blue-600" />
                            </div>
                        </Link>
                    </div>
                </>
            )}

            {/* Vote Modal */}
            {selectedQuery && (
                <VoteModal
                    query={{
                        ...selectedQuery,
                        deadline: parseInt(selectedQuery.deadline),
                        commitPhaseEnd: parseInt(selectedQuery.commitEnd),
                        revealPhaseEnd: parseInt(selectedQuery.revealEnd),
                    }}
                    onClose={() => setSelectedQuery(null)}
                    onSuccess={() => {
                        setSelectedQuery(null);
                        loadData();
                    }}
                />
            )}
        </div>
    );
}

function QueryRow({ query, onVote, isPast = false }: { query: Query; onVote: () => void; isPast?: boolean }) {
    const commitEnd = parseInt(query.commitEnd);
    const revealEnd = parseInt(query.revealEnd);
    const phase = getCurrentPhase(commitEnd, revealEnd);
    const createdDate = new Date(parseInt(query.deadline) / 1000 - 86400000); // Approximate

    // Check if user has pending reveal or completed vote
    const getPendingReveal = () => {
        try {
            const stored = localStorage.getItem('alethea_pending_reveals');
            const reveals = stored ? JSON.parse(stored) : {};
            return reveals[query.id];
        } catch {
            return null;
        }
    };

    const getCompletedVote = () => {
        try {
            const stored = localStorage.getItem('alethea_completed_votes');
            const votes = stored ? JSON.parse(stored) : {};
            return votes[query.id];
        } catch {
            return null;
        }
    };

    const pendingReveal = getPendingReveal();
    const completedVote = getCompletedVote();
    const userVote = completedVote?.value || pendingReveal?.value;

    return (
        <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50">
            {/* Vote Info */}
            <div className="col-span-6">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPast
                        ? query.status === 'Resolved' ? 'bg-green-100' : 'bg-gray-100'
                        : 'bg-blue-100'
                        }`}>
                        <Activity className={`w-5 h-5 ${isPast
                            ? query.status === 'Resolved' ? 'text-green-600' : 'text-gray-600'
                            : 'text-blue-600'
                            }`} />
                    </div>
                    <div>
                        <p className="text-base font-medium text-gray-900 line-clamp-1">{query.description}</p>
                        <p className="text-sm text-gray-500">
                            Alethea | {createdDate.toLocaleDateString()} {createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Your Vote / Result */}
            <div className="col-span-3">
                {isPast ? (
                    <div className="text-base">
                        {query.result ? (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                                {query.result}
                            </span>
                        ) : (
                            <span className="text-gray-400">No result</span>
                        )}
                    </div>
                ) : userVote ? (
                    // User has already voted - show locked vote
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <Lock className="w-4 h-4 text-blue-600" />
                        <span className="text-base font-medium text-blue-700">{userVote}</span>
                    </div>
                ) : (
                    <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                        defaultValue=""
                        onChange={(e) => {
                            if (e.target.value) onVote();
                        }}
                    >
                        <option value="">Choose answer</option>
                        {query.outcomes.map((outcome) => (
                            <option key={outcome} value={outcome}>{outcome}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* Vote Status */}
            <div className="col-span-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {isPast ? (
                        <>
                            <span className={`w-2 h-2 rounded-full ${query.status === 'Resolved' ? 'bg-green-500' : 'bg-gray-400'
                                }`} />
                            <span className="text-base text-gray-600">
                                {query.status === 'Resolved' ? 'Resolved' : 'Expired'}
                            </span>
                        </>
                    ) : (
                        <>
                            <span className={`w-2 h-2 rounded-full ${phase === 'commit' ? 'bg-red-500' :
                                phase === 'reveal' ? 'bg-yellow-500' :
                                    'bg-gray-400'
                                }`} />
                            <span className="text-base text-gray-600">
                                {phase === 'commit' ? 'Requires signature' :
                                    phase === 'reveal' ? 'Reveal pending' :
                                        'Ended'}
                            </span>
                        </>
                    )}
                </div>
                {!isPast && (
                    <button
                        onClick={onVote}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                    >
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                )}
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, color }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: 'blue' | 'green' | 'purple' | 'orange';
}) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600',
        orange: 'bg-orange-50 text-orange-600',
    };

    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>
                {icon}
            </div>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
    );
}

function formatStake(stake: string): string {
    const cleanStake = stake.endsWith('.') ? stake.slice(0, -1) : stake;
    let num = parseFloat(cleanStake);
    if (isNaN(num) || num === 0) return '0';
    // If value is very large (> 1e15), it's likely in attos, divide by 10^18
    if (num > 1e15) {
        num = num / 1e18;
    }
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
}
