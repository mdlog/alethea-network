// Hook untuk auto-request resolution ketika deadline expired
'use client';

import { useEffect, useCallback, useRef } from 'react';
import { MarketChainService } from '../services/market-chain.service';
import { RegistryService } from '../services/registry.service';
import { Market } from '@/types';

interface UseAutoResolutionOptions {
    markets: Market[];
    enabled?: boolean;
    checkInterval?: number; // milliseconds
    onResolutionRequested?: (marketId: number) => void;
}

export function useAutoResolution({
    markets,
    enabled = true,
    checkInterval = 10000, // Check every 10 seconds
    onResolutionRequested,
}: UseAutoResolutionOptions) {
    const processingRef = useRef<Set<number>>(new Set());
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const checkAndRequestResolution = useCallback(async () => {
        if (!enabled || markets.length === 0) return;

        const now = Date.now();
        
        // Find expired markets that need resolution
        const expiredMarkets = markets.filter((market) => {
            // Skip if already processing
            if (processingRef.current.has(market.id)) return false;
            
            // Skip if not OPEN status
            if (market.status !== 'OPEN') return false;
            
            // Check if deadline has passed
            // Convert deadline to milliseconds if needed
            const deadlineMs = market.deadline > 1000000000000
                ? market.deadline
                : market.deadline * 1000;
            
            return deadlineMs < now;
        });

        if (expiredMarkets.length === 0) return;

        console.log(`Found ${expiredMarkets.length} expired market(s) that need resolution`);

        // Process each expired market
        for (const market of expiredMarkets) {
            // Mark as processing
            processingRef.current.add(market.id);

            try {
                console.log(`Auto-requesting resolution for market ${market.id}: ${market.question}`);

                // Step 1: Get market details from Market Chain
                const marketDetails = await MarketChainService.getMarket(market.id);
                if (!marketDetails) {
                    console.warn(`Market ${market.id} not found in Market Chain`);
                    processingRef.current.delete(market.id);
                    continue;
                }

                // Step 2: Register market with Registry (for resolution)
                // Convert resolutionDeadline to microseconds string
                const deadlineMicros = marketDetails.resolutionDeadline.toString();
                const callbackDataHex = market.id.toString(16).padStart(16, '0');
                const outcomesStr = marketDetails.outcomes.map(o => `"${o.replace(/"/g, '\\"')}"`).join(', ');

                const { queryGraphQL } = await import('../graphql');
                
                let registered = false;
                let retries = 3;
                while (retries > 0 && !registered) {
                    try {
                        await queryGraphQL(`
                            mutation {
                                registerMarket(
                                    question: "${marketDetails.question.replace(/"/g, '\\"')}",
                                    outcomes: [${outcomesStr}],
                                    deadline: "${deadlineMicros}",
                                    callbackData: "${callbackDataHex}"
                                )
                            }
                        `, 'registry');
                        registered = true;
                    } catch (err: any) {
                        // If already registered, that's okay - continue
                        if (err.message?.includes('already registered') || err.message?.includes('duplicate')) {
                            registered = true;
                            break;
                        }
                        retries--;
                        if (retries > 0) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        } else {
                            console.warn(`Failed to register market ${market.id} with Registry after retries:`, err);
                        }
                    }
                }

                // Step 3: Request resolution via Market Chain
                await MarketChainService.requestResolution(market.id);

                console.log(`✅ Successfully requested resolution for market ${market.id}`);
                
                // Callback
                if (onResolutionRequested) {
                    onResolutionRequested(market.id);
                }
            } catch (err: any) {
                console.error(`Failed to auto-request resolution for market ${market.id}:`, err);
                // Remove from processing set on error so we can retry
                processingRef.current.delete(market.id);
            }
        }
    }, [markets, enabled, onResolutionRequested]);

    useEffect(() => {
        if (!enabled) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // Initial check
        checkAndRequestResolution();

        // Set up interval
        intervalRef.current = setInterval(() => {
            checkAndRequestResolution();
        }, checkInterval);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [enabled, checkInterval, checkAndRequestResolution]);

    return {
        checkAndRequestResolution,
    };
}

