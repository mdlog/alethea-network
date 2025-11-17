// React Hook for Market Operations
'use client';

import { useState, useCallback } from 'react';
import { RegistryService, Market, RegistryCreateMarketParams as CreateMarketParams } from '../services';

export function useMarket() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createMarket = useCallback(async (params: CreateMarketParams): Promise<Market | null> => {
        setLoading(true);
        setError(null);
        try {
            const market = await RegistryService.createMarket(params);
            return market;
        } catch (err: any) {
            setError(err.message || 'Failed to create market');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const getMarket = useCallback(async (id: number): Promise<Market | null> => {
        setLoading(true);
        setError(null);
        try {
            const market = await RegistryService.getMarket(id);
            return market;
        } catch (err: any) {
            setError(err.message || 'Failed to get market');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateMarketStatus = useCallback(async (marketId: number, status: string): Promise<Market | null> => {
        setLoading(true);
        setError(null);
        try {
            const market = await RegistryService.updateMarketStatus(marketId, status);
            return market;
        } catch (err: any) {
            setError(err.message || 'Failed to update market status');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        createMarket,
        getMarket,
        updateMarketStatus,
        loading,
        error
    };
}
