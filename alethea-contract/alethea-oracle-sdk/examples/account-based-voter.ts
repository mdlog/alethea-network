/**
 * Internal Dashboard Example - Voter Operations
 * 
 * ⚠️ WARNING: This example is for ALETHEA DASHBOARD INTERNAL USE ONLY.
 * External DApps should NOT use InternalDashboardClient.
 * 
 * For external DApps (prediction markets, insurance, etc.), see basic-usage.ts
 * which demonstrates ExternalDAppClient.
 * 
 * This example demonstrates:
 * 1. Voter registration
 * 2. Stake management
 * 3. Voting on queries
 * 4. Claiming rewards
 * 
 * @internal Alethea Dashboard only
 */

import {
    InternalDashboardClient,
    ValidationError,
    NetworkError,
    VoterNotRegisteredError,
    InsufficientStakeError,
} from 'alethea-oracle-sdk';

async function main() {
    console.log('='.repeat(60));
    console.log('⚠️  INTERNAL ALETHEA DASHBOARD EXAMPLE');
    console.log('   This client is for Alethea Dashboard only.');
    console.log('   External DApps should use ExternalDAppClient.');
    console.log('='.repeat(60));
    console.log('');

    // =========================================================================
    // STEP 1: Initialize Internal Dashboard Client
    // =========================================================================
    
    const client = new InternalDashboardClient({
        // Oracle Registry configuration
        registryId: 'oracle-registry-app-id',
        chainId: 'oracle-chain-id',
        
        // Voter's chain ID (required for voter operations)
        voterChainId: 'voter-chain-id',
        
        // Optional
        endpoint: 'http://localhost:8080/graphql',
    });

    try {
        // =====================================================================
        // STEP 2: Register as Voter
        // =====================================================================
        
        console.log('📋 Registering as voter...');
        
        const registered = await client.registerVoter({
            stake: '500',  // Minimum 100 ALTH tokens
            name: 'My Voter Node',
            metadataUrl: 'https://my-voter.example.com/metadata.json',
        });

        if (registered) {
            console.log('✅ Successfully registered as voter!');
        }

        // =====================================================================
        // STEP 3: Check Voter Information
        // =====================================================================
        
        console.log('\n📊 Fetching voter information...');
        
        const voterInfo = await client.getMyVoterInfo();
        
        if (voterInfo) {
            console.log('Voter Info:');
            console.log('   Address:', voterInfo.address);
            console.log('   Stake:', voterInfo.stake, 'ALTH');
            console.log('   Locked Stake:', voterInfo.lockedStake, 'ALTH');
            console.log('   Available Stake:', voterInfo.availableStake, 'ALTH');
            console.log('   Withdrawable Balance:', voterInfo.withdrawableBalance, 'ALTH');
            console.log('   Pending Rewards:', voterInfo.pendingRewards || '0', 'ALTH');
            console.log('   Reputation:', voterInfo.reputation);
            console.log('   Reputation Tier:', voterInfo.reputationTier);
            console.log('   Total Votes:', voterInfo.totalVotes);
            console.log('   Accuracy:', voterInfo.accuracyPercentage + '%');
            console.log('   Status:', voterInfo.isActive ? 'Active' : 'Inactive');
        }

        // =====================================================================
        // STEP 4: Get Active Queries
        // =====================================================================
        
        console.log('\n📋 Fetching active queries...');
        
        const activeQueries = await client.getQueries({ status: 'Active', limit: 10 });
        
        console.log(`Found ${activeQueries.length} active queries:`);
        
        for (const query of activeQueries) {
            console.log(`\n   Query #${query.id}: ${query.description}`);
            console.log(`   Outcomes: ${query.outcomes.join(', ')}`);
            console.log(`   Status: ${query.status}, Phase: ${query.phase || 'N/A'}`);
            console.log(`   Votes: ${query.voteCount}, Reward: ${query.rewardAmount} ALTH`);
        }

        // =====================================================================
        // STEP 5: Submit Vote on First Active Query
        // =====================================================================
        
        if (activeQueries.length > 0) {
            const queryToVote = activeQueries[0];
            
            console.log(`\n🗳️  Voting on Query #${queryToVote.id}...`);
            
            // Vote for the first outcome
            const voted = await client.submitVote({
                queryId: queryToVote.id,
                value: queryToVote.outcomes[0],
                confidence: 85,  // 85% confidence
            });

            if (voted) {
                console.log('✅ Vote submitted successfully!');
            }
        }

        // =====================================================================
        // STEP 6: Check and Claim Rewards (Two-Step Process)
        // =====================================================================
        
        console.log('\n💰 Checking pending rewards...');
        
        const pendingRewards = await client.getPendingRewards();
        console.log('   Pending Rewards:', pendingRewards, 'ALTH');
        
        // Step 1: Claim rewards → moves to withdrawableBalance
        if (parseFloat(pendingRewards) > 0) {
            console.log('   Step 1: Claiming rewards to withdrawable balance...');
            const claimed = await client.claimRewards();
            if (claimed) {
                console.log('   ✅ Rewards moved to withdrawable balance!');
            }
        }
        
        // Check withdrawable balance
        const infoAfterClaim = await client.getMyVoterInfo();
        if (infoAfterClaim) {
            console.log('   Withdrawable Balance:', infoAfterClaim.withdrawableBalance, 'ALTH');
            
            // Step 2: Claim withdrawable tokens → sends actual tokens to wallet
            if (parseFloat(infoAfterClaim.withdrawableBalance) > 0) {
                console.log('   Step 2: Claiming tokens to wallet...');
                const tokensClaimed = await client.claimWithdrawableTokens();
                if (tokensClaimed) {
                    console.log('   ✅ Tokens sent to wallet!');
                }
            }
        }

        // =====================================================================
        // STEP 7: Stake Management
        // =====================================================================
        
        console.log('\n📈 Adding additional stake...');
        
        const stakeAdded = await client.addStake('100');
        if (stakeAdded) {
            console.log('   ✅ Added 100 ALTH to stake');
        }

        // Check updated stake
        const updatedInfo = await client.getMyVoterInfo();
        if (updatedInfo) {
            console.log('   New Total Stake:', updatedInfo.stake, 'ALTH');
        }

        // =====================================================================
        // STEP 8: Get Protocol Statistics
        // =====================================================================
        
        console.log('\n📊 Protocol Statistics:');
        
        const stats = await client.getStatistics();
        console.log('   Total Voters:', stats.totalVoters);
        console.log('   Active Voters:', stats.activeVoters);
        console.log('   Total Stake:', stats.totalStake, 'ALTH');
        console.log('   Queries Created:', stats.totalQueriesCreated);
        console.log('   Queries Resolved:', stats.totalQueriesResolved);
        console.log('   Resolution Rate:', stats.resolutionRate + '%');
        console.log('   Protocol Status:', stats.protocolStatus);

    } catch (error) {
        // =====================================================================
        // ERROR HANDLING
        // =====================================================================
        
        if (error instanceof ValidationError) {
            console.error('\n❌ Validation error:', error.message);
        } else if (error instanceof VoterNotRegisteredError) {
            console.error('\n❌ Voter not registered. Please register first.');
        } else if (error instanceof InsufficientStakeError) {
            console.error('\n❌ Insufficient stake for this operation.');
        } else if (error instanceof NetworkError) {
            console.error('\n❌ Network error:', error.message);
        } else {
            console.error('\n❌ Unexpected error:', error);
        }
        process.exit(1);
    }

    console.log('\n✨ Done!');
}

