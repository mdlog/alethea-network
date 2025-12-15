import { useState } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { useToken } from '../contexts/TokenContext';
import { ArrowDownCircle, Loader2, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface WithdrawStakeProps {
    availableStake: string;
    lockedStake: string;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function WithdrawStake({
    availableStake,
    lockedStake,
    onSuccess,
    onCancel
}: WithdrawStakeProps) {
    const { chainId, status, executeMutation } = useLinera();
    const { refreshBalance } = useToken();
    const [amount, setAmount] = useState('');
    const [withdrawing, setWithdrawing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const available = parseFloat(availableStake) || 0;
    const locked = parseFloat(lockedStake) || 0;
    const canWithdraw = available > 0;

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chainId || !canWithdraw) return;

        const withdrawAmount = parseFloat(amount);
        if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (withdrawAmount > available) {
            setError(`Maximum withdrawal is ${available.toFixed(0)} tokens`);
            return;
        }

        setWithdrawing(true);
        setError(null);
        setSuccess(false);

        try {
            console.log('💸 Withdrawing stake:', amount);

            // Use cross-chain messaging via WASM
            const REGISTRY_CHAIN_ID = import.meta.env.VITE_CHAIN_ID || '208873b668818fc962d8470c68698dc5dff2321720a9bb0d74576d45f4f73c91';
            const mutation = `mutation { sendWithdrawStakeMessage(targetChain: "${REGISTRY_CHAIN_ID}", amount: "${amount}") }`;
            console.log('📤 Sending cross-chain withdraw message:', mutation);
            await executeMutation(mutation);

            console.log('✅ Stake withdrawn successfully!');
            setSuccess(true);
            setAmount('');

            // Refresh header balance
            await refreshBalance();

            if (onSuccess) {
                setTimeout(() => onSuccess(), 1500);
            }
        } catch (err) {
            console.error('❌ Failed to withdraw stake:', err);
            setError(err instanceof Error ? err.message : 'Failed to withdraw stake');
        } finally {
            setWithdrawing(false);
        }
    };

    const handleMaxClick = () => {
        setAmount(available.toFixed(0));
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
                    <p className="text-sm text-gray-500">Withdraw your staked tokens</p>
                </div>
            </div>

            {/* Stake Info */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs text-green-600">Available</p>
                    <p className="text-lg font-bold text-green-700">{available.toFixed(0)}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Locked</p>
                    <p className="text-lg font-bold text-gray-700">{locked.toFixed(0)}</p>
                </div>
            </div>

            {/* Warning if stake is locked */}
            {locked > 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                    <Info className="w-4 h-4 text-amber-500 mt-0.5" />
                    <p className="text-sm text-amber-700">
                        {locked.toFixed(0)} tokens are locked due to active votes.
                        You can only withdraw available stake.
                    </p>
                </div>
            )}

            <form onSubmit={handleWithdraw} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount to Withdraw
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min="1"
                            max={available}
                            step="1"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 pr-16"
                            placeholder="0"
                            disabled={withdrawing || !canWithdraw}
                        />
                        <button
                            type="button"
                            onClick={handleMaxClick}
                            className="absolute right-2 top-2 px-3 py-1 text-sm bg-orange-100 text-orange-600 rounded hover:bg-orange-200 transition-colors"
                            disabled={!canWithdraw}
                        >
                            MAX
                        </button>
                    </div>
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex gap-2">
                    {[25, 50, 75, 100].map((pct) => {
                        const val = Math.floor(available * pct / 100);
                        return (
                            <button
                                key={pct}
                                type="button"
                                onClick={() => setAmount(val.toString())}
                                className="flex-1 px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                                disabled={withdrawing || !canWithdraw}
                            >
                                {pct}%
                            </button>
                        );
                    })}
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
                        <p className="text-sm text-green-700">Stake withdrawn successfully!</p>
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        type="submit"
                        disabled={withdrawing || !canWithdraw || !amount}
                        className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${canWithdraw && amount
                            ? 'bg-orange-600 text-white hover:bg-orange-700'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            }`}
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
                            className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
