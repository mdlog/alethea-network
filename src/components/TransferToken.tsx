import { useState } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { useToken } from '../contexts/TokenContext';
import { Send, Loader2, AlertCircle, CheckCircle, X } from 'lucide-react';

const TOKEN_APP_ID = import.meta.env.VITE_TOKEN_APP_ID || '';
// Use relative URL for Vite proxy, or explicit URL if set
const SERVICE_URL = import.meta.env.VITE_SERVICE_URL || '';
const TOKEN_CHAIN_ID = import.meta.env.VITE_TOKEN_CHAIN_ID || import.meta.env.VITE_CHAIN_ID;

interface TransferTokenProps {
    balance: string;
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

    const availableBalance = parseFloat(balance) || 0;

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
            console.log('📤 Transferring tokens via WASM:', amount, 'to', recipient);

            // Format amount with trailing dot for Linera Amount parsing
            const formattedAmount = amount.includes('.') ? amount : `${amount}.`;

            // Use cross-chain transfer message via WASM (authenticated)
            const mutation = `mutation { sendTransferMessage(tokenChain: "${TOKEN_CHAIN_ID}", amount: "${formattedAmount}", targetOwner: "${recipient}") }`;
            console.log('🪙 Token mutation:', mutation);

            const result = await executeTokenMutation(mutation);
            console.log('✅ Transfer successful!', result);
            setSuccess(true);
            setAmount('');
            setRecipient('');

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
        <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Send className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Transfer Tokens</h3>
                        <p className="text-sm text-gray-500">Send tokens to another address</p>
                    </div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-600">Available Balance</p>
                <p className="text-lg font-bold text-blue-700">{availableBalance.toFixed(2)} tokens</p>
            </div>

            <form onSubmit={handleTransfer} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Recipient Address
                    </label>
                    <input
                        type="text"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        placeholder="Enter chain ID or address"
                        disabled={transferring}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-20"
                            placeholder="0.00"
                            disabled={transferring}
                        />
                        <button
                            type="button"
                            onClick={() => setAmount(availableBalance.toFixed(2))}
                            className="absolute right-2 top-2 px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
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
                            className="flex-1 px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
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
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <p className="text-sm text-green-700">Transfer successful!</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={transferring || !amount || !recipient}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${amount && recipient
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
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
        </div>
    );
}
