import { useState, useEffect } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { Loader2, Coins, Info, Wallet, AlertTriangle } from 'lucide-react';

const TOKEN_APP_ID = import.meta.env.VITE_TOKEN_APP_ID || '';
// Use relative URL for Vite proxy (same as TokenBalance.tsx)
const SERVICE_URL = import.meta.env.VITE_SERVICE_URL || '';
const TOKEN_CHAIN_ID = import.meta.env.VITE_TOKEN_CHAIN_ID || import.meta.env.VITE_CHAIN_ID;
const REGISTRY_CHAIN_ID = import.meta.env.VITE_CHAIN_ID || '208873b668818fc962d8470c68698dc5dff2321720a9bb0d74576d45f4f73c91';

interface StakeInterfaceProps {
    currentStake?: string;
    isRegistration?: boolean;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function StakeInterface({
    currentStake = '0',
    isRegistration = false,
    onSuccess,
    onCancel
}: StakeInterfaceProps) {
    const { chainId, owner, status, application, executeMutation, executeTokenMutation } = useLinera();
    const ready = status === 'Ready' && !!application;

    const [amount, setAmount] = useState(isRegistration ? '100' : '100');
    const [name, setName] = useState('');
    const [isStaking, setIsStaking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [tokenBalance, setTokenBalance] = useState<string>('0');
    const [loadingBalance, setLoadingBalance] = useState(false);

    // Load token balance - use owner address (0x...), not chainId
    useEffect(() => {
        const loadBalance = async () => {
            if (!TOKEN_APP_ID || !owner) return;

            setLoadingBalance(true);
            try {
                const graphqlUrl = `${SERVICE_URL}/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID}`;
                const response = await fetch(graphqlUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
                    body: JSON.stringify({
                        query: `{ balance(owner: "${owner}") }`
                    }),
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.data?.balance) {
                        setTokenBalance(result.data.balance);
                    }
                }
            } catch (err) {
                console.error('Failed to load token balance:', err);
            } finally {
                setLoadingBalance(false);
            }
        };

        if (ready && owner) {
            loadBalance();
        }
    }, [ready, owner]);

    const tokenBalanceNum = parseFloat(tokenBalance) || 0;
    const stakeAmountNum = parseFloat(amount) || 0;
    const hasEnoughTokens = tokenBalanceNum >= stakeAmountNum;

    const handleStake = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        setIsStaking(true);

        try {
            if (!chainId) {
                throw new Error('Wallet not connected');
            }

            const stakeAmount = parseFloat(amount);
            const minStake = isRegistration ? 100 : 10;
            if (isNaN(stakeAmount) || stakeAmount < minStake) {
                throw new Error(`Minimum stake is ${minStake} ALTH`);
            }

            // Check token balance
            if (TOKEN_APP_ID && tokenBalanceNum < stakeAmount) {
                throw new Error(`Insufficient ALTH balance. You have ${tokenBalanceNum.toFixed(0)} ALTH but need ${stakeAmount} ALTH`);
            }

            console.log(isRegistration ? '📝 Registering voter:' : '💰 Staking tokens:', amount);
            console.log('  Chain ID:', chainId);

            // Treasury address to receive staked tokens
            const treasuryAddress = '0x403bc4052a40835697d74411322cec087a55a7fb81a791ed7a590e7cfd5f612a';

            // Step 1: Transfer tokens to treasury via cross-chain message (WASM authenticated)
            // This uses sendTransferMessage which sends a RequestTransfer message to the token chain
            // The token chain will debit the user's balance and credit the treasury
            if (TOKEN_APP_ID && owner) {
                console.log('═══════════════════════════════════════════════════════════');
                console.log('💸 Step 1: Cross-chain Token Transfer to Treasury');
                console.log('═══════════════════════════════════════════════════════════');
                console.log('📍 User Owner:', owner);
                console.log('📍 Token Chain:', TOKEN_CHAIN_ID);
                console.log('📍 Treasury:', treasuryAddress);
                console.log('💰 Amount:', amount, 'ALTH');

                const tokenMutation = `mutation { sendTransferMessage(tokenChain: "${TOKEN_CHAIN_ID}", amount: "${amount}.", targetOwner: "${treasuryAddress}") }`;
                console.log('🪙 Token mutation:', tokenMutation);

                try {
                    const tokenResult = await executeTokenMutation(tokenMutation);
                    console.log('✅ Token transfer message sent!');
                    console.log('📦 Result:', tokenResult);

                    // Wait a moment for cross-chain message to be processed
                    console.log('⏳ Waiting for cross-chain message processing...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch (tokenErr) {
                    console.error('❌ Token transfer failed:', tokenErr);
                    // Don't continue if token transfer fails - user needs tokens to stake
                    throw new Error(`Token transfer failed: ${tokenErr instanceof Error ? tokenErr.message : 'Unknown error'}`);
                }
            }

            // Step 2: Register voter or update stake
            console.log('═══════════════════════════════════════════════════════════');
            console.log('📝 Step 2: Register Voter / Update Stake');
            console.log('═══════════════════════════════════════════════════════════');

            if (isRegistration) {
                // Use cross-chain messaging via WASM
                // Amount format requires trailing dot: "100." not "100"
                const nameArg = name ? `, name: "${name}"` : '';
                const mutation = `mutation { sendRegisterVoterMessage(targetChain: "${REGISTRY_CHAIN_ID}", stake: "${amount}."${nameArg}) }`;
                console.log('📝 Sending cross-chain register message via WASM:', mutation);

                const regResult = await executeMutation(mutation);
                console.log('✅ Cross-chain register message sent!');
                console.log('📦 Result:', regResult);
            } else {
                // For updating stake, use cross-chain message via WASM
                // Amount format requires trailing dot: "100." not "100"
                const mutation = `mutation { sendUpdateStakeMessage(targetChain: "${REGISTRY_CHAIN_ID}", additionalStake: "${amount}.") }`;
                console.log('💰 Sending cross-chain stake update via WASM:', mutation);

                const stakeResult = await executeMutation(mutation);
                console.log('✅ Cross-chain stake update sent!');
                console.log('📦 Result:', stakeResult);

                console.log('✅ Stake update sent!');
            }

            console.log('═══════════════════════════════════════════════════════════');
            console.log('✅ All operations completed successfully!');
            console.log('═══════════════════════════════════════════════════════════');

            setSuccess(true);
            setAmount('100');
            setName('');

            if (onSuccess) {
                setTimeout(() => onSuccess(), 1500);
            }
        } catch (err) {
            console.error('❌ Error:', err);
            setError(err instanceof Error ? err.message : isRegistration ? 'Registration failed' : 'Staking failed');
        } finally {
            setIsStaking(false);
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
                        <span className="text-lg font-bold text-yellow-800">
                            {loadingBalance ? '...' : `${tokenBalanceNum.toFixed(0)} ALTH`}
                        </span>
                    </div>
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
