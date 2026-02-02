import { useState, useEffect, useMemo, useRef } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { Plus, Clock, CheckCircle, AlertCircle, Loader2, Vote, Lock, Eye, Activity } from 'lucide-react';
import VoteModal from '../components/VoteModal';

// Storage keys for vote tracking
const REGISTRY_APP_ID = import.meta.env.VITE_REGISTRY_APP_ID || '';
const PENDING_REVEALS_KEY = `alethea_v2_pending_${REGISTRY_APP_ID.substring(0, 16)}`;
const COMPLETED_VOTES_KEY = `alethea_v2_completed_${REGISTRY_APP_ID.substring(0, 16)}`;

interface PendingReveal {
    queryId: string;
    value: string;
    salt: string;
    confidence: number;
    committedAt: number;
}

interface CompletedVote {
    queryId: string;
    value: string;
    confidence: number;
    revealedAt: number;
}

function getPendingReveals(userChainId: string): Record<string, PendingReveal> {
    try {
        const key = `${PENDING_REVEALS_KEY}_${userChainId.substring(0, 16)}`;
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

function getCompletedVotes(userChainId: string): Record<string, CompletedVote> {
    try {
        const key = `${COMPLETED_VOTES_KEY}_${userChainId.substring(0, 16)}`;
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
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

function formatTimeRemaining(ms: number): string {
    if (ms <= 0) return 'Ended';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

function getCurrentPhase(commitEnd: number, revealEnd: number): 'commit' | 'reveal' | 'ended' {
    const now = Date.now() * 1000;
    if (now < commitEnd) return 'commit';
    if (now < revealEnd) return 'reveal';
    return 'ended';
}

export default function QueriesPage() {
    const { chainId, application, executeMutation, executeAppChainQuery, executeAppChainMutation } = useLinera();
    const [queries, setQueries] = useState<Query[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'active' | 'past' | 'create'>('active');
    const [error, setError] = useState<string | null>(null);
    const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
    const [, setTick] = useState(0);
    const [resolving, setResolving] = useState<string | null>(null);
    const [pastPage, setPastPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const handleResolve = async (queryId: string) => {
        setResolving(queryId);
        try {
            const result = await executeAppChainMutation(`mutation { executeResolveQuery(queryId: ${queryId}) }`);
            console.log('Resolve result:', result);
            await new Promise(resolve => setTimeout(resolve, 2000));
            loadQueries();
        } catch (err) {
            console.error('Failed to resolve:', err);
            setError(err instanceof Error ? err.message : 'Failed to resolve query');
        } finally {
            setResolving(null);
        }
    };

    const [newQuery, setNewQuery] = useState({
        description: '',
        outcomes: ['Yes', 'No'],
        duration: 600,
        rewardAmount: 100, // Default reward in ALTH tokens
        strategy: 'WeightedByStake', // Default voting method/strategy
    });
    const [creating, setCreating] = useState(false);

    const loadQueries = async () => {
        setLoading(true);
        try {
            const data = await executeAppChainQuery(`
                query {
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
            setQueries(data?.queries || []);
        } catch (err) {
            console.error('Failed to load queries:', err);
            setError(err instanceof Error ? err.message : 'Failed to load queries');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const queriesRef = useRef<Query[]>([]);
    const isResolvingRef = useRef<boolean>(false);

    useEffect(() => {
        queriesRef.current = queries;
    }, [queries]);

    useEffect(() => {
        if (!executeAppChainMutation) return;

        const checkAndResolve = async () => {
            if (isResolvingRef.current) return;
            const now = Date.now() * 1000;
            const queriesToResolve = queriesRef.current.filter(q => {
                if (q.status !== 'Active') return false;
                const revealEnd = parseInt(q.revealEnd);
                return now >= revealEnd && q.voteCount > 0;
            });

            if (queriesToResolve.length > 0) {
                isResolvingRef.current = true;
                try {
                    await executeAppChainMutation(`mutation { executeAutoResolveQueries }`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    loadQueries();
                } catch (err) {
                    console.error('[Auto-resolve] Failed:', err);
                } finally {
                    isResolvingRef.current = false;
                }
            }
        };

        const interval = setInterval(checkAndResolve, 10000);
        checkAndResolve();
        return () => clearInterval(interval);
    }, [executeAppChainMutation]);

    useEffect(() => {
        loadQueries();
    }, []);

    const handleCreateQuery = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chainId || !application) return;

        setCreating(true);
        setError(null);

        const appChainId = import.meta.env.VITE_CHAIN_ID;

        try {
            // Convert reward amount from tokens to attos (18 decimals)
            const TOKEN_DECIMALS = 18;
            const rewardAmountTokens = newQuery.rewardAmount || 100; // Use form input or default
            const rewardAmountAttos = (rewardAmountTokens * Math.pow(10, TOKEN_DECIMALS)).toString();

            const outcomesStr = newQuery.outcomes.map(o => `"${o}"`).join(', ');
            const mutation = `mutation { 
                sendCreateQueryMessage(
                    targetChain: "${appChainId}",
                    description: "${newQuery.description}",
                    outcomes: [${outcomesStr}],
                    strategy: "${newQuery.strategy}",
                    rewardAmount: "${rewardAmountAttos}",
                    minVotes: 1,
                    durationSecs: ${newQuery.duration}
                )
            }`;

            const result = await executeMutation(mutation);
            console.log('Create query message sent:', result);

            await new Promise(resolve => setTimeout(resolve, 3000));
            setNewQuery({ description: '', outcomes: ['Yes', 'No'], duration: 600, rewardAmount: 100, strategy: 'WeightedByStake' });
            setActiveTab('active');
            loadQueries();
        } catch (err) {
            console.error('Failed to create query:', err);
            setError(err instanceof Error ? err.message : 'Failed to create query');
        } finally {
            setCreating(false);
        }
    };

    const handleVote = (query: Query) => setSelectedQuery(query);
    const handleVoteSuccess = () => {
        setSelectedQuery(null);
        loadQueries();
    };

    const activeQueries = queries.filter(q => q.status !== 'Resolved' && q.status !== 'Expired');
    const pastQueries = queries.filter(q => q.status === 'Resolved' || q.status === 'Expired');

    const totalPastPages = Math.ceil(pastQueries.length / ITEMS_PER_PAGE);
    const paginatedPastQueries = pastQueries.slice(
        (pastPage - 1) * ITEMS_PER_PAGE,
        pastPage * ITEMS_PER_PAGE
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-black">Oracle Queries</h1>
                <p className="text-grey-700">Create queries and vote on outcomes</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-grey-200">
                <nav className="flex gap-8">
                    {(['active', 'past'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-3 border-b-2 font-medium text-sm capitalize transition-colors ${activeTab === tab
                                ? 'border-alethea-500 text-alethea-600'
                                : 'border-transparent text-grey-700 hover:text-black'
                                }`}
                        >
                            {`${tab} Queries`}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 card border-red-500/30 text-red-400">
                    {error}
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-alethea-500" />
                </div>
            ) : (
                <>
                    {/* Active Queries */}
                    {activeTab === 'active' && (
                        <div className="space-y-4">
                            {activeQueries.length === 0 ? (
                                <div className="card p-12 text-center">
                                    <AlertCircle className="w-12 h-12 text-grey-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-black mb-2">No Active Queries</h3>
                                    <p className="text-grey-700">No active queries at the moment</p>
                                </div>
                            ) : (
                                activeQueries.map((query) => (
                                    <QueryCard
                                        key={query.id}
                                        query={query}
                                        onVote={() => handleVote(query)}
                                        onResolve={() => handleResolve(query.id)}
                                        canVote={!!chainId}
                                        isResolving={resolving === query.id}
                                    />
                                ))
                            )}
                        </div>
                    )}

                    {/* Past Queries */}
                    {activeTab === 'past' && (
                        <div className="space-y-4">
                            {pastQueries.length === 0 ? (
                                <div className="card p-12 text-center">
                                    <CheckCircle className="w-12 h-12 text-grey-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-black">No Past Queries</h3>
                                    <p className="text-grey-700">Resolved queries will appear here</p>
                                </div>
                            ) : (
                                <>
                                    {paginatedPastQueries.map((query) => (
                                        <QueryCard key={query.id} query={query} isPast />
                                    ))}

                                    {totalPastPages > 1 && (
                                        <div className="flex items-center justify-between card p-4">
                                            <p className="text-sm text-grey-600">
                                                Showing {(pastPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(pastPage * ITEMS_PER_PAGE, pastQueries.length)} of {pastQueries.length}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setPastPage(p => Math.max(1, p - 1))}
                                                    disabled={pastPage === 1}
                                                    className="btn-secondary text-sm disabled:opacity-50"
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
                                                                : 'hover:bg-grey-50 text-grey-700'
                                                                }`}
                                                        >
                                                            {page}
                                                        </button>
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={() => setPastPage(p => Math.min(totalPastPages, p + 1))}
                                                    disabled={pastPage === totalPastPages}
                                                    className="btn-secondary text-sm disabled:opacity-50"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Create Query */}
                    {activeTab === 'create' && (
                        <div className="card p-6">
                            <h2 className="text-xl font-bold text-black mb-6">Create Custom Query</h2>

                            <form onSubmit={handleCreateQuery} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-grey-700 mb-2">
                                        Question
                                    </label>
                                    <textarea
                                        value={newQuery.description}
                                        onChange={(e) => setNewQuery({ ...newQuery, description: e.target.value })}
                                        className="input resize-none"
                                        rows={3}
                                        placeholder="e.g., Did BTC close above $100,000 on January 5, 2026?"
                                        required
                                    />
                                    <p className="text-xs text-grey-600 mt-1">
                                        Tip: Ask about events that have already occurred, not predictions.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-grey-700 mb-2">
                                        Outcomes
                                    </label>
                                    <div className="flex gap-2">
                                        {newQuery.outcomes.map((outcome, idx) => (
                                            <input
                                                key={idx}
                                                type="text"
                                                value={outcome}
                                                onChange={(e) => {
                                                    const outcomes = [...newQuery.outcomes];
                                                    outcomes[idx] = e.target.value;
                                                    setNewQuery({ ...newQuery, outcomes });
                                                }}
                                                className="input flex-1"
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-grey-700 mb-2">
                                        Duration (Commit + Reveal phases)
                                    </label>
                                    <select
                                        value={newQuery.duration}
                                        onChange={(e) => setNewQuery({ ...newQuery, duration: parseInt(e.target.value) })}
                                        className="select"
                                    >
                                        <option value={120}>2 Minutes (1m commit + 1m reveal)</option>
                                        <option value={300}>5 Minutes (2.5m + 2.5m)</option>
                                        <option value={600}>10 Minutes (5m + 5m)</option>
                                        <option value={3600}>1 Hour (30m + 30m)</option>
                                        <option value={86400}>24 Hours (12h + 12h)</option>
                                        <option value={604800}>7 Days (3.5d + 3.5d)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-grey-700 mb-2">
                                        Reward Amount (ALTH)
                                    </label>
                                    <input
                                        type="number"
                                        value={newQuery.rewardAmount}
                                        onChange={(e) => setNewQuery({ ...newQuery, rewardAmount: parseFloat(e.target.value) || 0 })}
                                        className="input"
                                        placeholder="100"
                                        min="0"
                                        step="0.01"
                                        required
                                    />
                                    <p className="text-xs text-grey-600 mt-1">
                                        Reward amount in ALTH tokens. This is added to inflation rewards for correct voters.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-grey-700 mb-2">
                                        Voting Method (Decision Strategy)
                                    </label>
                                    <select
                                        value={newQuery.strategy}
                                        onChange={(e) => setNewQuery({ ...newQuery, strategy: e.target.value })}
                                        className="select"
                                    >
                                        <option value="WeightedByStake">Weighted by Stake</option>
                                        <option value="WeightedByReputation">Weighted by Reputation</option>
                                        <option value="Majority">Simple Majority</option>
                                        <option value="Median">Median Value</option>
                                    </select>
                                    <p className="text-xs text-grey-600 mt-1">
                                        How votes are weighted when resolving the query.
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={creating || !newQuery.description.trim() || newQuery.outcomes.length === 0 || !chainId || !application}
                                    className={`w-full py-3 rounded-lg font-medium transition-colors ${creating || !newQuery.description.trim() || newQuery.outcomes.length === 0 || !chainId || !application
                                        ? 'bg-grey-50 text-grey-600 cursor-not-allowed'
                                        : 'bg-alethea-600 text-white hover:bg-alethea-500'
                                        }`}
                                    title={
                                        !chainId || !application
                                            ? "Please connect your wallet first"
                                            : !newQuery.description.trim()
                                                ? "Please enter a description"
                                                : newQuery.outcomes.length === 0
                                                    ? "Please add at least one outcome"
                                                    : creating
                                                        ? "Creating query..."
                                                        : "Create Query"
                                    }
                                >
                                    <span className="flex items-center justify-center gap-2">
                                        <Plus className="w-4 h-4" />
                                        {creating ? 'Creating...' : 'Create Query'}
                                    </span>
                                </button>
                            </form>
                        </div>
                    )}
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
                    onSuccess={handleVoteSuccess}
                />
            )}
        </div>
    );
}

function QueryCard({ query, onVote, onResolve, canVote, isPast, isResolving, userChainId }: {
    query: Query;
    onVote?: () => void;
    onResolve?: () => void;
    canVote?: boolean;
    isPast?: boolean;
    isResolving?: boolean;
    userChainId?: string;
}) {
    const commitEnd = parseInt(query.commitEnd);
    const revealEnd = parseInt(query.revealEnd);
    const now = Date.now() * 1000;

    const phase = getCurrentPhase(commitEnd, revealEnd);
    const isEnded = phase === 'ended';
    const canResolve = isEnded && query.status === 'Active' && query.voteCount > 0;

    const phaseEndTime = phase === 'commit' ? commitEnd : revealEnd;
    const timeRemaining = phaseEndTime - now;
    const timeRemainingMs = timeRemaining / 1000;

    const userVoteStatus = useMemo(() => {
        if (!userChainId) return null;
        const completed = getCompletedVotes(userChainId);
        if (completed[query.id]) return { type: 'revealed' as const, vote: completed[query.id] };
        const pending = getPendingReveals(userChainId);
        if (pending[query.id]) return { type: 'committed' as const, vote: pending[query.id] };
        return null;
    }, [userChainId, query.id]);

    return (
        <div className="card-hover p-6">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className="font-semibold text-lg text-black">{query.description}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-grey-600">
                        <span>Query #{query.id}</span>
                        <span>{query.voteCount} votes</span>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span className={`badge ${query.status === 'Resolved' ? 'badge-success' :
                        query.status === 'Expired' ? 'badge-neutral' : 'badge-info'
                        }`}>
                        {query.status}
                    </span>
                </div>
            </div>

            {/* Phase Timer */}
            {!isPast && query.status === 'Active' && (
                <div className={`mb-4 p-3 rounded-lg border ${phase === 'commit' ? 'bg-blue-500/10 border-blue-500/30' :
                    phase === 'reveal' ? 'bg-amber-500/10 border-amber-500/30' :
                        'bg-grey-50 border-grey-200'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {phase === 'commit' ? (
                                <>
                                    <Lock className="w-4 h-4 text-blue-400" />
                                    <span className="text-sm font-medium text-blue-400">Commit Phase</span>
                                </>
                            ) : phase === 'reveal' ? (
                                <>
                                    <Eye className="w-4 h-4 text-amber-400" />
                                    <span className="text-sm font-medium text-amber-400">Reveal Phase</span>
                                </>
                            ) : (
                                <>
                                    <Clock className="w-4 h-4 text-grey-700" />
                                    <span className="text-sm font-medium text-grey-700">Voting Ended</span>
                                </>
                            )}
                        </div>
                        {!isEnded && (
                            <div className="flex items-center gap-1 text-sm font-mono">
                                <Clock className={`w-4 h-4 ${phase === 'commit' ? 'text-blue-400' : 'text-amber-400'}`} />
                                <span className={phase === 'commit' ? 'text-blue-400' : 'text-amber-400'}>
                                    {formatTimeRemaining(timeRemainingMs)}
                                </span>
                            </div>
                        )}
                    </div>
                    <p className="text-xs mt-1 text-grey-600">
                        {phase === 'commit'
                            ? 'Submit your hidden vote commitment'
                            : phase === 'reveal'
                                ? 'Reveal your committed vote'
                                : 'Waiting for resolution'}
                    </p>
                </div>
            )}

            {isPast && query.result ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <p className="text-sm text-emerald-400">
                        <span className="font-medium">Result:</span> {query.result}
                    </p>
                </div>
            ) : canVote && onVote && !isEnded ? (
                <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                        {query.outcomes.map((outcome) => (
                            <span key={outcome} className="py-1.5 px-3 bg-grey-50 rounded-lg text-sm text-grey-700">
                                {outcome}
                            </span>
                        ))}
                    </div>
                    <button onClick={onVote} className="btn-primary flex items-center gap-2">
                        <Vote className="w-4 h-4" />
                        Vote
                    </button>
                </div>
            ) : (
                <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                        {query.outcomes.map((outcome) => (
                            <span key={outcome} className="py-1.5 px-3 bg-grey-50 rounded-lg text-sm text-grey-700">
                                {outcome}
                            </span>
                        ))}
                    </div>
                    {canResolve && onResolve && (
                        <button
                            onClick={onResolve}
                            disabled={isResolving}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:bg-grey-50 disabled:text-grey-600 transition-colors"
                        >
                            {isResolving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Resolving...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    Resolve
                                </>
                            )}
                        </button>
                    )}
                    {isEnded && query.voteCount === 0 && query.status === 'Active' && (
                        <span className="text-sm text-grey-600">No votes - will expire</span>
                    )}
                </div>
            )}
        </div>
    );
}
