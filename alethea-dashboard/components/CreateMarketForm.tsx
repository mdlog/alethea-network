'use client';

import { useState } from 'react';
import {
    createMarketViaMarketChain,
    validateMarketParams,
    getTimeUntilDeadline,
    type CreateMarketParams
} from '../lib/helpers/operations';

interface CreateMarketFormProps {
    onSuccess?: () => void;
}

export default function CreateMarketForm({ onSuccess }: CreateMarketFormProps) {
    const [question, setQuestion] = useState('');
    const [outcomes, setOutcomes] = useState(['', '']);
    // Initialize with current date/time in datetime-local format (YYYY-MM-DDTHH:mm)
    const getDefaultDeadline = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    const [deadline, setDeadline] = useState(getDefaultDeadline());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleAddOutcome = () => {
        setOutcomes([...outcomes, '']);
    };

    const handleRemoveOutcome = (index: number) => {
        if (outcomes.length > 2) {
            setOutcomes(outcomes.filter((_, i) => i !== index));
        }
    };

    const handleOutcomeChange = (index: number, value: string) => {
        const newOutcomes = [...outcomes];
        newOutcomes[index] = value;
        setOutcomes(newOutcomes);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccess(false);
        setError(null);
        setLoading(true);

        try {
            // Filter empty outcomes
            const filteredOutcomes = outcomes.filter(o => o.trim() !== '');

            // Prepare params
            const params: CreateMarketParams = {
                question: question.trim(),
                outcomes: filteredOutcomes,
                deadline: new Date(deadline),
            };

            // Validate
            const validationError = validateMarketParams(params);
            if (validationError) {
                setError(validationError);
                setLoading(false);
                return;
            }

            // Get Market Chain URL from environment
            // Market Chain supports GraphQL mutations - no Linera CLI needed!
            // Updated: Nov 11, 2025 - Latest IDs from .env.conway
            const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || '0c77da791bd3daee848448091fefd29891fbeab54e57362af6598f551f924307';
            const MARKET_CHAIN_ID = process.env.NEXT_PUBLIC_MARKET_CHAIN_ID || '2bd2d86cec6af2af327ee1a61037c8ec3cd950bf2bb214a1da0e2bf259ccedc5';
            
            const marketChainUrl = process.env.NEXT_PUBLIC_MARKET_CHAIN_URL ||
                `http://localhost:8080/chains/${CHAIN_ID}/applications/${MARKET_CHAIN_ID}`;

            // Execute operation via Market Chain GraphQL mutation
            const result = await createMarketViaMarketChain(params, marketChainUrl);

            if (result.success) {
                setSuccess(true);
                setQuestion('');
                setOutcomes(['', '']);
                setDeadline('');
                // Call onSuccess callback if provided
                if (onSuccess) {
                    setTimeout(() => {
                        onSuccess();
                    }, 1500);
                } else {
                    setTimeout(() => setSuccess(false), 5000);
                }
            } else {
                setError(result.error || 'Failed to create market');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Question
                    </label>
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="What will happen?"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">
                        Outcomes
                    </label>
                    {outcomes.map((outcome, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={outcome}
                                onChange={(e) => handleOutcomeChange(index, e.target.value)}
                                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder={`Outcome ${index + 1}`}
                                required
                            />
                            {outcomes.length > 2 && (
                                <button
                                    type="button"
                                    onClick={() => handleRemoveOutcome(index)}
                                    className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={handleAddOutcome}
                        className="mt-2 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                    >
                        Add Outcome
                    </button>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">
                        Deadline <span className="text-gray-500 text-xs">(Date & Time)</span>
                    </label>
                    <input
                        type="datetime-local"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        step="1"
                        min={getDefaultDeadline()}
                        required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Select both date and time (hours, minutes, seconds)
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {loading ? 'Creating Market...' : 'Create Market'}
                </button>

                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                        Market created successfully!
                    </div>
                )}
            </form>
        </div>
    );
}
