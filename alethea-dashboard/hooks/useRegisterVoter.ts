// React Hook for Voter Registration with Polling

import { useState } from 'react';
import { oracleApi } from '@/lib/api/oracleApi';

export type RegistrationStatus =
    | 'idle'
    | 'submitting'
    | 'pending'
    | 'confirming'
    | 'confirmed'
    | 'timeout'
    | 'error';

interface UseRegisterVoterResult {
    status: RegistrationStatus;
    certificateHash: string | null;
    error: string | null;
    progress: number;
    register: (address: string, stake: string, name: string) => Promise<void>;
    reset: () => void;
}

export function useRegisterVoter(): UseRegisterVoterResult {
    const [status, setStatus] = useState<RegistrationStatus>('idle');
    const [certificateHash, setCertificateHash] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    const register = async (address: string, stake: string, name: string) => {
        try {
            // Step 1: Submit
            setStatus('submitting');
            setError(null);
            setProgress(0);

            const result = await oracleApi.registerVoter(address, stake, name);

            setCertificateHash(result.certificateHash || null);

            // Step 2: Pending
            setStatus('pending');

            // Wait a moment before polling
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Step 3: Poll for confirmation
            setStatus('confirming');

            const confirmed = await oracleApi.pollForVoterConfirmation(address, {
                timeout: 300000,  // 5 minutes
                interval: 3000,   // 3 seconds
                onProgress: (elapsed) => {
                    // Update progress (0-100%)
                    const progressPercent = Math.min((elapsed / 300000) * 100, 100);
                    setProgress(progressPercent);
                }
            });

            // Step 4: Result
            if (confirmed) {
                setStatus('confirmed');
                setProgress(100);
            } else {
                setStatus('timeout');
                setProgress(100);
            }

        } catch (err) {
            setStatus('error');
            setError(err instanceof Error ? err.message : 'Registration failed');
        }
    };

    const reset = () => {
        setStatus('idle');
        setCertificateHash(null);
        setError(null);
        setProgress(0);
    };

    return {
        status,
        certificateHash,
        error,
        progress,
        register,
        reset
    };
}
