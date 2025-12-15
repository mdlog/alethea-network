import { useState, useEffect } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { useToken } from '../contexts/TokenContext';
import { X, Loader2, AlertTriangle } from 'lucide-react';

const TOKEN_APP_ID = import.meta.env.VITE_TOKEN_APP_ID || '';
// Use relative URL for Vite proxy, or explicit URL if set
const SERVICE_URL = import.meta.env.VITE_SERVICE_URL || '';
const TOKEN_CHAIN_ID = import.meta.env.VITE_TOKEN_CHAIN_ID || import.meta.env.VITE_CHAIN_ID;

interface RegisterModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function RegisterModal({ onClose, onSuccess }: RegisterModalProps) {
    const { chainId, owner, application, executeMutation, executeTokenMutation } = useLinera();
    const { refreshBalance } = useToken();
    const [stake, setStake] = useState('100');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tokenBalance, setTokenBalance] = useState<number>(0);
    const [loadingBalance, setLoadingBalance] = useState(false);

    // Load token balance
    useEffect(() => {
        const loadBalance = async () => {
            if (!TOKEN_APP_ID || !owner) return;
            setLoadingBalance(true);
            try {
                const graphqlUrl = `${SERVICE_URL}/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID}`;
                const response = await fetch(graphqlUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: `{ balance(owner: "${owner}") }` }),
                });
                if (response.ok) {
                    const result = await response.json();
                    if (result.data?.balance) {
                        const bal = parseFloat(result.data.balance) || 0;
                        setTokenBalance(bal);
                    }
                }
            } catch (err) {
                console.error('Failed to load balance:', err);
            } finally {
                setLoadingBalance(false);
            }
        };
        loadBalance();
    }, [owner]);

    const stakeAmount = parseFloat(stake) || 0;
    const hasEnoughTokens = tokenBalance >= stakeAmount;

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!chainId) {
            setError('Wallet not connected');
            return;
        }

        const stakeAmountNum = parseFloat(stake);
        if (isNaN(stakeAmountNum) || stakeAmountNum < 100) {
            setError('Minimum stake is 100 tokens');
            return;
        }

        // Check token balance
        if (TOKEN_APP_ID && tokenBalance < stakeAmountNum) {
            setError(`Insufficient ALTH balance. You have ${tokenBalance.toFixed(0)} ALTH but need ${stakeAmountNum} ALTH`);
            return;
        }

        setLoading(true);
        setError(null);

        const nameArg = name ? `, name: "${name}"` : '';
        const appChainId = import.meta.env.VITE_CHAIN_ID;
        const treasuryAddress = '0x403bc4052a40835697d74411322cec087a55a7fb81a791ed7a590e7cfd5f612a';

        try {
            if (!application) {
                setError('WASM not connected. Please wait for connection or refresh the page.');
                setLoading(false);
                return;
            }

            console.log('[WASM] Registering voter via CROSS-CHAIN MESSAGE');
            console.log('User Chain ID:', chainId);
            console.log('Target App Chain:', appChainId);
            console.log('Stake:', stake);

            // Step 1: Transfer tokens to treasury (like StakeInterface does)
            if (TOKEN_APP_ID && owner) {
                console.log('💸 Step 1: Transfer tokens to treasury');
                const tokenMutation = `mutation { sendTransferMessage(tokenChain: "${TOKEN_CHAIN_ID}", amount: "${stake}.", targetOwner: "${treasuryAddress}") }`;
                console.log('Token mutation:', tokenMutation);

                try {
                    const tokenResult = await executeTokenMutation(tokenMutation);
                    console.log('✅ Token transfer sent:', tokenResult);
                    // Wait for cross-chain message processing
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch (tokenErr) {
                    console.error('❌ Token transfer failed:', tokenErr);
                    throw new Error(`Token transfer failed: ${tokenErr instanceof Error ? tokenErr.message : 'Unknown error'}`);
                }
            }

            // Step 2: Register voter
            console.log('📝 Step 2: Register voter');
            const mutation = `mutation { sendRegisterVoterMessage(targetChain: "${appChainId}", stake: "${stake}"${nameArg}) }`;
            console.log('Mutation:', mutation);

            const result = await executeMutation(mutation);
            console.log('✅ Registration message sent:', result);

            // Refresh balance after staking
            await refreshBalance();

            onSuccess();
        } catch (err) {
            console.error('Registration failed:', err);
            setError(err instanceof Error ? err.message : 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Register as Voter</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleRegister} className="p-6 space-y-4">
                    {/* Token Balance */}
                    {TOKEN_APP_ID && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-yellow-700">Your ALTH Balance</span>
                                <span className="font-bold text-yellow-800">
                                    {loadingBalance ? '...' : `${tokenBalance.toFixed(0)} ALTH`}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Insufficient Balance Warning */}
                    {TOKEN_APP_ID && !hasEnoughTokens && stakeAmount > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                            <div className="text-sm text-red-700">
                                <p className="font-medium">Insufficient Balance</p>
                                <p>Need {stakeAmount} ALTH, have {tokenBalance.toFixed(0)} ALTH</p>
                            </div>
                        </div>
                    )}

                    {/* Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                        <p className="font-medium mb-1">Become an Oracle Voter</p>
                        <ul className="list-disc list-inside space-y-1 text-blue-700">
                            <li>Minimum stake: 100 ALTH</li>
                            <li>Start with 50 reputation</li>
                            <li>Earn rewards for correct votes</li>
                        </ul>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Display Name (optional)
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your name"
                            disabled={loading}
                        />
                    </div>

                    {/* Stake */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Initial Stake
                        </label>
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
                            <span className="absolute right-4 top-3 text-gray-500">tokens</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Minimum: 100 tokens</p>
                    </div>

                    {/* Quick amounts */}
                    <div className="flex gap-2">
                        {['100', '500', '1000'].map((amount) => (
                            <button
                                key={amount}
                                type="button"
                                onClick={() => setStake(amount)}
                                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                                disabled={loading}
                            >
                                {amount}
                            </button>
                        ))}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading || (TOKEN_APP_ID && !hasEnoughTokens)}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Registering...
                            </span>
                        ) : (
                            'Register & Stake'
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="px-6 pb-6 space-y-2">
                    <p className="text-xs text-gray-500 text-center">
                        Your Chain ID: {chainId?.slice(0, 16)}...
                    </p>
                    {/* WASM Connection Status */}
                    <div className="flex items-center justify-center gap-2 text-xs">
                        <span className={`w-2 h-2 rounded-full ${application ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                        <span className={application ? 'text-green-600' : 'text-yellow-600'}>
                            {application ? 'WASM Connected' : 'HTTP Mode (WASM not connected)'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
