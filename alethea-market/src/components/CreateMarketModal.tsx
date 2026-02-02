import { useState } from 'react';
import { X, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { useLinera } from '../contexts/LineraContext';

interface Props {
    onClose: () => void;
    onCreated: () => void;
}

const MARKET_CHAIN_ID = import.meta.env.VITE_CHAIN_ID || '';
const MARKET_APP_ID = import.meta.env.VITE_MARKET_APP_ID || '';
const SERVICE_URL = import.meta.env.VITE_SERVICE_URL || '';
const MARKET_URL = SERVICE_URL 
    ? `${SERVICE_URL}/chains/${MARKET_CHAIN_ID}/applications/${MARKET_APP_ID}`
    : `/chains/${MARKET_CHAIN_ID}/applications/${MARKET_APP_ID}`;

export default function CreateMarketModal({ onClose, onCreated }: Props) {
    const { executeMarketMutation, walletExists, marketApplication } = useLinera();
    const [question, setQuestion] = useState('');
    const [duration, setDuration] = useState('5'); // minutes for testing
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim()) {
            setError('Please enter a question');
            return;
        }

        if (!walletExists) {
            setError('Please connect your wallet first');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Calculate end time (current time + duration in microseconds)
            const durationMs = parseInt(duration) * 60 * 1000;
            const endTime = (Date.now() + durationMs) * 1000; // Convert to microseconds

            // Escape question for GraphQL
            const escapedQuestion = question.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

            let result: any;
            let responseData: any;
            
            // Try using Linera client first (authenticated)
            if (executeMarketMutation && marketApplication) {
                try {
                    console.log('🔐 Using authenticated Linera client for createMarket');
                    console.log('   Question:', question);
                    console.log('   EndTime:', endTime);
                    console.log('   Market App:', marketApplication);
                    
                    const mutationQuery = `mutation { createMarket(question: "${escapedQuestion}", endTime: ${endTime}) }`;
                    console.log('   Mutation query:', mutationQuery);
                    
                    responseData = await executeMarketMutation(mutationQuery);
                    console.log('✅ Market created via Linera client. Response:', responseData);
                    
                    // executeMarketMutation returns result.data directly (or null/undefined for void mutations)
                    result = { 
                        data: responseData || {},
                        errors: null
                    };
                } catch (clientErr: any) {
                    console.error('❌ Linera client error:', clientErr);
                    console.warn('⚠️ Linera client failed, falling back to direct fetch');
                    // Fallback to direct fetch
                    const response = await fetch(MARKET_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            query: `mutation { createMarket(question: "${escapedQuestion}", endTime: ${endTime}) }`
                        }),
                    });
                    result = await response.json();
                }
            } else {
                // Direct fetch (unauthenticated - may not work for mutations)
                console.log('⚠️ Using direct fetch (unauthenticated)');
                console.log('   executeMarketMutation available:', !!executeMarketMutation);
                console.log('   marketApplication available:', !!marketApplication);
                
                const response = await fetch(MARKET_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: `mutation { createMarket(question: "${escapedQuestion}", endTime: ${endTime}) }`
                    }),
                });
                result = await response.json();
            }

            // Check for errors
            if (result.errors && result.errors.length > 0) {
                const errorMsg = result.errors[0]?.message || 'Unknown error';
                console.error('❌ Mutation error:', errorMsg);
                throw new Error(errorMsg);
            }

            // Mutation may return void/empty - success if no errors
            // createMarket mutation returns void, so we just check for errors
            console.log('✅ Mutation completed successfully');
            console.log('   Response data:', responseData);
            console.log('   Full result:', JSON.stringify(result, null, 2));

            // Wait a bit for the operation to be processed
            console.log('⏳ Waiting for operation to be processed...');
            await new Promise(resolve => setTimeout(resolve, 2000));

            setSuccess(true);
            setTimeout(() => {
                onCreated();
            }, 1500);
        } catch (err) {
            console.error('Failed to create market:', err);
            setError(err instanceof Error ? err.message : 'Failed to create market');
        } finally {
            setLoading(false);
        }
    };

    // Example questions for inspiration
    const examples = [
        "Did Bitcoin close above 100000 USD on December 20, 2024?",
        "Did the US Federal Reserve cut interest rates in December 2024?",
        "Was SpaceX Starship Flight 7 successful?",
        "Did Ethereum reach 5000 USD before January 1, 2025?",
    ];

    if (success) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900 border border-white/10 shadow-xl text-center">
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Market Created!</h2>
                    <p className="text-gray-400">Your prediction market has been created successfully.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/10 shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white">Create Market</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Question */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Question
                        </label>
                        <textarea
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Enter a question about a verifiable fact..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                            maxLength={200}
                        />
                        <div className="flex justify-between mt-1">
                            <span className="text-xs text-gray-500">
                                Should be a Yes/No question about a verifiable fact
                            </span>
                            <span className="text-xs text-gray-500">{question.length}/200</span>
                        </div>
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Betting Duration
                        </label>
                        <select
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500"
                        >
                            <option value="2">2 minutes (testing)</option>
                            <option value="5">5 minutes (testing)</option>
                            <option value="10">10 minutes</option>
                            <option value="30">30 minutes</option>
                            <option value="60">1 hour</option>
                            <option value="1440">24 hours</option>
                        </select>
                    </div>

                    {/* Examples */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Example Questions
                        </label>
                        <div className="space-y-2">
                            {examples.map((ex, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setQuestion(ex)}
                                    className="w-full text-left px-3 py-2 rounded-lg bg-white/5 text-sm text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                                >
                                    {ex}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                        <h4 className="text-sm font-medium text-purple-400 mb-2">How Resolution Works</h4>
                        <p className="text-xs text-gray-400">
                            After the betting period ends, click "Request Resolution" to create a query in Alethea Oracle.
                            Oracle voters will vote on the outcome. The winning outcome is determined by stake-weighted consensus.
                        </p>
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
                            disabled={loading || !question.trim()}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Market'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
