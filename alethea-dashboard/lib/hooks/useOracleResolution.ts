// Hook for Oracle Resolution Workflow (Solution C: Hybrid Approach)
'use client';

import { useState, useCallback } from 'react';
import { MarketChainService } from '../services/market-chain.service';
import { RegistryService } from '../services/registry.service';

export interface ResolutionStep {
    step: number;
    total: number;
    message: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
}

export function useOracleResolution() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState<ResolutionStep | null>(null);

    const requestResolution = useCallback(async (marketId: number) => {
        setLoading(true);
        setError(null);

        try {
            // Step 1: Get market details from Market Chain
            setCurrentStep({
                step: 1,
                total: 3,
                message: 'Fetching market details...',
                status: 'processing'
            });

            const market = await MarketChainService.getMarket(marketId);
            if (!market) {
                throw new Error('Market not found');
            }

            // Add small delay to avoid blockchain message ordering issues
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Step 2: Register market with Registry
            setCurrentStep({
                step: 2,
                total: 3,
                message: 'Registering with Oracle Registry...',
                status: 'processing'
            });

            // Convert resolutionDeadline from microseconds to microseconds (Registry expects microseconds as String)
            // Registry expects deadline as String in microseconds format
            const deadlineMicros = market.resolutionDeadline.toString();

            // Convert market ID to callback data hex string (16 hex chars = 8 bytes)
            const callbackDataHex = marketId.toString(16).padStart(16, '0');

            // Call Registry's registerMarket mutation directly with retry
            const { queryGraphQL } = await import('../graphql');
            const outcomesStr = market.outcomes.map(o => `"${o.replace(/"/g, '\\"')}"`).join(', ');

            let retries = 3;
            let lastError;

            while (retries > 0) {
                try {
                    await queryGraphQL(`
                        mutation {
                            registerMarket(
                                question: "${market.question.replace(/"/g, '\\"')}",
                                outcomes: [${outcomesStr}],
                                deadline: "${deadlineMicros}",
                                callbackData: "${callbackDataHex}"
                            )
                        }
                    `, 'registry');
                    break; // Success, exit retry loop
                } catch (err: any) {
                    lastError = err;
                    retries--;
                    if (retries > 0) {
                        // Wait before retry (exponential backoff)
                        await new Promise(resolve => setTimeout(resolve, 2000 * (4 - retries)));
                    }
                }
            }

            if (retries === 0 && lastError) {
                throw lastError;
            }

            // Add delay before next operation
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Step 3: Request resolution via Market Chain
            // Market Chain akan mengirim message ke Registry untuk resolution
            setCurrentStep({
                step: 3,
                total: 3,
                message: 'Requesting resolution via Market Chain...',
                status: 'processing'
            });

            // Request resolution melalui Market Chain
            // Market Chain akan mengirim RegisterMarket message ke Registry
            await MarketChainService.requestResolution(marketId);

            // Success
            setCurrentStep({
                step: 3,
                total: 3,
                message: 'Oracle resolution requested successfully!',
                status: 'completed'
            });

            return true;
        } catch (err: any) {
            console.error('Resolution request failed:', err);
            setError(err.message || 'Failed to request resolution');
            setCurrentStep({
                step: currentStep?.step || 0,
                total: 3,
                message: err.message || 'Failed to request resolution',
                status: 'error'
            });
            return false;
        } finally {
            setLoading(false);
        }
    }, [currentStep]);

    const reset = useCallback(() => {
        setLoading(false);
        setError(null);
        setCurrentStep(null);
    }, []);

    return {
        requestResolution,
        loading,
        error,
        currentStep,
        reset
    };
}
