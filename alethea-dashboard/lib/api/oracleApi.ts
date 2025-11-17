// Oracle API Client with Polling Support

interface OperationResult {
    success: boolean;
    certificateHash?: string;
    message: string;
}

interface PollOptions {
    timeout?: number;      // Default: 300000 (5 minutes)
    interval?: number;     // Default: 3000 (3 seconds)
    onProgress?: (elapsed: number) => void;
}

export class OracleAPI {
    private baseUrl: string;
    private graphqlUrl: string;

    constructor(baseUrl: string, graphqlUrl: string) {
        this.baseUrl = baseUrl;
        this.graphqlUrl = graphqlUrl;
    }

    // Register voter via backend
    async registerVoter(
        address: string,
        stake: string,
        name: string
    ): Promise<OperationResult> {
        const response = await fetch(`${this.baseUrl}/api/transaction/register-voter`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voter_address: address, stake, name })
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Registration failed');
        }

        return {
            success: true,
            certificateHash: result.data?.certificate_hash,
            message: result.data?.message || 'Registration submitted'
        };
    }

    // Check if voter exists
    async checkVoter(address: string): Promise<boolean> {
        const query = `
      query {
        voter(address: "${address}") {
          address
        }
      }
    `;

        try {
            const response = await fetch(this.graphqlUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            const result = await response.json();
            return result.data?.voter !== null;
        } catch (error) {
            console.error('Error checking voter:', error);
            return false;
        }
    }

    // Poll for voter confirmation
    async pollForVoterConfirmation(
        address: string,
        options: PollOptions = {}
    ): Promise<boolean> {
        const {
            timeout = 300000,    // 5 minutes
            interval = 3000,     // 3 seconds
            onProgress
        } = options;

        const startTime = Date.now();
        const maxAttempts = Math.floor(timeout / interval);

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const elapsed = Date.now() - startTime;

            if (onProgress) {
                onProgress(elapsed);
            }

            // Check if voter exists
            const exists = await this.checkVoter(address);

            if (exists) {
                return true; // Confirmed!
            }

            // Wait before next attempt
            await new Promise(resolve => setTimeout(resolve, interval));
        }

        return false; // Timeout
    }

    // Get voter details
    async getVoter(address: string) {
        const query = `
      query {
        voter(address: "${address}") {
          address
          name
          stake
          reputation
          isActive
        }
      }
    `;

        try {
            const response = await fetch(this.graphqlUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            const result = await response.json();
            return result.data?.voter;
        } catch (error) {
            console.error('Error getting voter:', error);
            return null;
        }
    }

    // Get voter count
    async getVoterCount(): Promise<number> {
        const query = `
      query {
        voterCount
      }
    `;

        try {
            const response = await fetch(this.graphqlUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            const result = await response.json();
            return result.data?.voterCount || 0;
        } catch (error) {
            console.error('Error getting voter count:', error);
            return 0;
        }
    }
}

// Export singleton instance
export const oracleApi = new OracleAPI(
    process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001',
    process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8080'
);
