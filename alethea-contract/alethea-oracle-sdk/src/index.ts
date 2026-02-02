/**
 * Alethea Oracle SDK
 * 
 * TypeScript SDK for integrating with Alethea Oracle Network
 * 
 * Supports both:
 * - Legacy application-based registry (for backward compatibility)
 * - Account-based registry (recommended for new integrations)
 */

// Export main client
export { AletheaOracleClient } from './client';

// Export types
export type {
    // Configuration
    OracleConfig,

    // Legacy market-based types (application-based registry)
    RegisterMarketParams,
    MarketRegistration,
    MarketStatus,
    Resolution,
    ResolutionCallback,
    Unsubscribe,
    SubscriptionOptions,

    // Account-based registry types
    VoterInfo,
    QueryInfo,
    Statistics,
    RegisterVoterParams,
    CreateQueryParams,
    SubmitVoteParams,
} from './types';

// Export errors
export {
    OracleError,
    ValidationError,
    NetworkError,
    MarketNotFoundError,
    InsufficientFeeError,
    MaxRetriesExceededError,
    SubscriptionTimeoutError,
} from './errors';
