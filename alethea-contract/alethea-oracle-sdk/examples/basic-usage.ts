/**
 * Basic usage example for Alethea Oracle SDK
 * 
 * This example demonstrates how to:
 * 1. Initialize the client
 * 2. Register a market
 * 3. Subscribe to resolution updates
 * 4. Handle errors
 */

import {
    AletheaOracleClient,
    ValidationError,
    NetworkError,
    InsufficientFeeError
} from '@alethea/oracle-sdk';

async function main() {
    // Initialize the client
    const client = new AletheaOracleClient({
        registryId: 'e476187f6ddfeb9d588c7e2428137534e89c2da815c8f0d3e181a98a2a500de0060000000000000000000000e476187f6ddfeb9d588c7e2428137534e89c2da815c8f0d3e181a98a2a500de0070000000000000000000000',
        chainId: 'e476187f6ddfeb9d588c7e2428137534e89c2da815c8f0d3e181a98a2a500de0060000000000000000000000',
        endpoint: 'http://localhost:8080/graphql', // Optional
        retryAttempts: 3,
        retryDelay: 1000,
    });

    try {
        // Register a market
        console.log('Registering market...');
        const registration = await client.registerMarket({
            question: 'Will it rain tomorrow in San Francisco?',
            outcomes: ['Yes', 'No'],
            deadline: String(Date.now() * 1000 + 86400000000), // 24 hours from now
            callbackChainId: 'your-callback-chain-id',
            callbackApplicationId: 'your-callback-app-id',
            callbackMethod: 'handleResolution',
            fee: '100',
        });

        console.log('Market registered successfully!');
        console.log('Market ID:', registration.marketId);
        console.log('Registered at:', registration.registeredAt);
        console.log('Estimated resolution:', registration.estimatedResolution);

        // Subscribe to resolution updates
        console.log('\nSubscribing to resolution updates...');
        const unsubscribe = await client.subscribeToResolution(
            registration.marketId,
            (resolution, error) => {
                if (error) {
                    console.error('Subscription error:', error.message);
                    return;
                }

                console.log('\n🎉 Market resolved!');
                console.log('Winning outcome:', resolution!.outcome);
                console.log('Resolved at:', resolution!.resolvedAt);
                console.log('Confidence:', resolution!.confidence);
                console.log('Voter count:', resolution!.voterCount);
            },
            {
                pollInterval: 5000, // Poll every 5 seconds
                timeout: 86400000, // Timeout after 24 hours
            }
        );

        console.log('Subscription active. Polling for updates...');
        console.log('Press Ctrl+C to stop');

        // Keep the process running
        process.on('SIGINT', () => {
            console.log('\nUnsubscribing...');
            unsubscribe();
            process.exit(0);
        });

    } catch (error) {
        // Handle different error types
        if (error instanceof ValidationError) {
            console.error('❌ Validation error:', error.message);
            console.error('Please check your input parameters');
        } else if (error instanceof InsufficientFeeError) {
            console.error('❌ Insufficient fee');
            console.error('Required:', error.required);
            console.error('Provided:', error.provided);
        } else if (error instanceof NetworkError) {
            console.error('❌ Network error:', error.message);
            console.error('Please check your connection and endpoint');
        } else {
            console.error('❌ Unexpected error:', error);
        }
        process.exit(1);
    }
}

// Run the example
main().catch(console.error);
