import { useEffect } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { useToken } from '../contexts/TokenContext';
import { Coins, RefreshCw, Loader2 } from 'lucide-react';

const TOKEN_APP_ID = import.meta.env.VITE_TOKEN_APP_ID || '';

interface TokenBalanceProps {
    showRefresh?: boolean;
    compact?: boolean;
}

export default function TokenBalance({ showRefresh = true, compact = false }: TokenBalanceProps) {
    const { chainId, owner, status } = useLinera();
    const { balance, refreshBalance, loading } = useToken();
    const tokenSymbol = 'ALTH'; // Fixed symbol for Alethea Token

    // Load balance on mount and refresh periodically
    useEffect(() => {
        if (status === 'Ready' && owner && chainId) {
            console.log('🔍 TokenBalance: Initial load for owner:', owner);
            refreshBalance();

            // Auto-refresh every 30 seconds
            const interval = setInterval(() => {
                console.log('🔄 TokenBalance: Auto-refresh');
                refreshBalance();
            }, 30000);
            return () => clearInterval(interval);
        }
    }, [status, owner, chainId, refreshBalance]);



    const formatBalance = (bal: number): string => {
        if (isNaN(bal) || bal === 0) return '0';
        if (bal >= 1000000) return `${(bal / 1000000).toFixed(2)}M`;
        if (bal >= 1000) return `${(bal / 1000).toFixed(2)}K`;
        return bal.toFixed(2);
    };

    if (!TOKEN_APP_ID) {
        return null; // Token not configured
    }

    if (compact) {
        return (
            <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-alethea-50 border border-alethea-200 rounded-md sm:rounded-lg">
                <Coins className="w-3 h-3 sm:w-4 sm:h-4 text-alethea-600" />
                <span className="text-[10px] sm:text-xs md:text-sm font-medium text-alethea-700">
                    {loading ? '...' : formatBalance(balance)}
                </span>
            </div>
        );
    }

    return (
        <div className="card p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-alethea-50 rounded-lg flex items-center justify-center">
                        <Coins className="w-5 h-5 text-alethea-600" />
                    </div>
                    <div>
                        <p className="text-xs text-grey-600 font-medium">Token Balance</p>
                        <p className="text-xl font-bold text-alethea-600">
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                `${formatBalance(balance)} ${tokenSymbol}`
                            )}
                        </p>
                    </div>
                </div>
                {showRefresh && (
                    <button
                        onClick={refreshBalance}
                        disabled={loading}
                        className="p-2 hover:bg-grey-50 rounded-lg transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 text-alethea-600 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                )}
            </div>
        </div>
    );
}
