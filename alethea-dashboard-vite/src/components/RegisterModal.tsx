import { useState, useEffect } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { X, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

const TOKEN_APP_ID = import.meta.env.VITE_TOKEN_APP_ID || '';
const SERVICE_URL = import.meta.env.VITE_SERVICE_URL || '';
const REGISTRY_CHAIN_ID = import.meta.env.VITE_CHAIN_ID || '';
const REGISTRY_APP_ID = import.meta.env.VITE_REGISTRY_APP_ID || '';

interface RegisterModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

async function processChainInbox(targetChainId: string, maxRetries = 5, delayMs = 2000): Promise<boolean> {
    const url = SERVICE_URL || '/inbox';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `mutation { processInbox(chainId: "${targetChainId}") }`,
                }),
            });

            if (!response.ok) {
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    continue;
                }
                return false;
            }

            const result = await response.json();
            if (result.errors?.length > 0) {
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    continue;
                }
                return false;
            }
            return true;
        } catch (err) {
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }
    return false;
}

async function processRegistryInbox(maxRetries = 5, delayMs = 2000): Promise<boolean> {
    // Use /inbox which proxies to root endpoint at localhost:8080
    const url = SERVICE_URL || '/inbox';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`📥 Process registry inbox attempt ${attempt}/${maxRetries}...`);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `mutation { processInbox(chainId: "${REGISTRY_CHAIN_ID}") }`,
                }),
            });

            if (!response.ok) {
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    continue;
                }
                return false;
            }

            const result = await response.json();

            if (result.errors?.length > 0) {
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delayMs * 2));
                    continue;
                }
                return false;
            }

            console.log(`✅ Registry inbox processed`);
            return true;
        } catch (err) {
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }
    return false;
}

