import { useState } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { Gift, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface ClaimRewardsProps {
    pendingRewards?: string;
    onSuccess?: () => void;
}

export default function ClaimRewards({ pendingRewards = '0', onSuccess }: ClaimRewardsProps) {
    const { chainId, status, executeMutation } = useLinera();
    const [claiming, setClaiming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const hasPendingRewards = parseFloat(pendingRewards) > 0;

    const handleClaim = async () => {
        if (!chainId || !hasPendingRewards) return;

        setClaiming(true);
        setError(null);
        setSuccess(false);

        try {
            console.log('🎁 Claiming rewards...');

            const mutation = `mutation { claimRewards }`;
            await executeMutation(mutation);

            console.log('✅ Rewards claimed successfully!');
            setSuccess(true);

            if (onSuccess) {
                setTimeout(() => onSuccess(), 1500);
            }
        } catch (err) {
            console.error('❌ Failed to claim rewards:', err);
            setError(err instanceof Error ? err.message : 'Failed to claim rewards');
        } finally {
            setClaiming(false);
        }
    };

    if (status !== 'Ready') {
        return null;
    }

    return (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Gift className="w-5 h-5 text-green-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-gray-900">Pending Rewards</h3>
                    <p className="text-sm text-gray-500">Claim your voting rewards</p>
                </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-green-600 mb-1">Available to Claim</p>
                <p className="text-2xl font-bold text-green-700">
                    {parseFloat(pendingRewards).toFixed(2)} tokens
                </p>
            </div>

            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {success && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <p className="text-sm text-green-700">Rewards claimed successfully!</p>
                </div>
            )}

            <button
                onClick={handleClaim}
                disabled={claiming || !hasPendingRewards}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${hasPendingRewards
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
            >
                {claiming ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Claiming...
                    </>
                ) : (
                    <>
                        <Gift className="w-4 h-4" />
                        {hasPendingRewards ? 'Claim Rewards' : 'No Rewards Available'}
                    </>
                )}
            </button>

            <p className="text-xs text-gray-500 mt-3 text-center">
                Rewards are earned by voting correctly on oracle queries
            </p>
        </div>
    );
}
