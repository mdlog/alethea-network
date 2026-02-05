import { useState, useEffect } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { Users, Activity, Award, TrendingUp, Loader2, Clock, Eye, ChevronRight, Bell, Lock, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import VoteModal from '../components/VoteModal';
import QueryDetailModal from '../components/QueryDetailModal';
import HeroSlider from '../components/HeroSlider';
import ReminderModal from '../components/ReminderModal';

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

export default function HomePage() {
    const { chainId, executeAppChainQuery } = useLinera();
    const [stats, setStats] = useState<Stats | null>(null);
    const [queries, setQueries] = useState<Query[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
    const [detailQueryId, setDetailQueryId] = useState<string | null>(null);
    const [reminderQuery, setReminderQuery] = useState<Query | null>(null);
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
        return now < revealEnd;
    });

    const upcomingQueries = queries.filter(q => {
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

    return (
        <div className="space-y-4 sm:space-y-6 md:space-y-8">
            {/* Hero Slider */}
            <HeroSlider />

            {/* Stats Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-8 sm:py-12">
                    <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-alethea-500" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                        <StatCard
                            icon={<Users className="w-5 h-5" />}
                            label="Total Voters"
                            value={stats?.totalVoters?.toString() || '0'}
                            color="teal"
                        />
                        <StatCard
                            icon={<Activity className="w-5 h-5" />}
                            label="Active Queries"
                            value={activeQueries.length.toString()}
                            color="cyan"
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
                            color="emerald"
                        />
                    </div>

                    {/* Votes Section with Tabs */}
                    <div className="card overflow-hidden">
                        <div className="p-3 sm:p-4 md:p-6 border-b border-grey-200">
                            {/* Tabs */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 sm:mb-4">
                                <div className="flex gap-1 bg-grey-100 p-1 rounded-lg overflow-x-auto no-scrollbar">
                                    <button
                                        onClick={() => setActiveTab('active')}
                                        className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'active'
                                            ? 'bg-white text-black shadow-sm'
                                            : 'text-grey-600 hover:text-black'
                                            }`}
                                    >
                                        Active ({activeQueries.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('upcoming')}
                                        className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'upcoming'
                                            ? 'bg-white text-black shadow-sm'
                                            : 'text-grey-600 hover:text-black'
                                            }`}
                                    >
                                        Upcoming ({upcomingQueries.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('past')}
                                        className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'past'
                                            ? 'bg-white text-black shadow-sm'
                                            : 'text-grey-600 hover:text-black'
                                            }`}
                                    >
                                        Past ({pastQueries.length})
                                    </button>
                                </div>
                                <button
                                    onClick={() => activeQueries.length > 0 && setReminderQuery(activeQueries[0])}
                                    className="text-alethea-600 hover:text-alethea-700 text-xs sm:text-sm flex items-center gap-1 self-end sm:self-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={activeQueries.length === 0}
                                >
                                    <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    <span className="hidden sm:inline">Remind me</span>
                                    <span className="sm:hidden">Remind</span>
                                </button>
                            </div>

                            {/* Phase Summary Bar - only show for active tab */}
                            {activeTab === 'active' && activeQueries.length > 0 && (() => {
                                const commitCount = activeQueries.filter(q => getCurrentPhase(parseInt(q.commitEnd), parseInt(q.revealEnd)) === 'commit').length;
                                const revealCount = activeQueries.filter(q => getCurrentPhase(parseInt(q.commitEnd), parseInt(q.revealEnd)) === 'reveal').length;
                                const endedCount = activeQueries.filter(q => getCurrentPhase(parseInt(q.commitEnd), parseInt(q.revealEnd)) === 'ended').length;

                                return (
                                    <div className="flex items-center gap-3">
                                        {commitCount > 0 && (
                                            <div className="badge-info">
                                                <Lock className="w-3.5 h-3.5" />
                                                <span>{commitCount} in Commit</span>
                                            </div>
                                        )}
                                        {revealCount > 0 && (
                                            <div className="badge-warning">
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>{revealCount} in Reveal</span>
                                            </div>
                                        )}
                                        {endedCount > 0 && (
                                            <div className="badge-neutral">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span>{endedCount} Ended</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Table Header - Hidden on mobile */}
                        <div className={`hidden md:grid gap-4 px-4 md:px-6 py-3 bg-grey-50 text-xs font-medium text-grey-600 uppercase tracking-wider border-b border-grey-200 ${activeTab === 'past' ? 'grid-cols-12' : 'grid-cols-12'}`}>
                            <div className={activeTab === 'past' ? 'col-span-3' : 'col-span-4'}>Query</div>
                            <div className="col-span-2">{activeTab === 'past' ? 'Your Vote' : 'Phase'}</div>
                            <div className="col-span-2">{activeTab === 'past' ? 'Result' : 'Time Left'}</div>
                            <div className="col-span-2">{activeTab === 'past' ? 'Outcome' : 'Your vote'}</div>
                            <div className={activeTab === 'past' ? 'col-span-3' : 'col-span-2'}>Status</div>
                        </div>

                        {/* Query List */}
                        {displayQueries.length === 0 ? (
                            <div className="p-8 sm:p-12 text-center">
                                <Activity className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-grey-400" />
                                <p className="text-sm sm:text-base text-grey-600">
                                    {activeTab === 'active' && 'No active votes at the moment'}
                                    {activeTab === 'upcoming' && 'No upcoming votes'}
                                    {activeTab === 'past' && 'No past votes yet'}
                                </p>
                                {activeTab === 'active' && (
                                    <Link to="/queries" className="text-alethea-600 hover:text-alethea-700 mt-2 inline-block text-sm sm:text-base">
                                        Create a new query
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <div className="divide-y divide-grey-200">
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
                            <div className="flex items-center justify-between px-6 py-4 border-t border-grey-200">
                                <p className="text-sm text-grey-600">
                                    Showing {(pastPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(pastPage * ITEMS_PER_PAGE, pastQueries.length)} of {pastQueries.length}
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPastPage(p => Math.max(1, p - 1))}
                                        disabled={pastPage === 1}
                                        className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: totalPastPages }, (_, i) => i + 1).map(page => (
                                            <button
                                                key={page}
                                                onClick={() => setPastPage(page)}
                                                className={`w-8 h-8 text-sm font-medium rounded-lg ${page === pastPage
                                                    ? 'bg-alethea-500 text-white'
                                                    : 'hover:bg-grey-100 text-grey-600'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setPastPage(p => Math.min(totalPastPages, p + 1))}
                                        disabled={pastPage === totalPastPages}
                                        className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick Links */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <Link
                            to="/voters"
                            className="card hover:shadow-md p-4 sm:p-5 md:p-6 group transition-shadow"
                        >
                            <div className="flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1 sm:mb-2">
                                        <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-alethea-600 flex-shrink-0" />
                                        <h3 className="text-sm sm:text-base md:text-lg font-semibold text-black truncate">Become a Voter</h3>
                                    </div>
                                    <p className="text-xs sm:text-sm text-grey-600 line-clamp-1">Register to participate and earn rewards</p>
                                </div>
                                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-grey-400 group-hover:text-alethea-600 transition-colors flex-shrink-0 ml-2" />
                            </div>
                        </Link>
                        <Link
                            to="/queries"
                            className="card hover:shadow-md p-4 sm:p-5 md:p-6 group transition-shadow"
                        >
                            <div className="flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1 sm:mb-2">
                                        <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                                        <h3 className="text-sm sm:text-base md:text-lg font-semibold text-black truncate">Create Query</h3>
                                    </div>
                                    <p className="text-xs sm:text-sm text-grey-600 line-clamp-1">Submit questions for the oracle network</p>
                                </div>
                                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-grey-400 group-hover:text-blue-600 transition-colors flex-shrink-0 ml-2" />
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

            {/* Reminder Modal */}
            {reminderQuery && (
                <ReminderModal
                    isOpen={true}
                    onClose={() => setReminderQuery(null)}
                    queryId={reminderQuery.id}
                    queryDescription={reminderQuery.description}
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
    const hasRevealed = Boolean(completedVote);
    const hasCommitted = Boolean(pendingReveal) && !hasRevealed;
    const userVote = hasRevealed ? completedVote?.value : pendingReveal?.value;

    const now = Date.now() * 1000;
    const commitTimeLeft = Math.max(0, (commitEnd - now) / 1000);
    const revealTimeLeft = Math.max(0, (revealEnd - now) / 1000);
    const currentTimeLeft = phase === 'commit' ? commitTimeLeft : phase === 'reveal' ? revealTimeLeft : 0;

    const getQuestionText = () => {
        const questionMatch = query.description.match(/^([^?]+\?)/);
        return questionMatch ? questionMatch[1] : query.description.split('Source:')[0].split('.')[0].trim();
    };

    return (
        <>
            {/* Mobile Card View */}
            <div className="md:hidden p-3 sm:p-4 border-b border-grey-100 hover:bg-grey-50 transition-colors">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2 mb-2" onClick={onShowDetail}>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isPast
                            ? query.status === 'Resolved' ? 'bg-emerald-500/20' : 'bg-grey-100'
                            : phase === 'commit' ? 'bg-blue-500/20' : phase === 'reveal' ? 'bg-amber-500/20' : 'bg-grey-100'
                            }`}>
                            <span className={`text-[10px] sm:text-xs font-bold ${isPast
                                ? query.status === 'Resolved' ? 'text-emerald-600' : 'text-grey-600'
                                : phase === 'commit' ? 'text-blue-600' : phase === 'reveal' ? 'text-amber-600' : 'text-grey-600'
                                }`}>#{query.id}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-medium text-black">
                                {getQuestionText()}
                            </p>
                        </div>
                    </div>
                    {/* Phase Badge */}
                    {!isPast && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] sm:text-xs font-medium flex-shrink-0 ${phase === 'commit' ? 'bg-blue-100 text-blue-700' :
                            phase === 'reveal' ? 'bg-amber-100 text-amber-700' :
                                'bg-grey-100 text-grey-600'
                            }`}>
                            {phase === 'commit' ? <Lock className="w-3 h-3" /> :
                                phase === 'reveal' ? <Eye className="w-3 h-3" /> :
                                    <Clock className="w-3 h-3" />}
                            <span className="capitalize">{phase}</span>
                        </div>
                    )}
                </div>

                {/* Info Row */}
                <div className="flex items-center justify-between gap-2 text-[10px] sm:text-xs text-grey-600 mb-3">
                    <span className="font-mono">
                        {phase === 'commit'
                            ? `Commit: ${new Date(commitEnd / 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                            : phase === 'reveal'
                                ? `Reveal: ${new Date(revealEnd / 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                                : `Ended: ${new Date(revealEnd / 1000).toLocaleString('en-US', { month: 'short', day: 'numeric' })}`
                        }
                    </span>
                    {!isPast && phase !== 'ended' && (
                        <span className={`font-mono font-medium ${phase === 'commit' ? 'text-blue-600' : 'text-amber-600'}`}>
                            {formatTimeRemaining(currentTimeLeft)}
                        </span>
                    )}
                </div>

                {/* Action Row */}
                <div className="flex items-center justify-between gap-2">
                    {/* Status/Vote Info */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {isPast ? (
                            <>
                                {query.result && <span className="badge-info text-[10px] sm:text-xs">{query.result}</span>}
                                {userVote && (
                                    <span className={`badge text-[10px] sm:text-xs ${userVote === query.result ? 'badge-success' : 'badge-error'}`}>
                                        {userVote === query.result ? '✓ Correct' : '✗ Wrong'}
                                    </span>
                                )}
                            </>
                        ) : (
                            <>
                                {hasCommitted && <span className="badge-info text-[10px] sm:text-xs"><Lock className="w-3 h-3 mr-1" />Committed</span>}
                                {hasRevealed && <span className="badge-success text-[10px] sm:text-xs"><Eye className="w-3 h-3 mr-1" />Revealed</span>}
                                {!hasCommitted && !hasRevealed && phase !== 'ended' && (
                                    <span className="text-[10px] sm:text-xs text-grey-500">Not voted</span>
                                )}
                            </>
                        )}
                    </div>

                    {/* Vote Button */}
                    {!isPast && (
                        <button
                            onClick={onVote}
                            className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg bg-alethea-500 text-white hover:bg-alethea-600 transition-colors flex items-center gap-1"
                        >
                            {hasCommitted && phase === 'reveal' ? 'Reveal' : hasCommitted ? 'View' : 'Vote'}
                            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Desktop Table Row */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 md:px-6 py-4 items-center hover:bg-grey-50 transition-colors">
                {/* Query Info */}
                <div className={`${isPast ? 'col-span-3' : 'col-span-4'} cursor-pointer`} onClick={onShowDetail}>
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isPast
                            ? query.status === 'Resolved' ? 'bg-emerald-500/20' : 'bg-grey-100'
                            : phase === 'commit' ? 'bg-blue-500/20' : phase === 'reveal' ? 'bg-amber-500/20' : 'bg-grey-100'
                            }`}>
                            <span className={`text-xs font-bold ${isPast
                                ? query.status === 'Resolved' ? 'text-emerald-600' : 'text-grey-600'
                                : phase === 'commit' ? 'text-blue-600' : phase === 'reveal' ? 'text-amber-600' : 'text-grey-600'
                                }`}>#{query.id}</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-black hover:text-alethea-600 transition-colors">
                                {getQuestionText()}
                            </p>
                            <p className="text-xs text-grey-600 mt-0.5">
                                {phase === 'commit'
                                    ? `Commit: ${new Date(commitEnd / 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                                    : phase === 'reveal'
                                        ? `Reveal: ${new Date(revealEnd / 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                                        : `Ended: ${new Date(revealEnd / 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                                }
                            </p>
                        </div>
                    </div>
                </div>

                {/* Phase / Your Vote */}
                <div className="col-span-2">
                    {isPast ? (
                        userVote ? (
                            <span className={`badge ${userVote === query.result ? 'badge-success' : 'badge-error'}`}>{userVote}</span>
                        ) : (
                            <span className="text-sm text-grey-500">Not voted</span>
                        )
                    ) : phase === 'commit' ? (
                        <div className="flex items-center gap-1.5">
                            <Lock className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-600">Commit</span>
                        </div>
                    ) : phase === 'reveal' ? (
                        <div className="flex items-center gap-1.5">
                            <Eye className="w-4 h-4 text-amber-600" />
                            <span className="text-sm font-medium text-amber-600">Reveal</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-grey-500" />
                            <span className="text-sm font-medium text-grey-500">Ended</span>
                        </div>
                    )}
                </div>

                {/* Time Left / Result */}
                <div className="col-span-2">
                    {isPast ? (
                        query.result ? <span className="badge-info">{query.result}</span> : <span className="text-sm text-grey-500">No result</span>
                    ) : phase === 'ended' ? (
                        <span className="text-sm text-grey-500">0s</span>
                    ) : (
                        <span className={`text-sm font-mono font-medium ${phase === 'commit' ? 'text-blue-600' : 'text-amber-600'}`}>
                            {formatTimeRemaining(currentTimeLeft)}
                        </span>
                    )}
                </div>

                {/* Your vote / Outcome */}
                <div className="col-span-2">
                    {isPast ? (
                        userVote ? (
                            userVote === query.result ? (
                                <span className="flex items-center gap-1.5 text-sm text-emerald-600"><span className="status-dot-success" />Correct</span>
                            ) : (
                                <span className="flex items-center gap-1.5 text-sm text-red-600"><span className="status-dot-error" />Wrong</span>
                            )
                        ) : <span className="text-sm text-grey-500">-</span>
                    ) : hasCommitted ? (
                        <div className="badge-info"><Lock className="w-3.5 h-3.5" /><span>{userVote}</span></div>
                    ) : hasRevealed ? (
                        <div className="badge-success"><Eye className="w-3.5 h-3.5" /><span>{userVote}</span></div>
                    ) : (
                        <button onClick={onVote} className="text-sm text-alethea-600 hover:text-alethea-700 font-medium">Vote →</button>
                    )}
                </div>

                {/* Status */}
                <div className={`${isPast ? 'col-span-3' : 'col-span-2'} flex items-center justify-between`}>
                    <div className="flex items-center gap-1.5">
                        {isPast ? (
                            <>
                                <span className={query.status === 'Resolved' ? 'status-dot-success' : 'status-dot'} />
                                <span className="text-sm text-grey-600">{query.status === 'Resolved' ? 'Resolved' : 'Expired'}</span>
                            </>
                        ) : hasCommitted ? (
                            <>
                                <span className={`status-dot ${phase === 'reveal' ? 'status-dot-warning' : 'bg-blue-500'}`} />
                                <span className="text-sm text-blue-600">{phase === 'reveal' ? 'Reveal now' : 'Committed'}</span>
                            </>
                        ) : hasRevealed ? (
                            <>
                                <span className="status-dot-success" />
                                <span className="text-sm text-emerald-600">Revealed</span>
                            </>
                        ) : (
                            <>
                                <span className={`status-dot ${phase === 'commit' ? 'bg-amber-500' : phase === 'reveal' ? 'bg-amber-500' : 'bg-grey-300'}`} />
                                <span className="text-sm text-grey-600">{phase === 'commit' ? 'Not voted' : phase === 'reveal' ? 'Missed' : 'Ended'}</span>
                            </>
                        )}
                    </div>
                    {!isPast && (
                        <button onClick={onVote} className="w-8 h-8 rounded-lg border border-alethea-500/30 flex items-center justify-center hover:bg-alethea-100 transition-all">
                            <ChevronRight className="w-4 h-4 text-alethea-600" />
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}

function StatCard({ icon, label, value, color }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: 'teal' | 'cyan' | 'purple' | 'emerald';
}) {
    const config = {
        teal: { icon: 'bg-alethea-100 text-alethea-600' },
        cyan: { icon: 'bg-blue-100 text-blue-600' },
        purple: { icon: 'bg-purple-100 text-purple-600' },
        emerald: { icon: 'bg-emerald-100 text-emerald-600' },
    };

    const c = config[color];

    return (
        <div className="group card p-3 sm:p-4 md:p-5 transition-all duration-300 hover:-translate-y-1 hover:border-grey-200 hover:shadow-md">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg ${c.icon} flex items-center justify-center mb-2 sm:mb-3`}>
                <div className="w-4 h-4 sm:w-5 sm:h-5">{icon}</div>
            </div>
            <p className="text-[10px] sm:text-xs text-grey-600 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">{label}</p>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-black">{value}</p>
        </div>
    );
}

function formatStake(stake: string): string {
    const cleanStake = stake.endsWith('.') ? stake.slice(0, -1) : stake;
    let num = parseFloat(cleanStake);
    if (isNaN(num) || num === 0) return '0';
    if (num > 1e15) {
        num = num / 1e18;
    }
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
}
