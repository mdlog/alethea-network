import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLinera } from '../contexts/LineraContext';
import { Plus, Clock, CheckCircle, Vote, TrendingUp, AlertCircle, RefreshCw, ExternalLink, Eye } from 'lucide-react';
import CreateMarketModal from '../components/CreateMarketModal';
import BetModal from '../components/BetModal';

interface Market {
    id: string;
    question: string;
    status: string;
    endTime: string;
    yesPool: string;
    noPool: string;
    totalPool: string;
    queryId?: string;
    winningOutcome?: string;
    resolvedAt?: string;
}

// GraphQL endpoint for Simple Market
const MARKET_CHAIN_ID = import.meta.env.VITE_CHAIN_ID || '';
const MARKET_APP_ID = import.meta.env.VITE_MARKET_APP_ID || '';
// Use proxy path if VITE_SERVICE_URL is not set, otherwise use full URL
// Use proxy path if VITE_SERVICE_URL is not set (proxy configured in vite.config.ts)
// Otherwise use full URL (for production or when proxy is not available)
const SERVICE_URL = import.meta.env.VITE_SERVICE_URL || '';
const MARKET_URL = SERVICE_URL 
    ? `${SERVICE_URL}/chains/${MARKET_CHAIN_ID}/applications/${MARKET_APP_ID}`
    : `/chains/${MARKET_CHAIN_ID}/applications/${MARKET_APP_ID}`;

