// Market Chain Service - Prediction Market Operations
import { queryGraphQL } from '../graphql';

export interface MarketChainMarket {
    id: number;
    question: string;
    outcomes: string[];
    status: string;
    finalOutcome: number | null;
    resolutionDeadline: number;
}

export interface Position {
    marketId: number;
    owner: string;
    outcomeIndex: number;
    shares: number;
    averagePrice: string;
}

export interface CreateMarketParams {
    question: string;
    outcomes: string[];
    resolutionDeadline: number; // Unix timestamp in SECONDS
    initialLiquidity: string; // Amount as string
}

export class MarketChainService {
    // Queries
    static async getMarket(id: number): Promise<MarketChainMarket | null> {
        try {
            const result = await queryGraphQL(`
                query {
                    market(id: ${id}) {
                        id
                        question
                        outcomes
                        status
                        finalOutcome
                        resolutionDeadline
                    }
                }
            `, 'marketChain');
            return result?.market || null;
        } catch (error) {
            console.error('Failed to get market from Market Chain:', error);
            throw error;
        }
    }

    static async getAllMarkets(): Promise<MarketChainMarket[]> {
        try {
            const result = await queryGraphQL(`
                query {
                    markets {
                        id
                        question
                        outcomes
                        status
                        finalOutcome
                        resolutionDeadline
                    }
                }
            `, 'marketChain');
            return result?.markets || [];
        } catch (error) {
            console.error('Failed to get markets from Market Chain:', error);
            return [];
        }
    }

    static async getNextMarketId(): Promise<number> {
        try {
            const result = await queryGraphQL(`
                query {
                    nextMarketId
                }
            `, 'marketChain');
            return result?.nextMarketId || 0;
        } catch (error) {
            console.error('Failed to get next market ID:', error);
            return 0;
        }
    }

    static async getPosition(marketId: number, owner: string): Promise<Position | null> {
        try {
            const result = await queryGraphQL(`
                query {
                    position(marketId: ${marketId}, owner: "${owner}") {
                        marketId
                        owner
                        outcomeIndex
                        shares
                        averagePrice
                    }
                }
            `, 'marketChain');
            return result?.position || null;
        } catch (error) {
            console.error('Failed to get position:', error);
            return null;
        }
    }

    // Mutations
    static async createMarket(params: CreateMarketParams): Promise<any> {
        const outcomesStr = params.outcomes.map(o => `"${o.replaceAll('"', '\\"')}"`).join(', ');

        try {
            // Note: resolutionDeadline must be in SECONDS, not milliseconds
            // initialLiquidity must be a string
            const result = await queryGraphQL(`
                mutation {
                    createMarket(
                        question: "${params.question.replaceAll('"', '\\"')}",
                        outcomes: [${outcomesStr}],
                        resolutionDeadline: ${params.resolutionDeadline},
                        initialLiquidity: "${params.initialLiquidity}"
                    )
                }
            `, 'marketChain');

            if (!result) {
                throw new Error('Failed to create market');
            }

            return result;
        } catch (error) {
            console.error('Failed to create market:', error);
            throw error;
        }
    }

    static async buyShares(marketId: number, outcomeIndex: number, amount: string): Promise<any> {
        try {
            const result = await queryGraphQL(`
                mutation {
                    buyShares(
                        marketId: ${marketId},
                        outcomeIndex: ${outcomeIndex},
                        amount: "${amount}"
                    )
                }
            `, 'marketChain');

            if (!result) {
                throw new Error('Failed to buy shares');
            }

            return result;
        } catch (error) {
            console.error('Failed to buy shares:', error);
            throw error;
        }
    }

    static async requestResolution(marketId: number): Promise<any> {
        try {
            const result = await queryGraphQL(`
                mutation {
                    requestResolution(marketId: ${marketId})
                }
            `, 'marketChain');

            if (!result) {
                throw new Error('Failed to request resolution');
            }

            return result;
        } catch (error) {
            console.error('Failed to request resolution:', error);
            throw error;
        }
    }

    static async claimWinnings(marketId: number): Promise<any> {
        try {
            const result = await queryGraphQL(`
                mutation {
                    claimWinnings(marketId: ${marketId})
                }
            `, 'marketChain');

            if (!result) {
                throw new Error('Failed to claim winnings');
            }

            return result;
        } catch (error) {
            console.error('Failed to claim winnings:', error);
            throw error;
        }
    }
}
