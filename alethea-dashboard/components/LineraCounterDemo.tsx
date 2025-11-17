'use client';

import { useState, useEffect } from 'react';
import { useLineraClient, useLineraNotifications } from '@/hooks/useLineraClient';

const COUNTER_APP_ID = process.env.NEXT_PUBLIC_COUNTER_APP_ID || '2b1a0df8868206a4b7d6c2fdda911e4355d6c0115b896d4947ef8e535ee3e6b8';

export default function LineraCounterDemo() {
    const { graphqlQuery, graphqlMutation, isReady } = useLineraClient();
    const [count, setCount] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Update count from backend
    const updateCount = async () => {
        if (!isReady) return;

        try {
            setError(null);
            const response = await graphqlQuery(
                'query { value }',
                COUNTER_APP_ID
            );

            if (response?.data?.value !== undefined) {
                setCount(response.data.value);
            }
        } catch (err: any) {
            console.error('Failed to update count:', err);
            setError(err.message || 'Failed to fetch count');
        }
    };

    // Increment counter
    const handleIncrement = async () => {
        if (!isReady || loading) return;

        setLoading(true);
        setError(null);

        try {
            await graphqlMutation(
                'mutation { increment(value: 1) }',
                COUNTER_APP_ID
            );

            // Update will happen via notification
        } catch (err: any) {
            console.error('Failed to increment:', err);
            setError(err.message || 'Failed to increment');
        } finally {
            setLoading(false);
        }
    };

    // Listen for notifications
    useLineraNotifications((notification) => {
        if (notification.reason?.NewBlock) {
            console.log('New block detected, updating count...');
            updateCount();
        }
    }, isReady);

    // Initial load
    useEffect(() => {
        if (isReady) {
            updateCount();
        }
    }, [isReady]);

    if (!isReady) {
        return (
            <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Counter Demo</h2>
                <div className="text-center py-8">
                    <p className="text-gray-600">Please connect your wallet first</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Counter Demo</h2>

            <div className="text-center py-8">
                <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-2">Current Count:</p>
                    <div className="text-6xl font-bold text-blue-600">
                        {count}
                    </div>
                </div>

                <button
                    onClick={handleIncrement}
                    disabled={loading}
                    className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg transition-colors shadow-lg hover:shadow-xl"
                >
                    {loading ? 'Incrementing...' : '+ Increment'}
                </button>

                {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                    This counter is stored on the Linera blockchain. Changes are reflected in real-time via notifications.
                </p>
            </div>
        </div>
    );
}
