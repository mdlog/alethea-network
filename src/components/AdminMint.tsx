import { useState } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { Coins, Loader2, CheckCircle, AlertCircle, Shield } from 'lucide-react';

const TOKEN_APP_ID = import.meta.env.VITE_TOKEN_APP_ID || '';
// Use relative URL for Vite proxy, or explicit URL if set
const SERVICE_URL = import.meta.env.VITE_SERVICE_URL || '';
const TOKEN_CHAIN_ID = import.meta.env.VITE_TOKEN_CHAIN_ID || import.meta.env.VITE_CHAIN_ID;

// Admin wallet address (the one that deployed the token)
const ADMIN_ADDRESS = '0x403bc4052a40835697d74411322cec087a55a7fb81a791ed7a590e7cfd5f612a';

interface AdminMintProps {
    onSuccess?: () => void;
}

export default function AdminMint({ onSuccess }: AdminMintProps) {
    const { chainId, owner, status } = useLinera();
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('1000');
    const [minting, setMinting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Check if current user is admin
    const isAdmin = owner === ADMIN_ADDRESS || chainId === TOKEN_CHAIN_ID;

    const handleMint = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!TOKEN_APP_ID || !recipient || !amount) return;

        setMinting(true);
        setError(null);
        setSuccess(false);

        try {
            console.log('🪙 Minting tokens...');
            console.log('  To:', recipient);
            console.log('  Amount:', amount);

            const graphqlUrl = `${SERVICE_URL}/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID}`;

            // Note: This will only work if called from admin chain
            // For cross-chain mint, need to use the contract directly
            // Same-chain transfer for reliability
            const response = await fetch(graphqlUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `mutation { 
                        transfer(
                            owner: "${ADMIN_ADDRESS}",
                            amount: "${amount}.",
                            targetChain: "${TOKEN_CHAIN_ID}",
                            targetOwner: "${recipient}"
                        )
                    }`
                }),
            });

            const result = await response.json();
            console.log('Mint response:', result);

            if (result.errors?.length > 0) {
                throw new Error(result.errors[0].message);
            }

            console.log('✅ Tokens minted successfully!');
            setSuccess(true);
            setRecipient('');

            if (onSuccess) {
                setTimeout(() => onSuccess(), 1500);
            }
        } catch (err) {
            console.error('❌ Mint failed:', err);
            setError(err instanceof Error ? err.message : 'Failed to mint tokens');
        } finally {
            setMinting(false);
        }
    };

    if (status !== 'Ready' || !TOKEN_APP_ID) {
        return null;
    }

    return (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-gray-900">Admin: Distribute Tokens</h3>
                    <p className="text-sm text-gray-500">Send ALTH to users (admin only)</p>
                </div>
            </div>

            {!isAdmin && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-amber-700">
                        ⚠️ This function requires admin privileges.
                        Connect with the admin wallet to distribute tokens.
                    </p>
                </div>
            )}

            <form onSubmit={handleMint} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Recipient Owner Address
                    </label>
                    <input
                        type="text"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                        placeholder="0x... (owner address)"
                        disabled={minting}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Tokens will be sent on the same chain as the token contract
                    </p>
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
                            min="1"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 pr-16"
                            placeholder="1000"
                            disabled={minting}
                        />
                        <div className="absolute right-3 top-3 text-gray-500 font-medium">
                            ALTH
                        </div>
                    </div>
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex gap-2">
                    {['100', '500', '1000', '5000'].map((val) => (
                        <button
                            key={val}
                            type="button"
                            onClick={() => setAmount(val)}
                            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                            disabled={minting}
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
                        <p className="text-sm text-green-700">Tokens sent successfully!</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={minting || !recipient || !amount}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${recipient && amount
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                >
                    {minting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sending...
                        </>
                    ) : (
                        <>
                            <Coins className="w-4 h-4" />
                            Send Tokens
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
