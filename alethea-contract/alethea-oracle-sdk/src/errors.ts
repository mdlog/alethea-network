/**
 * Alethea Oracle SDK - Error Classes
 * 
 * All errors extend OracleError for consistent error handling.
 */

/**
 * Base error class for all Oracle SDK errors
 */
export class OracleError extends Error {
    constructor(
        public code: string,
        message: string,
        public cause?: any
    ) {
        super(message);
        this.name = 'OracleError';

        // Maintains proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

/**
 * Validation error for invalid parameters
 */
export class ValidationError extends OracleError {
    constructor(message: string) {
        super(
            'VALIDATION_ERROR',
            `Validation failed: ${message}. Please check your input parameters and try again.`
        );
        this.name = 'ValidationError';
    }
}

/**
 * Network error for connection and communication issues
 */
export class NetworkError extends OracleError {
    constructor(message: string, cause?: any) {
        super(
            'NETWORK_ERROR',
            `Network error: ${message}. Please check your connection and endpoint configuration.`,
            cause
        );
        this.name = 'NetworkError';
    }
}

/**
 * Error when a query is not found
 */
export class QueryNotFoundError extends OracleError {
    constructor(public queryId: number) {
        super(
            'QUERY_NOT_FOUND',
            `Query with ID ${queryId} was not found. The query may not exist or may have been removed.`
        );
        this.name = 'QueryNotFoundError';
    }
}

/**
 * Error when a market is not found
 * @deprecated Use QueryNotFoundError
 */
export class MarketNotFoundError extends OracleError {
    constructor(public marketId: number) {
        super(
            'MARKET_NOT_FOUND',
            `Market with ID ${marketId} was not found. The market may not exist or may have been removed.`
        );
        this.name = 'MarketNotFoundError';
    }
}

/**
 * Error when registration fee is insufficient
 */
export class InsufficientFeeError extends OracleError {
    constructor(
        public required: string,
        public provided: string
    ) {
        super(
            'INSUFFICIENT_FEE',
            `Insufficient fee. Required: ${required} tokens, Provided: ${provided} tokens.`
        );
        this.name = 'InsufficientFeeError';
    }
}

/**
 * Error when maximum retry attempts are exceeded
 */
export class MaxRetriesExceededError extends OracleError {
    constructor(attempts: number, cause?: any) {
        super(
            'MAX_RETRIES_EXCEEDED',
            `Operation failed after ${attempts} retry attempts. Please try again later.`,
            cause
        );
        this.name = 'MaxRetriesExceededError';
    }
}

/**
 * Error when subscription times out
 */
export class SubscriptionTimeoutError extends OracleError {
    constructor(queryId: number, timeoutMs: number) {
        super(
            'SUBSCRIPTION_TIMEOUT',
            `Subscription for query ${queryId} timed out after ${timeoutMs}ms. The query may not have been resolved within the expected timeframe.`
        );
        this.name = 'SubscriptionTimeoutError';
    }
}

/**
 * Error when voter is not registered
 */
export class VoterNotRegisteredError extends OracleError {
    constructor(address: string) {
        super(
            'VOTER_NOT_REGISTERED',
            `Voter ${address} is not registered. Please register as a voter first.`
        );
        this.name = 'VoterNotRegisteredError';
    }
}

/**
 * Error when voter is already registered
 */
export class VoterAlreadyRegisteredError extends OracleError {
    constructor(address: string) {
        super(
            'VOTER_ALREADY_REGISTERED',
            `Voter ${address} is already registered.`
        );
        this.name = 'VoterAlreadyRegisteredError';
    }
}

/**
 * Error when trying to vote twice on the same query
 */
export class AlreadyVotedError extends OracleError {
    constructor(queryId: number) {
        super(
            'ALREADY_VOTED',
            `You have already voted on query ${queryId}.`
        );
        this.name = 'AlreadyVotedError';
    }
}

/**
 * Error when insufficient stake for operation
 */
export class InsufficientStakeError extends OracleError {
    constructor(required: string, available: string) {
        super(
            'INSUFFICIENT_STAKE',
            `Insufficient stake. Required: ${required}, Available: ${available}.`
        );
        this.name = 'InsufficientStakeError';
    }
}

/**
 * Error when protocol is paused
 */
export class ProtocolPausedError extends OracleError {
    constructor() {
        super(
            'PROTOCOL_PAUSED',
            'The Oracle protocol is currently paused. Please try again later.'
        );
        this.name = 'ProtocolPausedError';
    }
}
