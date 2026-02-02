import { useState, useEffect } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { X, Loader2, AlertCircle, Lock, Eye, Clock } from 'lucide-react';

interface Query {
    id: string;
    description: string;
    outcomes: string[];
    deadline: number;
    status: string;
    voteCount: number;
    phase?: string;
    commitPhaseEnd?: number;
    revealPhaseEnd?: number;
}

interface VoteModalProps {
    query: Query;
    onClose: () => void;
    onSuccess: () => void;
}

// Storage key for pending reveals - includes App ID to avoid conflicts between contract deployments
const REGISTRY_APP_ID = import.meta.env.VITE_REGISTRY_APP_ID || '';
const PENDING_REVEALS_KEY = `alethea_v2_pending_${REGISTRY_APP_ID.substring(0, 16)}`;
// Storage key for completed votes
const COMPLETED_VOTES_KEY = `alethea_v2_completed_${REGISTRY_APP_ID.substring(0, 16)}`;

// Clear old localStorage keys on first load (migration)
if (typeof window !== 'undefined') {
    const migrationKey = `alethea_migrated_${REGISTRY_APP_ID.substring(0, 8)}`;
    if (!localStorage.getItem(migrationKey)) {
        // Clear all old alethea keys
        Object.keys(localStorage)
            .filter(k => k.startsWith('alethea_') && !k.startsWith('alethea_v2_') && !k.startsWith('alethea_migrated_'))
            .forEach(k => localStorage.removeItem(k));
        localStorage.setItem(migrationKey, 'true');
        console.log('🧹 Cleared old vote data from localStorage');
    }
}

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

