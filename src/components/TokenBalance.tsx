import { useState, useEffect } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { Coins, RefreshCw, Loader2 } from 'lucide-react';

const TOKEN_APP_ID = import.meta.env.VITE_TOKEN_APP_ID || '';
// Use relative URL for Vite proxy, or explicit URL if set
const SERVICE_URL = import.meta.env.VITE_SERVICE_URL || '';

interface TokenBalanceProps {
    showRefresh?: boolean;
    compact?: boolean;
}

export default function TokenBalance({ showRefresh = true, compact = false }: TokenBalanceProps) {
    const { chainId, owner, status } = useLinera();
    const [balance, setBalance] = useState<string>('0');
    const [loading, setLoading] = useState(false);
    const [tokenSymbol, setTokenSymbol] = useState('ALTH');

    const loadBalance = async () => {
        if (!TOKEN_APP_ID || !owner || !chainId) return;

        setLoading(true);
        try {
            // Linera standard: query on USER's chain, not token chain
            const graphqlUrl = `${SERVICE_URL}/chains/${chainId}/applications/${TOKEN_APP_ID}`;

            // Use 0x prefix and lowercase for owner (Linera stores keys in lowercase)
            const queryOwner = (owner.startsWith('0x') ? owner : `0x${owner}`).toLowerCase();
            console.log('🔍 Loading balance for owner:', queryOwner, 'on chain:', chainId);

            const response = await fetch(graphqlUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
                body: JSON.stringify({
                    query: `
                        query {
                            accounts {
                                entry(key: "${queryOwner}") {
                                    value
                                }
                            }
                            tickerSymbol
                        }
                    `
                }),
            });

            if (response.ok) {
                const result = await response.json();
                console.log('📊 Balance response:', result);
                if (result.data) {
                    // Balance from accounts.entry.value (Linera standard format)
                    const balanceValue = result.data.accounts?.entry?.value || '0';
                    setBalance(balanceValue);
                    if (result.data.tickerSymbol) {
                        setTokenSymbol(result.data.tickerSymbol);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to load token balance:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (status === 'Ready' && owner) {
            loadBalance();
            // Auto-refresh every 30 seconds
            const interval = setInterval(() => {
                loadBalance();
            }, 30000);
            return () => clearInterval(interval);
        }
    }, [status, owner]);



    const formatBalance = (bal: string): string => {
        const cleanBal = bal.endsWith('.') ? bal.slice(0, -1) : bal;
        const num = parseFloat(cleanBal);
        if (isNaN(num) || num === 0) return '0';
        if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
        return num.toFixed(2);
    };

    if (!TOKEN_APP_ID) {
        return null; // Token not configured
    }

    if (compact) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg">
                <Coins className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-700">
                    {loading ? '...' : formatBalance(balance)} {tokenSymbol}
                </span>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <Coins className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                        <p className="text-xs text-yellow-600 font-medium">Token Balance</p>
                        <p className="text-xl font-bold text-yellow-800">
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
                        onClick={loadBalance}
                        disabled={loading}
                        className="p-2 hover:bg-yellow-100 rounded-lg transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 text-yellow-600 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                )}
            </div>
        </div>
    );
}
