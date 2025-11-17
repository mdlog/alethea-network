/**
 * Alethea Operations Helper
 * 
 * Helper functions to execute Linera operations for Alethea protocol
 */

// ==================== TYPES ====================

export interface CreateMarketParams {
    question: string;
    outcomes: string[];
    deadline: Date | number; // Date object or timestamp in milliseconds
    callbackData?: Uint8Array;
}

export interface RegisterVoterParams {
    stake: string | number; // Amount in tokens or attos
}

export interface VoteCommitmentParams {
    marketId: number;
    commitmentHash: string; // Hex string
    stakeLocked: string | number;
}

export interface VoteRevealParams {
    marketId: number;
    outcomeIndex: number;
    salt: string; // Hex string
    confidence: number; // 0-100
}

export interface OperationResult {
    success: boolean;
    transactionHash?: string;
    error?: string;
}

// ==================== MARKET CHAIN OPERATIONS (Preferred Method) ====================

/**
 * Create market using Market Chain GraphQL mutation
 * Market Chain supports GraphQL mutations and will automatically request oracle resolution
 * 
 * This is the PREFERRED method - no Linera CLI needed!
 * 
 * @example
 * ```typescript
 * const result = await createMarketViaMarketChain({
 *   question: "Will BTC hit $100k by end of 2024?",
 *   outcomes: ["Yes", "No"],
 *   deadline: new Date('2024-12-31'),
 * }, marketChainUrl);
 * ```
 */
