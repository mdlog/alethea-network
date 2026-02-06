/**
 * Alethea Oracle SDK
 * 
 * TypeScript SDK for integrating with Alethea Oracle Network
 * 
 * ## For External DApps (Prediction Markets, Insurance, etc.):
 * Use `ExternalDAppClient` - handles query creation, resolution subscription, disputes.
 * 
 * ## For Alethea Dashboard (Internal):
 * Use `InternalDashboardClient` - handles voter registration, voting, staking, rewards.
 * 
 * ## Legacy:
 * `AletheaOracleClient` is deprecated. Use the specific clients above.
 */

// Primary clients (use these)
export { ExternalDAppClient } from './external-client';
export { InternalDashboardClient } from './internal-client';

// Legacy client (deprecated)
export { AletheaOracleClient } from './client';

// Base client (for advanced use / extending)
export { BaseOracleClient } from './base-client';

// Export types
export type {
    // Configuration
    OracleConfigBase,
    ExternalDAppConfig,
    InternalDashboardConfig,
    OracleConfig,

    // Query types
    QueryInfo,
    DecisionStrategy,
    QueryStatus,
    VotingPhase,

    // Voter types
    VoterInfo,
    Statistics,

    // External DApp types
    CreateResolutionQueryParams,
    CreateQueryWithBondParams,
    RaiseDisputeParams,
    QueryCreationResult,
    ResolutionResult,
    ResolutionCallback,
    Unsubscribe,
    SubscriptionOptions,

    // Internal Dashboard types
    RegisterVoterParams,
    SubmitVoteParams,
    CommitVoteParams,
    RevealVoteParams,

    // GraphQL types
    GraphQLResponse,

    // Legacy types (deprecated)
    RegisterMarketParams,
    MarketRegistration,
    MarketStatus,
    Resolution,
    CreateQueryParams,
} from './types';

// Export errors
export {
    OracleError,
    ValidationError,
    NetworkError,
    QueryNotFoundError,
    MarketNotFoundError,
    InsufficientFeeError,
    MaxRetriesExceededError,
    SubscriptionTimeoutError,
    VoterNotRegisteredError,
    VoterAlreadyRegisteredError,
    AlreadyVotedError,
    InsufficientStakeError,
    ProtocolPausedError,
} from './errors';
