import { useState } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { useToken } from '../contexts/TokenContext';
import { Gift, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const TOKEN_APP_ID = import.meta.env.VITE_TOKEN_APP_ID || '';
const TOKEN_CHAIN_ID = import.meta.env.VITE_TOKEN_CHAIN_ID || import.meta.env.VITE_CHAIN_ID;
const SERVICE_URL = import.meta.env.VITE_SERVICE_URL || '';

interface ClaimRewardsProps {
    pendingRewards?: string;
    voterAddress?: string;
    onSuccess?: () => void;
}

export default function ClaimRewards({ pendingRewards = '0', voterAddress, onSuccess }: ClaimRewardsProps) {
    const { chainId, owner, status, executeAppChainMutation, tokenApplication } = useLinera();
    const { refreshBalance } = useToken();
    const [claiming, setClaiming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [step, setStep] = useState<string>('');

    const hasPendingRewards = parseFloat(pendingRewards) > 0;
    const isWasmReady = !!tokenApplication;

    const handleClaim = async () => {
        if (!chainId || !hasPendingRewards || !owner) return;

        setClaiming(true);
        setError(null);
        setSuccess(false);

        try {
            // Use voter address without 0x prefix
            const voterAddr = voterAddress || (owner.startsWith('0x') ? owner.slice(2) : owner).toLowerCase();
            const userOwner = (owner.startsWith('0x') ? owner : `0x${owner}`).toLowerCase();
            const rewardAmount = pendingRewards.includes('.') ? pendingRewards : `${pendingRewards}.`;

            console.log('🎁 Claiming rewards...');
            console.log('   voterAddress:', voterAddr);
            console.log('   pendingRewards:', pendingRewards);

            // Step 1: Claim rewards in registry
            setStep('Step 1/3: Claiming rewards...');
            const mutation = `mutation { executeClaimRewardsFor(voterAddress: "${voterAddr}") }`;
            await executeAppChainMutation(mutation);
            console.log('✅ Rewards claimed in registry');

            // Step 2: Transfer reward tokens from treasury to user
            if (TOKEN_APP_ID && chainId) {
                setStep('Step 2/3: Transferring tokens...');
                try {
                    const treasuryOwner = '0x97f8b39f99b4097e4f05961d3a93539dbcd99851091809eaf7588d74123649b4';

                    const transferResponse = await fetch(`${SERVICE_URL}/chains/${TOKEN_CHAIN_ID}/applications/${TOKEN_APP_ID}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            query: `mutation { 
                                transfer(
                                    owner: "${treasuryOwner}",
                                    amount: "${rewardAmount}",
                                    targetAccount: {
                                        chainId: "${chainId}",
                                        owner: "${userOwner}"
                                    }
                                )
                            }`
                        }),
                    });

                    const transferResult = await transferResponse.json();
                    if (transferResult.errors?.length > 0) {
                        console.warn('Transfer warning:', transferResult.errors[0].message);
                    }

                    // Step 3: Receive tokens via WASM
                    setStep('Step 3/3: Receiving tokens...');
                    await new Promise(resolve => setTimeout(resolve, 3000));

                    if (tokenApplication) {
                        const balanceQuery = `{ accounts { entry(key: "${userOwner}") { value } } }`;
                        for (let i = 0; i < 3; i++) {
                            try {
                                await tokenApplication.query(JSON.stringify({ query: balanceQuery }));
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            } catch (err) {
                                console.warn('Balance query failed:', err);
                            }
                        }
                    }
                } catch (transferErr) {
                    console.warn('Token transfer warning:', transferErr);
                }
            }

            console.log('✅ Rewards claimed!');
            setSuccess(true);
            await refreshBalance();

            if (onSuccess) {
                setTimeout(() => onSuccess(), 1500);
            }
        } catch (err) {
            console.error('Failed to claim rewards:', err);
            setError(err instanceof Error ? err.message : 'Failed to claim rewards');
        } finally {
            setClaiming(false);
            setStep('');
        }
    };

    if (status !== 'Ready') {
        return null;
    }

    return (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Gift className="w-5 h-5 text-green-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-gray-900">Pending Rewards</h3>
                    <p className="text-sm text-gray-500">Claim your voting rewards</p>
                </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-green-600 mb-1">Available to Claim</p>
                <p className="text-2xl font-bold text-green-700">
                    {parseFloat(pendingRewards).toFixed(2)} ALTH
                </p>
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
                    <p className="text-sm text-amber-700">Connecting...</p>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {success && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <p className="text-sm text-green-700">Rewards claimed!</p>
                </div>
            )}

            <button
                onClick={handleClaim}
                disabled={claiming || !hasPendingRewards || !isWasmReady}
                className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 ${hasPendingRewards && !claiming && isWasmReady
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
            >
                {claiming ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Claiming...
                    </>
                ) : (
                    <>
                        <Gift className="w-4 h-4" />
                        {hasPendingRewards ? 'Claim Rewards' : 'No Rewards'}
                    </>
                )}
            </button>
        </div>
    );
}
