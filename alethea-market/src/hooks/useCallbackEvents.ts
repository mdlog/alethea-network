import { useState, useEffect, useCallback } from 'react';
import { useOracleQuery, QueryStatus } from './useOracleQuery';

export interface CallbackEvent {
    type: 'QueryCreated' | 'QueryResolved' | 'QueryFinalized' | 'QueryDisputed' | 'DisputeResolved';
    queryId?: string;
    timestamp: string;
    result?: string;
    isFinal?: boolean;
    status: 'pending' | 'received' | 'processed';
    description?: string;
}

interface UseCallbackEventsProps {
    marketId: string;
    queryId?: string | null;
    marketStatus: string;
    enabled?: boolean;
    pollInterval?: number;
}

export function useCallbackEvents({
    marketId,
    queryId,
    marketStatus,
    enabled = true,
    pollInterval = 5000,
}: UseCallbackEventsProps) {
    const [events, setEvents] = useState<CallbackEvent[]>([]);
    const [previousQueryStatus, setPreviousQueryStatus] = useState<QueryStatus | null>(null);
    const { checkQueryStatus, loading } = useOracleQuery();

    // Detect callback events based on query status changes
    const detectCallbackEvents = useCallback((currentStatus: QueryStatus | null, currentEvents: CallbackEvent[]) => {
        if (!currentStatus) return [];

        const newEvents: CallbackEvent[] = [];

        // QueryCreated: detected when queryId appears and query exists
        if (currentStatus.id && !currentEvents.find(e => e.type === 'QueryCreated')) {
            newEvents.push({
                type: 'QueryCreated',
                queryId: currentStatus.id.toString(),
                timestamp: new Date().toISOString(),
                status: 'received',
                description: `Query #${currentStatus.id} created in Oracle Registry`,
            });
        }

        // QueryResolved: when query status changes to Resolved
        if (
            currentStatus.status === 'Resolved' &&
            previousQueryStatus?.status !== 'Resolved' &&
            !currentEvents.find(e => e.type === 'QueryResolved')
        ) {
            newEvents.push({
                type: 'QueryResolved',
                queryId: currentStatus.id.toString(),
                result: currentStatus.result,
                timestamp: currentStatus.resolvedAt || new Date().toISOString(),
                isFinal: currentStatus.isFinal,
                status: 'received',
                description: `Query resolved with result: ${currentStatus.result}`,
            });
        }

        // QueryFinalized: when dispute window passes or no dispute window
        if (
            currentStatus.isFinal &&
            currentStatus.status === 'Resolved' &&
            !currentEvents.find(e => e.type === 'QueryFinalized')
        ) {
            newEvents.push({
                type: 'QueryFinalized',
                queryId: currentStatus.id.toString(),
                result: currentStatus.result,
                isFinal: true,
                timestamp: new Date().toISOString(),
                status: 'received',
                description: `Query finalized - safe to settle market. Result: ${currentStatus.result}`,
            });
        }

        return newEvents;
    }, [previousQueryStatus]);

    // Poll Oracle Registry for query status
    useEffect(() => {
        if (!enabled || !queryId || marketStatus === 'open') {
            return;
        }

        const poll = async () => {
            const queryStatus = await checkQueryStatus(queryId);
            
            if (queryStatus) {
                // Detect new callback events
                const newEvents = detectCallbackEvents(queryStatus);
                
                if (newEvents.length > 0) {
                    setEvents(prev => [...prev, ...newEvents]);
                }

                setPreviousQueryStatus(queryStatus);
            }
        };

        // Initial poll
        poll();

        // Set up polling interval
        const interval = setInterval(poll, pollInterval);

        return () => clearInterval(interval);
    }, [enabled, queryId, marketStatus, checkQueryStatus, detectCallbackEvents, pollInterval]);

    // Add pending events based on market status
    useEffect(() => {
        const pendingEvents: CallbackEvent[] = [];

        // If market has queryId but no QueryCreated event yet
        if (queryId && !events.find(e => e.type === 'QueryCreated')) {
            pendingEvents.push({
                type: 'QueryCreated',
                queryId: queryId.toString(),
                timestamp: new Date().toISOString(),
                status: 'pending',
                description: 'Waiting for query creation confirmation...',
            });
        }

        // If market is voting but no QueryResolved event yet
        if (marketStatus === 'voting' && queryId && !events.find(e => e.type === 'QueryResolved')) {
            pendingEvents.push({
                type: 'QueryResolved',
                queryId: queryId.toString(),
                timestamp: new Date().toISOString(),
                status: 'pending',
                description: 'Waiting for oracle resolution...',
            });
        }

        // If market is resolved but no QueryFinalized event yet
        if (marketStatus === 'resolved' && queryId && !events.find(e => e.type === 'QueryFinalized')) {
            pendingEvents.push({
                type: 'QueryFinalized',
                queryId: queryId.toString(),
                timestamp: new Date().toISOString(),
                status: 'pending',
                description: 'Checking if query is finalized...',
            });
        }

        // Only add pending events that don't exist yet
        setEvents(prev => {
            const existingTypes = new Set(prev.map(e => e.type));
            const newPending = pendingEvents.filter(e => !existingTypes.has(e.type));
            return [...prev, ...newPending];
        });
    }, [queryId, marketStatus, events]);

    const refresh = useCallback(async () => {
        if (queryId) {
            const queryStatus = await checkQueryStatus(queryId);
            if (queryStatus) {
                setEvents(prev => {
                    const newEvents = detectCallbackEvents(queryStatus, prev);
                    return newEvents.length > 0 ? [...prev, ...newEvents] : prev;
                });
                setPreviousQueryStatus(queryStatus);
            }
        }
    }, [queryId, checkQueryStatus, detectCallbackEvents]);

    return {
        events: events.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ),
        loading,
        refresh,
    };
}
