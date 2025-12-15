import { useState, useEffect } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { useToken } from '../contexts/TokenContext';
import {
    Droplets,
    Loader2,
    CheckCircle,
    AlertCircle,
    Clock,
} from 'lucide-react';

const TOKEN_APP_ID = import.meta.env.VITE_TOKEN_APP_ID || '';
const TOKEN_CHAIN_ID =
    import.meta.env.VITE_TOKEN_CHAIN_ID || import.meta.env.VITE_CHAIN_ID;
// Use relative URL for Vite proxy, or explicit URL if set
const SERVICE_URL = import.meta.env.VITE_SERVICE_URL || '';

// Faucet settings
const FAUCET_AMOUNT = 1000; // Amount per claim
const COOLDOWN_HOURS = 24; // Hours between claims

// Admin/Treasury address that holds tokens for faucet
const FAUCET_ADMIN = '0x403bc4052a40835697d74411322cec087a55a7fb81a791ed7a590e7cfd5f612a';

interface TokenFaucetProps {
    onSuccess?: () => void;
}

export default function TokenFaucet({ onSuccess }: TokenFaucetProps) {
    const { owner, status } = useLinera();
    const { refreshBalance } = useToken();
    const [claiming, setClaiming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [lastClaim, setLastClaim] = useState<number | null>(null);
    const [canClaim, setCanClaim] = useState(true);
    const [timeRemaining, setTimeRemaining] = useState<string>('');

    // Check last claim time from localStorage
    useEffect(() => {
        if (owner) {
            const stored = localStorage.getItem(`faucet_${owner}`);
            if (stored) {
                const lastClaimTime = parseInt(stored);
                setLastClaim(lastClaimTime);

                const now = Date.now();
                const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
                const nextClaimTime = lastClaimTime + cooldownMs;

                if (now < nextClaimTime) {
                    setCanClaim(false);
                    updateTimeRemaining(nextClaimTime);
                }
            }
        }
    }, [owner]);

    // Update countdown timer
    useEffect(() => {
        if (!canClaim && lastClaim) {
            const interval = setInterval(() => {
                const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
                const nextClaimTime = lastClaim + cooldownMs;
                const now = Date.now();

                if (now >= nextClaimTime) {
                    setCanClaim(true);
                    setTimeRemaining('');
                    clearInterval(interval);
                } else {
                    updateTimeRemaining(nextClaimTime);
                }
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [canClaim, lastClaim]);

    const updateTimeRemaining = (nextClaimTime: number) => {
        const now = Date.now();
        const remaining = nextClaimTime - now;

        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((remaining % (60 * 1000)) / 1000);

        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    };

    const handleClaim = async () => {
        if (!owner || !TOKEN_APP_ID || !canClaim) return;

        setClaiming(true);
        setError(null);
        setSuccess(false);

        try {
            console.log('🚰 Auto-transferring faucet tokens...');
            console.log('  From:', FAUCET_ADMIN);
            console.log('  To:', owner);
            console.log('  Amount:', FAUCET_AMOUNT);

            // Direct transfer from admin to user via HTTP
            const graphqlUrl = `${SERVICE_URL}/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID}`;

            const response = await fetch(graphqlUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Bypass-Tunnel-Reminder': 'true',
                },
                body: JSON.stringify({
                    query: `mutation { 
                        transfer(
                            owner: "${FAUCET_ADMIN}",
                            amount: "${FAUCET_AMOUNT}.",
                            targetChain: "${TOKEN_CHAIN_ID}",
                            targetOwner: "${owner}"
                        )
                    }`,
                }),
            });

            // Check if response is ok
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Server error: ${response.status} - ${text || 'No response'}`);
            }

            // Try to parse JSON, handle empty response
            const text = await response.text();
            if (!text) {
                throw new Error('Empty response from server');
            }

            const result = JSON.parse(text);
            console.log('Faucet response:', result);

            if (result.errors?.length > 0) {
                throw new Error(result.errors[0].message);
            }

            console.log('✅ Faucet tokens transferred!', result.data);

            // Save claim time
            const now = Date.now();
            localStorage.setItem(`faucet_${owner}`, now.toString());
            setLastClaim(now);
            setCanClaim(false);
            setSuccess(true);

            // Refresh header balance
            await refreshBalance();

            if (onSuccess) {
                setTimeout(() => onSuccess(), 1500);
            }
        } catch (err) {
            console.error('❌ Faucet claim failed:', err);
            setError(err instanceof Error ? err.message : 'Failed to claim tokens');
        } finally {
            setClaiming(false);
        }
    };

    if (status !== 'Ready' || !TOKEN_APP_ID) {
        return null;
    }

    return (
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                    <Droplets className="w-6 h-6 text-cyan-600" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900">ALTH Testnet Faucet</h3>
                    <p className="text-sm text-gray-500">Get free tokens for testing</p>
                </div>
            </div>

            <div className="bg-white/60 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                    <span className="text-gray-600">Amount per request</span>
                    <span className="text-xl font-bold text-cyan-700">
                        {FAUCET_AMOUNT} ALTH
                    </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                    <span className="text-gray-600">Cooldown</span>
                    <span className="text-sm text-gray-500">{COOLDOWN_HOURS} hours</span>
                </div>
            </div>

            {!canClaim && timeRemaining && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <p className="text-sm text-amber-700">
                        Next request available in: <strong>{timeRemaining}</strong>
                    </p>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {success && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <div className="text-sm text-green-700">
                        <p className="font-medium">Tokens received! 🎉</p>
                        <p className="text-xs mt-1">
                            {FAUCET_AMOUNT} ALTH has been sent to your wallet.
                        </p>
                    </div>
                </div>
            )}

            <button
                onClick={handleClaim}
                disabled={claiming || !canClaim}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${canClaim
                    ? 'bg-cyan-600 text-white hover:bg-cyan-700'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
            >
                {claiming ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending tokens...
                    </>
                ) : (
                    <>
                        <Droplets className="w-4 h-4" />
                        {canClaim ? 'Request ALTH Tokens' : 'Already Claimed'}
                    </>
                )}
            </button>

            <p className="text-xs text-gray-500 mt-3 text-center">
                Testnet tokens have no real value and are for testing only.
            </p>
        </div>
    );
}
