import { useState, useEffect } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { useToken } from '../contexts/TokenContext';
import { X, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

const TOKEN_APP_ID = import.meta.env.VITE_TOKEN_APP_ID || '';
const SERVICE_URL = import.meta.env.VITE_SERVICE_URL || '';
const REGISTRY_CHAIN_ID = import.meta.env.VITE_CHAIN_ID || '';
const REGISTRY_APP_ID = import.meta.env.VITE_REGISTRY_APP_ID || '';

interface RegisterModalProps {
    onClose: () => void;
    onSuccess: () => void;
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
    const { chainId, owner, tokenApplication } = useLinera();
    const { balance, refreshBalance } = useToken();
    const [stake, setStake] = useState('100');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingBalance, setLoadingBalance] = useState(false);
    const [step, setStep] = useState<string>('');

    const stakeAmount = parseFloat(stake) || 0;
    const hasEnoughTokens = balance >= stakeAmount;
    const isWasmReady = !!tokenApplication;

    const handleRefreshBalance = async () => {
        if (!chainId || !tokenApplication || !owner) return;
        setLoadingBalance(true);

        try {
            const userOwner = (owner.startsWith('0x') ? owner : `0x${owner}`).toLowerCase();
            const balanceQuery = `{ accounts { entry(key: "${userOwner}") { value } } }`;
            await tokenApplication.query(JSON.stringify({ query: balanceQuery }));
            await refreshBalance();
        } catch (err) {
            console.error('Refresh failed:', err);
        } finally {
            setLoadingBalance(false);
        }
    };

    useEffect(() => {
        if (tokenApplication && owner) {
            handleRefreshBalance();
        }
    }, [tokenApplication, owner]);

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
            const voterAddressWithPrefix = (owner.startsWith('0x') ? owner : `0x${owner}`).toLowerCase();
            const voterAddressNoPrefix = (owner.startsWith('0x') ? owner.slice(2) : owner).toLowerCase();

            console.log('📝 Registering voter:', voterAddressNoPrefix);

            if (TOKEN_APP_ID) {
                setStep('Step 1/3: Transferring tokens to registry...');

                // Use HTTP to transfer from user's chain to registry chain
                // This works because we transfer on the user's chain where they have tokens
                const userTokenUrl = `${SERVICE_URL}/chains/${chainId}/applications/${TOKEN_APP_ID}`;

                const transferMutation = `mutation { 
                    transfer(
                        owner: "${voterAddressWithPrefix}",
                        amount: "${stake}.",
                        targetAccount: {
                            chainId: "${REGISTRY_CHAIN_ID}",
                            owner: "${voterAddressWithPrefix}"
                        }
                    ) 
                }`;

                console.log('📤 Transfer via HTTP:', userTokenUrl);
                console.log('📤 Mutation:', transferMutation);

                const transferResponse = await fetch(userTokenUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: transferMutation }),
                });

                if (!transferResponse.ok) {
                    const text = await transferResponse.text();
                    throw new Error(`Token transfer failed: ${transferResponse.status} - ${text}`);
                }

                const transferResult = await transferResponse.json();
                console.log('📥 Transfer result:', transferResult);

                if (transferResult.errors?.length > 0) {
                    throw new Error(transferResult.errors[0].message);
                }

                setStep('Step 2/3: Confirming transfer...');
                await new Promise(resolve => setTimeout(resolve, 3000));
                await processRegistryInbox(5, 2500);
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
            await refreshBalance();
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Register as Voter</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600" disabled={loading}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleRegister} className="p-6 space-y-4">
                    {TOKEN_APP_ID && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-yellow-700">Your ALTH Balance</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-yellow-800">
                                        {loadingBalance ? '...' : `${balance.toFixed(0)} ALTH`}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleRefreshBalance}
                                        disabled={loadingBalance || loading || !isWasmReady}
                                        className="p-1 text-yellow-600 hover:text-yellow-800 disabled:opacity-50"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${loadingBalance ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {!isWasmReady && (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                            <p className="text-sm text-amber-700">Connecting to blockchain...</p>
                        </div>
                    )}

                    {step && (
                        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                            <p className="text-sm text-blue-700">{step}</p>
                        </div>
                    )}

                    {TOKEN_APP_ID && !hasEnoughTokens && stakeAmount > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                            <div className="text-sm text-red-700">
                                <p className="font-medium">Insufficient Balance</p>
                                <p>Need {stakeAmount} ALTH, have {balance.toFixed(0)} ALTH</p>
                            </div>
                        </div>
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                        <p className="font-medium mb-1">Become an Oracle Voter</p>
                        <ul className="list-disc list-inside space-y-1 text-blue-700">
                            <li>Minimum stake: 100 ALTH</li>
                            <li>Earn rewards for correct votes</li>
                        </ul>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Display Name (optional)</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your name"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Initial Stake</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={stake}
                                onChange={(e) => setStake(e.target.value)}
                                min="100"
                                step="10"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={loading}
                            />
                            <span className="absolute right-4 top-3 text-gray-500">ALTH</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {['100', '500', '1000'].map((amount) => (
                            <button
                                key={amount}
                                type="button"
                                onClick={() => setStake(amount)}
                                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
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
                        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
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
                    <p className="text-xs text-gray-500 text-center">Chain: {chainId?.slice(0, 16)}...</p>
                </div>
            </div>
        </div>
    );
}
