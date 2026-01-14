import { useState, useEffect } from 'react';
import { useLinera } from '../contexts/LineraContext';
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
    treasury?: string;
    circulating?: string;
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
            let tokenData: TokenInfo | null = null;

            // Load token info from token chain
            if (TOKEN_APP_ID) {
                const tokenInfoUrl = `${SERVICE_URL}/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID}`;

                // Get ticker symbol and treasury balance (initial supply holder)
                const treasuryOwner = '0x97f8b39f99b4097e4f05961d3a93539dbcd99851091809eaf7588d74123649b4';

                const tokenInfoResponse = await fetch(tokenInfoUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
                    body: JSON.stringify({
                        query: `query { 
                            tickerSymbol 
                            accounts { 
                                entry(key: "${treasuryOwner}") { value }
                            }
                        }`
                    }),
                });

                if (tokenInfoResponse.ok) {
                    const result = await tokenInfoResponse.json();
                    console.log('📊 Token info response:', result);
                    if (result.data) {
                        const treasuryBal = result.data.accounts?.entry?.value || '0';
                        // Total supply = 1,000,000,000 (1 billion initial mint)
                        const totalSupply = 1000000000;
                        // Remove trailing dot from Linera amount format
                        const treasuryAmount = parseFloat(treasuryBal.replace(/\.$/, '')) || 0;
                        const circulating = totalSupply - treasuryAmount;

                        tokenData = {
                            name: 'Alethea Token',
                            symbol: result.data.tickerSymbol || 'ALTH',
                            decimals: 18,
                            totalSupply: totalSupply.toString(),
                            totalMinted: totalSupply.toString(),
                            totalBurned: '0',
                            treasury: treasuryAmount.toString(),
                            circulating: circulating.toString(),
                        };
                    }
                }

                // Load user balance from USER's chain (not token chain)
                if (owner && chainId) {
                    const userChainUrl = `${SERVICE_URL}/chains/${chainId}/applications/${TOKEN_APP_ID}`;
                    const queryOwner = (owner.startsWith('0x') ? owner : `0x${owner}`).toLowerCase();

                    console.log('🔍 TokenPage: Loading balance for', queryOwner, 'on chain', chainId);

                    const balanceResponse = await fetch(userChainUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
                        body: JSON.stringify({
                            query: `query { accounts { entry(key: "${queryOwner}") { value } } }`
                        }),
                    });

                    if (balanceResponse.ok) {
                        const balanceResult = await balanceResponse.json();
                        console.log('📊 TokenPage balance response:', balanceResult);
                        if (balanceResult.data?.accounts?.entry?.value) {
                            setBalance(balanceResult.data.accounts.entry.value);
                        }
                    }
                }
            }

            // Set token info (already has treasury and circulating from token contract)
            if (tokenData) {
                setTokenInfo(tokenData);
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

                        <div className="grid grid-cols-5 gap-3">
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
                            <div className="bg-white/10 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <ArrowDownCircle className="w-4 h-4 text-yellow-200" />
                                    <span className="text-xs text-yellow-200">Treasury</span>
                                </div>
                                <p className="text-xl font-bold">
                                    {formatAmount(tokenInfo?.treasury || '0')}
                                </p>
                            </div>
                            <div className="bg-white/10 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Send className="w-4 h-4 text-yellow-200" />
                                    <span className="text-xs text-yellow-200">Circulating</span>
                                </div>
                                <p className="text-xl font-bold">
                                    {formatAmount(tokenInfo?.circulating || '0')}
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
                                        disabled={balance <= 0}
                                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${balance > 0
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                            }`}
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
                                        disabled={balance <= 0}
                                        className={`w-full flex items-center gap-3 p-4 rounded-lg transition-colors text-left ${balance > 0
                                            ? 'bg-blue-50 hover:bg-blue-100'
                                            : 'bg-gray-50 cursor-not-allowed opacity-50'
                                            }`}
                                    >
                                        <Send className={`w-5 h-5 ${balance > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
                                        <div>
                                            <p className={`font-medium ${balance > 0 ? 'text-gray-900' : 'text-gray-500'}`}>Transfer Tokens</p>
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

                    {/* Token Minter Section */}
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
