import { useState, useEffect } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { Users, Plus, Loader2 } from 'lucide-react';
import RegisterModal from '../components/RegisterModal';

// Format stake - handle trailing dot from Linera Amount format
function formatStake(stake: string | number | undefined): string {
    if (!stake) return '0';
    // Remove trailing dot (e.g., "142.5" stays as "142.5", "100." becomes "100")
    const stakeStr = String(stake).endsWith('.') ? String(stake).slice(0, -1) : String(stake);
    const stakeNum = parseFloat(stakeStr);
    if (isNaN(stakeNum)) return '0';
    // If value is very large (> 1e15), it's likely in raw format (multiplied by 10^18)
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

export default function VotersPage() {
    const { chainId, status, application, executeAppChainQuery } = useLinera();
    const [voters, setVoters] = useState<Voter[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showRegisterModal, setShowRegisterModal] = useState(false);

    const loadVoters = async () => {
        // Tidak perlu application untuk query ke app chain via HTTP
        setLoading(true);
        setError(null);

        try {
            console.log('📊 Loading voters from Application Chain...');
            // Query ke Application Chain agar semua browser melihat voters yang sama
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

            console.log('📊 Voters data:', data);
            setVoters(data?.voters || []);
        } catch (err) {
            console.error('❌ Failed to load voters:', err);
            setError(err instanceof Error ? err.message : 'Failed to load voters');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Load voters saat component mount (tidak perlu tunggu WASM ready)
        loadVoters();
    }, []);

    const isUserRegistered = voters.some(
        v => v.address?.toLowerCase() === chainId?.toLowerCase()
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Voters</h1>
                    <p className="text-gray-500">Registered oracle voters on the network</p>
                </div>

                {chainId && !isUserRegistered && (
                    <button
                        onClick={() => setShowRegisterModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Register as Voter
                    </button>
                )}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                    {error}
                </div>
            ) : voters.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Voters Yet</h3>
                    <p className="text-gray-500 mb-6">Be the first to register as a voter!</p>
                    {chainId && (
                        <button
                            onClick={() => setShowRegisterModal(true)}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Register Now
                        </button>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voter</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stake</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reputation</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Votes</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {voters.map((voter, idx) => (
                                <tr key={voter.address || idx} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium text-gray-900">{voter.name || `Voter #${idx + 1}`}</p>
                                            <p className="text-xs text-gray-500 font-mono">
                                                {voter.address?.slice(0, 12)}...{voter.address?.slice(-8)}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-medium text-gray-900">
                                            {formatStake(voter.stake)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900">{voter.reputation}</span>
                                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                                {voter.reputationTier}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-gray-900">
                                            {voter.correctVotes}/{voter.totalVotes}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs rounded-full ${voter.isActive
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-500'
                                            }`}>
                                            {voter.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Register Modal */}
            {showRegisterModal && (
                <RegisterModal
                    onClose={() => setShowRegisterModal(false)}
                    onSuccess={() => {
                        setShowRegisterModal(false);
                        loadVoters();
                    }}
                />
            )}
        </div>
    );
}
