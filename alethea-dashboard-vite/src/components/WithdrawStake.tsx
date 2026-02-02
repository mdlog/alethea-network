import { useState } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { useToken } from '../contexts/TokenContext';
import { ArrowDownCircle, Loader2, AlertCircle, CheckCircle, Info } from 'lucide-react';

const TOKEN_APP_ID = import.meta.env.VITE_TOKEN_APP_ID || '';
const TOKEN_CHAIN_ID = import.meta.env.VITE_TOKEN_CHAIN_ID || '';
const REGISTRY_CHAIN_ID = import.meta.env.VITE_CHAIN_ID || '';
const REGISTRY_APP_ID = import.meta.env.VITE_REGISTRY_APP_ID || '';
const SERVICE_URL = import.meta.env.VITE_SERVICE_URL || '';

interface WithdrawStakeProps {
    availableStake: string;
    lockedStake: string;
    voterAddress?: string;
    onSuccess?: () => void;
    onCancel?: () => void;
}

async function processRegistryInbox(maxRetries = 5, delayMs = 2000): Promise<boolean> {
    // Use /inbox which proxies to root endpoint at localhost:8080
    const url = SERVICE_URL || '/inbox';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
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

            return true;
        } catch (err) {
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }
    return false;
}

export default function WithdrawStake({
    availableStake,
    lockedStake,
    voterAddress,
    onSuccess,
    onCancel
}: WithdrawStakeProps) {
    const lineraContext = useLinera();
    const { chainId, status, tokenApplication } = lineraContext;
    const { refreshBalance } = useToken();
    const [amount, setAmount] = useState('');
    const [withdrawing, setWithdrawing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [step, setStep] = useState<string>('');

    const available = parseFloat(availableStake) || 0;
    const locked = parseFloat(lockedStake) || 0;
    const canWithdraw = available > 0;
    const isWasmReady = !!tokenApplication;

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chainId || !canWithdraw) return;

        const withdrawAmount = parseFloat(amount);
        if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (withdrawAmount > available) {
            setError(`Maximum unstake is ${available.toFixed(2)} ALTH`);
            return;
        }

        setWithdrawing(true);
        setError(null);
        setSuccess(false);

        try {
            // Use chainId as voter address (how registry identifies voters)
            const voterChainId = chainId;
            const formattedAmount = amount.includes('.') ? amount : `${amount}.`;

            console.log('💸 Unstaking:', amount);
            console.log('   Voter Chain ID:', voterChainId);

            // Step 1: Process registry inbox
            setStep('Step 1/4: Preparing...');
            await processRegistryInbox(3, 2000);

            // Step 2: Unstake from registry
            // This updates the voter's stake in the registry
            setStep('Step 2/4: Unstaking from registry...');

            const registryUrl = `${SERVICE_URL}/chains/${REGISTRY_CHAIN_ID}/applications/${REGISTRY_APP_ID}`;
            const withdrawMutation = `mutation {
                executeWithdrawStakeFor(
                    voterAddress: "${voterChainId}",
                    amount: "${formattedAmount}"
                )
            }`;

            console.log('   Withdraw mutation:', withdrawMutation);

            const withdrawResponse = await fetch(registryUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: withdrawMutation }),
            });

            if (!withdrawResponse.ok) {
                const text = await withdrawResponse.text();
                throw new Error(`Registry unstake failed: ${text}`);
            }

            const withdrawResult = await withdrawResponse.json();
            if (withdrawResult.errors?.length > 0) {
                throw new Error(withdrawResult.errors[0].message);
            }

            console.log('✅ Registry stake withdrawn');

            // Step 3: Transfer tokens back from registry to user via SECURE sendUnstakeRequest
            setStep('Step 3/4: Transferring tokens back...');

            if (!tokenApplication) {
                throw new Error('Token application not ready. Please refresh the page.');
            }

            // Use SECURE sendUnstakeRequest via WASM (authenticated by Linera runtime)
            const { executeTokenMutation, owner } = lineraContext;
            if (!executeTokenMutation || !owner) {
                throw new Error('WASM wallet not available or owner not found');
            }

            // Normalize owner address
            const userOwner = (owner.startsWith('0x') ? owner : `0x${owner}`).toLowerCase();

            const sendUnstakeRequestMutation = `mutation {
                sendUnstakeRequest(
                    tokenChain: "${TOKEN_CHAIN_ID}",
                    owner: "${userOwner}",
                    amount: "${formattedAmount}",
                    fromRegistry: "${REGISTRY_APP_ID}"
                )
            }`;

            console.log('   Sending secure unstake request via WASM...');
            console.log('   Owner:', userOwner);

            try {
                const result = await executeTokenMutation(sendUnstakeRequestMutation);
                console.log('✅ sendUnstakeRequest succeeded!', result);
            } catch (err) {
                const errMsg = err instanceof Error ? err.message : String(err);
                console.error('❌ sendUnstakeRequest failed:', errMsg);
                throw new Error(`Failed to unstake tokens: ${errMsg}`);
            }

            console.log('✅ Tokens will be transferred back to user');

            // Step 4: Wait for confirmation
            setStep('Step 4/4: Confirming...');
            await new Promise(resolve => setTimeout(resolve, 2000));

            console.log('✅ Unstake complete!');
            setSuccess(true);
            setAmount('');

            await refreshBalance();
            if (onSuccess) {
                setTimeout(() => onSuccess(), 1500);
            }
        } catch (err) {
            console.error('❌ Unstake failed:', err);
            setError(err instanceof Error ? err.message : 'Unstake failed');
        } finally {
            setWithdrawing(false);
            setStep('');
        }
    };

    if (status !== 'Ready') {
        return null;
    }

    return (
        <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                    <ArrowDownCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-black">Unstake Tokens</h3>
                    <p className="text-sm text-grey-600">Unstake your available tokens</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs text-green-700 mb-1">Available</p>
                    <p className="text-lg font-bold text-green-700">{available.toFixed(2)} ALTH</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs text-amber-700 mb-1">Locked</p>
                    <p className="text-lg font-bold text-amber-700">{locked.toFixed(2)} ALTH</p>
                </div>
            </div>

            {step && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    <p className="text-sm text-blue-700">{step}</p>
                </div>
            )}

            {!isWasmReady && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                    <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                    <p className="text-sm text-amber-700">Connecting to blockchain...</p>
                </div>
            )}

            {locked > 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                    <Info className="w-4 h-4 text-amber-600 mt-0.5" />
                    <p className="text-sm text-amber-700">
                        {locked.toFixed(2)} ALTH is locked due to active votes.
                    </p>
                </div>
            )}

            {!canWithdraw ? (
                <div className="flex items-center gap-2 p-3 bg-grey-50 border border-grey-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-grey-600" />
                    <p className="text-sm text-grey-700">No available stake to unstake</p>
                </div>
            ) : (
                <form onSubmit={handleWithdraw} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-grey-800 mb-2">Amount to Unstake</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                max={available}
                                step="0.01"
                                className="input pr-20"
                                placeholder="0.00"
                                disabled={withdrawing}
                            />
                            <button
                                type="button"
                                onClick={() => setAmount(available.toString())}
                                className="absolute right-2 top-2 px-2 py-1 text-xs bg-amber-50 text-amber-700 rounded hover:bg-amber-100"
                                disabled={withdrawing}
                            >
                                MAX
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <p className="text-sm text-green-700">Unstake successful!</p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={withdrawing || !amount || parseFloat(amount) <= 0 || !isWasmReady}
                            className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${withdrawing || !amount || parseFloat(amount) <= 0 || !isWasmReady
                                ? 'bg-grey-100 text-grey-600 cursor-not-allowed'
                                : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                                }`}
                        >
                            {withdrawing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Unstaking...
                                </>
                            ) : (
                                <>
                                    <ArrowDownCircle className="w-4 h-4" />
                                    Unstake
                                </>
                            )}
                        </button>
                        {onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={withdrawing}
                                className="px-4 py-3 bg-grey-50 text-grey-800 rounded-lg hover:bg-grey-100 border border-grey-200"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            )}
        </div>
    );
}
