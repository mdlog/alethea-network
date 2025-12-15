import { useState, useEffect, useCallback } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { useGlobalRefresh } from '../contexts/TokenContext';
import {
    Coins, RefreshCw, Loader2, Send, ArrowDownCircle,
    TrendingUp, Flame, Info, ExternalLink
} from 'lucide-react';
import TokenBalance from '../components/TokenBalance';
import TransferToken from '../components/TransferToken';
import TreasuryInfo from '../components/TreasuryInfo';
import TokenFaucet from '../components/TokenFaucet';

const TOKEN_APP_ID = import.meta.env.VITE_TOKEN_APP_ID || '';
// Use relative URL for Vite proxy, or explicit URL if set
const SERVICE_URL = import.meta.env.VITE_SERVICE_URL || '';
const TOKEN_CHAIN_ID = import.meta.env.VITE_TOKEN_CHAIN_ID || import.meta.env.VITE_CHAIN_ID;

interface TokenInfo {
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: string;
    totalMinted: string;
    totalBurned: string;
}

export default function TokenPage() {
    const { chainId, owner, status, executeAppChainQuery } = useLinera();
    const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
    const [balance, setBalance] = useState('0');
    const [loading, setLoading] = useState(true);
    const [showTransfer, setShowTransfer] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load token info
            if (TOKEN_APP_ID) {
                const graphqlUrl = `${SERVICE_URL}/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID}`;

                const response = await fetch(graphqlUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
                    body: JSON.stringify({
                        query: `
                            query {
                                tokenInfo {
                                    name
                                    symbol
                                    decimals
                                    totalSupply
                                    totalMinted
                                    totalBurned
                                }
                                ${owner ? `balance(owner: "${owner}")` : ''}
                            }
                        `
                    }),
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.data) {
                        setTokenInfo(result.data.tokenInfo);
                        if (result.data.balance) {
                            setBalance(result.data.balance);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Failed to load token data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (status === 'Ready') {
            loadData();
        }
    }, [status, owner]);

    // Listen for global refresh events (triggered after stake/register/transfer)
    const handleGlobalRefresh = useCallback(() => {
        console.log('🔄 TokenPage: Global refresh triggered');
        loadData();
    }, []);
    useGlobalRefresh(handleGlobalRefresh);

    const formatAmount = (amount: string): string => {
        const cleanAmount = amount.endsWith('.') ? amount.slice(0, -1) : amount;
        const num = parseFloat(cleanAmount);
        if (isNaN(num) || num === 0) return '0';
        if (num >= 1000000000) return `${(num / 1000000000).toFixed(2)}B`;
        if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
        return num.toFixed(2);
    };

    if (!TOKEN_APP_ID) {
        return (
            <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-amber-800">Token Not Configured</h3>
                            <p className="text-sm text-amber-700 mt-1">
                                The ALETH token application is not configured. Please set VITE_TOKEN_APP_ID
                                in your .env.local file to enable token features.
                            </p>
                        </div>
                    </div>
                </div>
                <TreasuryInfo />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {tokenInfo?.name || 'Alethea Token'}
                    </h1>
                    <p className="text-gray-500">
                        {tokenInfo?.symbol || 'ALETH'} Token Management
                    </p>
                </div>
                <button
                    onClick={loadData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : (
                <>
                    {/* Token Info Card */}
                    <div className="bg-gradient-to-r from-yellow-500 to-amber-600 rounded-2xl p-6 text-white">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                                <Coins className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">{tokenInfo?.name || 'Alethea Token'}</h2>
                                <p className="text-yellow-100">{tokenInfo?.symbol || 'ALETH'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-white/10 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <TrendingUp className="w-4 h-4 text-yellow-200" />
                                    <span className="text-xs text-yellow-200">Total Supply</span>
                                </div>
                                <p className="text-xl font-bold">
                                    {formatAmount(tokenInfo?.totalSupply || '0')}
                                </p>
                            </div>
                            <div className="bg-white/10 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Coins className="w-4 h-4 text-yellow-200" />
                                    <span className="text-xs text-yellow-200">Total Minted</span>
                                </div>
                                <p className="text-xl font-bold">
                                    {formatAmount(tokenInfo?.totalMinted || '0')}
                                </p>
                            </div>
                            <div className="bg-white/10 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Flame className="w-4 h-4 text-yellow-200" />
                                    <span className="text-xs text-yellow-200">Total Burned</span>
                                </div>
                                <p className="text-xl font-bold">
                                    {formatAmount(tokenInfo?.totalBurned || '0')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* User Balance & Actions */}
                    {chainId && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Balance Card */}
                            <div className="bg-white rounded-xl p-6 border border-gray-200">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                                        <Coins className="w-5 h-5 text-yellow-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Your Balance</h3>
                                        <p className="text-sm text-gray-500">Available tokens</p>
                                    </div>
                                </div>

                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                                    <p className="text-3xl font-bold text-yellow-700">
                                        {formatAmount(balance)} {tokenInfo?.symbol || 'ALETH'}
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowTransfer(true)}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        <Send className="w-4 h-4" />
                                        Send
                                    </button>
                                    <button
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                        disabled
                                    >
                                        <ArrowDownCircle className="w-4 h-4" />
                                        Receive
                                    </button>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="bg-white rounded-xl p-6 border border-gray-200">
                                <h3 className="font-semibold text-gray-900 mb-4">Token Actions</h3>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => setShowTransfer(true)}
                                        className="w-full flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
                                    >
                                        <Send className="w-5 h-5 text-blue-600" />
                                        <div>
                                            <p className="font-medium text-gray-900">Transfer Tokens</p>
                                            <p className="text-sm text-gray-500">Send tokens to another address</p>
                                        </div>
                                    </button>

                                    <a
                                        href={`${SERVICE_URL}/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
                                    >
                                        <ExternalLink className="w-5 h-5 text-purple-600" />
                                        <div>
                                            <p className="font-medium text-gray-900">GraphQL Explorer</p>
                                            <p className="text-sm text-gray-500">Explore token contract API</p>
                                        </div>
                                    </a>
                                </div>

                                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-xs text-blue-700">
                                        <strong>Tip:</strong> Stake your tokens in the Voters page to earn rewards
                                        by participating in oracle queries.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Faucet Section */}
                    {chainId && (
                        <div className="grid grid-cols-1 gap-6">
                            <TokenFaucet onSuccess={loadData} />
                        </div>
                    )}

                    {/* Treasury Info */}
                    <TreasuryInfo />

                    {/* Token Contract Info */}
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-4">Contract Information</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">Token Name</span>
                                <span className="font-medium text-gray-900">{tokenInfo?.name || '-'}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">Symbol</span>
                                <span className="font-medium text-gray-900">{tokenInfo?.symbol || '-'}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">Decimals</span>
                                <span className="font-medium text-gray-900">{tokenInfo?.decimals || '-'}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">Application ID</span>
                                <span className="font-mono text-xs text-gray-600 break-all">
                                    {TOKEN_APP_ID.substring(0, 20)}...
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-gray-500">Chain ID</span>
                                <span className="font-mono text-xs text-gray-600 break-all">
                                    {TOKEN_CHAIN_ID?.substring(0, 20)}...
                                </span>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Transfer Modal */}
            {showTransfer && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="max-w-md w-full">
                        <TransferToken
                            balance={balance}
                            onSuccess={() => {
                                setShowTransfer(false);
                                loadData();
                            }}
                            onClose={() => setShowTransfer(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
