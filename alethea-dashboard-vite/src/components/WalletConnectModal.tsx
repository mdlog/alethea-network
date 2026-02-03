import { useState } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { X, Wallet, Key, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

interface WalletConnectModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function WalletConnectModal({ isOpen, onClose }: WalletConnectModalProps) {
    const { createWallet, connectWithMetaMask, isMetaMaskAvailable, loading, status, error } = useLinera();
    const [connectError, setConnectError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleCreateWallet = async () => {
        setConnectError(null);
        try {
            await createWallet();
            onClose();
        } catch (err) {
            setConnectError(err instanceof Error ? err.message : 'Failed to create wallet');
        }
    };

    const handleConnectMetaMask = async () => {
        setConnectError(null);
        try {
            await connectWithMetaMask();
            onClose();
        } catch (err) {
            setConnectError(err instanceof Error ? err.message : 'Failed to connect MetaMask');
        }
    };

    const isConnecting = loading && (status === 'Creating Wallet' || status === 'Connecting MetaMask' || status === 'Claiming Chain');

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content max-w-md mx-2 sm:mx-auto" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-grey-200">
                    <h2 className="text-lg font-bold text-black">Connect Wallet</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-grey-100 rounded-lg transition-colors"
                        disabled={isConnecting}
                    >
                        <X className="w-5 h-5 text-grey-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Status/Loading */}
                    {isConnecting && (
                        <div className="flex items-center gap-3 p-4 bg-alethea-50 border border-alethea-200 rounded-lg">
                            <Loader2 className="w-5 h-5 animate-spin text-alethea-600" />
                            <div>
                                <p className="text-sm font-medium text-alethea-700">{status}</p>
                                <p className="text-xs text-alethea-600">Please wait...</p>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {(connectError || error) && !isConnecting && (
                        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-red-700">Connection Failed</p>
                                <p className="text-xs text-red-600 mt-1">{connectError || error}</p>
                            </div>
                        </div>
                    )}

                    {/* MetaMask Option */}
                    <button
                        onClick={handleConnectMetaMask}
                        disabled={isConnecting || !isMetaMaskAvailable}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                            isMetaMaskAvailable
                                ? 'border-orange-200 hover:border-orange-400 hover:bg-orange-50 cursor-pointer'
                                : 'border-grey-200 bg-grey-50 cursor-not-allowed opacity-60'
                        }`}
                    >
                        {/* MetaMask Logo */}
                        <div className="w-12 h-12 flex items-center justify-center bg-orange-100 rounded-xl flex-shrink-0">
                            <svg viewBox="0 0 40 40" className="w-8 h-8">
                                <path fill="#E17726" d="M35.9 5L22.1 15.3l2.5-6L35.9 5z"/>
                                <path fill="#E27625" d="M4.1 5l13.6 10.4-2.4-6L4.1 5zM31 27.3l-3.6 5.6 7.8 2.1 2.2-7.6-6.4-.1zM2.6 27.4l2.2 7.6 7.8-2.1-3.6-5.6-6.4.1z"/>
                                <path fill="#E27625" d="M12.1 17.5l-2.2 3.3 7.7.3-.3-8.3-5.2 4.7zM27.9 17.5l-5.3-4.8-.2 8.4 7.7-.3-2.2-3.3zM12.6 32.9l4.7-2.3-4-3.2-.7 5.5zM22.7 30.6l4.7 2.3-.7-5.5-4 3.2z"/>
                                <path fill="#D5BFB2" d="M27.4 32.9l-4.7-2.3.4 3.1v1.3l4.3-2.1zM12.6 32.9l4.3 2.1v-1.3l.4-3.1-4.7 2.3z"/>
                                <path fill="#233447" d="M17 25.6l-3.9-1.1 2.7-1.3 1.2 2.4zM23 25.6l1.2-2.4 2.8 1.3-4 1.1z"/>
                                <path fill="#CC6228" d="M12.6 32.9l.7-5.6-4.3.1 3.6 5.5zM26.7 27.3l.7 5.6 3.6-5.5-4.3-.1zM30.1 20.8l-7.7.3.7 3.9 1.2-2.4 2.8 1.3 3-3.1zM13.1 22.9l2.8-1.3 1.2 2.4.7-3.9-7.7-.3 3 3.1z"/>
                                <path fill="#E27625" d="M9.9 20.8l3.1 6.1-.1-3-3-3.1zM27.1 23.9l-.1 3 3.1-6.1-3 3.1zM17.6 21.1l-.7 3.9.9 4.5.2-5.9-.4-2.5zM22.4 21.1l-.4 2.5.2 5.9.9-4.5-.7-3.9z"/>
                                <path fill="#F5841F" d="M23.1 25l-.9 4.5.6.5 4-3.2.1-3-3.8 1.2zM13.1 23.8l.1 3 4 3.2.6-.5-.9-4.5-3.8-1.2z"/>
                                <path fill="#C0AC9D" d="M23.2 35.1v-1.3l-.3-.3h-5.8l-.3.3v1.3l-4.2-2 1.5 1.2 3 2h5.9l3-2 1.5-1.2-4.3 2z"/>
                                <path fill="#161616" d="M22.7 30.6l-.6-.5h-4.2l-.6.5-.4 3.1.3-.3h5.8l.3.3-.6-3.1z"/>
                                <path fill="#763E1A" d="M36.5 16l1.1-5.5L35.9 5l-13.2 9.8 5.1 4.3 7.2 2.1 1.6-1.8-.7-.5 1.1-1-.8-.6 1.1-.9-.8-.5zM2.4 10.5L3.5 16l-.8.6 1.1.8-.8.7 1.1 1-.7.5 1.6 1.9 7.2-2.1 5.1-4.3L4.1 5l-1.7 5.5z"/>
                                <path fill="#F5841F" d="M35 21.1l-7.2-2.1 2.2 3.3-3.1 6.1 4.1-.1h6.1l-2.1-7.2zM12.2 19l-7.2 2.1-2.4 7.3h6.1l4.1.1-3.1-6.1 2.5-3.4zM22.4 21.1l.5-8.3 2.1-5.7H15l2.1 5.7.5 8.3.2 2.5v5.9h4.2l.1-5.9.3-2.5z"/>
                            </svg>
                        </div>
                        <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-black">MetaMask</span>
                                {isMetaMaskAvailable ? (
                                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">Detected</span>
                                ) : (
                                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-grey-200 text-grey-600 rounded">Not Installed</span>
                                )}
                            </div>
                            <p className="text-xs text-grey-600 mt-0.5">
                                {isMetaMaskAvailable
                                    ? 'Connect using your MetaMask wallet'
                                    : 'Install MetaMask to use this option'}
                            </p>
                        </div>
                    </button>

                    {/* Install MetaMask Link */}
                    {!isMetaMaskAvailable && (
                        <a
                            href="https://metamask.io/download/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 text-xs text-orange-600 hover:text-orange-700"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Install MetaMask Extension
                        </a>
                    )}

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-grey-200" />
                        <span className="text-xs text-grey-500">or</span>
                        <div className="flex-1 h-px bg-grey-200" />
                    </div>

                    {/* Local Wallet Option */}
                    <button
                        onClick={handleCreateWallet}
                        disabled={isConnecting}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-alethea-200 hover:border-alethea-400 hover:bg-alethea-50 transition-all"
                    >
                        <div className="w-12 h-12 flex items-center justify-center bg-alethea-100 rounded-xl flex-shrink-0">
                            <Key className="w-6 h-6 text-alethea-600" />
                        </div>
                        <div className="flex-1 text-left">
                            <span className="font-semibold text-black">Create New Wallet</span>
                            <p className="text-xs text-grey-600 mt-0.5">
                                Generate a new wallet with mnemonic phrase
                            </p>
                        </div>
                    </button>

                    {/* Info Box */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-2">
                            <Wallet className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-blue-700">
                                <p className="font-medium mb-1">How it works</p>
                                <ul className="space-y-0.5 text-blue-600">
                                    <li>A new Linera chain will be claimed for you</li>
                                    <li>Chain ID is from Linera (not Ethereum)</li>
                                    <li>MetaMask is used only for signing</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
