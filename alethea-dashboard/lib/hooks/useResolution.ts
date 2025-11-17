// React Hook for Market Resolution Operations
// Note: Resolution operations are handled via Registry using Linera operations
'use client';

import { useState, useCallback } from 'react';
import { queryGraphQL } from '../graphql';

export interface MarketResolution {
    marketId: number;
    winningOutcome: number;
    finalizedAt: number;
    status: string;
}

export interface VoteAggregation {
    marketId: number;
    voteCount: number;
    consensus: number;
    aggregatedAt: number;
    distribution: number[];
}

export function useResolution() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Note: Resolution requests should be done via Linera operations, not GraphQL
    // This hook provides query functions for checking resolution status
    const getResolutionStatus = useCallback(async (marketId: number) => {
        setLoading(true);
        setError(null);
        try {
            const result = await queryGraphQL(`
                query {
                    marketDetails(id: ${marketId}) {
                        id
                        status
                        totalCommitments
                        totalReveals
                    }
                }
            `);
            return result?.marketDetails || null;
        } catch (err: any) {
            setError(err.message || 'Failed to get resolution status');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const getMarketDetails = useCallback(async (marketId: number) => {
        setLoading(true);
        setError(null);
        try {
            const result = await queryGraphQL(`
                query {
                    marketDetails(id: ${marketId}) {
                        id
                        question
                        outcomes
                        status
                        selectedVotersCount
                        totalCommitments
                        totalReveals
                    }
                }
            `);
            return result?.marketDetails || null;
        } catch (err: any) {
            setError(err.message || 'Failed to get market details');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        getResolutionStatus,
        getMarketDetails,
        loading,
        error
    };
}
