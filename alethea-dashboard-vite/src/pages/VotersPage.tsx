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

    // Calculate stats
    const totalStake = voters.reduce((sum, v) => sum + parseFloat(formatStake(v.stake).replace(/,/g, '')), 0);
    const avgReputation = voters.length > 0
        ? Math.round(voters.reduce((sum, v) => sum + v.reputation, 0) / voters.length)
        : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-black">Voters</h1>
                    <p className="text-grey-600">Registered oracle voters on the network</p>
                </div>

                {chainId && !isUserRegistered && (
                    <button
                        onClick={() => setShowRegisterModal(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Register as Voter
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            {!loading && voters.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="card p-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-alethea-100 flex items-center justify-center">
                                <Users className="w-5 h-5 text-alethea-600" />
                            </div>
                            <div>
                                <p className="text-xs text-grey-600 uppercase tracking-wider">Total Voters</p>
                                <p className="text-xl font-bold text-black">{voters.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                <Award className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-xs text-grey-600 uppercase tracking-wider">Total Staked</p>
                                <p className="text-xl font-bold text-black">{totalStake.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-cyber-100 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-cyber-600" />
                            </div>
                            <div>
                                <p className="text-xs text-grey-600 uppercase tracking-wider">Avg Reputation</p>
                                <p className="text-xl font-bold text-black">{avgReputation}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-alethea-600" />
                </div>
            ) : error ? (
                <div className="card border-red-200 p-4 text-red-600">
                    {error}
                </div>
            ) : voters.length === 0 ? (
                <div className="card p-12 text-center">
                    <Users className="w-12 h-12 text-grey-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-black mb-2">No Voters Yet</h3>
                    <p className="text-grey-600 mb-6">Be the first to register as a voter!</p>
                    {chainId && (
                        <button
                            onClick={() => setShowRegisterModal(true)}
                            className="btn-primary"
                        >
                            Register Now
                        </button>
                    )}
                </div>
            ) : (
                <div className="card overflow-hidden">
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
                                                    <p className="text-xs text-grey-700 font-mono font-medium">
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
            )}

            {/* Register Modal */}
            {showRegisterModal && (
                <div className="modal-overlay" onClick={() => setShowRegisterModal(false)}>
                    <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-grey-200">
                            <h2 className="text-lg font-bold text-black">Register as Voter</h2>
                            <button
                                onClick={() => setShowRegisterModal(false)}
                                className="p-2 text-grey-600 hover:text-black hover:bg-grey-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5">
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