export default function MarketsPage() {
    const navigate = useNavigate();
    const { walletExists, chainId, executeMarketMutation, marketApplication, status } = useLinera();
    
    // Debug: Log market application connection status
    useEffect(() => {
        if (walletExists) {
            console.log('📊 MarketsPage - Connection Status:');
            console.log('   Wallet exists:', walletExists);
            console.log('   Status:', status);
            console.log('   executeMarketMutation available:', !!executeMarketMutation);
            console.log('   marketApplication available:', !!marketApplication);
            console.log('   MARKET_APP_ID:', MARKET_APP_ID);
        }
    }, [walletExists, status, executeMarketMutation, marketApplication]);
    const [markets, setMarkets] = useState<Market[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
    const [filter, setFilter] = useState<'all' | 'open' | 'voting' | 'resolved'>('all');

    const fetchMarkets = useCallback(async () => {
        if (!MARKET_APP_ID) {
            setError('Market App ID not configured');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(MARKET_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `{ 
                        markets { 
                            id 
                            question 
                            status 
                            endTime 
                            yesPool 
                            noPool 
                            totalPool 
                            queryId 
                            winningOutcome 
                            resolvedAt 
                        } 
                    }`
                }),
            });

            const result = await response.json();

            if (result.errors) {
                throw new Error(result.errors[0].message);
            }

            if (result.data?.markets) {
                // Parse and normalize market data
                const normalizedMarkets = result.data.markets.map((m: any) => ({
                    ...m,
                    // Normalize status (remove "MarketStatus::" prefix if present)
                    status: m.status.replace('MarketStatus::', '').replace(/"/g, ''),
                    // Parse endTime from Timestamp format
                    endTime: parseTimestamp(m.endTime),
                }));
                setMarkets(normalizedMarkets);
            }
        } catch (err) {
            console.error('Failed to fetch markets:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch markets');
        } finally {
            setLoading(false);
        }
    }, []);

    // Parse Linera Timestamp format
    const parseTimestamp = (ts: string): string => {
        // Format: "Timestamp(1234567890000000)" -> extract microseconds
        const match = ts.match(/Timestamp\((\d+)\)/);
        if (match) {
            const micros = parseInt(match[1]);
            return new Date(micros / 1000).toISOString();
        }
        return ts;
    };

    useEffect(() => {
        fetchMarkets();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchMarkets, 30000);
        return () => clearInterval(interval);
    }, [fetchMarkets]);

    const filteredMarkets = markets.filter(m => {
        if (filter === 'all') return true;
        const status = m.status.toLowerCase();
        if (filter === 'open') return status === 'open';
        if (filter === 'voting') return status === 'voting';
        if (filter === 'resolved') return status === 'resolved';
        return true;
    });

    const handleRequestResolution = async (marketId: string) => {
        if (!walletExists) {
            alert('Please connect your wallet first');
            return;
        }

        try {
            console.log('🔐 Requesting resolution for market:', marketId);
            console.log('   executeMarketMutation available:', !!executeMarketMutation);
            console.log('   marketApplication available:', !!marketApplication);
            
            let result: any;
            
            // Try using Linera client first (authenticated)
            if (executeMarketMutation && marketApplication) {
                try {
                    console.log('   ✅ Using authenticated Linera client');
                    const mutationQuery = `mutation { requestResolution(marketId: ${marketId}) }`;
                    console.log('   Mutation query:', mutationQuery);
                    
                    result = await executeMarketMutation(mutationQuery);
                    console.log('✅ Resolution requested via Linera client. Response:', result);
                    
                    // executeMarketMutation returns result.data directly
                    result = { data: result || {}, errors: null };
                } catch (clientErr: any) {
                    console.error('❌ Linera client error:', clientErr);
                    console.warn('⚠️ Linera client failed, falling back to direct fetch');
                    // Fallback to direct fetch
                    const response = await fetch(MARKET_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            query: `mutation { requestResolution(marketId: ${marketId}) }`
                        }),
                    });
                    result = await response.json();
                }
            } else {
                // Direct fetch (may not work for mutations - needs authentication)
                console.warn('⚠️ Using direct fetch (unauthenticated)');
                console.warn('   This may not work for mutations. Please ensure wallet is connected.');
                
                const response = await fetch(MARKET_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: `mutation { requestResolution(marketId: ${marketId}) }`
                    }),
                });
                result = await response.json();
                console.log('   Direct fetch response:', result);
            }

            // Check for errors
            if (result.errors && result.errors.length > 0) {
                const errorMsg = result.errors[0]?.message || 'Unknown error';
                console.error('❌ Mutation error:', errorMsg);
                alert(`Error: ${errorMsg}`);
                return;
            }

            console.log('✅ Resolution requested successfully');
            console.log('   Full result:', JSON.stringify(result, null, 2));
            
            alert('Resolution requested! Query will be created in Oracle Registry. This may take a few seconds. Check Oracle Dashboard for voting.');
            
            // Wait a bit for the operation to process and cross-chain message to be sent
            console.log('⏳ Waiting for operation to process...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Refresh markets to show updated status
            fetchMarkets();
            
            // Check again after a delay to see if query was created
            setTimeout(() => {
                console.log('🔍 Checking if query was created...');
                fetchMarkets();
            }, 5000);
        } catch (err) {
            console.error('❌ Failed to request resolution:', err);
            alert(`Failed to request resolution: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    };

    const stats = {
        total: markets.length,
        open: markets.filter(m => m.status.toLowerCase() === 'open').length,
        voting: markets.filter(m => m.status.toLowerCase() === 'voting').length,
        resolved: markets.filter(m => m.status.toLowerCase() === 'resolved').length,
        totalVolume: markets.reduce((sum, m) => sum + parseInt(m.totalPool || '0'), 0),
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Prediction Markets</h1>
                    <p className="text-gray-400">Bet on outcomes, resolved by Alethea Oracle</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchMarkets}
                        disabled={loading}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                        title="Refresh markets"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <a
                        href="http://localhost:4002"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        Oracle Dashboard <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity"
                    >
                        <Plus className="w-5 h-5" /> Create Market
                    </button>
                </div>
            </div>

            {/* Connection Info */}
            <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div>
                        <span className="text-gray-400">Market Contract: </span>
                        <span className="text-white font-mono">{MARKET_APP_ID.slice(0, 8)}...</span>
                    </div>
                    <div>
                        <span className="text-gray-400">Chain: </span>
                        <span className="text-white font-mono">{MARKET_CHAIN_ID.slice(0, 8)}...</span>
                    </div>
                    {walletExists && chainId && (
                        <div>
                            <span className="text-gray-400">Your Chain: </span>
                            <span className="text-green-400 font-mono">{chainId.slice(0, 8)}...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        <span>{error}</span>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <StatCard label="Total Markets" value={stats.total} icon={<TrendingUp className="w-5 h-5" />} />
                <StatCard label="Open" value={stats.open} icon={<Clock className="w-5 h-5" />} color="blue" />
                <StatCard label="Voting" value={stats.voting} icon={<Vote className="w-5 h-5" />} color="yellow" />
                <StatCard label="Resolved" value={stats.resolved} icon={<CheckCircle className="w-5 h-5" />} color="green" />
                <StatCard label="Total Volume" value={`${stats.totalVolume.toLocaleString()}`} icon={<TrendingUp className="w-5 h-5" />} color="purple" />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 mb-6">
                {(['all', 'open', 'voting', 'resolved'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f
                            ? 'bg-purple-500 text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Markets Grid */}
            {loading && markets.length === 0 ? (
                <div className="text-center py-16">
                    <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Loading markets...</p>
                </div>
            ) : filteredMarkets.length === 0 ? (
                <div className="text-center py-16">
                    <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 mb-2">No markets found</p>
                    <p className="text-sm text-gray-500">Create a new market to get started</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-6">
                    {filteredMarkets.map(market => (
                        <MarketCard
                            key={market.id}
                            market={market}
                            onBet={() => setSelectedMarket(market)}
                            onRequestResolution={() => handleRequestResolution(market.id)}
                            onViewDetail={() => navigate(`/markets/${market.id}`)}
                        />
                    ))}
                </div>
            )}

            {/* Modals */}
            {showCreateModal && (
                <CreateMarketModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => {
                        setShowCreateModal(false);
                        fetchMarkets();
                    }}
                />
            )}

            {selectedMarket && (
                <BetModal
                    market={selectedMarket}
                    onClose={() => setSelectedMarket(null)}
                    onBetPlaced={() => {
                        setSelectedMarket(null);
                        fetchMarkets();
                    }}
                />
            )}
        </div>
    );
}

function StatCard({ label, value, icon, color = 'gray' }: { label: string; value: string | number; icon: React.ReactNode; color?: string }) {
    const colors: Record<string, string> = {
        gray: 'text-gray-400',
        blue: 'text-blue-400',
        yellow: 'text-yellow-400',
        green: 'text-green-400',
        purple: 'text-purple-400',
    };

    return (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className={`${colors[color]} mb-2`}>{icon}</div>
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="text-sm text-gray-400">{label}</div>
        </div>
    );
}

// Countdown Timer Component
function CountdownTimer({ endTime }: { endTime: string }) {
    const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const endDate = new Date(endTime);
            const now = new Date();
            const diff = endDate.getTime() - now.getTime();

            if (diff <= 0) {
                setIsExpired(true);
                setTimeLeft(null);
                return;
            }

            setIsExpired(false);
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft({ days, hours, minutes, seconds });
        };

        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(interval);
    }, [endTime]);

    if (isExpired) {
        return (
            <div className="flex items-center gap-2 text-yellow-400">
                <Clock className="w-4 h-4" />
                <span className="font-medium">Expired - Ready for Resolution</span>
            </div>
        );
    }

    if (!timeLeft) return null;

    return (
        <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-blue-400" />
            <div className="flex items-center gap-1">
                {timeLeft.days > 0 && (
                    <TimeUnit value={timeLeft.days} label="d" />
                )}
                <TimeUnit value={timeLeft.hours} label="h" />
                <TimeUnit value={timeLeft.minutes} label="m" />
                <TimeUnit value={timeLeft.seconds} label="s" />
            </div>
        </div>
    );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
    return (
        <div className="flex items-center">
            <span className="bg-white/10 px-2 py-1 rounded text-white font-mono font-bold min-w-[2rem] text-center">
                {value.toString().padStart(2, '0')}
            </span>
            <span className="text-gray-500 text-xs ml-0.5 mr-1">{label}</span>
        </div>
    );
}

function MarketCard({ market, onBet, onRequestResolution, onViewDetail }: { market: Market; onBet: () => void; onRequestResolution: () => void; onViewDetail: () => void }) {
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update current time every second for accurate expiry check
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const statusColors: Record<string, { bg: string; text: string }> = {
        open: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
        voting: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
        resolved: { bg: 'bg-green-500/20', text: 'text-green-400' },
        cancelled: { bg: 'bg-red-500/20', text: 'text-red-400' },
    };

    const status = market.status.toLowerCase();
    const statusStyle = statusColors[status] || statusColors.open;

    const yesPool = parseInt(market.yesPool || '0');
    const noPool = parseInt(market.noPool || '0');
    const total = yesPool + noPool;
    const yesPercent = total > 0 ? (yesPool / total) * 100 : 50;

    const endDate = new Date(market.endTime);
    const isExpired = endDate < currentTime;
    const canRequestResolution = status === 'open' && isExpired;

    return (
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-colors">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                    {market.status}
                </span>
                {market.queryId && (
                    <span className="text-xs text-gray-500">Query #{market.queryId}</span>
                )}
            </div>

            {/* Question */}
            <h3 
                className="text-lg font-semibold text-white mb-4 line-clamp-2 cursor-pointer hover:text-purple-400 transition-colors"
                onClick={onViewDetail}
            >
                {market.question}
            </h3>

            {/* Countdown Timer - Only show for Open markets */}
            {status === 'open' && (
                <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-xs text-gray-400 mb-2">Time Remaining</div>
                    <CountdownTimer endTime={market.endTime} />
                </div>
            )}

            {/* Odds Bar */}
            <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-green-400">Yes {yesPercent.toFixed(0)}%</span>
                    <span className="text-red-400">No {(100 - yesPercent).toFixed(0)}%</span>
                </div>
                <div className="h-2 rounded-full bg-red-500/30 overflow-hidden">
                    <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${yesPercent}%` }}
                    />
                </div>
            </div>

            {/* Pool Info */}
            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="p-2 rounded-lg bg-green-500/10">
                    <div className="text-xs text-gray-400">Yes Pool</div>
                    <div className="text-sm font-semibold text-green-400">{yesPool.toLocaleString()}</div>
                </div>
                <div className="p-2 rounded-lg bg-red-500/10">
                    <div className="text-xs text-gray-400">No Pool</div>
                    <div className="text-sm font-semibold text-red-400">{noPool.toLocaleString()}</div>
                </div>
                <div className="p-2 rounded-lg bg-purple-500/10">
                    <div className="text-xs text-gray-400">Total</div>
                    <div className="text-sm font-semibold text-purple-400">{total.toLocaleString()}</div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div className="text-sm text-gray-400">
                    {status === 'resolved' ? (
                        <span className="text-green-400">Winner: {market.winningOutcome}</span>
                    ) : status === 'voting' ? (
                        <span className="text-yellow-400">Oracle voting in progress...</span>
                    ) : isExpired ? (
                        <span className="text-yellow-400">Ready for resolution</span>
                    ) : (
                        <span>Ends: {endDate.toLocaleString()}</span>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onViewDetail}
                        className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="View Details"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    {status === 'open' && !isExpired && (
                        <button
                            onClick={onBet}
                            className="px-4 py-2 rounded-lg bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 transition-colors"
                        >
                            Place Bet
                        </button>
                    )}

                    {canRequestResolution && (
                        <button
                            onClick={onRequestResolution}
                            className="px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 text-sm font-medium hover:bg-yellow-500/30 transition-colors animate-pulse"
                        >
                            Request Resolution
                        </button>
                    )}

                    {status === 'voting' && (
                        <a
                            href="http://localhost:4002"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 text-sm font-medium hover:bg-yellow-500/30 transition-colors flex items-center gap-1"
                        >
                            Vote <ExternalLink className="w-3 h-3" />
                        </a>
                    )}

                    {status === 'resolved' && (
                        <button
                            className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 text-sm font-medium hover:bg-green-500/30 transition-colors"
                        >
                            Claim Payout
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
