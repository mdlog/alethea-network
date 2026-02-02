import { useState, useEffect } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { Loader2, Coins, Info, Wallet, AlertTriangle, RefreshCw } from 'lucide-react';

const TOKEN_APP_ID = import.meta.env.VITE_TOKEN_APP_ID || '';
const TOKEN_CHAIN_ID = import.meta.env.VITE_TOKEN_CHAIN_ID || '';
const SERVICE_URL = import.meta.env.VITE_SERVICE_URL || '';
const REGISTRY_CHAIN_ID = import.meta.env.VITE_CHAIN_ID || '';
const REGISTRY_APP_ID = import.meta.env.VITE_REGISTRY_APP_ID || '';

interface StakeInterfaceProps {
    currentStake?: string;
    isRegistration?: boolean;
    onSuccess?: () => void;
    onCancel?: () => void;
}

// Helper to process inbox with retries
async function processInboxWithRetry(chainId: string, maxRetries = 5, delayMs = 2000): Promise<boolean> {
    // Use /inbox which proxies to root endpoint at localhost:8080
    const url = SERVICE_URL || '/inbox';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`📥 Process inbox attempt ${attempt}/${maxRetries} for chain ${chainId}...`);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `mutation { processInbox(chainId: "${chainId}") }`,
                }),
            });

            if (!response.ok) {
                console.warn(`⚠️ Attempt ${attempt} HTTP error:`, response.status);
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    continue;
                }
                return false;
            }

            const result = await response.json();

            if (result.errors?.length > 0) {
                const errorMsg = result.errors[0].message;
                console.warn(`⚠️ Attempt ${attempt} error:`, errorMsg);

                if (errorMsg.includes('was not processed') || errorMsg.includes('pending')) {
                    if (attempt < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, delayMs * 2));
                        continue;
                    }
                }
                return false;
            }

            console.log(`✅ Inbox processed on attempt ${attempt}`);
            return true;
        } catch (err) {
            console.warn(`⚠️ Attempt ${attempt} exception:`, err);
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }
    return false;
}

