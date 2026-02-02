import { useState, useEffect } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { Building2, Coins, TrendingUp, Award, RefreshCw, Loader2 } from 'lucide-react';

interface TreasuryStats {
    protocolTreasury: string;
    rewardPoolBalance: string;
    totalRewardsDistributed: string;
    totalStake: string;
}

export default function TreasuryInfo() {
    const { status, executeAppChainQuery } = useLinera();
    const [stats, setStats] = useState<TreasuryStats | null>(null);
    const [loading, setLoading] = useState(true);

    const loadStats = async () => {
        setLoading(true);
        try {
            const data = await executeAppChainQuery(`
                query {
                    statistics {
                        protocolTreasury
                        rewardPoolBalance
                        totalRewardsDistributed
                        totalStake
                    }
                }
            `);

            setStats({
                protocolTreasury: data?.statistics?.protocolTreasury || '0',
                rewardPoolBalance: data?.statistics?.rewardPoolBalance || '0',
                totalRewardsDistributed: data?.statistics?.totalRewardsDistributed || '0',
                totalStake: data?.statistics?.totalStake || '0',
            });
        } catch (err) {
            console.error('Failed to load treasury stats:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (status === 'Ready') {
            loadStats();
        }
    }, [status]);

    // Helper to format stake (handles 10^18 issue from contract)
    const formatStake = (value: string | number): number => {
        const cleanValue = typeof value === 'string' && value.endsWith('.') ? value.slice(0, -1) : value;
        const num = typeof cleanValue === 'string' ? parseFloat(cleanValue) : cleanValue;
        if (isNaN(num)) return 0;
        // If value is very large (> 1e15), it's likely in attos, divide by 10^18
        if (num > 1e15) {
            return num / 1e18;
        }
        return num;
    };

    const formatAmount = (amount: string): string => {
        const num = formatStake(amount);
        if (num === 0) return '0';
        if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
        return num.toFixed(2);
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Protocol Treasury</h3>
                        <p className="text-sm text-gray-500">Network financial overview</p>
                    </div>
                </div>
                <button
                    onClick={loadStats}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4 text-gray-500" />
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-100">
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs text-gray-500">Treasury</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">
                        {formatAmount(stats?.protocolTreasury || '0')}
                    </p>
                </div>

                <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Award className="w-4 h-4 text-green-500" />
                        <span className="text-xs text-gray-500">Reward Pool</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">
                        {formatAmount(stats?.rewardPoolBalance || '0')}
                    </p>
                </div>

                <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                        <span className="text-xs text-gray-500">Distributed</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">
                        {formatAmount(stats?.totalRewardsDistributed || '0')}
                    </p>
                </div>

                <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Coins className="w-4 h-4 text-yellow-500" />
                        <span className="text-xs text-gray-500">Total Staked</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">
                        {formatAmount(stats?.totalStake || '0')}
                    </p>
                </div>
            </div>
        </div>
    );
}
