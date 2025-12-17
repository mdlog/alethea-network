import { useState, useEffect, useMemo } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { Plus, Clock, CheckCircle, AlertCircle, Loader2, Vote, Lock, Eye, CheckSquare } from 'lucide-react';
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

// Get pending reveals from localStorage
function getPendingReveals(userChainId: string): Record<string, PendingReveal> {
    try {
        const key = `${PENDING_REVEALS_KEY}_${userChainId.substring(0, 16)}`;
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

// Get completed votes from localStorage
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

// Format time remaining
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

// Get current phase based on timestamps
function getCurrentPhase(commitEnd: number, revealEnd: number): 'commit' | 'reveal' | 'ended' {
    const now = Date.now() * 1000; // Convert to microseconds
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
    const [, setTick] = useState(0); // For timer updates
    const [resolving, setResolving] = useState<string | null>(null);

    // Resolve query function
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

    // Create query form state
    const [newQuery, setNewQuery] = useState({
        description: '',
        outcomes: ['Yes', 'No'],
        duration: 600, // 10 minutes default for testing
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

    // Timer update every second
    useEffect(() => {
        const interval = setInterval(() => {
            setTick(t => t + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Auto-resolve queries every 30 seconds
    useEffect(() => {
        const autoResolve = async () => {
            try {
                // Check if there are any queries that need resolving (reveal phase ended)
                const hasEndedQueries = queries.some(q => {
                    const revealEnd = parseInt(q.revealEnd);
                    const now = Date.now() * 1000;
                    return q.status === 'Active' && now >= revealEnd;
                });

                if (hasEndedQueries && executeAppChainMutation) {
                    console.log('🔄 Auto-resolving queries...');
                    await executeAppChainMutation(`mutation { executeAutoResolveQueries }`);
                    console.log('✅ Auto-resolve completed');
                    // Reload queries to get updated status
                    loadQueries();
                }
            } catch (err) {
                console.log('Auto-resolve check:', err instanceof Error ? err.message : 'No queries to resolve');
            }
        };

        // Run immediately on mount and then every 30 seconds
        autoResolve();
        const interval = setInterval(autoResolve, 30000);
        return () => clearInterval(interval);
    }, [queries, executeAppChainMutation]);

    useEffect(() => {
        loadQueries();
    }, []);

    const handleCreateQuery = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chainId) return;

        if (!application) {
            setError('WASM not connected. Please wait for connection or refresh the page.');
            return;
        }

        setCreating(true);
        setError(null);

        const appChainId = import.meta.env.VITE_CHAIN_ID;

        try {
            const outcomesStr = newQuery.outcomes.map(o => `"${o}"`).join(', ');
            const mutation = `mutation { 
                sendCreateQueryMessage(
                    targetChain: "${appChainId}",
                    description: "${newQuery.description}",
                    outcomes: [${outcomesStr}],
                    strategy: "WeightedByStake",
                    rewardAmount: "100",
                    minVotes: 1,
                    durationSecs: ${newQuery.duration}
                )
            }`;

            console.log('[WASM] Creating query via CROSS-CHAIN MESSAGE');
            const result = await executeMutation(mutation);
            console.log('Create query message sent:', result);

            await new Promise(resolve => setTimeout(resolve, 3000));

            setNewQuery({ description: '', outcomes: ['Yes', 'No'], duration: 600 });
            setActiveTab('active');
            loadQueries();
        } catch (err) {
            console.error('Failed to create query:', err);
            setError(err instanceof Error ? err.message : 'Failed to create query');
        } finally {
            setCreating(false);
        }
    };

    const handleVote = (query: Query) => {
        setSelectedQuery(query);
    };

    const handleVoteSuccess = () => {
        setSelectedQuery(null);
        loadQueries();
    };

    const activeQueries = queries.filter(q => q.status !== 'Resolved' && q.status !== 'Expired');
    const pastQueries = queries.filter(q => q.status === 'Resolved' || q.status === 'Expired');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Oracle Queries</h1>
                <p className="text-gray-500">Create queries and vote on outcomes</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-8">
                    {(['active', 'past', 'create'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-3 border-b-2 font-medium text-sm capitalize transition-colors ${activeTab === tab
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab === 'create' ? 'Create Query' : `${tab} Queries`}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {error}
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : (
                <>
                    {/* Active Queries */}
                    {activeTab === 'active' && (
                        <div className="space-y-4">
                            {activeQueries.length === 0 ? (
                                <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
                                    <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Queries</h3>
                                    <p className="text-gray-500 mb-6">Create a new query to get started</p>
                                    <button
                                        onClick={() => setActiveTab('create')}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        Create Query
                                    </button>
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
                                <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
                                    <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900">No Past Queries</h3>
                                    <p className="text-gray-500">Resolved queries will appear here</p>
                                </div>
                            ) : (
                                pastQueries.map((query) => (
                                    <QueryCard key={query.id} query={query} isPast />
                                ))
                            )}
                        </div>
                    )}

                    {/* Create Query */}
                    {activeTab === 'create' && (
                        <div className="bg-white rounded-xl p-6 border border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">Create New Query</h2>

                            <form onSubmit={handleCreateQuery} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Question
                                    </label>
                                    <textarea
                                        value={newQuery.description}
                                        onChange={(e) => setNewQuery({ ...newQuery, description: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        rows={3}
                                        placeholder="e.g., Will ETH reach $5000 by end of Q1 2025?"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Duration (Commit + Reveal phases)
                                    </label>
                                    <select
                                        value={newQuery.duration}
                                        onChange={(e) => setNewQuery({ ...newQuery, duration: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value={120}>2 Minutes (1m commit + 1m reveal)</option>
                                        <option value={300}>5 Minutes (2.5m + 2.5m)</option>
                                        <option value={600}>10 Minutes (5m + 5m)</option>
                                        <option value={3600}>1 Hour (30m + 30m)</option>
                                        <option value={86400}>24 Hours (12h + 12h)</option>
                                        <option value={604800}>7 Days (3.5d + 3.5d)</option>
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={creating || !chainId}
                                    className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
                                >
                                    {creating ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Creating...
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            <Plus className="w-4 h-4" />
                                            Create Query
                                        </span>
                                    )}
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
    const now = Date.now() * 1000; // microseconds

    const phase = getCurrentPhase(commitEnd, revealEnd);
    const isEnded = phase === 'ended';
    const canResolve = isEnded && query.status === 'Active' && query.voteCount > 0;

    // Calculate time remaining for current phase
    const phaseEndTime = phase === 'commit' ? commitEnd : revealEnd;
    const timeRemaining = phaseEndTime - now;
    const timeRemainingMs = timeRemaining / 1000; // Convert to milliseconds

    // Check user's vote status
    const userVoteStatus = useMemo(() => {
        if (!userChainId) return null;

        const completed = getCompletedVotes(userChainId);
        if (completed[query.id]) {
            return { type: 'revealed' as const, vote: completed[query.id] };
        }

        const pending = getPendingReveals(userChainId);
        if (pending[query.id]) {
            return { type: 'committed' as const, vote: pending[query.id] };
        }

        return null;
    }, [userChainId, query.id]);

    const hasVoted = userVoteStatus !== null;

    return (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900">{query.description}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>Query #{query.id}</span>
                        <span>{query.voteCount} votes</span>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 text-xs rounded-full ${query.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                        query.status === 'Expired' ? 'bg-gray-100 text-gray-700' :
                            'bg-blue-100 text-blue-700'
                        }`}>
                        {query.status}
                    </span>
                </div>
            </div>

            {/* Phase Timer */}
            {!isPast && query.status === 'Active' && (
                <div className={`mb-4 p-3 rounded-lg ${phase === 'commit' ? 'bg-blue-50 border border-blue-200' :
                    phase === 'reveal' ? 'bg-yellow-50 border border-yellow-200' :
                        'bg-gray-50 border border-gray-200'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {phase === 'commit' ? (
                                <>
                                    <Lock className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-800">Commit Phase</span>
                                </>
                            ) : phase === 'reveal' ? (
                                <>
                                    <Eye className="w-4 h-4 text-yellow-600" />
                                    <span className="text-sm font-medium text-yellow-800">Reveal Phase</span>
                                </>
                            ) : (
                                <>
                                    <Clock className="w-4 h-4 text-gray-600" />
                                    <span className="text-sm font-medium text-gray-800">Voting Ended</span>
                                </>
                            )}
                        </div>
                        {!isEnded && (
                            <div className="flex items-center gap-1 text-sm font-mono">
                                <Clock className={`w-4 h-4 ${phase === 'commit' ? 'text-blue-600' : 'text-yellow-600'
                                    }`} />
                                <span className={
                                    phase === 'commit' ? 'text-blue-700' : 'text-yellow-700'
                                }>
                                    {formatTimeRemaining(timeRemainingMs)}
                                </span>
                            </div>
                        )}
                    </div>
                    <p className="text-xs mt-1 opacity-75">
                        {phase === 'commit'
                            ? 'Submit your hidden vote commitment'
                            : phase === 'reveal'
                                ? 'Reveal your committed vote'
                                : 'Waiting for resolution'}
                    </p>
                </div>
            )}

            {isPast && query.result ? (
                <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-700">
                        <span className="font-medium">Result:</span> {query.result}
                    </p>
                </div>
            ) : canVote && onVote && !isEnded ? (
                <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                        {query.outcomes.map((outcome) => (
                            <span
                                key={outcome}
                                className="py-1 px-3 bg-gray-100 rounded-lg text-sm text-gray-600"
                            >
                                {outcome}
                            </span>
                        ))}
                    </div>
                    <button
                        onClick={onVote}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Vote className="w-4 h-4" />
                        Vote
                    </button>
                </div>
            ) : (
                <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                        {query.outcomes.map((outcome) => (
                            <span
                                key={outcome}
                                className="py-1 px-3 bg-gray-100 rounded-lg text-sm text-gray-600"
                            >
                                {outcome}
                            </span>
                        ))}
                    </div>
                    {/* Resolve button for ended queries with votes */}
                    {canResolve && onResolve && (
                        <button
                            onClick={onResolve}
                            disabled={isResolving}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
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
                    {/* Show waiting message if ended but no votes */}
                    {isEnded && query.voteCount === 0 && query.status === 'Active' && (
                        <span className="text-sm text-gray-500">No votes - will expire</span>
                    )}
                </div>
            )}
        </div>
    );
}