export default function RegisterModal({ onClose, onSuccess }: RegisterModalProps) {
    const { chainId, owner, tokenApplication, executeTokenMutation } = useLinera();
    const [balance, setBalance] = useState<number>(0);
    const [stake, setStake] = useState('100');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingBalance, setLoadingBalance] = useState(false);
    const [step, setStep] = useState<string>('');

    const stakeAmount = parseFloat(stake) || 0;
    const hasEnoughTokens = balance >= stakeAmount;
    const isWasmReady = !!tokenApplication;

    // Load balance using HTTP query
    const loadBalance = async () => {
        if (!TOKEN_APP_ID || !owner || !chainId) {
            console.log('⚠️ RegisterModal: Missing required data', { TOKEN_APP_ID, owner, chainId });
            return;
        }

        setLoadingBalance(true);
        try {
            // Query balance via HTTP
            const graphqlUrl = `${SERVICE_URL}/chains/${chainId}/applications/${TOKEN_APP_ID}`;

            // LINERA STANDARD: Use owner address (AccountOwner)
            const queryOwner = (owner.startsWith('0x') ? owner : `0x${owner}`).toLowerCase();

            console.log('🔍 RegisterModal: Loading balance');
            console.log('   Chain ID:', chainId);
            console.log('   Owner:', owner);
            console.log('   Query Owner:', queryOwner);
            console.log('   GraphQL URL:', graphqlUrl);

            const response = await fetch(graphqlUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `query { balance(owner: "${queryOwner}") }`
                }),
            });

            if (response.ok) {
                const result = await response.json();
                console.log('📊 RegisterModal: Balance response:', result);

                if (result.errors) {
                    console.error('❌ RegisterModal: GraphQL errors:', result.errors);
                }

                const balanceValue = result.data?.balance || '0';
                const numBalance = parseFloat(balanceValue.replace(/\.$/, '')) || 0;
                setBalance(numBalance);
                console.log('💰 RegisterModal: Balance set to:', numBalance, 'ALTH');
            } else {
                console.error('❌ RegisterModal: HTTP error:', response.status, response.statusText);
                const text = await response.text();
                console.error('   Response:', text);
            }
        } catch (err) {
            console.error('❌ RegisterModal: Failed to load balance:', err);
        } finally {
            setLoadingBalance(false);
        }
    };

    useEffect(() => {
        if (owner && chainId) {
            loadBalance();
        }
    }, [owner, chainId]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!chainId || !owner) {
            setError('Wallet not connected');
            return;
        }

        if (!tokenApplication) {
            setError('Token application not connected. Please wait.');
            return;
        }

        const stakeAmountNum = parseFloat(stake);
        if (isNaN(stakeAmountNum) || stakeAmountNum < 100) {
            setError('Minimum stake is 100 tokens');
            return;
        }

        if (TOKEN_APP_ID && balance < stakeAmountNum) {
            setError(`Insufficient balance. Need ${stakeAmountNum} ALTH.`);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            console.log('📝 Registering voter with chainId:', chainId);

            if (TOKEN_APP_ID) {
                setStep('Step 1/3: Staking tokens to registry...');

                const TOKEN_CHAIN_ID = import.meta.env.VITE_TOKEN_CHAIN_ID || REGISTRY_CHAIN_ID;
                let tokenTransferSuccess = false;

                // Use SECURE sendStakeRequest (new token contract)
                // Format owner address with 0x prefix for AccountOwner format
                const formattedOwner = owner.startsWith('0x') ? owner : `0x${owner}`;

                if (tokenApplication && executeTokenMutation) {
                    try {
                        // CRITICAL: sendStakeRequest runs on USER CHAIN and deducts balance there
                        // Format: sendStakeRequest(tokenChain, owner, amount, toRegistry)
                        // Amount must have trailing dot for Linera Amount format
                        const stakeAmountFormatted = `${stake}.`;

                        const sendStakeRequestMutation = `mutation {
                            sendStakeRequest(
                                tokenChain: "${TOKEN_CHAIN_ID}",
                                owner: "${formattedOwner}",
                                amount: "${stakeAmountFormatted}",
                                toRegistry: "${REGISTRY_APP_ID}"
                            )
                        }`;

                        console.log('📤 Sending secure stake request via WASM...');
                        console.log('   User Chain:', chainId);
                        console.log('   Token Chain:', TOKEN_CHAIN_ID);
                        console.log('   Owner:', formattedOwner);
                        console.log('   Amount:', stakeAmountFormatted);
                        console.log('   Registry:', REGISTRY_APP_ID);

                        const result = await executeTokenMutation(sendStakeRequestMutation);
                        console.log('✅ sendStakeRequest succeeded!', result);
                        console.log('   Balance should be deducted on USER CHAIN:', chainId);
                        tokenTransferSuccess = true;
                    } catch (err) {
                        const errMsg = err instanceof Error ? err.message : String(err);
                        console.error('❌ sendStakeRequest failed:', errMsg);

                        // Check for common errors
                        if (errMsg.includes('Insufficient') || errMsg.includes('insufficient')) {
                            throw new Error(`Insufficient balance. You need ${stake} ALTH but have ${balance} ALTH.`);
                        }

                        throw new Error(`Failed to stake tokens: ${errMsg}`);
                    }
                }

                // No fallback - sendStakeRequest is the only secure method
                if (!tokenTransferSuccess) {
                    throw new Error('Token staking failed - WASM not available');
                }

                // Remove old fallback code - it's insecure
                /*
                                */

                if (tokenTransferSuccess) {
                    setStep('Step 2/3: Confirming stake...');
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    // Process token chain inbox
                    console.log('📥 Processing token chain inbox...');
                    await processChainInbox(TOKEN_CHAIN_ID, 3, 2000);

                    // Process user's chain inbox to see updated balance
                    console.log('📥 Processing user chain inbox...');
                    await processChainInbox(chainId, 3, 2000);

                    // Process registry inbox
                    await processRegistryInbox(3, 2000);
                } else {
                    console.log('⚠️ Token transfer skipped - using virtual stake');
                }
            }

            setStep(TOKEN_APP_ID ? 'Step 3/3: Registering voter...' : 'Registering voter...');

            const registryUrl = `${SERVICE_URL}/chains/${REGISTRY_CHAIN_ID}/applications/${REGISTRY_APP_ID}`;
            // IMPORTANT: voterAddress harus menggunakan chainId, bukan owner address
            const registerMutation = `mutation { 
executeRegisterVoterFor(
    voterAddress: "${chainId}",
    stake: "${stake}."
    ${name ? `, name: "${name}"` : ''}
) 
}`;

            const response = await fetch(registryUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: registerMutation }),
            });

            if (!response.ok) {
                throw new Error(`Registration failed: ${response.status}`);
            }

            const result = await response.json();
            if (result.errors?.length > 0) {
                throw new Error(result.errors[0].message);
            }

            console.log('✅ Voter registered!');
            await loadBalance();
            onSuccess();
        } catch (err) {
            console.error('Registration failed:', err);
            setError(err instanceof Error ? err.message : 'Registration failed');
        } finally {
            setLoading(false);
            setStep('');
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-grey-200">
                    <h2 className="text-xl font-bold text-black">Register as Voter</h2>
                    <button onClick={onClose} className="p-2 text-grey-600 hover:text-black hover:bg-grey-100 rounded-lg transition-colors" disabled={loading}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleRegister} className="p-6 space-y-4">
                    {TOKEN_APP_ID && (
                        <div className="bg-alethea-50 border border-alethea-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-alethea-700">Your ALTH Balance</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-alethea-600">
                                        {loadingBalance ? '...' : `${balance.toFixed(0)} ALTH`}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={loadBalance}
                                        disabled={loadingBalance || loading}
                                        className="p-1 text-alethea-600 hover:text-alethea-700 disabled:opacity-50"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${loadingBalance ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {!isWasmReady && (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                            <p className="text-sm text-amber-700">Connecting to blockchain...</p>
                        </div>
                    )}

                    {step && (
                        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                            <p className="text-sm text-blue-700">{step}</p>
                        </div>
                    )}

                    {TOKEN_APP_ID && !hasEnoughTokens && stakeAmount > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                            <div className="text-sm text-red-700">
                                <p className="font-medium">Insufficient Balance</p>
                                <p>Need {stakeAmount} ALTH, have {balance.toFixed(0)} ALTH</p>
                            </div>
                        </div>
                    )}

                    <div className="bg-grey-50 border border-grey-200 rounded-lg p-4 text-sm">
                        <p className="font-medium mb-1 text-black">Become an Oracle Voter</p>
                        <ul className="list-disc list-inside space-y-1 text-grey-600">
                            <li>Minimum stake: 100 ALTH</li>
                            <li>Earn rewards for correct votes</li>
                        </ul>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-grey-700 mb-2">Display Name (optional)</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="input"
                            placeholder="Enter your name"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-grey-700 mb-2">Initial Stake</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={stake}
                                onChange={(e) => setStake(e.target.value)}
                                min="100"
                                step="10"
                                className="input pr-16"
                                disabled={loading}
                            />
                            <span className="absolute right-4 top-3 text-grey-500">ALTH</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {['100', '500', '1000'].map((amount) => (
                            <button
                                key={amount}
                                type="button"
                                onClick={() => setStake(amount)}
                                className="px-3 py-1 text-sm bg-grey-100 hover:bg-grey-200 text-grey-700 rounded-md border border-grey-200"
                                disabled={loading}
                            >
                                {amount}
                            </button>
                        ))}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !isWasmReady || (TOKEN_APP_ID && !hasEnoughTokens)}
                        className={`w-full py-3 rounded-lg font-medium transition-all ${loading || !isWasmReady || (TOKEN_APP_ID && !hasEnoughTokens)
                            ? 'bg-grey-200 text-grey-500 cursor-not-allowed'
                            : 'btn-primary'
                        }`}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Registering...
                            </span>
                        ) : !isWasmReady ? 'Connecting...' : 'Register & Stake'}
                    </button>
                </form>

                <div className="px-6 pb-6">
                    <p className="text-xs text-grey-500 text-center">Chain: {chainId?.slice(0, 16)}...</p>
                </div>
            </div>
        </div>
    );
}
