/**
 * Query Creation Examples
 * 
 * This file demonstrates two ways to create queries:
 * 
 * 1. ExternalDAppClient.createResolutionQuery() 
 *    - For prediction markets, insurance, and external DApps
 *    - Includes callback configuration for receiving resolution
 * 
 * 2. InternalDashboardClient.createQuery()
 *    - For Alethea Dashboard testing/admin purposes
 *    - Does not include callback (internal oracle queries)
 */

import {
    ExternalDAppClient,
    InternalDashboardClient,
    ValidationError,
    NetworkError,
} from 'alethea-oracle-sdk';

// =============================================================================
// EXAMPLE 1: External DApp Creating Resolution Query
// =============================================================================

/**
 * Example: Prediction Market requesting resolution
 */
async function predictionMarketExample() {
    console.log('='.repeat(60));
    console.log('📊 PREDICTION MARKET - Resolution Query Example');
    console.log('='.repeat(60));
    
    const client = new ExternalDAppClient({
        registryId: 'oracle-registry-id',
        chainId: 'oracle-chain-id',
        callbackChainId: 'prediction-market-chain-id',
        callbackAppId: 'prediction-market-app-id',
    });

    try {
        // Create a resolution query for a sports event
        const result = await client.createResolutionQuery({
            description: 'Did Manchester United win the Premier League 2025-26?',
            outcomes: ['Yes', 'No'],
            strategy: 'WeightedByStake',
            rewardAmount: '150',
            durationSecs: 86400,  // 24 hours voting period
            referenceId: 'market-premier-league-2026',
        });

        console.log('\n✅ Resolution query created:');
        console.log('   Query ID:', result.queryId);
        console.log('   Deadline:', result.deadline);
        console.log('   Status:', result.status);
        
        // Subscribe to receive resolution
        console.log('\n🔔 Subscribing to resolution...');
        
        const unsubscribe = await client.subscribeToResolution(
            result.queryId,
            (resolution, error) => {
                if (resolution) {
                    console.log('\n🎉 Resolution received!');
                    console.log('   Result:', resolution.result);
                    console.log('   Votes:', resolution.voteCount);
                    console.log('   Confidence:', resolution.confidence + '%');
                    
                    // In your DApp, settle the market:
                    // settleMarket(resolution.referenceId, resolution.result);
                }
            }
        );

        console.log('   Subscription active.');
        
        // Cleanup after 10 seconds (for demo)
        setTimeout(() => {
            unsubscribe();
            console.log('   Subscription stopped (demo).');
        }, 10000);

    } catch (error) {
        if (error instanceof ValidationError) {
            console.error('❌ Invalid parameters:', error.message);
        } else if (error instanceof NetworkError) {
            console.error('❌ Network error:', error.message);
        } else {
            console.error('❌ Error:', error);
        }
    }
}

/**
 * Example: Insurance Protocol requesting claim resolution
 */
async function insuranceProtocolExample() {
    console.log('\n');
    console.log('='.repeat(60));
    console.log('🛡️  INSURANCE PROTOCOL - Claim Resolution Example');
    console.log('='.repeat(60));
    
    const client = new ExternalDAppClient({
        registryId: 'oracle-registry-id',
        chainId: 'oracle-chain-id',
        callbackChainId: 'insurance-chain-id',
        callbackAppId: 'insurance-app-id',
    });

    try {
        // Create a resolution query for an insurance claim
        const result = await client.createResolutionQuery({
            description: 'Did Flight AA123 on Jan 15, 2026 arrive more than 3 hours late?',
            outcomes: ['Yes - Delayed 3+ hours', 'No - On time or less delay'],
            strategy: 'Majority',  // Simple majority for factual claims
            rewardAmount: '75',
            durationSecs: 7200,  // 2 hours
            referenceId: 'claim-flight-aa123-delay',
        });

        console.log('\n✅ Insurance claim query created:');
        console.log('   Query ID:', result.queryId);
        console.log('   This claim will be resolved by oracle voters');
        
        // Check resolution
        const resolution = await client.checkResolution(result.queryId);
        if (resolution) {
            console.log('   Already resolved:', resolution.result);
        } else {
            console.log('   Awaiting voter resolution...');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

/**
 * Example: Gaming DApp requesting match result
 */
async function gamingDAppExample() {
    console.log('\n');
    console.log('='.repeat(60));
    console.log('🎮 GAMING DAPP - Match Result Resolution Example');
    console.log('='.repeat(60));
    
    const client = new ExternalDAppClient({
        registryId: 'oracle-registry-id',
        chainId: 'oracle-chain-id',
        callbackChainId: 'gaming-chain-id',
        callbackAppId: 'gaming-app-id',
    });

    try {
        // Create a resolution query for esports match
        const result = await client.createResolutionQuery({
            description: 'Who won the LCK Spring 2026 Finals?',
            outcomes: ['T1', 'Gen.G', 'DRX', 'KT Rolster', 'Match Cancelled'],
            strategy: 'WeightedByReputation',  // Trust experienced voters
            rewardAmount: '200',
            durationSecs: 3600,
            referenceId: 'esports-lck-finals-2026',
        });

        console.log('\n✅ Esports match query created:');
        console.log('   Query ID:', result.queryId);
        console.log('   5 possible outcomes');
        console.log('   Using WeightedByReputation strategy');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// =============================================================================
// EXAMPLE 2: Internal Dashboard Creating Test Query
// =============================================================================

/**
 * Example: Alethea Dashboard creating a test query
 * 
 * @internal Alethea Dashboard only
 */
async function internalTestQueryExample() {
    console.log('\n');
    console.log('='.repeat(60));
    console.log('⚙️  INTERNAL - Dashboard Test Query Example');
    console.log('='.repeat(60));
    
    const client = new InternalDashboardClient({
        registryId: 'oracle-registry-id',
        chainId: 'oracle-chain-id',
        voterChainId: 'admin-voter-chain-id',
    });

    try {
        // Create a test query for testing voter functionality
        const success = await client.createQuery({
            description: '[TEST] Sample query for voter testing - What is 2+2?',
            outcomes: ['4', '5', 'Other'],
            strategy: 'Majority',
            minVotes: 1,
            rewardAmount: '10',
            durationSecs: 300,  // 5 minutes
        });

        if (success) {
            console.log('\n✅ Test query created');
            console.log('   Voters can now test voting functionality');
        }

        // Get active queries
        const activeQueries = await client.getQueries({ status: 'Active', limit: 5 });
        console.log(`\n📋 Active queries: ${activeQueries.length}`);
        
        for (const query of activeQueries) {
            console.log(`   #${query.id}: ${query.description.substring(0, 50)}...`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// =============================================================================
// RUN EXAMPLES
// =============================================================================

async function main() {
    console.log('\n🚀 Alethea Oracle SDK - Query Creation Examples\n');
    
    // Run external DApp examples
    await predictionMarketExample();
    await insuranceProtocolExample();
    await gamingDAppExample();
    
    // Run internal example
    await internalTestQueryExample();
    
    console.log('\n✨ All examples completed!\n');
}

main().catch(console.error);
