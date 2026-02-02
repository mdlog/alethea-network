import { useState, useCallback } from 'react';

const SERVICE_URL = import.meta.env.VITE_SERVICE_URL || '';
const REGISTRY_APP_ID = import.meta.env.VITE_REGISTRY_APP_ID || '';
const REGISTRY_CHAIN_ID = import.meta.env.VITE_REGISTRY_CHAIN_ID || import.meta.env.VITE_CHAIN_ID || '';

const REGISTRY_URL = SERVICE_URL 
    ? `${SERVICE_URL}/chains/${REGISTRY_CHAIN_ID}/applications/${REGISTRY_APP_ID}`
    : `/chains/${REGISTRY_CHAIN_ID}/applications/${REGISTRY_APP_ID}`;

export interface QueryStatus {
    id: number;
    status: string;
    result?: string;
    resolvedAt?: string;
    disputeWindowEnd?: string;
    isFinal?: boolean;
}

export function useOracleQuery() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const checkQueryStatus = useCallback(async (queryId: string | number): Promise<QueryStatus | null> => {
        if (!REGISTRY_APP_ID || !queryId) {
            return null;
        }

        setLoading(true);
        setError(null);

        try {
            const query = `query { query(id: ${queryId}) { id status result resolvedAt disputeWindowEnd bondRefunded } }`;
            
            const response = await fetch(REGISTRY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });

            const result = await response.json();

            if (result.errors) {
                throw new Error(result.errors[0].message);
            }

            if (!result.data?.query) {
                return null;
            }

            const queryData = result.data.query;
            
            // Determine if final (no dispute window or dispute window passed)
            let isFinal = false;
            if (queryData.disputeWindowEnd) {
                const disputeEndMicros = parseInt(queryData.disputeWindowEnd.match(/\d+/)?.[0] || '0');
                const disputeEndMs = disputeEndMicros / 1000;
                isFinal = new Date(disputeEndMs) < new Date();
            } else if (queryData.status === 'Resolved') {
                // No dispute window = immediately final
                isFinal = true;
            }

            return {
                id: queryData.id,
                status: queryData.status.replace('QueryStatus::', '').replace(/"/g, ''),
                result: queryData.result,
                resolvedAt: queryData.resolvedAt,
                disputeWindowEnd: queryData.disputeWindowEnd,
                isFinal,
            };
        } catch (err) {
            console.error('Failed to check query status:', err);
            setError(err instanceof Error ? err.message : 'Failed to check query status');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return { checkQueryStatus, loading, error };
}