// =========================================================================
// COMMIT-REVEAL VOTING EXAMPLE
// =========================================================================

/**
 * Example: Commit-Reveal voting process
 * 
 * Phase 1: Commit a hash of your vote (nobody can see your vote)
 * Phase 2: Reveal your actual vote (after commit phase ends)
 * 
 * @internal
 */
async function commitRevealVotingExample(client: InternalDashboardClient, queryId: number) {
    // Generate a random salt for commit
    const salt = generateRandomSalt();
    const voteValue = 'Yes';
    
    // Phase 1: Commit
    console.log('Phase 1: Committing vote...');
    const commitHash = generateCommitHash(voteValue, salt);
    
    await client.commitVote({
        queryId: queryId,
        commitHash: commitHash,
    });
    console.log('Commit submitted. Hash:', commitHash);
    
    // Wait for reveal phase (in production, monitor query phase)
    console.log('Waiting for reveal phase...');
    
    // Phase 2: Reveal
    console.log('Phase 2: Revealing vote...');
    
    await client.revealVote({
        queryId: queryId,
        value: voteValue,
        salt: salt,
        confidence: 90,
    });
    console.log('Vote revealed successfully!');
}

// Helper functions (implement using crypto library)
function generateRandomSalt(): string {
    return Math.random().toString(36).substring(2, 15);
}

function generateCommitHash(value: string, salt: string): string {
    // In production, use SHA256: sha256(value + salt)
    // This is a placeholder
    return `hash_${value}_${salt}`;
}

// Run the example
main().catch(console.error);
