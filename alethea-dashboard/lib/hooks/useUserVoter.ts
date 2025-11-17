import { useState, useEffect } from 'react';
import { queryGraphQL } from '@/lib/graphql';

/**
 * Hook to check if the current user is already a registered voter
 * @returns Object containing isUserVoter boolean and loading state
 */
export function useUserVoter() {
    const [isUserVoter, setIsUserVoter] = useState(false);
    const [loading, setLoading] = useState(true);
    const [userVoterId, setUserVoterId] = useState<string | null>(null);

    useEffect(() => {
        checkUserVoter();
    }, []);

    const checkUserVoter = async () => {
        setLoading(true);
        try {
            // Get current user's address from the chain
            // In Linera, we can query the current chain owner
            const chainInfo = await queryGraphQL(`
                query {
                    chain {
                        chainId
                        owner
                    }
                }
            `, 'registry').catch(() => null);

            if (!chainInfo?.chain?.owner) {
                setIsUserVoter(false);
                setLoading(false);
                return;
            }

            const userAddress = chainInfo.chain.owner;

            // Query the voter leaderboard to check if user is registered
            const result = await queryGraphQL(`
                query {
                    voterLeaderboard(limit: 1000) {
                        voterApp
                        reputationScore
                        totalVotes
                    }
                }
            `, 'registry');

            if (result?.voterLeaderboard && Array.isArray(result.voterLeaderboard)) {
                // Check if any voter matches the user's address
                const userVoter = result.voterLeaderboard.find(
                    (v: any) => v.voterApp === userAddress
                );

                if (userVoter) {
                    setIsUserVoter(true);
                    setUserVoterId(userVoter.voterApp);
                } else {
                    setIsUserVoter(false);
                    setUserVoterId(null);
                }
            } else {
                setIsUserVoter(false);
                setUserVoterId(null);
            }
        } catch (error) {
            console.error('Error checking user voter status:', error);
            setIsUserVoter(false);
            setUserVoterId(null);
        } finally {
            setLoading(false);
        }
    };

    return {
        isUserVoter,
        loading,
        userVoterId,
        refetch: checkUserVoter,
    };
}
