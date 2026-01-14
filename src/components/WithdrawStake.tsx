import { useState } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { useToken } from '../contexts/TokenContext';
import { ArrowDownCircle, Loader2, AlertCircle, CheckCircle, Info } from 'lucide-react';

const TOKEN_APP_ID = import.meta.env.VITE_TOKEN_APP_ID || '';
const REGISTRY_CHAIN_ID = import.meta.env.VITE_CHAIN_ID || '';
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
    const { chainId, owner, status, executeAppChainMutation, tokenApplication } = useLinera();
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
        if (!chainId || !canWithdraw || !owner) return;

        const withdrawAmount = parseFloat(amount);
        if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (withdrawAmount > available) {
            setError(`Maximum withdrawal is ${available.toFixed(2)} ALTH`);
            return;
        }

        setWithdrawing(true);
        setError(null);
        setSuccess(false);

        try {
            // Use voter address without 0x prefix (how contract stores it)
            const voterAddr = voterAddress || (owner.startsWith('0x') ? owner.slice(2) : owner).toLowerCase();
            const userOwner = (owner.startsWith('0x') ? owner : `0x${owner}`).toLowerCase();
            const formattedAmount = amount.includes('.') ? amount : `${amount}.`;

            console.log('💸 Withdrawing stake:', amount);
            console.log('   voterAddress:', voterAddr);

            // Step 1: Process registry inbox
            setStep('Step 1/3: Preparing...');
            await processRegistryInbox(3, 2000);

            // Step 2: Withdraw stake via registry
            // This should move tokens from stake to withdrawable, then transfer back to user
            setStep('Step 2/3: Withdrawing stake...');

            const withdrawMutation = `mutation { executeWithdrawStakeFor(voterAddress: "${voterAddr}", amount: "${formattedAmount}") }`;
            console.log('   Withdraw mutation:', withdrawMutation);
            await executeAppChainMutation(withdrawMutation);
            console.log('✅ Stake withdrawn');

            // Step 3: Wait and receive tokens via WASM
            setStep('Step 3/3: Receiving tokens...');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Query balance via WASM to trigger inbox processing
            if (tokenApplication) {
                const balanceQuery = `{ accounts { entry(key: "${userOwner}") { value } } }`;
                for (let i = 0; i < 3; i++) {
                    try {
                        await tokenApplication.query(JSON.stringify({ query: balanceQuery }));
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (err) {
                        console.warn('Balance query attempt failed:', err);
                    }
                }
            }

            console.log('✅ Withdrawal complete!');
            setSuccess(true);
            setAmount('');

            await refreshBalance();
            if (onSuccess) {
                setTimeout(() => onSuccess(), 1500);
            }
        } catch (err) {
            console.error('❌ Withdrawal failed:', err);
            setError(err instanceof Error ? err.message : 'Withdrawal failed');
        } finally {
            setWithdrawing(false);
            setStep('');
        }
    };

    if (status !== 'Ready') {
        return null;
    }

    return (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <ArrowDownCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-gray-900">Withdraw Stake</h3>
                    <p className="text-sm text-gray-500">Withdraw your unlocked tokens</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs text-green-600 mb-1">Available</p>
                    <p className="text-lg font-bold text-green-700">{available.toFixed(2)} ALTH</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs text-amber-600 mb-1">Locked</p>
                    <p className="text-lg font-bold text-amber-700">{locked.toFixed(2)} ALTH</p>
                </div>
            </div>

            {step && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    <p className="text-sm text-blue-700">{step}</p>
                </div>
            )}

            {!isWasmReady && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                    <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                    <p className="text-sm text-amber-700">Connecting to blockchain...</p>
                </div>
            )}

            {locked > 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                    <Info className="w-4 h-4 text-amber-500 mt-0.5" />
                    <p className="text-sm text-amber-700">
                        {locked.toFixed(2)} ALTH is locked due to active votes.
                    </p>
                </div>
            )}

            {!canWithdraw ? (
                <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-gray-400" />
                    <p className="text-sm text-gray-600">No available stake to withdraw</p>
                </div>
            ) : (
                <form onSubmit={handleWithdraw} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Amount to Withdraw</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                max={available}
                                step="0.01"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 pr-20"
                                placeholder="0.00"
                                disabled={withdrawing}
                            />
                            <button
                                type="button"
                                onClick={() => setAmount(available.toString())}
                                className="absolute right-2 top-2 px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                                disabled={withdrawing}
                            >
                                MAX
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <p className="text-sm text-green-700">Withdrawal successful!</p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={withdrawing || !amount || parseFloat(amount) <= 0 || !isWasmReady}
                            className="flex-1 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 font-medium flex items-center justify-center gap-2"
                        >
                            {withdrawing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Withdrawing...
                                </>
                            ) : (
                                <>
                                    <ArrowDownCircle className="w-4 h-4" />
                                    Withdraw
                                </>
                            )}
                        </button>
                        {onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={withdrawing}
                                className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
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