export default function StakeInterface({
    currentStake = '0',
    isRegistration = false,
    onSuccess,
    onCancel
}: StakeInterfaceProps) {
    const lineraContext = useLinera();
    const { chainId, owner, status, executeTokenMutation, tokenApplication } = lineraContext;
    const ready = status === 'Ready';
    const tokenAppReady = !!tokenApplication;

    const [amount, setAmount] = useState(isRegistration ? '100' : '100');
    const [name, setName] = useState('');
    const [isStaking, setIsStaking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [tokenBalance, setTokenBalance] = useState<string>('0');
    const [loadingBalance, setLoadingBalance] = useState(false);
    const [step, setStep] = useState<string>('');

    // Load token balance
    const loadBalance = async () => {
        if (!TOKEN_APP_ID || !owner || !chainId) return;

        setLoadingBalance(true);
        try {
            const graphqlUrl = `${SERVICE_URL}/chains/${chainId}/applications/${TOKEN_APP_ID}`;
            const queryOwner = (owner.startsWith('0x') ? owner : `0x${owner}`).toLowerCase();

            const response = await fetch(graphqlUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `{ accounts { entry(key: "${queryOwner}") { value } } }`
                }),
            });

            if (response.ok) {
                const result = await response.json();
                const balanceStr = result.data?.accounts?.entry?.value || '0';
                setTokenBalance(balanceStr);
            }
        } catch (err) {
            console.error('Failed to load token balance:', err);
        } finally {
            setLoadingBalance(false);
        }
    };

    useEffect(() => {
        if (ready && owner && chainId) {
            loadBalance();
        }
    }, [ready, owner, chainId]);

    const tokenBalanceNum = parseFloat(tokenBalance.replace(/\.$/, '')) || 0;
    const stakeAmountNum = parseFloat(amount) || 0;
    const hasEnoughTokens = tokenBalanceNum >= stakeAmountNum;

    const handleRefreshBalance = async () => {
        if (!chainId) return;
        setLoadingBalance(true);
        try {
            await processInboxWithRetry(chainId, 3, 2000);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await loadBalance();
        } catch (err) {
            console.error('Refresh failed:', err);
        } finally {
            setLoadingBalance(false);
        }
    };

    const handleStake = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        setIsStaking(true);

        try {
            if (!chainId || !owner) {
                throw new Error('Wallet not connected');
            }

            const stakeAmount = parseFloat(amount);
            const minStake = isRegistration ? 100 : 10;
            if (isNaN(stakeAmount) || stakeAmount < minStake) {
                throw new Error(`Minimum stake is ${minStake} ALTH`);
            }

            if (TOKEN_APP_ID && tokenBalanceNum < stakeAmount) {
                throw new Error(`Insufficient ALTH balance. You have ${tokenBalanceNum.toFixed(0)} ALTH but need ${stakeAmount} ALTH`);
            }

            const voterAddress = (owner.startsWith('0x') ? owner : `0x${owner}`).toLowerCase();

            console.log('═══════════════════════════════════════════════════════════');
            console.log(isRegistration ? '📝 Registering voter' : '💰 Updating stake');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('  Voter Address:', voterAddress);
            console.log('  Chain ID:', chainId);
            console.log('  Amount:', amount);

            // STEP 1: Process user's chain inbox first
            setStep('Step 1/4: Clearing pending blocks...');
            await processInboxWithRetry(chainId, 3, 2000);

            // STEP 2: Transfer tokens to registry chain using WASM client
            if (TOKEN_APP_ID && TOKEN_CHAIN_ID) {
                setStep('Step 2/4: Connecting to token app...');
                console.log('📤 Step 2: Transferring tokens to registry chain via WASM...');

                // Wait for token application to be connected with retries
                // Note: We check lineraContext.tokenApplication directly to get latest value
                let tokenReady = !!lineraContext.tokenApplication;
                const maxWaitAttempts = 10;
                for (let i = 0; i < maxWaitAttempts && !tokenReady; i++) {
                    console.log(`⏳ Waiting for token app connection... attempt ${i + 1}/${maxWaitAttempts}`);
                    setStep(`Step 2/4: Waiting for token app (${i + 1}/${maxWaitAttempts})...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    // Re-check tokenApplication from context (latest value)
                    tokenReady = !!lineraContext.tokenApplication;
                }

                if (!tokenReady) {
                    console.warn('⚠️ Token application still not connected after waiting');
                    // Try HTTP fallback for token transfer
                    setStep('Step 2/4: Using HTTP fallback for transfer...');
                    console.log('🔄 Attempting HTTP fallback for token transfer...');

                    const tokenGraphqlUrl = `${SERVICE_URL}/chains/${chainId}/applications/${TOKEN_APP_ID}`;
                    const transferMutation = `mutation { 
                        transfer(
                            owner: "${voterAddress}",
                            amount: "${amount}.",
                            targetAccount: {
                                chainId: "${REGISTRY_CHAIN_ID}",
                                owner: "${voterAddress}"
                            }
                        ) 
                    }`;

                    try {
                        const response = await fetch(tokenGraphqlUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ query: transferMutation }),
                        });

                        if (!response.ok) {
                            const text = await response.text();
                            console.error('❌ HTTP token transfer failed:', response.status, text);
                            throw new Error(`Token transfer failed: ${response.status} - ${text}`);
                        }

                        const result = await response.json();
                        if (result.errors?.length > 0) {
                            throw new Error(result.errors[0].message);
                        }
                        console.log('✅ Token transfer via HTTP fallback succeeded!');
                    } catch (httpErr) {
                        console.error('❌ HTTP fallback also failed:', httpErr);
                        throw new Error('Token application not ready and HTTP fallback failed. Please refresh the page and wait for wallet to fully connect, then try again.');
                    }
                } else {
                    // Use WASM client for transfer
                    setStep('Step 2/4: Transferring tokens via WASM...');

                    // Transfer to registry chain (same owner, different chain)
                    const transferMutation = `mutation { 
                        transfer(
                            owner: "${voterAddress}",
                            amount: "${amount}.",
                            targetAccount: {
                                chainId: "${REGISTRY_CHAIN_ID}",
                                owner: "${voterAddress}"
                            }
                        ) 
                    }`;

                    console.log('  Transfer mutation:', transferMutation);

                    try {
                        const tokenResult = await executeTokenMutation(transferMutation);
                        console.log('  Transfer response:', tokenResult);
                        console.log('✅ Token transfer initiated via WASM!');
                    } catch (err) {
                        console.error('❌ WASM token transfer failed:', err);
                        const errMsg = err instanceof Error ? err.message : String(err);

                        // Provide detailed error info
                        console.log('═══════════════════════════════════════════════════════════');
                        console.log('🔍 WASM Transfer Debug Info:');
                        console.log('  Error:', errMsg);
                        console.log('  User Chain:', chainId);
                        console.log('  Registry Chain:', REGISTRY_CHAIN_ID);
                        console.log('  Token App:', TOKEN_APP_ID);
                        console.log('  Token App Ready:', tokenAppReady);
                        console.log('═══════════════════════════════════════════════════════════');

                        // If network error, this is likely a testnet connectivity issue
                        if (errMsg.includes('network error')) {
                            throw new Error('Network error connecting to Linera testnet. The testnet validators may be temporarily unavailable. Please try again in a few minutes.');
                        }

                        // If not connected, the WASM client didn't initialize properly
                        if (errMsg.includes('not connected')) {
                            throw new Error('Token application not ready. Please refresh the page and wait for the "Token app connecting..." message to disappear, then try again.');
                        }

                        throw new Error(`Token transfer failed: ${errMsg}`);
                    }
                }

                // Wait for cross-chain message
                setStep('Step 3/4: Waiting for confirmation...');
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Process registry chain inbox
                console.log('📥 Processing registry chain inbox...');
                await processInboxWithRetry(REGISTRY_CHAIN_ID, 5, 2500);
            }

            // STEP 3: Register/Update stake on registry
            setStep('Step 4/4: ' + (isRegistration ? 'Registering voter...' : 'Updating stake...'));
            const registryUrl = `${SERVICE_URL}/chains/${REGISTRY_CHAIN_ID}/applications/${REGISTRY_APP_ID}`;

            if (isRegistration) {
                // Use executeRegisterVoterFor for registration
                const registerMutation = `mutation { 
                    executeRegisterVoterFor(
                        voterAddress: "${chainId}",
                        stake: "${amount}."
                        ${name ? `, name: "${name}"` : ''}
                    ) 
                }`;

                console.log('📤 Registration mutation:', registerMutation);

                const response = await fetch(registryUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: registerMutation }),
                });

                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(`Registration failed: ${response.status} - ${text}`);
                }

                const result = await response.json();
                console.log('📦 Registration result:', result);

                if (result.errors?.length > 0) {
                    throw new Error(result.errors[0].message);
                }

                console.log('✅ Voter registered successfully!');
            } else {
                // Update stake - need to use the voter's chain ID as address
                const stakeMutation = `mutation { 
                    executeUpdateStake(additionalStake: "${amount}.") 
                }`;

                console.log('📤 Stake update mutation:', stakeMutation);

                const response = await fetch(registryUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: stakeMutation }),
                });

                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(`Stake update failed: ${response.status} - ${text}`);
                }

                const result = await response.json();
                console.log('📦 Stake update result:', result);

                if (result.errors?.length > 0) {
                    throw new Error(result.errors[0].message);
                }

                console.log('✅ Stake updated successfully!');
            }

            console.log('═══════════════════════════════════════════════════════════');

            setSuccess(true);
            setAmount('100');
            setName('');

            // Refresh balance
            await loadBalance();

            if (onSuccess) {
                setTimeout(() => onSuccess(), 1500);
            }
        } catch (err) {
            console.error('❌ Error:', err);
            setError(err instanceof Error ? err.message : isRegistration ? 'Registration failed' : 'Staking failed');
        } finally {
            setIsStaking(false);
            setStep('');
        }
    };

    if (!ready) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <p className="text-gray-600">Connecting wallet...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
                {isRegistration ? 'Register as Voter' : 'Stake Tokens'}
            </h3>

            {/* Token Balance Display */}
            {TOKEN_APP_ID && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-yellow-600" />
                            <span className="text-sm text-yellow-700 font-medium">Your ALTH Balance</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-yellow-800">
                                {loadingBalance ? '...' : `${tokenBalanceNum.toFixed(0)} ALTH`}
                            </span>
                            <button
                                type="button"
                                onClick={handleRefreshBalance}
                                disabled={loadingBalance || isStaking}
                                className="p-1 text-yellow-600 hover:text-yellow-800 disabled:opacity-50"
                                title="Refresh balance"
                            >
                                <RefreshCw className={`w-4 h-4 ${loadingBalance ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>
                    {!tokenAppReady && (
                        <div className="mt-2 text-xs text-yellow-600 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Token app connecting... (refresh page if this persists)
                        </div>
                    )}
                </div>
            )}

            {/* Progress indicator */}
            {step && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    <p className="text-sm text-blue-700">{step}</p>
                </div>
            )}

            {/* Current Stake Display */}
            {!isRegistration && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-600 font-medium">Current Stake</p>
                            <p className="text-2xl font-bold text-blue-900">
                                {parseFloat(currentStake).toFixed(0)} ALTH
                            </p>
                        </div>
                        <Coins className="w-10 h-10 text-blue-400" />
                    </div>
                </div>
            )}

            {/* Insufficient Balance Warning */}
            {TOKEN_APP_ID && !hasEnoughTokens && stakeAmountNum > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                        <div className="text-sm text-red-700">
                            <p className="font-medium">Insufficient ALTH Balance</p>
                            <p>You need {stakeAmountNum} ALTH but only have {tokenBalanceNum.toFixed(0)} ALTH.</p>
                            <p className="text-xs mt-1">Click refresh if you recently received tokens</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Info Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <div className="flex gap-3">
                    <Info className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <div className="text-sm text-amber-800">
                        <p className="font-medium mb-1">
                            {isRegistration ? 'Register as a voter' : 'Stake to increase voting power'}
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-amber-700">
                            {isRegistration ? (
                                <>
                                    <li>Minimum stake: 100 ALTH</li>
                                    <li>Start with 50 reputation</li>
                                    <li>Earn rewards for correct votes</li>
                                </>
                            ) : (
                                <>
                                    <li>Higher stake = More voting weight</li>
                                    <li>Stake is locked while voting</li>
                                    <li>Can unstake anytime (if not locked)</li>
                                </>
                            )}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Stake Form */}
            <form onSubmit={handleStake} className="space-y-4">
                {isRegistration && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Display Name (optional)
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your display name"
                            disabled={isStaking}
                        />
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {isRegistration ? 'Initial Stake Amount' : 'Amount to Stake'}
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min={isRegistration ? "100" : "10"}
                            step="10"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-16"
                            placeholder="100"
                            disabled={isStaking}
                        />
                        <div className="absolute right-3 top-3 text-gray-500 font-medium">
                            ALTH
                        </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                        Minimum: {isRegistration ? '100' : '10'} ALTH
                    </p>
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex gap-2">
                    {['100', '500', '1000'].map((val) => (
                        <button
                            key={val}
                            type="button"
                            onClick={() => setAmount(val)}
                            className={`px-3 py-1 text-sm rounded-md transition-colors ${parseFloat(val) <= tokenBalanceNum || !TOKEN_APP_ID
                                ? 'bg-gray-100 hover:bg-gray-200'
                                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                }`}
                            disabled={isStaking || (TOKEN_APP_ID && parseFloat(val) > tokenBalanceNum)}
                        >
                            {val}
                        </button>
                    ))}
                    {TOKEN_APP_ID && tokenBalanceNum > 0 && (
                        <button
                            type="button"
                            onClick={() => setAmount(Math.floor(tokenBalanceNum).toString())}
                            className="px-3 py-1 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-md transition-colors"
                            disabled={isStaking}
                        >
                            MAX
                        </button>
                    )}
                </div>

                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
                        {isRegistration
                            ? '✅ Registration successful! You are now a voter.'
                            : '✅ Stake updated successfully!'}
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        type="submit"
                        disabled={isStaking || (TOKEN_APP_ID && !hasEnoughTokens)}
                        className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
                    >
                        {isStaking ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {isRegistration ? 'Registering...' : 'Staking...'}
                            </span>
                        ) : (
                            isRegistration ? '📝 Register & Stake' : '💰 Stake Tokens'
                        )}
                    </button>
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>

            {/* Identity Info */}
            <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Your Identity:</p>
                <p className="text-xs font-mono text-gray-600 break-all">
                    <span className="font-semibold">Chain:</span> {chainId?.substring(0, 20)}...
                </p>
                {owner && (
                    <p className="text-xs font-mono text-gray-600 break-all mt-1">
                        <span className="font-semibold">Owner:</span> {owner?.substring(0, 20)}...
                    </p>
                )}
            </div>
        </div>
    );
}
