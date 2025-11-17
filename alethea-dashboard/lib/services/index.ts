// Services Index - Export all services and types

export { RegistryService } from './registry.service';
export type { Market, CreateMarketParams as RegistryCreateMarketParams, Oracle } from './registry.service';

export { MarketChainService } from './market-chain.service';
export type {
    MarketChainMarket,
    Position,
    CreateMarketParams as MarketChainCreateMarketParams
} from './market-chain.service';

export { VoterService } from './voter.service';
export type { Vote, Voter, VoterStats } from './voter.service';

// Note: Coordinator service removed - all resolution operations now handled via Registry
// Market operations should use MarketChainService instead of RegistryService

// Re-export common types
export interface ServiceError {
    message: string;
    code?: string;
    details?: any;
}

// Helper function for error handling
export function handleServiceError(error: any): ServiceError {
    if (error instanceof Error) {
        return {
            message: error.message,
            details: error
        };
    }
    return {
        message: 'Unknown error occurred',
        details: error
    };
}
