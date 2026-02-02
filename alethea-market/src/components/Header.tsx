import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useLinera } from '../contexts/LineraContext';
import { TrendingUp, Wallet, LogOut, Copy, Check } from 'lucide-react';

export default function Header() {
    const location = useLocation();
    const { chainId, owner, walletExists, createWallet, resetWallet, loading, status } = useLinera();
    const [copied, setCopied] = useState<'owner' | 'chain' | null>(null);

    const navLinks = [
        { path: '/', label: 'Home' },
        { path: '/markets', label: 'Markets' },
        { path: '/how-it-works', label: 'How It Works' },
    ];

    const shortAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    const copyToClipboard = async (text: string, type: 'owner' | 'chain') => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(type);
            setTimeout(() => setCopied(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <span className="text-xl font-bold text-white">Alethea</span>
                            <span className="text-xl font-light text-purple-400"> Market</span>
                        </div>
                    </Link>

                    <nav className="hidden md:flex items-center gap-6">
                        {navLinks.map(link => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`text-sm font-medium transition-colors ${location.pathname === link.path
                                        ? 'text-white'
                                        : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center gap-3">
                        {walletExists && owner ? (
                            <div className="flex items-center gap-2">
                                <div 
                                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group"
                                    onClick={() => copyToClipboard(owner, 'owner')}
                                    title="Click to copy owner address"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400">Owner: </span>
                                        <span className="text-xs text-white font-mono">{shortAddress(owner)}</span>
                                        {copied === 'owner' ? (
                                            <Check className="w-3 h-3 text-green-400" />
                                        ) : (
                                            <Copy className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        )}
                                    </div>
                                </div>
                                <div 
                                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group"
                                    onClick={() => copyToClipboard(chainId || '', 'chain')}
                                    title="Click to copy chain ID"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400">Chain: </span>
                                        <span className="text-xs text-white font-mono">{shortAddress(chainId || '')}</span>
                                        {copied === 'chain' ? (
                                            <Check className="w-3 h-3 text-green-400" />
                                        ) : (
                                            <Copy className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={resetWallet}
                                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                    title="Disconnect"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={createWallet}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                <Wallet className="w-4 h-4" />
                                {loading ? status : 'Connect Wallet'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
