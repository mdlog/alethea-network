import { useState } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { useToken } from '../contexts/TokenContext';
import { Send, Loader2, AlertCircle, CheckCircle, X } from 'lucide-react';

const TOKEN_APP_ID = import.meta.env.VITE_TOKEN_APP_ID || '';
// Use relative URL for Vite proxy, or explicit URL if set
const SERVICE_URL = import.meta.env.VITE_SERVICE_URL || '';
const TOKEN_CHAIN_ID = import.meta.env.VITE_TOKEN_CHAIN_ID || import.meta.env.VITE_CHAIN_ID;

interface TransferTokenProps {
    balance: number;
    onSuccess?: () => void;
    onClose?: () => void;
}

export default function TransferToken({ balance, onSuccess, onClose }: TransferTokenProps) {
    const { chainId, owner, status, executeTokenMutation } = useLinera();
    const { refreshBalance } = useToken();
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [transferring, setTransferring] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const availableBalance = balance;

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chainId || !owner || !TOKEN_APP_ID) return;

        const transferAmount = parseFloat(amount);
        if (isNaN(transferAmount) || transferAmount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (transferAmount > availableBalance) {
            setError(`Insufficient balance. Maximum: ${availableBalance.toFixed(2)}`);
            return;
        }

        if (!recipient.trim()) {
            setError('Please enter a recipient address');
            return;
        }

        setTransferring(true);
        setError(null);
        setSuccess(false);

        try {
            console.log('📤 Transferring tokens using WASM (signed transaction)');

            // Format amount with trailing dot for Linera Amount parsing
            const formattedAmount = amount.includes('.') ? amount : `${amount}.`;

            // Use owner (public key) as the source - lowercase for Linera standard
            const sourceOwner = (owner.startsWith('0x') ? owner : `0x${owner}`).toLowerCase();
            const targetOwner = recipient.trim().toLowerCase();
            // If recipient doesn't have 0x prefix and looks like a public key, add it
            const formattedTargetOwner = targetOwner.startsWith('0x') ? targetOwner : `0x${targetOwner}`;

            console.log('🎯 From owner:', sourceOwner);
            console.log('🎯 To owner:', formattedTargetOwner);
            console.log('🎯 Target chain:', chainId);
            console.log('🎯 Amount:', formattedAmount);

            // Updated mutation format for new token contract
            const transferMutation = `mutation { 
                transfer(
                    owner: "${sourceOwner}",
                    amount: "${formattedAmount}",
                    targetChain: "${chainId}",
                    targetOwner: "${formattedTargetOwner}"
                )
            }`;

            console.log('🔐 Transfer mutation (via WASM):', transferMutation);

            const result = await executeTokenMutation(transferMutation);
            console.log('✅ Transfer result:', result);

            setSuccess(true);
            setAmount('');
            setRecipient('');

            // Wait for operation to process
            console.log('⏳ Waiting for transfer to complete...');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Refresh header balance
            await refreshBalance();

            if (onSuccess) {
                setTimeout(() => onSuccess(), 1500);
            }
        } catch (err) {
            console.error('❌ Transfer failed:', err);
            setError(err instanceof Error ? err.message : 'Transfer failed');
        } finally {
            setTransferring(false);
        }
    };

    if (status !== 'Ready' || !TOKEN_APP_ID) {
        return null;
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-alethea-50 rounded-lg flex items-center justify-center">
                        <Send className="w-5 h-5 text-alethea-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-black">Transfer Tokens</h3>
                        <p className="text-sm text-grey-600">Send tokens to another address</p>
                    </div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-grey-50 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4 text-grey-600" />
                    </button>
                )}
            </div>

            <div className="bg-alethea-50 border border-alethea-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-alethea-700">Available Balance</p>
                <p className="text-lg font-bold text-alethea-600">{availableBalance.toFixed(2)} tokens</p>
            </div>

            <form onSubmit={handleTransfer} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-grey-700 mb-2">
                        Recipient Address
                        <span className="text-xs text-grey-600 block mt-1">
                            Enter chain ID (64 hex chars) or account address
                        </span>
                    </label>
                    <input
                        type="text"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        className="input font-mono text-sm"
                        placeholder="e.g., 268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f"
                        disabled={transferring}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-grey-700 mb-2">
                        Amount
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min="0.01"
                            step="0.01"
                            max={availableBalance}
                            className="input pr-20"
                            placeholder="0.00"
                            disabled={transferring}
                        />
                        <button
                            type="button"
                            onClick={() => setAmount(availableBalance.toFixed(2))}
                            className="absolute right-2 top-2 px-3 py-1 text-sm bg-alethea-50 text-alethea-600 rounded hover:bg-alethea-100 transition-colors"
                        >
                            MAX
                        </button>
                    </div>
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex gap-2">
                    {[10, 50, 100, 500].map((val) => (
                        <button
                            key={val}
                            type="button"
                            onClick={() => setAmount(Math.min(val, availableBalance).toString())}
                            className="flex-1 px-2 py-1 text-sm bg-grey-50 hover:bg-grey-100 text-grey-700 rounded-md border border-grey-100 transition-colors"
                            disabled={transferring}
                        >
                            {val}
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <p className="text-sm text-emerald-700">Transfer successful!</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={transferring || !amount || !recipient}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${amount && recipient
                        ? 'btn-primary'
                        : 'bg-grey-50 text-grey-600 cursor-not-allowed'
                        }`}
                >
                    {transferring ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Transferring...
                        </>
                    ) : (
                        <>
                            <Send className="w-4 h-4" />
                            Transfer
                        </>
                    )}
                </button>
            </form>

            <div className="mt-4 p-3 bg-grey-50 border border-grey-100 rounded-lg">
                <p className="text-xs text-grey-600">
                    <strong className="text-grey-700">How it works:</strong> Transfers use secure cross-chain messaging.
                    Tokens are sent directly to the recipient's chain using authenticated messages.
                </p>
            </div>
        </div>
    );
}
