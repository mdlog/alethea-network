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
    const { chainId, owner, status, tokenApplication, executeTokenMutation } = lineraContext;
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
                    // Updated query format for new token contract
                    query: `{ balance(owner: "${queryOwner}") }`
                }),
            });

            if (response.ok) {
                const result = await response.json();
                console.log('📊 StakeInterface: Balance response:', result);

                if (result.errors) {
                    console.error('❌ StakeInterface: GraphQL errors:', result.errors);
                }

                const balanceStr = result.data?.balance || '0';
                setTokenBalance(balanceStr);
                console.log('💰 StakeInterface: Balance set to:', balanceStr);
            } else {
                console.error('❌ StakeInterface: HTTP error:', response.status);
            }
        } catch (err) {
            console.error('❌ StakeInterface: Failed to load token balance:', err);
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

            // STEP 2: Stake tokens to registry using SECURE sendStakeRequest
            if (TOKEN_APP_ID && TOKEN_CHAIN_ID) {
                setStep('Step 2/4: Staking tokens to registry...');
                console.log('📤 Step 2: Staking tokens to registry...');
                console.log('  User Chain ID:', chainId);
                console.log('  Registry App ID:', REGISTRY_APP_ID);
                console.log('  Amount:', amount);

                let tokenTransferSuccess = false;

                // Use SECURE sendStakeRequest (new token contract)
                // Format owner address with 0x prefix for AccountOwner format
                const formattedOwner = owner.startsWith('0x') ? owner : `0x${owner}`;

                if (tokenApplication && executeTokenMutation) {
                    try {
                        // CRITICAL: sendStakeRequest runs on USER CHAIN and deducts balance there
                        // Format: sendStakeRequest(tokenChain, owner, amount, toRegistry)
                        // Amount must have trailing dot for Linera Amount format
                        const stakeAmountFormatted = `${amount}.`;

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

                        if (errMsg.includes('Insufficient') || errMsg.includes('insufficient')) {
                            throw new Error(`Insufficient ALTH balance. Please get tokens from the faucet first.`);
                        }
                        throw new Error(`Failed to stake tokens: ${errMsg}`);
                    }
                }

                // No fallback - sendStakeRequest is the only secure method
                if (!tokenTransferSuccess) {
                    throw new Error('Token staking failed - WASM not available');
                }

                // Wait for transaction to be processed
                setStep('Step 3/4: Waiting for confirmation...');
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Process token chain inbox to ensure transaction is complete
                console.log('📥 Processing token chain inbox...');
                await processInboxWithRetry(TOKEN_CHAIN_ID, 3, 2000);

                // Process registry chain inbox to receive tokens
                console.log('📥 Processing registry chain inbox to receive tokens...');
                await processInboxWithRetry(REGISTRY_CHAIN_ID, 3, 2000);

                // Also process user's chain inbox to see updated balance
                console.log('📥 Processing user chain inbox...');
                await processInboxWithRetry(chainId, 3, 2000);
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
                // Update stake for existing voter - call executeUpdateStakeFor
                console.log('📤 Updating stake in registry...');
                
                const updateStakeMutation = `mutation { 
                    executeUpdateStakeFor(
                        voterAddress: "${chainId}",
                        additionalStake: "${amount}."
                    ) 
                }`;

                console.log('📤 Update stake mutation:', updateStakeMutation);

                const response = await fetch(registryUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: updateStakeMutation }),
                });

                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(`Update stake failed: ${response.status} - ${text}`);
                }

                const result = await response.json();
                console.log('📦 Update stake result:', result);

                if (result.errors?.length > 0) {
                    throw new Error(result.errors[0].message);
                }

                console.log('✅ Stake updated successfully!');
            }

            console.log('═══════════════════════════════════════════════════════════');

            setSuccess(true);
            setAmount('100');
            setName('');

            // Wait longer for cross-chain messages to be fully processed
            console.log('⏳ Waiting for cross-chain messages to complete...');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Refresh balance
            await loadBalance();

            if (onSuccess) {
                // Give extra time before calling onSuccess to ensure data is updated
                setTimeout(() => onSuccess(), 2000);
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
            <div className="card p-6">
                <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-alethea-500" />
                    <p className="text-grey-700">Connecting wallet...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h3 className="text-xl font-bold text-black mb-4">
                {isRegistration ? 'Register as Voter' : 'Stake Tokens'}
            </h3>

            {/* Token Balance Display */}
            {
                TOKEN_APP_ID && (
                    <div className="bg-alethea-50 border border-alethea-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-alethea-600" />
                                <span className="text-sm text-alethea-700 font-medium">Your ALTH Balance</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-alethea-600">
                                    {loadingBalance ? '...' : `${tokenBalanceNum.toFixed(0)} ALTH`}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleRefreshBalance}
                                    disabled={loadingBalance || isStaking}
                                    className="p-1 text-alethea-600 hover:text-alethea-700 disabled:opacity-50"
                                    title="Refresh balance"
                                >
                                    <RefreshCw className={`w-4 h-4 ${loadingBalance ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>
                        {!tokenAppReady && (
                            <div className="mt-2 text-xs text-alethea-600 flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Token app connecting... (refresh page if this persists)
                            </div>
                        )}
                    </div>
                )
            }

            {/* Progress indicator */}
            {
                step && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                        <p className="text-sm text-blue-700">{step}</p>
                    </div>
                )
            }

            {/* Current Stake Display */}
            {
                !isRegistration && (
                    <div className="bg-grey-50 border border-grey-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-grey-700 font-medium">Current Stake</p>
                                <p className="text-2xl font-bold text-black">
                                    {parseFloat(currentStake).toFixed(0)} ALTH
                                </p>
                            </div>
                            <Coins className="w-10 h-10 text-alethea-600" />
                        </div>
                    </div>
                )
            }

            {/* Insufficient Balance Warning */}
            {
                TOKEN_APP_ID && !hasEnoughTokens && stakeAmountNum > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                            <div className="text-sm text-red-700">
                                <p className="font-medium">Insufficient ALTH Balance</p>
                                <p>You need {stakeAmountNum} ALTH but only have {tokenBalanceNum.toFixed(0)} ALTH.</p>
                                <p className="text-xs mt-1 text-red-600">Click refresh if you recently received tokens</p>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Info Box */}
            <div className="bg-grey-50 border border-grey-200 rounded-lg p-4 mb-6">
                <div className="flex gap-3">
                    <Info className="w-5 h-5 text-alethea-600 flex-shrink-0" />
                    <div className="text-sm">
                        <p className="font-medium mb-1 text-black">
                            {isRegistration ? 'Register as a voter' : 'Stake to increase voting power'}
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-grey-700">
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
                        <label className="block text-sm font-medium text-grey-800 mb-2">
                            Display Name (optional)
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="input"
                            placeholder="Enter your display name"
                            disabled={isStaking}
                        />
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-grey-800 mb-2">
                        {isRegistration ? 'Initial Stake Amount' : 'Amount to Stake'}
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min={isRegistration ? "100" : "10"}
                            step="10"
                            className="input pr-16"
                            placeholder="100"
                            disabled={isStaking}
                        />
                        <div className="absolute right-3 top-3 text-grey-600 font-medium">
                            ALTH
                        </div>
                    </div>
                    <p className="mt-1 text-xs text-grey-600">
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
                            className={`px-3 py-1 text-sm rounded-md transition-colors border ${parseFloat(val) <= tokenBalanceNum || !TOKEN_APP_ID
                                ? 'bg-grey-50 hover:bg-grey-100 text-grey-800 border-grey-200'
                                : 'bg-grey-100 text-grey-600 cursor-not-allowed border-grey-200'
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
                            className="px-3 py-1 text-sm bg-alethea-50 hover:bg-alethea-100 text-alethea-600 rounded-md transition-colors border border-alethea-200"
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
                            ? 'Registration successful! You are now a voter.'
                            : 'Stake updated successfully!'}
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        type="submit"
                        disabled={isStaking || (TOKEN_APP_ID && !hasEnoughTokens)}
                        className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${isStaking || (TOKEN_APP_ID && !hasEnoughTokens)
                            ? 'bg-grey-100 text-grey-600 cursor-not-allowed'
                            : 'btn-primary'
                            }`}
                    >
                        {isStaking ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {isRegistration ? 'Registering...' : 'Staking...'}
                            </span>
                        ) : (
                            isRegistration ? 'Register & Stake' : 'Stake Tokens'
                        )}
                    </button>
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-3 bg-grey-50 text-grey-800 rounded-lg hover:bg-grey-100 border border-grey-200"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>

            {/* Identity Info */}
            <div className="mt-6 pt-6 border-t border-grey-200">
                <p className="text-xs text-grey-600 mb-2">Your Identity:</p>
                <p className="text-xs font-mono text-grey-700 break-all">
                    <span className="font-semibold text-grey-800">Chain:</span> {chainId?.substring(0, 20)}...
                </p>
                {owner && (
                    <p className="text-xs font-mono text-grey-700 break-all mt-1">
                        <span className="font-semibold text-grey-800">Owner:</span> {owner?.substring(0, 20)}...
                    </p>
                )}
            </div>
        </div >
    );
}
