import { useState } from 'react';
import { X, AlertCircle, Loader2, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';

interface Market {
    id: string;
    question: string;
    yesPool: string;
    noPool: string;
    totalPool: string;
}

interface Props {
    market: Market;
    onClose: () => void;
    onBetPlaced: () => void;
}

const MARKET_CHAIN_ID = import.meta.env.VITE_CHAIN_ID || '';
const MARKET_APP_ID = import.meta.env.VITE_MARKET_APP_ID || '';
const SERVICE_URL = import.meta.env.VITE_SERVICE_URL || '';
const MARKET_URL = SERVICE_URL 
    ? `${SERVICE_URL}/chains/${MARKET_CHAIN_ID}/applications/${MARKET_APP_ID}`
    : `/chains/${MARKET_CHAIN_ID}/applications/${MARKET_APP_ID}`;

export default function BetModal({ market, onClose, onBetPlaced }: Props) {
    const [outcome, setOutcome] = useState<'Yes' | 'No'>('Yes');
    const [amount, setAmount] = useState('100');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const yesPool = parseInt(market.yesPool || '0');
    const noPool = parseInt(market.noPool || '0');
    const total = yesPool + noPool;
    const yesPercent = total > 0 ? (yesPool / total) * 100 : 50;

    // Calculate potential payout
    const betAmount = parseInt(amount) || 0;
    const currentPool = outcome === 'Yes' ? yesPool : noPool;
    const newPool = currentPool + betAmount;
    const newTotal = total + betAmount;
    const potentialPayout = newPool > 0 ? (betAmount / newPool) * newTotal : 0;
    const potentialProfit = potentialPayout - betAmount;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (betAmount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(MARKET_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `mutation { placeBet(marketId: ${market.id}, outcome: "${outcome}", stake: "${betAmount}") }`
                }),
            });

            const result = await response.json();

            if (result.errors) {
                throw new Error(result.errors[0].message);
            }

            setSuccess(true);
            setTimeout(() => {
                onBetPlaced();
            }, 1500);
        } catch (err) {
            console.error('Failed to place bet:', err);
            setError(err instanceof Error ? err.message : 'Failed to place bet');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900 border border-white/10 shadow-xl text-center">
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Bet Placed!</h2>
                    <p className="text-gray-400">Your bet on {outcome} has been placed successfully.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white">Place Bet</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Question */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <p className="text-white font-medium">{market.question}</p>
                    </div>

                    {/* Current Odds */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Current Odds
                        </label>
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

                    {/* Outcome Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Your Prediction
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setOutcome('Yes')}
                                className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${outcome === 'Yes'
                                        ? 'bg-green-500/20 border-green-500 text-green-400'
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:border-green-500/50'
                                    }`}
                            >
                                <TrendingUp className="w-5 h-5" />
                                <span className="font-semibold">Yes</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setOutcome('No')}
                                className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${outcome === 'No'
                                        ? 'bg-red-500/20 border-red-500 text-red-400'
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:border-red-500/50'
                                    }`}
                            >
                                <TrendingDown className="w-5 h-5" />
                                <span className="font-semibold">No</span>
                            </button>
                        </div>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Bet Amount
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min="1"
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                            placeholder="Enter amount"
                        />
                        <div className="flex gap-2 mt-2">
                            {[100, 500, 1000, 5000].map(val => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => setAmount(val.toString())}
                                    className="px-3 py-1 rounded-lg bg-white/5 text-xs text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                                >
                                    {val}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Potential Payout */}
                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                        <div className="flex justify-between mb-2">
                            <span className="text-sm text-gray-400">Potential Payout</span>
                            <span className="text-lg font-bold text-white">{potentialPayout.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-400">Potential Profit</span>
                            <span className={`text-sm font-semibold ${potentialProfit > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                                +{potentialProfit.toFixed(0)} ({((potentialProfit / betAmount) * 100 || 0).toFixed(0)}%)
                            </span>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-gray-300 font-medium hover:bg-white/10 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || betAmount <= 0}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-opacity disabled:opacity-50 ${outcome === 'Yes'
                                    ? 'bg-green-500 text-white hover:bg-green-600'
                                    : 'bg-red-500 text-white hover:bg-red-600'
                                }`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Placing...
                                </>
                            ) : (
                                `Bet ${outcome}`
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
