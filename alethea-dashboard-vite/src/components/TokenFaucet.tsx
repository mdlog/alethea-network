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
const INBOX_PROCESSOR_URL = import.meta.env.VITE_INBOX_PROCESSOR_URL || '';
// Treasury owner is the admin that holds the initial token supply
// Conway Testnet Deployment (2026-01-31)
const TREASURY_OWNER = import.meta.env.VITE_ADMIN_OWNER || '0xf53bade3e76939a3ede4a22993d877fdbabe5394b98a6b83cdfbac9f317e6ca7';

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
            // Normalize owner address for balance query
            const userOwner = (owner?.startsWith('0x') ? owner : `0x${owner}`).toLowerCase();

            console.log('📥 Querying balance via WASM to trigger inbox processing...');

            // Query via WASM - this triggers inbox processing on user's chain
            // Updated query format for new token contract
            const balanceQuery = `{ balance(owner: "${userOwner}") }`;
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

            // LINERA STANDARD: Transfer to owner address (AccountOwner)
            const transferMutation = `mutation { 
                transfer(
                    owner: "${treasuryOwner}",
                    amount: "${MINT_AMOUNT}.",
                    targetChain: "${chainId}",
                    targetOwner: "${userOwner}"
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

            // STEP 2: Wait for cross-chain message to propagate
            setStep('Waiting for cross-chain message (8s)...');
            await new Promise(resolve => setTimeout(resolve, 8000));

            // STEP 3: Process inbox on user chain via multiple methods
            setStep('Processing inbox...');
            console.log('📥 Processing inbox for user chain:', chainId);

            let inboxSuccess = false;

            // Method 1: Try backend inbox processor with more retries
            const inboxEndpoint = INBOX_PROCESSOR_URL
                ? `${INBOX_PROCESSOR_URL}/process-inbox-retry`
                : '/process-inbox-retry';

            console.log('📥 Using inbox endpoint:', inboxEndpoint);

            for (let i = 0; i < 5; i++) {
                try {
                    console.log(`📥 Inbox attempt ${i + 1}/5...`);
                    setStep(`Processing inbox (attempt ${i + 1}/5)...`);

                    const inboxResponse = await fetch(inboxEndpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chainId: chainId,
                            maxRetries: 5,
                            delayMs: 3000
                        }),
                    });
                    const inboxResult = await inboxResponse.json();
                    console.log('📥 Backend inbox result:', inboxResult);

                    if (inboxResult.success) {
                        const processed = inboxResult.data?.processInbox;
                        if (processed && processed.length > 0) {
                            console.log('✅ Messages processed:', processed.length);
                            inboxSuccess = true;
                            break;
                        } else {
                            console.log('⏳ No messages yet, waiting...');
                            await new Promise(resolve => setTimeout(resolve, 4000));
                        }
                    }
                } catch (backendErr) {
                    console.warn('⚠️ Backend inbox processor error:', backendErr);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }

            // Method 2: Try direct HTTP inbox processing via Linera service
            if (!inboxSuccess) {
                console.log('📥 Trying direct HTTP inbox processing...');
                setStep('Trying alternative inbox processing...');

                try {
                    const directInboxUrl = `${SERVICE_URL}/chains/${chainId}/applications/${TOKEN_APP_ID}`;
                    const inboxMutation = `mutation { processInbox }`;

                    const directResponse = await fetch(directInboxUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
                        body: JSON.stringify({ query: inboxMutation }),
                    });

                    if (directResponse.ok) {
                        const directResult = await directResponse.json();
                        console.log('📥 Direct HTTP inbox result:', directResult);
                        if (directResult.data?.processInbox) {
                            inboxSuccess = true;
                        }
                    }
                } catch (directErr) {
                    console.warn('⚠️ Direct HTTP inbox failed:', directErr);
                }
            }

            if (!inboxSuccess) {
                console.log('⚠️ Inbox processing may have failed. Validators might be experiencing issues.');
                console.log('⚠️ Token transfer was sent - click Refresh Balance to receive tokens.');
            }

            // STEP 4: Receive tokens via WASM query
            setStep('Receiving tokens...');

            if (tokenApplication) {
                console.log('📥 Querying balance via WASM to receive tokens...');
                // Updated query format for new token contract
                const balanceQuery = `{ balance(owner: "${userOwner}") }`;

                // Multiple queries to ensure inbox is processed
                // WASM query automatically processes inbox on user's chain
                for (let i = 0; i < 5; i++) {
                    try {
                        const balanceResponse = await tokenApplication.query(JSON.stringify({ query: balanceQuery }));
                        console.log(`📥 Balance query ${i + 1}:`, balanceResponse);

                        const queryResult = typeof balanceResponse === 'string' ? JSON.parse(balanceResponse) : balanceResponse;
                        const currentBalance = queryResult?.data?.balance || '0';
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
        <div className="card p-6 border-alethea-200 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-alethea-50 via-transparent to-cyber-50" />
            <div className="relative flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-alethea-50 rounded-xl flex items-center justify-center">
                    <Droplets className="w-6 h-6 text-alethea-600" />
                </div>
                <div>
                    <h3 className="font-bold text-black">ALTH Token Faucet</h3>
                    <p className="text-sm text-grey-600">Request free tokens for testing</p>
                </div>
            </div>

            <div className="relative bg-grey-50 border border-grey-100 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                    <span className="text-grey-600">Amount per request</span>
                    <span className="text-xl font-bold text-alethea-600">
                        {MINT_AMOUNT} ALTH
                    </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                    <span className="text-grey-600">Cooldown</span>
                    <span className="text-sm text-grey-600">{COOLDOWN_HOURS} hours</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                    <span className="text-grey-600">WASM Status</span>
                    <span className={`text-sm ${isWasmReady ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {isWasmReady ? '✓ Connected' : '⏳ Connecting...'}
                    </span>
                </div>
            </div>

            {/* Progress indicator */}
            {step && (
                <div className="relative flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    <p className="text-sm text-blue-700">{step}</p>
                </div>
            )}

            {!canMint && timeRemaining && (
                <div className="relative flex items-center gap-2 p-3 bg-grey-50 border border-grey-100 rounded-lg mb-4">
                    <Clock className="w-4 h-4 text-grey-600" />
                    <p className="text-sm text-grey-600">
                        Next request in: <strong className="text-black">{timeRemaining}</strong>
                    </p>
                </div>
            )}

            {!isWasmReady && (
                <div className="relative flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <p className="text-sm text-amber-700">
                        Waiting for WASM connection to receive tokens...
                    </p>
                </div>
            )}

            {error && (
                <div className="relative flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {success && (
                <div className="relative flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg mb-4">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <div className="text-sm text-emerald-700">
                        <p className="font-medium">Tokens sent!</p>
                        <p className="text-xs mt-1 text-emerald-600">Click "Refresh Balance" to receive {MINT_AMOUNT} ALTH.</p>
                        <p className="text-xs mt-1 text-emerald-500">If balance shows 0, wait 1-2 minutes and refresh again.</p>
                    </div>
                </div>
            )}

            <div className="relative space-y-2">
                {/* Main request button */}
                <button
                    onClick={handleMint}
                    disabled={minting || !canMint}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${canMint && !minting
                        ? 'btn-primary'
                        : 'bg-grey-50 text-grey-600 cursor-not-allowed'
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
                    className="w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 bg-grey-50 text-grey-700 hover:bg-grey-100 border border-grey-100 disabled:opacity-50"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh Balance (Receive Tokens)
                </button>
            </div>

            <p className="relative text-xs text-grey-600 mt-3 text-center">
                After requesting, click "Refresh Balance" to receive tokens.
            </p>

            {/* Debug: Show chain ID for troubleshooting */}
            <div className="relative mt-4 pt-4 border-t border-grey-100">
                <details className="text-xs">
                    <summary className="text-grey-600 cursor-pointer hover:text-grey-700">
                        Debug Info (click to expand)
                    </summary>
                    <div className="mt-2 p-2 bg-grey-50 rounded text-grey-600 space-y-1">
                        <p><strong className="text-grey-700">Your Chain ID:</strong></p>
                        <p className="font-mono text-[10px] break-all bg-white p-1 rounded border border-grey-100 text-grey-600">
                            {chainId || 'Not connected'}
                        </p>
                        <p><strong className="text-grey-700">Owner:</strong></p>
                        <p className="font-mono text-[10px] break-all bg-white p-1 rounded border border-grey-100 text-grey-600">
                            {owner || 'Not connected'}
                        </p>
                        <p><strong className="text-grey-700">Inbox Processor:</strong></p>
                        <p className="font-mono text-[10px] break-all bg-white p-1 rounded border border-grey-100 text-grey-600">
                            {INBOX_PROCESSOR_URL || 'Local (Vite proxy)'}
                        </p>
                        <button
                            onClick={async () => {
                                if (!chainId) return;
                                setStep('Force processing inbox...');
                                try {
                                    // Use INBOX_PROCESSOR_URL if set, otherwise use Vite proxy
                                    const inboxEndpoint = INBOX_PROCESSOR_URL
                                        ? `${INBOX_PROCESSOR_URL}/process-inbox`
                                        : '/inbox';

                                    console.log('📥 Force processing via:', inboxEndpoint);

                                    let resp;
                                    if (INBOX_PROCESSOR_URL) {
                                        // Direct call to inbox processor
                                        resp = await fetch(inboxEndpoint, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ chainId })
                                        });
                                    } else {
                                        // Via Vite proxy to Linera service
                                        resp = await fetch(inboxEndpoint, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                query: `mutation { processInbox(chainId: "${chainId}") }`
                                            })
                                        });
                                    }

                                    const result = await resp.json();
                                    console.log('📥 Force inbox result:', result);
                                    alert('Inbox processed! Check console for details. Result: ' + JSON.stringify(result));
                                    await refreshBalance();
                                } catch (err) {
                                    console.error('Force inbox failed:', err);
                                    alert('Failed: ' + (err instanceof Error ? err.message : String(err)));
                                }
                                setStep('');
                            }}
                            className="mt-2 w-full py-1 px-2 bg-amber-50 text-amber-600 rounded text-xs hover:bg-amber-100 border border-amber-200"
                        >
                            Force Process Inbox
                        </button>
                    </div>
                </details>
            </div>
        </div>
    );
}
