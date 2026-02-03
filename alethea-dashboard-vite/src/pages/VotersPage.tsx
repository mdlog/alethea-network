import { useState, useEffect } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { Users, Plus, Loader2, X, Shield, TrendingUp, Award } from 'lucide-react';
import StakeInterface from '../components/StakeInterface';

// Format stake - handle trailing dot from Linera Amount format
function formatStake(stake: string | number | undefined): string {
    if (!stake) return '0';
    const stakeStr = String(stake).endsWith('.') ? String(stake).slice(0, -1) : String(stake);
    const stakeNum = parseFloat(stakeStr);
    if (isNaN(stakeNum)) return '0';
    if (stakeNum > 1e15) {
        return (stakeNum / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    return stakeNum.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

interface Voter {
    address: string;
    stake: string;
    lockedStake: string;
    reputation: number;
    reputationTier: string;
    totalVotes: number;
    correctVotes: number;
    isActive: boolean;
    name?: string;
}

const tierColors: Record<string, { bg: string; text: string; border: string }> = {
    'Legendary': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
    'Diamond': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
    'Platinum': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
    'Gold': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
    'Silver': { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
    'Bronze': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
    'Newcomer': { bg: 'bg-grey-100', text: 'text-grey-600', border: 'border-grey-200' },
};

export default function VotersPage() {
    const { chainId, executeAppChainQuery } = useLinera();
    const [voters, setVoters] = useState<Voter[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showRegisterModal, setShowRegisterModal] = useState(false);

    const loadVoters = async () => {
        setLoading(true);
        setError(null);

        try {
            console.log('Loading voters from Application Chain...');
            const data = await executeAppChainQuery(`
                query {
                    voters(limit: 50, offset: 0, activeOnly: true) {
                        address
                        stake
                        lockedStake
                        reputation
                        reputationTier
                        totalVotes
                        correctVotes
                        isActive
                        name
                    }
                }
            `);

            console.log('Voters data:', data);
            setVoters(data?.voters || []);
        } catch (err) {
            console.error('Failed to load voters:', err);
            setError(err instanceof Error ? err.message : 'Failed to load voters');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadVoters();
    }, []);

    const isUserRegistered = voters.some(
        v => v.address?.toLowerCase() === chainId?.toLowerCase()
    );

    // Calculate stats from RAW values (not formatted)
    const totalStake = voters.reduce((sum, v) => {
        if (!v.stake) return sum;
        const stakeStr = String(v.stake).endsWith('.') ? String(v.stake).slice(0, -1) : String(v.stake);
        const stakeNum = Number.parseFloat(stakeStr);
        if (Number.isNaN(stakeNum)) return sum;
        // Handle Linera's 18 decimal format (values > 1e15 are in attos)
        const actualValue = stakeNum > 1e15 ? stakeNum / 1e18 : stakeNum;
        return sum + actualValue;
    }, 0);
    
    const avgReputation = voters.length > 0
        ? Math.round(voters.reduce((sum, v) => sum + v.reputation, 0) / voters.length)
        : 0;
    
    // Format large numbers for display (locale-independent)
    const formatDisplayNumber = (num: number): string => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return Math.round(num).toString();
    };

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-black">Voters</h1>
                    <p className="text-sm sm:text-base text-grey-600">Registered oracle voters</p>
                </div>

                {chainId && !isUserRegistered && (
                    <button
                        onClick={() => setShowRegisterModal(true)}
                        className="btn-primary flex items-center justify-center gap-2 text-sm sm:text-base px-3 sm:px-4 py-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden xs:inline">Register as Voter</span>
                        <span className="xs:hidden">Register</span>
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            {!loading && voters.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    <div className="card p-3 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-alethea-100 flex items-center justify-center">
                                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-alethea-600" />
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs text-grey-600 uppercase tracking-wider">Voters</p>
                                <p className="text-lg sm:text-xl font-bold text-black">{voters.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-3 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                <Award className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs text-grey-600 uppercase tracking-wider">Staked</p>
                                <p className="text-lg sm:text-xl font-bold text-black">{formatDisplayNumber(totalStake)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-3 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs text-grey-600 uppercase tracking-wider">Avg Rep</p>
                                <p className="text-lg sm:text-xl font-bold text-black">{avgReputation}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-8 sm:py-12">
                    <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-alethea-600" />
                </div>
            ) : error ? (
                <div className="card border-red-200 p-3 sm:p-4 text-sm text-red-600">
                    {error}
                </div>
            ) : voters.length === 0 ? (
                <div className="card p-8 sm:p-12 text-center">
                    <Users className="w-10 h-10 sm:w-12 sm:h-12 text-grey-400 mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-base sm:text-lg font-medium text-black mb-2">No Voters Yet</h3>
                    <p className="text-sm text-grey-600 mb-4 sm:mb-6">Be the first to register as a voter!</p>
                    {chainId && (
                        <button
                            onClick={() => setShowRegisterModal(true)}
                            className="btn-primary text-sm"
                        >
                            Register Now
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                        {voters.map((voter, idx) => {
                            const tier = tierColors[voter.reputationTier] || tierColors['Newcomer'];
                            const accuracy = voter.totalVotes > 0
                                ? Math.round((voter.correctVotes / voter.totalVotes) * 100)
                                : 0;

                            return (
                                <div key={voter.address || idx} className="card p-3">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-grey-100 flex items-center justify-center">
                                                <Shield className="w-4 h-4 text-grey-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-black">{voter.name || `Voter #${idx + 1}`}</p>
                                                <p className="text-[10px] text-grey-600 font-mono">
                                                    {voter.address?.slice(0, 8)}...{voter.address?.slice(-4)}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${voter.isActive
                                            ? 'bg-green-50 text-green-700 border border-green-200'
                                            : 'bg-grey-100 text-grey-600 border border-grey-200'
                                            }`}>
                                            {voter.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-[10px] sm:text-xs">
                                        <div className="bg-grey-50 rounded p-2">
                                            <p className="text-grey-500">Stake</p>
                                            <p className="font-semibold text-black">{formatStake(voter.stake)}</p>
                                        </div>
                                        <div className="bg-grey-50 rounded p-2">
                                            <p className="text-grey-500">Rep</p>
                                            <p className="font-semibold text-black">{voter.reputation}</p>
                                        </div>
                                        <div className="bg-grey-50 rounded p-2">
                                            <p className="text-grey-500">Accuracy</p>
                                            <p className={`font-semibold ${accuracy >= 80 ? 'text-emerald-600' : accuracy >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                                {accuracy}%
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block card overflow-hidden">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Voter</th>
                                    <th>Stake</th>
                                    <th>Reputation</th>
                                    <th>Votes</th>
                                    <th>Accuracy</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {voters.map((voter, idx) => {
                                    const tier = tierColors[voter.reputationTier] || tierColors['Newcomer'];
                                    const accuracy = voter.totalVotes > 0
                                        ? Math.round((voter.correctVotes / voter.totalVotes) * 100)
                                        : 0;

                                    return (
                                        <tr key={voter.address || idx}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-grey-100 flex items-center justify-center">
                                                        <Shield className="w-4 h-4 text-grey-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-black">{voter.name || `Voter #${idx + 1}`}</p>
                                                        <p className="text-xs text-grey-700 font-mono">
                                                            {voter.address?.slice(0, 10)}...{voter.address?.slice(-6)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="font-medium text-black">
                                                    {formatStake(voter.stake)} ALTH
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-black">{voter.reputation}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded border ${tier.bg} ${tier.text} ${tier.border}`}>
                                                        {voter.reputationTier}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="text-grey-700">
                                                    {voter.correctVotes}/{voter.totalVotes}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-1.5 bg-grey-200 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${accuracy >= 80 ? 'bg-emerald-500' :
                                                                accuracy >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                                                }`}
                                                            style={{ width: `${accuracy}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-sm ${accuracy >= 80 ? 'text-emerald-600' :
                                                        accuracy >= 60 ? 'text-amber-600' : 'text-red-600'
                                                        }`}>
                                                        {accuracy}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${voter.isActive
                                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                                    : 'bg-grey-100 text-grey-600 border border-grey-200'
                                                    }`}>
                                                    {voter.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Register Modal */}
            {showRegisterModal && (
                <div className="modal-overlay" onClick={() => setShowRegisterModal(false)}>
                    <div className="modal-content max-w-md mx-2 sm:mx-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-grey-200">
                            <h2 className="text-base sm:text-lg font-bold text-black">Register as Voter</h2>
                            <button
                                onClick={() => setShowRegisterModal(false)}
                                className="p-1.5 sm:p-2 text-grey-600 hover:text-black hover:bg-grey-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 sm:p-5 max-h-[70vh] overflow-y-auto">
                            <StakeInterface
                                isRegistration={true}
                                onSuccess={() => {
                                    setShowRegisterModal(false);
                                    loadVoters();
                                }}
                                onCancel={() => setShowRegisterModal(false)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
