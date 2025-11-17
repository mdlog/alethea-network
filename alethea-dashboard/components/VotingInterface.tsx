'use client';

import { useState } from 'react';
import { useVoting } from '../lib/hooks';
import type { Market } from '../lib/services';

interface VotingInterfaceProps {
    readonly market: Market;
    readonly onVoteSuccess?: () => void;
}

export default function VotingInterface({ market, onVoteSuccess }: VotingInterfaceProps) {
    const { submitVote, loading, error } = useVoting();
    const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);
    const [confidence, setConfidence] = useState(100);
    const [success, setSuccess] = useState(false);

    const handleVote = async () => {
        if (selectedOutcome === null) {
            alert('Please select an outcome');
            return;
        }

        const vote = await submitVote({
            marketId: market.id,
            outcomeIndex: selectedOutcome,
            confidence,
        });

        if (vote) {
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            onVoteSuccess?.();
        }
    };

    const isExpired = market.deadline < Date.now();
    const isClosed = market.status === 'CLOSED' || market.status === 'RESOLVED';

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-4">{market.question}</h3>

            {isExpired || isClosed ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
                    This market is {isClosed ? 'closed' : 'expired'} and no longer accepting votes.
                </div>
            ) : (
                <>
                    <div className="space-y-3 mb-6">
                        {market.outcomes.map((outcome, index) => (
                            <button
                                key={index}
                                onClick={() => setSelectedOutcome(index)}
                                className={`w-full p-4 rounded-lg border-2 transition-all ${selectedOutcome === index
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">{outcome}</span>
                                    {selectedOutcome === index && (
                                        <span className="text-blue-600">✓</span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2">
                            Confidence: {confidence}%
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="100"
                            value={confidence}
                            onChange={(e) => setConfidence(Number(e.target.value))}
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Low</span>
                            <span>High</span>
                        </div>
                    </div>

                    <button
                        onClick={handleVote}
                        disabled={loading || selectedOutcome === null}
                        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Submitting Vote...' : 'Submit Vote'}
                    </button>

                    {error && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                            Vote submitted successfully!
                        </div>
                    )}
                </>
            )}

            <div className="mt-6 pt-6 border-t text-sm text-gray-600">
                <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="font-medium">{market.status}</span>
                </div>
                <div className="flex justify-between mt-2">
                    <span>Deadline:</span>
                    <span className="font-medium">
                        {new Date(market.deadline).toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    );
}
