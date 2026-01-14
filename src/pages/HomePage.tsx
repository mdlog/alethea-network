import { useState, useEffect } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { Users, Activity, Award, TrendingUp, Loader2, Clock, Eye, ChevronRight, Bell, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import VoteModal from '../components/VoteModal';
import QueryDetailModal from '../components/QueryDetailModal';
import HeroSlider from '../components/HeroSlider';

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
    const [detailQueryId, setDetailQueryId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'past'>('active');
    const [pastPage, setPastPage] = useState(1);
    const [, setTick] = useState(0);
    const ITEMS_PER_PAGE = 10;

    // Timer update
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        loadData();
    }, []);



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

    // Pagination for past queries
    const totalPastPages = Math.ceil(pastQueries.length / ITEMS_PER_PAGE);
    const paginatedPastQueries = pastQueries.slice(
        (pastPage - 1) * ITEMS_PER_PAGE,
        pastPage * ITEMS_PER_PAGE
    );

    // Get queries for current tab
    const displayQueries = activeTab === 'active' ? activeQueries :
        activeTab === 'upcoming' ? upcomingQueries :
            paginatedPastQueries;

    // Calculate global phase timing (use first active query or defaults)
    const firstActive = activeQueries[0];
    const commitEnd = firstActive ? parseInt(firstActive.commitEnd) : 0;
    const revealEnd = firstActive ? parseInt(firstActive.revealEnd) : 0;

    const globalPhase = firstActive ? getCurrentPhase(commitEnd, revealEnd) : 'ended';
    const commitTimeRemaining = Math.max(0, (commitEnd - now) / 1000);
    const revealTimeRemaining = Math.max(0, (revealEnd - now) / 1000);

    return (
        <div className="space-y-8">
            {/* Hero Slider */}
            <HeroSlider />

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

                            {/* Phase Summary Bar - only show for active tab */}
                            {activeTab === 'active' && activeQueries.length > 0 && (() => {
                                const commitCount = activeQueries.filter(q => getCurrentPhase(parseInt(q.commitEnd), parseInt(q.revealEnd)) === 'commit').length;
                                const revealCount = activeQueries.filter(q => getCurrentPhase(parseInt(q.commitEnd), parseInt(q.revealEnd)) === 'reveal').length;
                                const endedCount = activeQueries.filter(q => getCurrentPhase(parseInt(q.commitEnd), parseInt(q.revealEnd)) === 'ended').length;

                                return (
                                    <div className="flex items-center gap-3">
                                        {commitCount > 0 && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700">
                                                <Lock className="w-3.5 h-3.5" />
                                                <span className="text-sm font-medium">{commitCount} in Commit</span>
                                            </div>
                                        )}
                                        {revealCount > 0 && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-700">
                                                <Eye className="w-3.5 h-3.5" />
                                                <span className="text-sm font-medium">{revealCount} in Reveal</span>
                                            </div>
                                        )}
                                        {endedCount > 0 && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span className="text-sm font-medium">{endedCount} Ended</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Table Header */}
                        <div className={`grid gap-4 px-6 py-3 bg-gray-50 text-sm font-medium text-gray-500 border-b border-gray-100 ${activeTab === 'past' ? 'grid-cols-12' : 'grid-cols-12'}`}>
                            <div className={activeTab === 'past' ? 'col-span-3' : 'col-span-4'}>Vote</div>
                            <div className="col-span-2">{activeTab === 'past' ? 'Your Vote' : 'Phase'}</div>
                            <div className="col-span-2">{activeTab === 'past' ? 'Result' : 'Time Left'}</div>
                            <div className="col-span-2">{activeTab === 'past' ? 'Outcome' : 'Your vote'}</div>
                            <div className={activeTab === 'past' ? 'col-span-3' : 'col-span-2'}>Status</div>
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
                                        onShowDetail={() => setDetailQueryId(query.id)}
                                        isPast={activeTab === 'past'}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Pagination for Past tab */}
                        {activeTab === 'past' && totalPastPages > 1 && (
                            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                                <p className="text-sm text-gray-500">
                                    Showing {(pastPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(pastPage * ITEMS_PER_PAGE, pastQueries.length)} of {pastQueries.length}
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPastPage(p => Math.max(1, p - 1))}
                                        disabled={pastPage === 1}
                                        className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: totalPastPages }, (_, i) => i + 1).map(page => (
                                            <button
                                                key={page}
                                                onClick={() => setPastPage(page)}
                                                className={`w-8 h-8 text-sm font-medium rounded-lg ${page === pastPage
                                                    ? 'bg-blue-600 text-white'
                                                    : 'hover:bg-gray-100 text-gray-600'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setPastPage(p => Math.min(totalPastPages, p + 1))}
                                        disabled={pastPage === totalPastPages}
                                        className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </div>
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

            {/* Query Detail Modal */}
            {detailQueryId && (
                <QueryDetailModal
                    queryId={detailQueryId}
                    onClose={() => setDetailQueryId(null)}
                />
            )}
        </div>
    );
}

// Storage keys for vote tracking (must match VoteModal.tsx)
const REGISTRY_APP_ID = import.meta.env.VITE_REGISTRY_APP_ID || '';
const PENDING_REVEALS_KEY = `alethea_v2_pending_${REGISTRY_APP_ID.substring(0, 16)}`;
const COMPLETED_VOTES_KEY = `alethea_v2_completed_${REGISTRY_APP_ID.substring(0, 16)}`;

function QueryRow({ query, onVote, onShowDetail, isPast = false }: { query: Query; onVote: () => void; onShowDetail: () => void; isPast?: boolean }) {
    const { chainId } = useLinera();
    const commitEnd = parseInt(query.commitEnd);
    const revealEnd = parseInt(query.revealEnd);
    const phase = getCurrentPhase(commitEnd, revealEnd);
    const createdDate = new Date(parseInt(query.deadline) / 1000 - 86400000); // Approximate

    // Check if user has pending reveal or completed vote (per user via chainId)
    const getPendingReveal = () => {
        if (!chainId) return null;
        try {
            const key = `${PENDING_REVEALS_KEY}_${chainId.substring(0, 16)}`;
            const stored = localStorage.getItem(key);
            const reveals = stored ? JSON.parse(stored) : {};
            return reveals[query.id];
        } catch {
            return null;
        }
    };

    const getCompletedVote = () => {
        if (!chainId) return null;
        try {
            const key = `${COMPLETED_VOTES_KEY}_${chainId.substring(0, 16)}`;
            const stored = localStorage.getItem(key);
            const votes = stored ? JSON.parse(stored) : {};
            return votes[query.id];
        } catch {
            return null;
        }
    };

    const pendingReveal = getPendingReveal();
    const completedVote = getCompletedVote();

    // Determine vote state - use Boolean check (handles null AND undefined)
    // If completedVote exists, user has already revealed
    // If pendingReveal exists but no completedVote, user has committed but not revealed
    const hasRevealed = Boolean(completedVote);
    const hasCommitted = Boolean(pendingReveal) && !hasRevealed;
    const userVote = hasRevealed ? completedVote?.value : pendingReveal?.value;

    // Calculate time remaining for current phase
    const now = Date.now() * 1000;
    const commitTimeLeft = Math.max(0, (commitEnd - now) / 1000);
    const revealTimeLeft = Math.max(0, (revealEnd - now) / 1000);
    const currentTimeLeft = phase === 'commit' ? commitTimeLeft : phase === 'reveal' ? revealTimeLeft : 0;

    return (
        <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50">
            {/* Vote Info - Clickable to show detail */}
            <div
                className={`${isPast ? 'col-span-3' : 'col-span-4'} cursor-pointer`}
                onClick={onShowDetail}
            >
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isPast
                        ? query.status === 'Resolved' ? 'bg-green-100' : 'bg-gray-100'
                        : phase === 'commit' ? 'bg-blue-100' : phase === 'reveal' ? 'bg-yellow-100' : 'bg-gray-100'
                        }`}>
                        <span className={`text-xs font-bold ${isPast
                            ? query.status === 'Resolved' ? 'text-green-600' : 'text-gray-600'
                            : phase === 'commit' ? 'text-blue-600' : phase === 'reveal' ? 'text-yellow-600' : 'text-gray-600'
                            }`}>#{query.id}</span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 hover:text-blue-600">{query.description}</p>
                        <p className="text-xs text-gray-500">
                            {phase === 'commit'
                                ? `Commit ends: ${new Date(commitEnd / 1000).toLocaleString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} UTC`
                                : phase === 'reveal'
                                    ? `Reveal ends: ${new Date(revealEnd / 1000).toLocaleString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} UTC`
                                    : `Ended: ${new Date(revealEnd / 1000).toLocaleString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} UTC`
                            }
                        </p>
                    </div>
                </div>
            </div>

            {/* Column 2: Phase (Active) / Your Vote (Past) */}
            <div className="col-span-2">
                {isPast ? (
                    // Past: Show user's vote
                    userVote ? (
                        <span className={`px-2 py-1 rounded text-sm font-medium ${userVote === query.result
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                            }`}>
                            {userVote}
                        </span>
                    ) : (
                        <span className="text-sm text-gray-400">Not voted</span>
                    )
                ) : phase === 'commit' ? (
                    <div className="flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-600">Commit</span>
                    </div>
                ) : phase === 'reveal' ? (
                    <div className="flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-600">Reveal</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-400">Ended</span>
                    </div>
                )}
            </div>

            {/* Column 3: Time Left (Active) / Result (Past) */}
            <div className="col-span-2">
                {isPast ? (
                    // Past: Show query result
                    query.result ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
                            {query.result}
                        </span>
                    ) : (
                        <span className="text-sm text-gray-400">No result</span>
                    )
                ) : phase === 'ended' ? (
                    <span className="text-sm text-gray-400">0s</span>
                ) : (
                    <span className={`text-sm font-mono font-medium ${phase === 'commit' ? 'text-blue-600' : 'text-yellow-600'}`}>
                        {formatTimeRemaining(currentTimeLeft)}
                    </span>
                )}
            </div>

            {/* Column 4: Your vote (Active) / Outcome (Past) */}
            <div className="col-span-2">
                {isPast ? (
                    // Past: Show if user was correct or wrong
                    userVote ? (
                        userVote === query.result ? (
                            <span className="flex items-center gap-1 text-sm text-green-600">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                Correct ✓
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-sm text-red-600">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                Wrong ✗
                            </span>
                        )
                    ) : (
                        <span className="text-sm text-gray-400">-</span>
                    )
                ) : hasCommitted ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-200 rounded">
                        <Lock className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-700">{userVote}</span>
                    </div>
                ) : hasRevealed ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded">
                        <Eye className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700">{userVote}</span>
                    </div>
                ) : (
                    <select
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        defaultValue=""
                        onChange={(e) => {
                            if (e.target.value) onVote();
                        }}
                    >
                        <option value="">Choose</option>
                        {query.outcomes.map((outcome) => (
                            <option key={outcome} value={outcome}>{outcome}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* Vote Status */}
            <div className={`${isPast ? 'col-span-3' : 'col-span-2'} flex items-center justify-between`}>
                <div className="flex items-center gap-1.5">
                    {isPast ? (
                        <>
                            <span className={`w-2 h-2 rounded-full ${query.status === 'Resolved' ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <span className="text-sm text-gray-600">
                                {query.status === 'Resolved' ? 'Resolved' : 'Expired'}
                                {userVote && query.result && (
                                    <span className={`ml-1 ${userVote === query.result ? 'text-green-600' : 'text-red-600'}`}>
                                        ({userVote === query.result ? '+reward' : '-slashed'})
                                    </span>
                                )}
                            </span>
                        </>
                    ) : hasCommitted ? (
                        <>
                            <span className={`w-2 h-2 rounded-full ${phase === 'reveal' ? 'bg-yellow-500 animate-pulse' : 'bg-blue-500'}`} />
                            <span className="text-sm text-blue-600">
                                {phase === 'reveal' ? 'Reveal now' : 'Committed'}
                            </span>
                        </>
                    ) : hasRevealed ? (
                        <>
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-sm text-green-600">Revealed</span>
                        </>
                    ) : (
                        <>
                            <span className={`w-2 h-2 rounded-full ${phase === 'commit' ? 'bg-orange-500' : phase === 'reveal' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
                            <span className="text-sm text-gray-600">
                                {phase === 'commit' ? 'Not voted' : phase === 'reveal' ? 'Missed' : 'Ended'}
                            </span>
                        </>
                    )}
                </div>
                {!isPast && (
                    <button
                        onClick={onVote}
                        className="w-7 h-7 rounded-full border-2 border-red-400 flex items-center justify-center hover:bg-red-50 hover:border-red-500 transition-colors"
                    >
                        <ChevronRight className="w-4 h-4 text-red-500" />
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