// Generate random salt for commit hash
function generateSalt(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Compute commit hash (SHA-256 of value + salt)
async function computeCommitHash(value: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(value + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Get pending reveals from localStorage (per user via chainId)
function getPendingReveals(userChainId: string): Record<string, PendingReveal> {
    try {
        const key = `${PENDING_REVEALS_KEY}_${userChainId.substring(0, 16)}`;
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

// Save pending reveal to localStorage (per user via chainId)
function savePendingReveal(userChainId: string, queryId: string, reveal: PendingReveal) {
    const key = `${PENDING_REVEALS_KEY}_${userChainId.substring(0, 16)}`;
    const reveals = getPendingReveals(userChainId);
    reveals[queryId] = reveal;
    localStorage.setItem(key, JSON.stringify(reveals));
}

// Remove pending reveal from localStorage (per user via chainId)
function removePendingReveal(userChainId: string, queryId: string) {
    const key = `${PENDING_REVEALS_KEY}_${userChainId.substring(0, 16)}`;
    const reveals = getPendingReveals(userChainId);
    delete reveals[queryId];
    localStorage.setItem(key, JSON.stringify(reveals));
}

// Get completed votes from localStorage (per user via chainId)
function getCompletedVotes(userChainId: string): Record<string, CompletedVote> {
    try {
        const key = `${COMPLETED_VOTES_KEY}_${userChainId.substring(0, 16)}`;
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

// Save completed vote to localStorage (per user via chainId)
function saveCompletedVote(userChainId: string, queryId: string, vote: CompletedVote) {
    const key = `${COMPLETED_VOTES_KEY}_${userChainId.substring(0, 16)}`;
    const votes = getCompletedVotes(userChainId);
    votes[queryId] = vote;
    localStorage.setItem(key, JSON.stringify(votes));
}

export default function VoteModal({ query, onClose, onSuccess }: VoteModalProps) {
    const { chainId, owner, application, executeMutation, executeAppChainQuery } = useLinera();
    const [selectedOutcome, setSelectedOutcome] = useState<string>('');
    const [confidence, setConfidence] = useState(100);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingReveal, setPendingReveal] = useState<PendingReveal | null>(null);
    const [completedVote, setCompletedVote] = useState<CompletedVote | null>(null);
    const [voteMode, setVoteMode] = useState<'commit' | 'reveal' | 'completed'>('commit');

    // Voter registration check
    const [isRegisteredVoter, setIsRegisteredVoter] = useState<boolean | null>(null);
    const [checkingRegistration, setCheckingRegistration] = useState(true);
    const [voterStake, setVoterStake] = useState<string>('0');

    // Check voter registration status on mount
    useEffect(() => {
        const checkVoterRegistration = async () => {
            if (!chainId) {
                setCheckingRegistration(false);
                setIsRegisteredVoter(false);
                return;
            }

            try {
                // IMPORTANT: Registry stores voters by chainId, not owner address!
                // The voter "address" in registry is actually the user's chain ID
                const voterAddress = chainId.toLowerCase();
                console.log('🔍 Checking voter registration for chainId:', voterAddress);
                console.log('   (owner address is:', owner, ')');

                const voterQuery = `{ voter(address: "${voterAddress}") { address name stake isActive } }`;
                const result = await executeAppChainQuery(voterQuery);

                console.log('📊 Voter check result:', result);

                if (result?.voter && result.voter.isActive) {
                    setIsRegisteredVoter(true);
                    setVoterStake(result.voter.stake || '0');
                    console.log('✅ User is registered voter with stake:', result.voter.stake);
                } else {
                    setIsRegisteredVoter(false);
                    console.log('❌ User is NOT a registered voter (chainId not found in registry)');
                }
            } catch (err) {
                console.error('Failed to check voter registration:', err);
                setIsRegisteredVoter(false);
            } finally {
                setCheckingRegistration(false);
            }
        };

        checkVoterRegistration();
    }, [chainId, owner, executeAppChainQuery]);

    // Check for pending reveal or completed vote on mount
    useEffect(() => {
        if (!chainId) return;

        // First check if already voted
        const completed = getCompletedVotes(chainId);
        const existingVote = completed[query.id];
        if (existingVote) {
            setCompletedVote(existingVote);
            setSelectedOutcome(existingVote.value);
            setConfidence(existingVote.confidence);
            setVoteMode('completed');
            return;
        }

        // Then check for pending reveal
        const reveals = getPendingReveals(chainId);
        const pending = reveals[query.id];
        if (pending) {
            setPendingReveal(pending);
            setSelectedOutcome(pending.value);
            setConfidence(pending.confidence);
            setVoteMode('reveal');
        } else {
            // Default to commit mode for new votes
            setVoteMode('commit');
        }
    }, [query.id, chainId]);

    const handleCommit = async () => {
        console.log('🎯 handleCommit called!');
        console.log('   selectedOutcome:', selectedOutcome);
        console.log('   chainId:', chainId);
        console.log('   application:', application ? 'exists' : 'null');

        if (!selectedOutcome || !chainId || !application) {
            console.log('❌ Early return - missing:', {
                selectedOutcome: !selectedOutcome,
                chainId: !chainId,
                application: !application
            });
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const appChainId = import.meta.env.VITE_CHAIN_ID;
            const salt = generateSalt();
            const commitHash = await computeCommitHash(selectedOutcome, salt);

            console.log('═══════════════════════════════════════════════════════════');
            console.log('📤 [WASM] Committing vote');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('📍 User Chain ID:', chainId);
            console.log('📍 App Chain:', appChainId);
            console.log('🗳️ Query ID:', query.id);
            console.log('🔒 Commit Hash:', commitHash);
            console.log('🧂 Salt (save this!):', salt);
            console.log('═══════════════════════════════════════════════════════════');

            // Use direct commitVote if on same chain, otherwise use cross-chain message
            const isSameChain = chainId === appChainId;
            const mutation = isSameChain
                ? `mutation { commitVote(queryId: ${query.id}, commitHash: "${commitHash}") }`
                : `mutation { 
                    sendCommitVoteMessage(
                        targetChain: "${appChainId}",
                        queryId: ${query.id},
                        commitHash: "${commitHash}"
                    ) 
                }`;

            console.log('📤 Using', isSameChain ? 'DIRECT commitVote' : 'CROSS-CHAIN sendCommitVoteMessage');

            const result = await executeMutation(mutation);
            console.log('✅ Commit result:', result);

            // Check if result contains error
            if (typeof result === 'string' && result.toLowerCase().includes('error')) {
                throw new Error(result);
            }
            const resultKey = chainId === appChainId ? 'commitVote' : 'sendCommitVoteMessage';
            if (result?.[resultKey] && typeof result[resultKey] === 'string'
                && result[resultKey].toLowerCase().includes('error')) {
                throw new Error(result[resultKey]);
            }

            // Save pending reveal to localStorage (per user)
            const reveal: PendingReveal = {
                queryId: query.id,
                value: selectedOutcome,
                salt,
                confidence,
                committedAt: Date.now(),
            };
            savePendingReveal(chainId, query.id, reveal);
            setPendingReveal(reveal);
            setVoteMode('reveal');

            // Wait for cross-chain message
            await new Promise(resolve => setTimeout(resolve, 2000));

            // No alert - UI will show the locked vote state
        } catch (err) {
            console.error('❌ Failed to commit vote:', err);
            setError(err instanceof Error ? err.message : 'Failed to commit vote');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReveal = async () => {
        if (!pendingReveal || !chainId || !application) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const appChainId = import.meta.env.VITE_CHAIN_ID;

            console.log('═══════════════════════════════════════════════════════════');
            console.log('📤 [WASM] Revealing vote');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('📍 User Chain ID:', chainId);
            console.log('📍 App Chain:', appChainId);
            console.log('🗳️ Query ID:', query.id);
            console.log('📝 Value:', pendingReveal.value);
            console.log('🧂 Salt:', pendingReveal.salt);
            console.log('═══════════════════════════════════════════════════════════');

            // Use direct revealVote if on same chain, otherwise use cross-chain message
            const isSameChain = chainId === appChainId;
            const mutation = isSameChain
                ? `mutation { revealVote(queryId: ${query.id}, value: "${pendingReveal.value}", salt: "${pendingReveal.salt}", confidence: ${pendingReveal.confidence}) }`
                : `mutation { 
                    sendRevealVoteMessage(
                        targetChain: "${appChainId}",
                        queryId: ${query.id},
                        value: "${pendingReveal.value}",
                        salt: "${pendingReveal.salt}",
                        confidence: ${pendingReveal.confidence}
                    ) 
                }`;

            console.log('📤 Using', isSameChain ? 'DIRECT revealVote' : 'CROSS-CHAIN sendRevealVoteMessage');

            const result = await executeMutation(mutation);
            console.log('✅ Reveal result:', result);

            // Check if result contains error
            if (typeof result === 'string' && result.toLowerCase().includes('error')) {
                throw new Error(result);
            }
            const revealResultKey = chainId === appChainId ? 'revealVote' : 'sendRevealVoteMessage';
            if (result?.[revealResultKey] && typeof result[revealResultKey] === 'string'
                && result[revealResultKey].toLowerCase().includes('error')) {
                throw new Error(result[revealResultKey]);
            }

            // Save as completed vote (per user)
            const completed: CompletedVote = {
                queryId: query.id,
                value: pendingReveal.value,
                confidence: pendingReveal.confidence,
                revealedAt: Date.now(),
            };
            saveCompletedVote(chainId, query.id, completed);

            // Remove pending reveal (per user)
            removePendingReveal(chainId, query.id);

            // Wait for cross-chain message
            await new Promise(resolve => setTimeout(resolve, 2000));

            onSuccess();
        } catch (err) {
            console.error('❌ Failed to reveal vote:', err);
            setError(err instanceof Error ? err.message : 'Failed to reveal vote');
        } finally {
            setIsSubmitting(false);
        }
    };

    const deadline = new Date(query.deadline / 1000);

    // Check if we're still in commit phase
    const now = Date.now() * 1000; // Convert to microseconds
    const commitPhaseEnd = query.commitPhaseEnd || 0;
    const revealPhaseEnd = query.revealPhaseEnd || 0;

    // Query is expired only when reveal phase has ended
    const isExpired = now >= revealPhaseEnd && revealPhaseEnd > 0;

    const isInCommitPhase = now < commitPhaseEnd;
    const isInRevealPhase = now >= commitPhaseEnd && now < revealPhaseEnd;
    const commitTimeRemaining = Math.max(0, (commitPhaseEnd - now) / 1000); // in milliseconds

    // Timer state for countdown
    const [, setTick] = useState(0);
    useEffect(() => {
        if (pendingReveal && isInCommitPhase) {
            const interval = setInterval(() => setTick(t => t + 1), 1000);
            return () => clearInterval(interval);
        }
    }, [pendingReveal, isInCommitPhase]);

    // Format time remaining
    const formatTimeRemaining = (ms: number): string => {
        if (ms <= 0) return 'Now';
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-grey-200">
                    <div className="flex items-center gap-3">
                        <Lock className="w-6 h-6 text-alethea-600" />
                        <h2 className="text-xl font-bold text-black">
                            {voteMode === 'reveal' ? 'Reveal Vote' : 'Commit Vote'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-grey-100 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-grey-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Query Info */}
                    <div className="mb-6">
                        <h3 className="font-semibold text-lg text-black mb-2">
                            {query.description}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-grey-600">
                            <span>Query #{query.id}</span>
                            <span>{query.voteCount} votes</span>
                        </div>
                        {isRegisteredVoter && voterStake !== '0' && (
                            <div className="mt-2 text-sm text-green-700">
                                ✓ Registered voter • Stake: {parseFloat(voterStake).toLocaleString()} ALTH
                            </div>
                        )}
                    </div>



                    {/* Loading registration check */}
                    {checkingRegistration ? (
                        <div className="p-4 bg-grey-50 border border-grey-200 rounded-lg">
                            <div className="flex items-center gap-2 text-grey-700">
                                <Loader2 className="w-5 h-5 animate-spin text-alethea-600" />
                                <span>Checking voter registration...</span>
                            </div>
                        </div>
                    ) : !isRegisteredVoter ? (
                        /* Not registered as voter */
                        <div className="space-y-4">
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="flex items-center gap-2 text-amber-700 mb-2">
                                    <AlertCircle className="w-5 h-5" />
                                    <span className="font-medium">Not Registered as Voter</span>
                                </div>
                                <p className="text-sm text-amber-600">
                                    You must register as a voter and stake ALTH tokens before you can vote on queries.
                                </p>
                            </div>

                            <div className="p-4 bg-grey-50 rounded-lg">
                                <p className="text-sm text-grey-700 mb-2">
                                    <strong>How to become a voter:</strong>
                                </p>
                                <ol className="text-sm text-grey-600 list-decimal list-inside space-y-1">
                                    <li>Get ALTH tokens from the Token Faucet</li>
                                    <li>Go to the Voters page</li>
                                    <li>Click "Register as Voter" and stake tokens</li>
                                </ol>
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full btn-secondary py-3"
                            >
                                Close
                            </button>
                        </div>
                    ) : isExpired ? (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-2 text-red-700">
                                <AlertCircle className="w-5 h-5" />
                                <span>This query has expired.</span>
                            </div>
                        </div>
                    ) : completedVote ? (
                        /* Already Voted */
                        <div className="space-y-6">
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-2 text-green-700 mb-2">
                                    <Eye className="w-5 h-5" />
                                    <span className="font-medium">Vote Submitted Successfully!</span>
                                </div>
                                <p className="text-sm text-green-600">
                                    You have already voted on this query.
                                </p>
                            </div>

                            <div className="p-4 bg-grey-50 rounded-lg">
                                <p className="text-sm text-grey-700">
                                    <strong className="text-black">Your Vote:</strong> {completedVote.value}
                                </p>
                                <p className="text-sm text-grey-700">
                                    <strong className="text-black">Confidence:</strong> {completedVote.confidence}%
                                </p>
                                <p className="text-sm text-grey-700">
                                    <strong className="text-black">Revealed:</strong> {new Date(completedVote.revealedAt).toLocaleString()}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full btn-secondary py-3"
                            >
                                Close
                            </button>
                        </div>
                    ) : pendingReveal ? (
                        /* Reveal Mode */
                        <div className="space-y-6">
                            {isInCommitPhase ? (
                                /* Still in commit phase - show countdown */
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center gap-2 text-blue-700 mb-2">
                                        <Clock className="w-5 h-5" />
                                        <span className="font-medium">Vote Committed Successfully!</span>
                                    </div>
                                    <p className="text-sm text-blue-600 mb-3">
                                        Your vote for "{pendingReveal.value}" has been committed.
                                    </p>
                                    <div className="p-3 bg-blue-100 rounded-lg">
                                        <p className="text-sm text-blue-700 font-medium text-center">
                                            Reveal phase starts in: <span className="text-lg font-bold text-blue-800">{formatTimeRemaining(commitTimeRemaining)}</span>
                                        </p>
                                    </div>
                                </div>
                            ) : isInRevealPhase ? (
                                /* In reveal phase - can reveal */
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center gap-2 text-green-700 mb-2">
                                        <Eye className="w-5 h-5" />
                                        <span className="font-medium">Reveal Phase Active!</span>
                                    </div>
                                    <p className="text-sm text-green-600">
                                        You can now reveal your vote for "{pendingReveal.value}".
                                    </p>
                                </div>
                            ) : (
                                /* Reveal phase ended */
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <div className="flex items-center gap-2 text-red-700 mb-2">
                                        <AlertCircle className="w-5 h-5" />
                                        <span className="font-medium">Reveal Phase Ended</span>
                                    </div>
                                    <p className="text-sm text-red-600">
                                        The reveal phase has ended. Your vote was not revealed in time.
                                    </p>
                                </div>
                            )}

                            <div className="p-4 bg-grey-50 rounded-lg">
                                <p className="text-sm text-grey-700">
                                    <strong className="text-black">Your Vote:</strong> {pendingReveal.value}
                                </p>
                                <p className="text-sm text-grey-700">
                                    <strong className="text-black">Confidence:</strong> {pendingReveal.confidence}%
                                </p>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 btn-secondary py-3"
                                >
                                    {isInCommitPhase ? 'Close' : 'Cancel'}
                                </button>
                                <button
                                    onClick={handleReveal}
                                    disabled={isSubmitting || isInCommitPhase || !isInRevealPhase}
                                    className={`flex-1 px-4 py-3 text-white rounded-lg font-medium transition-all ${isInCommitPhase || !isInRevealPhase
                                        ? 'bg-grey-300 text-grey-500 cursor-not-allowed'
                                        : 'bg-green-600 hover:bg-green-500'
                                        }`}
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Revealing...
                                        </span>
                                    ) : isInCommitPhase ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            Wait for Reveal Phase
                                        </span>
                                    ) : !isInRevealPhase ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            Phase Ended
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            <Eye className="w-4 h-4" />
                                            Reveal Vote
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Commit Vote Mode */
                        <div className="space-y-6">
                            {/* Mode Info */}
                            <div className="p-4 rounded-lg bg-alethea-50 border border-alethea-200">
                                <p className="text-sm">
                                    <strong className="text-alethea-600">Commit/Reveal:</strong>{' '}
                                    <span className="text-alethea-700">
                                        Your vote is hidden until reveal phase. More secure against vote manipulation.
                                    </span>
                                </p>
                            </div>

                            {/* Outcome Selection */}
                            <div>
                                <label className="block text-sm font-medium text-grey-700 mb-3">
                                    Select Your Answer
                                </label>
                                <div className="space-y-2">
                                    {query.outcomes.map((outcome) => (
                                        <label
                                            key={outcome}
                                            className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedOutcome === outcome
                                                ? 'border-alethea-500 bg-alethea-50'
                                                : 'border-grey-200 hover:border-grey-300 bg-white'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="outcome"
                                                value={outcome}
                                                checked={selectedOutcome === outcome}
                                                onChange={(e) => setSelectedOutcome(e.target.value)}
                                                className="sr-only"
                                            />
                                            <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${selectedOutcome === outcome
                                                ? 'border-alethea-500 bg-alethea-500'
                                                : 'border-grey-400'
                                                }`}>
                                                {selectedOutcome === outcome && (
                                                    <div className="w-2 h-2 bg-white rounded-full" />
                                                )}
                                            </div>
                                            <span className="font-medium text-black">{outcome}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Confidence Slider */}
                            <div>
                                <label className="block text-sm font-medium text-grey-700 mb-2">
                                    Confidence Level: {confidence}%
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="100"
                                    value={confidence}
                                    onChange={(e) => setConfidence(Number(e.target.value))}
                                    className="w-full h-2 bg-grey-200 rounded-lg appearance-none cursor-pointer accent-alethea-500"
                                />
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                                    {error}
                                </div>
                            )}

                            {/* Phase Warning - Show if not in commit phase */}
                            {!isInCommitPhase && (
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                    <div className="flex items-center gap-2 text-amber-700">
                                        <AlertCircle className="w-5 h-5" />
                                        <span className="font-medium">
                                            {isInRevealPhase
                                                ? 'Commit phase has ended. This query is now in reveal phase.'
                                                : 'This query has expired. Voting is no longer available.'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 btn-secondary py-3"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCommit}
                                    disabled={isSubmitting || !selectedOutcome || !isInCommitPhase}
                                    className={`flex-1 px-4 py-3 text-white rounded-lg font-medium transition-all ${isSubmitting || !selectedOutcome || !isInCommitPhase
                                        ? 'bg-grey-300 text-grey-500 cursor-not-allowed'
                                        : 'btn-primary'
                                        }`}
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Committing...
                                        </span>
                                    ) : !isInCommitPhase ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            {isInRevealPhase ? 'Commit Phase Ended' : 'Query Expired'}
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            <Lock className="w-4 h-4" />
                                            Commit Vote
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
