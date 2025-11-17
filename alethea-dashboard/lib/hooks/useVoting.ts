// React Hook for Voting Operations
'use client';

import { useState, useCallback } from 'react';
import { VoterService, Vote, Voter } from '../services';

export function useVoting() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submitVote = useCallback(async (params: {
        marketId: number;
        outcomeIndex: number;
        confidence?: number;
    }): Promise<Vote | null> => {
        setLoading(true);
        setError(null);
        try {
            const vote = await VoterService.submitVote(params);
            return vote;
        } catch (err: any) {
            setError(err.message || 'Failed to submit vote');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const registerVoter = useCallback(async (params: {
        address: string;
        stake?: number;
    }): Promise<Voter | null> => {
        setLoading(true);
        setError(null);
        try {
            const voter = await VoterService.registerVoter(params);
            return voter;
        } catch (err: any) {
            setError(err.message || 'Failed to register voter');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateStake = useCallback(async (address: string, stake: number): Promise<Voter | null> => {
        setLoading(true);
        setError(null);
        try {
            const voter = await VoterService.updateVoterStake(address, stake);
            return voter;
        } catch (err: any) {
            setError(err.message || 'Failed to update stake');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        submitVote,
        registerVoter,
        updateStake,
        loading,
        error
    };
}
