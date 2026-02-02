import { useState, useEffect } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { useToken } from '../contexts/TokenContext';
import {
    Droplets,
    Loader2,
    CheckCircle,
    AlertCircle,
    Clock,
    RefreshCw,
} from 'lucide-react';

const TOKEN_APP_ID = import.meta.env.VITE_TOKEN_APP_ID || '';
const TOKEN_CHAIN_ID = import.meta.env.VITE_TOKEN_CHAIN_ID || import.meta.env.VITE_CHAIN_ID;
const SERVICE_URL = import.meta.env.VITE_SERVICE_URL || '';
const TREASURY_OWNER = import.meta.env.VITE_TREASURY_OWNER || '0x97f8b39f99b4097e4f05961d3a93539dbcd99851091809eaf7588d74123649b4';

// Faucet settings
const MINT_AMOUNT = 1000;
const COOLDOWN_HOURS = 24;

interface TokenFaucetProps {
    onSuccess?: () => void;
}

export default function TokenFaucet({ onSuccess }: TokenFaucetProps) {
    const { owner, chainId, status, tokenApplication } = useLinera();
    const { refreshBalance } = useToken();
    const [minting, setMinting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [lastMint, setLastMint] = useState<number | null>(null);
    const [canMint, setCanMint] = useState(true);
    const [timeRemaining, setTimeRemaining] = useState<string>('');
    const [step, setStep] = useState<string>('');

    useEffect(() => {
        if (chainId) {
            const stored = localStorage.getItem(`token_mint_${chainId}`);
            if (stored) {
                const lastMintTime = parseInt(stored);
                setLastMint(lastMintTime);

                const now = Date.now();
                const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
                const nextMintTime = lastMintTime + cooldownMs;

                if (now < nextMintTime) {
                    setCanMint(false);
                    updateTimeRemaining(nextMintTime);
                }
            }
        }
    }, [chainId]);

    useEffect(() => {
        if (!canMint && lastMint) {
            const interval = setInterval(() => {
                const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
                const nextMintTime = lastMint + cooldownMs;
                const now = Date.now();

                if (now >= nextMintTime) {
                    setCanMint(true);
                    setTimeRemaining('');
                    clearInterval(interval);
                } else {
                    updateTimeRemaining(nextMintTime);
                }
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [canMint, lastMint]);

    const updateTimeRemaining = (nextMintTime: number) => {
        const now = Date.now();
        const remaining = nextMintTime - now;

        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((remaining % (60 * 1000)) / 1000);

        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    };

    // Refresh balance via WASM - triggers inbox processing on user chain
    const handleRefreshBalance = async () => {
        if (!chainId || !tokenApplication) {
            setError('Wallet not connected');
            return;
        }

        setStep('Syncing with blockchain...');
        setError(null);

        try {
            // Normalize owner address
            const userOwner = (owner?.startsWith('0x') ? owner : `0x${owner}`).toLowerCase();

            console.log('📥 Querying balance via WASM to trigger inbox processing...');

            // Query via WASM - this triggers inbox processing on user's chain
            const balanceQuery = `{ accounts { entry(key: "${userOwner}") { value } } }`;
            const response = await tokenApplication.query(JSON.stringify({ query: balanceQuery }));
            console.log('📥 WASM balance response:', response);

            await refreshBalance();
            setStep('');
        } catch (err) {
            console.error('Refresh failed:', err);
            setError('Failed to sync. Please try again.');
            setStep('');
        }
    };

    const handleMint = async () => {
        if (!owner || !chainId || !TOKEN_APP_ID || !canMint) return;

        setMinting(true);
        setError(null);
        setSuccess(false);

        try {
            // Normalize addresses
            const userOwner = (owner.startsWith('0x') ? owner : `0x${owner}`).toLowerCase();
            const treasuryOwner = TREASURY_OWNER.toLowerCase();

            console.log('═══════════════════════════════════════════════════════════');
            console.log('🪙 Requesting ALTH tokens from treasury');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('  Treasury owner:', treasuryOwner);
            console.log('  Treasury chain:', TOKEN_CHAIN_ID);
            console.log('  User owner:', userOwner);
            console.log('  User chain:', chainId);
            console.log('  Amount:', MINT_AMOUNT);

            // STEP 1: Transfer from treasury to user via HTTP
            // HTTP service can propose blocks on treasury chain (service owns it)
            setStep('Transferring tokens from treasury...');

            const treasuryTokenUrl = `${SERVICE_URL}/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID}`;

            const transferMutation = `mutation { 
                transfer(
                    owner: "${treasuryOwner}",
                    amount: "${MINT_AMOUNT}.",
                    targetAccount: {
                        chainId: "${chainId}",
                        owner: "${userOwner}"
                    }
                )
            }`;

            console.log('📤 Transfer mutation:', transferMutation);

            const response = await fetch(treasuryTokenUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: transferMutation }),
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Transfer failed: ${response.status} - ${text}`);
            }

            const result = await response.json();
            console.log('📥 Transfer response:', result);

            if (result.errors?.length > 0) {
                throw new Error(result.errors[0].message);
            }

            console.log('✅ Transfer initiated from treasury!');

            // STEP 2: Wait for cross-chain message
            setStep('Waiting for cross-chain message...');
            await new Promise(resolve => setTimeout(resolve, 2000));

            // STEP 3: Process inbox on user chain via HTTP
            setStep('Processing inbox...');
            console.log('📥 Processing inbox for user chain:', chainId);

            try {
                const inboxResponse = await fetch('/inbox', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: `mutation { processInbox(chainId: "${chainId}") }`,
                    }),
                });
                const inboxResult = await inboxResponse.json();
                console.log('📥 Inbox result:', inboxResult);
            } catch (inboxErr) {
                console.warn('⚠️ Inbox processing warning:', inboxErr);
            }

            // STEP 4: Receive tokens via WASM query
            setStep('Receiving tokens...');

            if (tokenApplication) {
                console.log('📥 Querying balance via WASM to receive tokens...');
                const balanceQuery = `{ accounts { entry(key: "${userOwner}") { value } } }`;

                // Multiple queries to ensure inbox is processed
                // WASM query automatically processes inbox on user's chain
                for (let i = 0; i < 5; i++) {
                    try {
                        const balanceResponse = await tokenApplication.query(JSON.stringify({ query: balanceQuery }));
                        console.log(`📥 Balance query ${i + 1}:`, balanceResponse);

                        const queryResult = typeof balanceResponse === 'string' ? JSON.parse(balanceResponse) : balanceResponse;
                        const currentBalance = queryResult?.data?.accounts?.entry?.value || '0';
                        const balNum = parseFloat(currentBalance.replace(/\.$/, '')) || 0;

                        if (balNum > 0) {
                            console.log('✅ Tokens received! Balance:', currentBalance);
                            break;
                        }

                        await new Promise(resolve => setTimeout(resolve, 2000));
                    } catch (err) {
                        console.warn(`⚠️ Balance query ${i + 1} failed:`, err);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            } else {
                console.warn('⚠️ WASM not ready - click Refresh Balance to receive tokens');
            }

            // Save mint time (cooldown starts now)
            const now = Date.now();
            localStorage.setItem(`token_mint_${chainId}`, now.toString());
            setLastMint(now);
            setCanMint(false);

            await refreshBalance();

            setSuccess(true);
            setStep('');

            if (onSuccess) {
                setTimeout(() => onSuccess(), 1000);
            }
        } catch (err) {
            console.error('❌ Token request failed:', err);
            setError(err instanceof Error ? err.message : 'Failed to request tokens');
            setStep('');
        } finally {
            setMinting(false);
        }
    };

    if (status !== 'Ready' || !TOKEN_APP_ID) {
        return null;
    }

    const isWasmReady = !!tokenApplication;

    return (
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                    <Droplets className="w-6 h-6 text-cyan-600" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900">ALTH Token Faucet</h3>
                    <p className="text-sm text-gray-500">Request free tokens for testing</p>
                </div>
            </div>

            <div className="bg-white/60 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                    <span className="text-gray-600">Amount per request</span>
                    <span className="text-xl font-bold text-cyan-700">
                        {MINT_AMOUNT} ALTH
                    </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                    <span className="text-gray-600">Cooldown</span>
                    <span className="text-sm text-gray-500">{COOLDOWN_HOURS} hours</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                    <span className="text-gray-600">WASM Status</span>
                    <span className={`text-sm ${isWasmReady ? 'text-green-600' : 'text-amber-600'}`}>
                        {isWasmReady ? '✓ Connected' : '⏳ Connecting...'}
                    </span>
                </div>
            </div>

            {/* Progress indicator */}
            {step && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    <p className="text-sm text-blue-700">{step}</p>
                </div>
            )}

            {!canMint && timeRemaining && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg mb-4">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <p className="text-sm text-gray-600">
                        Next request in: <strong>{timeRemaining}</strong>
                    </p>
                </div>
            )}

            {!isWasmReady && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <p className="text-sm text-amber-700">
                        Waiting for WASM connection to receive tokens...
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
                        <p className="font-medium">Tokens sent! 🎉</p>
                        <p className="text-xs mt-1">Click "Refresh Balance" to receive {MINT_AMOUNT} ALTH.</p>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {/* Main request button */}
                <button
                    onClick={handleMint}
                    disabled={minting || !canMint}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${canMint && !minting
                        ? 'bg-cyan-600 text-white hover:bg-cyan-700'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                >
                    {minting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Requesting tokens...
                        </>
                    ) : (
                        <>
                            <Droplets className="w-4 h-4" />
                            {canMint ? 'Request ALTH Tokens' : 'Already Requested'}
                        </>
                    )}
                </button>

                {/* Refresh balance button - important for receiving cross-chain tokens */}
                <button
                    onClick={handleRefreshBalance}
                    disabled={minting || !isWasmReady}
                    className="w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh Balance (Receive Tokens)
                </button>
            </div>

            <p className="text-xs text-gray-500 mt-3 text-center">
                After requesting, click "Refresh Balance" to receive tokens.
            </p>
        </div>
    );
}
