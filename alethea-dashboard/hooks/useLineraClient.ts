// React Hook for Linera Client
import { useState, useEffect, useCallback } from 'react';
// Use HTTP client for production (connects to real Linera service)
import { lineraClient, LineraClientState } from '@/lib/services/linera-client-http';

export interface UseLineraClientReturn {
    state: LineraClientState;
    initialize: () => Promise<void>;
    createWallet: () => Promise<{ wallet: any; chainId: string }>;
    loadWallet: (walletJson: string) => Promise<void>;
    query: (queryString: string, applicationId?: string) => Promise<any>;
    graphqlQuery: (query: string, applicationId?: string) => Promise<any>;
    graphqlMutation: (mutation: string, applicationId?: string) => Promise<any>;
    isReady: boolean;
    error: string | null;
    loading: boolean;
}

export function useLineraClient(): UseLineraClientReturn {
    const [state, setState] = useState<LineraClientState>(lineraClient.getState());
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Update state when client changes
    useEffect(() => {
        const interval = setInterval(() => {
            setState(lineraClient.getState());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const initialize = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            await lineraClient.initialize();
            setState(lineraClient.getState());
        } catch (err: any) {
            setError(err.message || 'Failed to initialize');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const createWallet = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await lineraClient.createWalletFromFaucet();
            setState(lineraClient.getState());
            return result;
        } catch (err: any) {
            setError(err.message || 'Failed to create wallet');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const loadWallet = useCallback(async (walletJson: string) => {
        setLoading(true);
        setError(null);
        try {
            await lineraClient.loadWalletFromJson(walletJson);
            setState(lineraClient.getState());
        } catch (err: any) {
            setError(err.message || 'Failed to load wallet');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const query = useCallback(async (queryString: string, applicationId?: string) => {
        setError(null);
        try {
            return await lineraClient.query(queryString, applicationId);
        } catch (err: any) {
            setError(err.message || 'Query failed');
            throw err;
        }
    }, []);

    const graphqlQuery = useCallback(async (queryStr: string, applicationId?: string) => {
        setError(null);
        try {
            return await lineraClient.graphqlQuery(queryStr, applicationId);
        } catch (err: any) {
            setError(err.message || 'GraphQL query failed');
            throw err;
        }
    }, []);

    const graphqlMutation = useCallback(async (mutation: string, applicationId?: string) => {
        setError(null);
        try {
            return await lineraClient.graphqlMutation(mutation, applicationId);
        } catch (err: any) {
            setError(err.message || 'GraphQL mutation failed');
            throw err;
        }
    }, []);

    return {
        state,
        initialize,
        createWallet,
        loadWallet,
        query,
        graphqlQuery,
        graphqlMutation,
        isReady: lineraClient.isReady(),
        error,
        loading,
    };
}

// Hook for notifications
export function useLineraNotifications(
    callback: (notification: any) => void,
    enabled: boolean = true
) {
    useEffect(() => {
        if (!enabled) return;

        const unsubscribe = lineraClient.onNotification(callback);
        return unsubscribe;
    }, [callback, enabled]);
}