export async function createMarketViaMarketChain(
    params: CreateMarketParams,
    marketChainUrl: string
): Promise<OperationResult> {
    try {
        // Convert deadline to microseconds
        const deadlineMicros = params.deadline instanceof Date
            ? params.deadline.getTime() * 1000
            : params.deadline * 1000;

        // Market Chain requires initial_liquidity as string
        const initialLiquidity = "1000000"; // Default liquidity

        // Prepare GraphQL mutation
        // Escape quotes in outcomes
        const escapeQuotes = (str: string) => str.replaceAll('"', String.raw`\"`);
        const outcomesStr = params.outcomes.map(o => `"${escapeQuotes(o)}"`).join(', ');

        const mutation = `
            mutation {
                createMarket(
                    question: "${escapeQuotes(params.question)}"
                    outcomes: [${outcomesStr}]
                    resolutionDeadline: ${deadlineMicros}
                    initialLiquidity: "${initialLiquidity}"
                )
            }
        `;

        // Call Market Chain GraphQL endpoint
        const response = await fetch(marketChainUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: mutation,
            }),
        });

        const result = await response.json();

        if (result.errors) {
            return {
                success: false,
                error: result.errors[0]?.message || 'Failed to create market',
            };
        }

        // Market Chain returns transaction hash or market ID
        const transactionHash = result.data?.createMarket || result.data?.marketCreated;

        return {
            success: true,
            transactionHash: transactionHash || 'Market created successfully',
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

// ==================== REGISTRY OPERATIONS (Via Linera CLI) ====================

/**
 * Create a new market (Register Market) - Requires Linera CLI
 * 
 * Note: This method requires Linera CLI to be available on the server.
 * Prefer using createMarketViaMarketChain() instead.
 * 
 * @example
 * ```typescript
 * const result = await createMarket({
 *   question: "Will BTC hit $100k by end of 2024?",
 *   outcomes: ["Yes", "No"],
 *   deadline: new Date('2024-12-31'),
 * }, registryUrl);
 * ```
 */
export async function createMarket(
    params: CreateMarketParams,
    registryUrl: string
): Promise<OperationResult> {
    try {
        // Convert deadline to microseconds
        const deadlineMicros = params.deadline instanceof Date
            ? params.deadline.getTime() * 1000
            : params.deadline * 1000;

        // Prepare operation
        const operation = {
            RegisterMarket: {
                question: params.question,
                outcomes: params.outcomes,
                deadline: deadlineMicros,
                callback_data: params.callbackData ? Array.from(params.callbackData) : [],
            },
        };

        // Execute operation via GraphQL
        const response = await fetch(registryUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: `
          mutation ExecuteOperation($operation: String!) {
            executeOperation(operation: $operation)
          }
        `,
                variables: {
                    operation: JSON.stringify(operation),
                },
            }),
        });

        const result = await response.json();

        if (result.errors) {
            return {
                success: false,
                error: result.errors[0]?.message || 'Unknown error',
            };
        }

        return {
            success: true,
            transactionHash: result.data?.executeOperation,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Register as a voter
 * 
 * @example
 * ```typescript
 * const result = await registerVoter({
 *   stake: 1000, // 1000 tokens
 * }, registryUrl);
 * ```
 */
export async function registerVoter(
    params: RegisterVoterParams,
    registryUrl: string
): Promise<OperationResult> {
    try {
        const operation = {
            RegisterVoter: {
                stake: typeof params.stake === 'number'
                    ? params.stake.toString()
                    : params.stake,
            },
        };

        const response = await fetch(registryUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: `
          mutation ExecuteOperation($operation: String!) {
            executeOperation(operation: $operation)
          }
        `,
                variables: {
                    operation: JSON.stringify(operation),
                },
            }),
        });

        const result = await response.json();

        if (result.errors) {
            return {
                success: false,
                error: result.errors[0]?.message || 'Unknown error',
            };
        }

        return {
            success: true,
            transactionHash: result.data?.executeOperation,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

// ==================== DIRECT HTTP OPERATIONS ====================

/**
 * Execute operation directly via HTTP (bypass GraphQL)
 * This is more reliable for Linera operations
 */
export async function executeOperationDirect(
    operation: any,
    chainUrl: string
): Promise<OperationResult> {
    try {
        const response = await fetch(`${chainUrl}/operations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(operation),
        });

        if (!response.ok) {
            const error = await response.text();
            return {
                success: false,
                error: error || `HTTP ${response.status}`,
            };
        }

        const result = await response.json();

        return {
            success: true,
            transactionHash: result.hash || result.transaction_hash,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Create market using direct HTTP operation
 * This is the recommended way for Linera
 */
export async function createMarketDirect(
    params: CreateMarketParams,
    chainUrl: string,
    applicationId: string
): Promise<OperationResult> {
    try {
        // Convert deadline to microseconds
        const deadlineMicros = params.deadline instanceof Date
            ? params.deadline.getTime() * 1000
            : params.deadline * 1000;

        // Prepare operation
        const operation = {
            application_id: applicationId,
            operation: {
                RegisterMarket: {
                    question: params.question,
                    outcomes: params.outcomes,
                    deadline: deadlineMicros,
                    callback_data: params.callbackData ? Array.from(params.callbackData) : [],
                },
            },
        };

        return await executeOperationDirect(operation, chainUrl);
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Create market using Next.js API route (executes Linera CLI)
 * This method requires Linera CLI on the server
 */
export async function createMarketViaAPI(
    params: CreateMarketParams,
    applicationId: string
): Promise<OperationResult> {
    try {
        // Convert deadline to microseconds
        const deadlineMicros = params.deadline instanceof Date
            ? params.deadline.getTime() * 1000
            : params.deadline * 1000;

        // Call Next.js API route
        const response = await fetch('/api/create-market', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question: params.question,
                outcomes: params.outcomes,
                deadline: deadlineMicros,
                applicationId: applicationId,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: result.error || result.details || `HTTP ${response.status}`,
            };
        }

        return {
            success: true,
            transactionHash: result.output || 'Operation completed',
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Validate market parameters
 */
export function validateMarketParams(params: CreateMarketParams): string | null {
    if (!params.question || params.question.trim().length === 0) {
        return 'Question is required';
    }

    if (params.question.length > 500) {
        return 'Question is too long (max 500 characters)';
    }

    if (!params.outcomes || params.outcomes.length < 2) {
        return 'At least 2 outcomes are required';
    }

    if (params.outcomes.length > 10) {
        return 'Maximum 10 outcomes allowed';
    }

    for (const outcome of params.outcomes) {
        if (!outcome || outcome.trim().length === 0) {
            return 'All outcomes must have a value';
        }
        if (outcome.length > 100) {
            return 'Outcome is too long (max 100 characters)';
        }
    }

    const deadline = params.deadline instanceof Date
        ? params.deadline.getTime()
        : params.deadline;

    if (deadline <= Date.now()) {
        return 'Deadline must be in the future';
    }

    return null;
}

/**
 * Format deadline for display
 */
export function formatDeadline(deadline: Date | number): string {
    const date = deadline instanceof Date ? deadline : new Date(deadline);
    return date.toLocaleString();
}

/**
 * Calculate time until deadline
 */
export function getTimeUntilDeadline(deadline: Date | number): string {
    const deadlineMs = deadline instanceof Date ? deadline.getTime() : deadline;
    const now = Date.now();
    const diff = deadlineMs - now;

    if (diff <= 0) {
        return 'Expired';
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
        return `${days}d ${hours}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

/**
 * Generate callback data for market ID
 */
export function generateCallbackData(marketId: number): Uint8Array {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setBigUint64(0, BigInt(marketId), true); // little-endian
    return new Uint8Array(buffer);
}

// ==================== EXAMPLE USAGE ====================

/**
 * Example: Create a simple Yes/No market
 */
export async function createYesNoMarket(
    question: string,
    deadline: Date,
    marketChainUrl: string
): Promise<OperationResult> {
    return createMarketViaMarketChain(
        {
            question,
            outcomes: ['Yes', 'No'],
            deadline,
        },
        marketChainUrl
    );
}

/**
 * Example: Create a multi-outcome market
 */
export async function createMultiOutcomeMarket(
    question: string,
    outcomes: string[],
    deadline: Date,
    marketChainUrl: string
): Promise<OperationResult> {
    return createMarketViaMarketChain(
        {
            question,
            outcomes,
            deadline,
        },
        marketChainUrl
    );
}
