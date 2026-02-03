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
                        // Updated query format for new token contract
                        query: `query { 
                            tokenInfo {
                                name
                                symbol
                                decimals
                                totalSupply
                                totalMinted
                                totalBurned
                            }
                            balance(owner: "${treasuryOwner}")
                        }`
                    }),
                });

                if (tokenInfoResponse.ok) {
                    const result = await tokenInfoResponse.json();
                    console.log('📊 Token info response:', result);
                    if (result.data) {
                        const treasuryBal = result.data.balance || '0';
                        const info = result.data.tokenInfo;

                        // Remove trailing dot from Linera amount format
                        const totalSupply = parseFloat(info.totalSupply.replace(/\.$/, '')) || 0;
                        const treasuryAmount = parseFloat(treasuryBal.replace(/\.$/, '')) || 0;
                        const totalMinted = parseFloat(info.totalMinted.replace(/\.$/, '')) || 0;
                        const totalBurned = parseFloat(info.totalBurned.replace(/\.$/, '')) || 0;
                        const circulating = totalSupply - treasuryAmount;

                        tokenData = {
                            name: info.name || 'Alethea Token',
                            symbol: info.symbol || 'ALTH',
                            decimals: info.decimals || 18,
                            totalSupply: totalSupply.toString(),
                            totalMinted: totalMinted.toString(),
                            totalBurned: totalBurned.toString(),
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
                            // Updated query format for new token contract
                            query: `query { balance(owner: "${queryOwner}") }`
                        }),
                    });

                    if (balanceResponse.ok) {
                        const balanceResult = await balanceResponse.json();
                        console.log('📊 TokenPage balance response:', balanceResult);
                        if (balanceResult.data?.balance) {
                            setBalance(balanceResult.data.balance);
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
                <div className="card p-6 border-amber-200">
                    <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-amber-500 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-amber-700">Token Not Configured</h3>
                            <p className="text-sm text-amber-600 mt-1">
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
        <div className="space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-black">
                        {tokenInfo?.name || 'Alethea Token'}
                    </h1>
                    <p className="text-sm sm:text-base text-grey-600">
                        {tokenInfo?.symbol || 'ALETH'} Token
                    </p>
                </div>
                <button
                    onClick={loadData}
                    disabled={loading}
                    className="btn-secondary flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-4 py-1.5 sm:py-2"
                >
                    <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span className="hidden xs:inline">Refresh</span>
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8 sm:py-12">
                    <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-alethea-500" />
                </div>
            ) : (
                <>
                    {/* Token Info Card */}
                    <div className="card p-4 sm:p-6 border-alethea-200 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-alethea-50 via-transparent to-blue-50" />
                        <div className="relative flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-alethea-50 rounded-xl flex items-center justify-center">
                                <Coins className="w-6 h-6 sm:w-8 sm:h-8 text-alethea-600" />
                            </div>
                            <div>
                                <h2 className="text-lg sm:text-2xl font-bold text-black">{tokenInfo?.name || 'Alethea Token'}</h2>
                                <p className="text-sm sm:text-base text-alethea-600">{tokenInfo?.symbol || 'ALETH'}</p>
                            </div>
                        </div>

                        <div className="relative grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
                            <div className="bg-grey-50 rounded-lg p-2.5 sm:p-4 border border-grey-100">
                                <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                                    <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-alethea-600" />
                                    <span className="text-[10px] sm:text-xs text-grey-600">Supply</span>
                                </div>
                                <p className="text-base sm:text-xl font-bold text-black">
                                    {formatAmount(tokenInfo?.totalSupply || '0')}
                                </p>
                            </div>
                            <div className="bg-grey-50 rounded-lg p-2.5 sm:p-4 border border-grey-100">
                                <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                                    <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                                    <span className="text-[10px] sm:text-xs text-grey-600">Minted</span>
                                </div>
                                <p className="text-base sm:text-xl font-bold text-black">
                                    {formatAmount(tokenInfo?.totalMinted || '0')}
                                </p>
                            </div>
                            <div className="bg-grey-50 rounded-lg p-2.5 sm:p-4 border border-grey-100">
                                <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                                    <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                                    <span className="text-[10px] sm:text-xs text-grey-600">Burned</span>
                                </div>
                                <p className="text-base sm:text-xl font-bold text-black">
                                    {formatAmount(tokenInfo?.totalBurned || '0')}
                                </p>
                            </div>
                            <div className="bg-grey-50 rounded-lg p-2.5 sm:p-4 border border-grey-100">
                                <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                                    <ArrowDownCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" />
                                    <span className="text-[10px] sm:text-xs text-grey-600">Treasury</span>
                                </div>
                                <p className="text-base sm:text-xl font-bold text-black">
                                    {formatAmount(tokenInfo?.treasury || '0')}
                                </p>
                            </div>
                            <div className="bg-grey-50 rounded-lg p-2.5 sm:p-4 border border-grey-100 col-span-2 sm:col-span-1">
                                <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                                    <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                                    <span className="text-[10px] sm:text-xs text-grey-600">Circulating</span>
                                </div>
                                <p className="text-base sm:text-xl font-bold text-black">
                                    {formatAmount(tokenInfo?.circulating || '0')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* User Balance & Actions */}
                    {chainId && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                            {/* Balance Card */}
                            <div className="card p-4 sm:p-6">
                                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-alethea-50 rounded-lg flex items-center justify-center">
                                        <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-alethea-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm sm:text-base font-semibold text-black">Your Balance</h3>
                                        <p className="text-xs sm:text-sm text-grey-600">Available tokens</p>
                                    </div>
                                </div>

                                <div className="bg-alethea-50 border border-alethea-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                                    <p className="text-xl sm:text-3xl font-bold text-alethea-600">
                                        {formatAmount(balance)} {tokenInfo?.symbol || 'ALETH'}
                                    </p>
                                </div>

                                <div className="flex gap-2 sm:gap-3">
                                    <button
                                        onClick={() => setShowTransfer(true)}
                                        disabled={parseFloat(balance) <= 0}
                                        className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm transition-colors ${parseFloat(balance) > 0
                                            ? 'btn-primary'
                                            : 'bg-grey-50 text-grey-600 cursor-not-allowed'
                                            }`}
                                    >
                                        <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        Send
                                    </button>
                                    <button
                                        className="flex-1 btn-secondary flex items-center justify-center gap-1.5 sm:gap-2 text-sm"
                                        disabled
                                    >
                                        <ArrowDownCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        Receive
                                    </button>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="card p-4 sm:p-6">
                                <h3 className="text-sm sm:text-base font-semibold text-black mb-3 sm:mb-4">Token Actions</h3>

                                <div className="space-y-2 sm:space-y-3">
                                    <button
                                        onClick={() => setShowTransfer(true)}
                                        disabled={parseFloat(balance) <= 0}
                                        className={`w-full flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg transition-colors text-left ${parseFloat(balance) > 0
                                            ? 'bg-grey-50 hover:bg-grey-100 border border-grey-100'
                                            : 'bg-grey-50 cursor-not-allowed opacity-50'
                                            }`}
                                    >
                                        <Send className={`w-4 h-4 sm:w-5 sm:h-5 ${parseFloat(balance) > 0 ? 'text-alethea-600' : 'text-grey-600'}`} />
                                        <div>
                                            <p className={`text-sm font-medium ${parseFloat(balance) > 0 ? 'text-black' : 'text-grey-600'}`}>Transfer Tokens</p>
                                            <p className="text-xs text-grey-600 hidden sm:block">Send tokens to another address</p>
                                        </div>
                                    </button>

                                    <a
                                        href={`${SERVICE_URL}/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-grey-50 hover:bg-grey-100 border border-grey-100 rounded-lg transition-colors text-left"
                                    >
                                        <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                                        <div>
                                            <p className="text-sm font-medium text-black">GraphQL Explorer</p>
                                            <p className="text-xs text-grey-600 hidden sm:block">Explore token contract API</p>
                                        </div>
                                    </a>
                                </div>

                                <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-alethea-50 border border-alethea-200 rounded-lg">
                                    <p className="text-[10px] sm:text-xs text-alethea-600">
                                        <strong>Tip:</strong> Stake tokens in Voters page to earn rewards.
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
                    <div className="card p-4 sm:p-6">
                        <h3 className="text-sm sm:text-base font-semibold text-black mb-3 sm:mb-4">Contract Information</h3>
                        <div className="space-y-2 sm:space-y-3">
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-grey-100">
                                <span className="text-xs sm:text-sm text-grey-600">Token Name</span>
                                <span className="text-xs sm:text-sm font-medium text-black">{tokenInfo?.name || '-'}</span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-grey-100">
                                <span className="text-xs sm:text-sm text-grey-600">Symbol</span>
                                <span className="text-xs sm:text-sm font-medium text-black">{tokenInfo?.symbol || '-'}</span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-grey-100">
                                <span className="text-xs sm:text-sm text-grey-600">Decimals</span>
                                <span className="text-xs sm:text-sm font-medium text-black">{tokenInfo?.decimals || '-'}</span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-1.5 sm:py-2 border-b border-grey-100 gap-1">
                                <span className="text-xs sm:text-sm text-grey-600">Application ID</span>
                                <span className="font-mono text-[10px] sm:text-xs text-grey-600 break-all">
                                    {TOKEN_APP_ID.substring(0, 16)}...
                                </span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-1.5 sm:py-2 gap-1">
                                <span className="text-xs sm:text-sm text-grey-600">Chain ID</span>
                                <span className="font-mono text-[10px] sm:text-xs text-grey-600 break-all">
                                    {TOKEN_CHAIN_ID?.substring(0, 16)}...
                                </span>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Transfer Modal */}
            {showTransfer && (
                <div className="modal-overlay" onClick={() => setShowTransfer(false)}>
                    <div className="modal-content max-w-md mx-2 sm:mx-auto" onClick={e => e.stopPropagation()}>
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
