import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, Vote, TrendingUp, TrendingDown, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { useLinera } from '../contexts/LineraContext';
import { useCallbackEvents } from '../hooks/useCallbackEvents';
import CallbackMonitor from '../components/CallbackMonitor';

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
    creator: string;
    createdAt: string;
}

const MARKET_CHAIN_ID = import.meta.env.VITE_CHAIN_ID || '';
const MARKET_APP_ID = import.meta.env.VITE_MARKET_APP_ID || '';
const SERVICE_URL = import.meta.env.VITE_SERVICE_URL || '';
const MARKET_URL = SERVICE_URL 
    ? `${SERVICE_URL}/chains/${MARKET_CHAIN_ID}/applications/${MARKET_APP_ID}`
    : `/chains/${MARKET_CHAIN_ID}/applications/${MARKET_APP_ID}`;

export default function MarketDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { walletExists, chainId } = useLinera();
    const [market, setMarket] = useState<Market | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { events, loading: callbacksLoading, refresh: refreshCallbacks } = useCallbackEvents({
        marketId: id || '',
        queryId: market?.queryId || null,
        marketStatus: market?.status || 'open',
        enabled: !!market?.queryId,
    });

    const fetchMarket = useCallback(async () => {
        if (!id || !MARKET_APP_ID) {
            setError('Market ID or App ID not configured');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(MARKET_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `query { 
                        market(id: ${id}) { 
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
                            creator
                            createdAt
                        } 
                    }`
                }),
            });

            const result = await response.json();

            if (result.errors) {
                throw new Error(result.errors[0].message);
            }

            if (result.data?.market) {
                const marketData = result.data.market;
                setMarket({
                    ...marketData,
                    status: marketData.status.replace('MarketStatus::', '').replace(/"/g, ''),
                    endTime: parseTimestamp(marketData.endTime),
                    createdAt: parseTimestamp(marketData.createdAt),
                });
            } else {
                setError('Market not found');
            }
        } catch (err) {
            console.error('Failed to fetch market:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch market');
        } finally {
            setLoading(false);
        }
    }, [id]);

    const parseTimestamp = (ts: string): string => {
        const match = ts.match(/Timestamp\((\d+)\)/);
        if (match) {
            const micros = parseInt(match[1]);
            return new Date(micros / 1000).toISOString();
        }
        return ts;
    };

    useEffect(() => {
        fetchMarket();
        const interval = setInterval(fetchMarket, 10000); // Refresh every 10 seconds
        return () => clearInterval(interval);
    }, [fetchMarket]);

    const handleRequestResolution = async () => {
        if (!market) return;

        try {
            const response = await fetch(MARKET_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `mutation { requestResolution(marketId: ${market.id}) }`
                }),
            });

            const result = await response.json();

            if (result.errors) {
                alert(`Error: ${result.errors[0].message}`);
            } else {
                alert('Resolution requested! Oracle Registry will create a query. Check callbacks below.');
                fetchMarket();
                setTimeout(refreshCallbacks, 2000);
            }
        } catch (err) {
            alert(`Failed to request resolution: ${err}`);
        }
    };

    if (loading && !market) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center py-16">
                    <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Loading market...</p>
                </div>
            </div>
        );
    }

    if (error || !market) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center py-16">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <p className="text-gray-400 mb-2">{error || 'Market not found'}</p>
                    <Link
                        to="/markets"
                        className="text-purple-400 hover:text-purple-300"
                    >
                        ← Back to Markets
                    </Link>
                </div>
            </div>
        );
    }

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
    const isExpired = endDate < new Date();
    const canRequestResolution = status === 'open' && isExpired;

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Back Button */}
            <Link
                to="/markets"
                className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Markets
            </Link>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Left Column - Market Info */}
                <div className="space-y-6">
                    {/* Market Header */}
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                        <div className="flex items-start justify-between mb-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                                {market.status}
                            </span>
                            {market.queryId && (
                                <a
                                    href={`http://localhost:4002/queries/${market.queryId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                                >
                                    Query #{market.queryId} <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                        </div>

                        <h1 className="text-2xl font-bold text-white mb-4">{market.question}</h1>

                        {/* Market Stats */}
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="p-3 rounded-lg bg-green-500/10">
                                <div className="text-xs text-gray-400 mb-1">Yes Pool</div>
                                <div className="text-lg font-semibold text-green-400">{yesPool.toLocaleString()}</div>
                            </div>
                            <div className="p-3 rounded-lg bg-red-500/10">
                                <div className="text-xs text-gray-400 mb-1">No Pool</div>
                                <div className="text-lg font-semibold text-red-400">{noPool.toLocaleString()}</div>
                            </div>
                            <div className="p-3 rounded-lg bg-purple-500/10">
                                <div className="text-xs text-gray-400 mb-1">Total</div>
                                <div className="text-lg font-semibold text-purple-400">{total.toLocaleString()}</div>
                            </div>
                        </div>

                        {/* Odds Bar */}
                        <div className="mb-4">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-green-400">Yes {yesPercent.toFixed(0)}%</span>
                                <span className="text-red-400">No {(100 - yesPercent).toFixed(0)}%</span>
                            </div>
                            <div className="h-3 rounded-full bg-red-500/30 overflow-hidden">
                                <div
                                    className="h-full bg-green-500 rounded-full transition-all"
                                    style={{ width: `${yesPercent}%` }}
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4 border-t border-white/10">
                            {canRequestResolution && (
                                <button
                                    onClick={handleRequestResolution}
                                    className="flex-1 px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 text-sm font-medium hover:bg-yellow-500/30 transition-colors"
                                >
                                    Request Resolution
                                </button>
                            )}
                            {status === 'voting' && market.queryId && (
                                <a
                                    href="http://localhost:4002"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 text-sm font-medium hover:bg-yellow-500/30 transition-colors"
                                >
                                    Vote in Oracle <ExternalLink className="w-4 h-4" />
                                </a>
                            )}
                            {status === 'resolved' && (
                                <button className="flex-1 px-4 py-2 rounded-lg bg-green-500/20 text-green-400 text-sm font-medium hover:bg-green-500/30 transition-colors">
                                    Claim Payout
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Market Details */}
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                        <h3 className="text-lg font-semibold text-white mb-4">Market Details</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Market ID</span>
                                <span className="text-white font-mono">{market.id}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Created</span>
                                <span className="text-white">{new Date(market.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">End Time</span>
                                <span className="text-white">{new Date(market.endTime).toLocaleString()}</span>
                            </div>
                            {market.resolvedAt && (
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Resolved At</span>
                                    <span className="text-white">{new Date(market.resolvedAt).toLocaleString()}</span>
                                </div>
                            )}
                            {market.winningOutcome && (
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Winning Outcome</span>
                                    <span className="text-green-400 font-semibold">{market.winningOutcome}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column - Callback Monitor */}
                <div>
                    <CallbackMonitor
                        events={events}
                        queryId={market.queryId || null}
                        loading={callbacksLoading}
                        onRefresh={refreshCallbacks}
                    />
                </div>
            </div>
        </div>
    );
}
