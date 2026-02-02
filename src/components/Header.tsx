import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLinera } from '../contexts/LineraContext';
import { Wallet, LogOut, Loader2, ChevronDown, Copy, Check, User, Link as LinkIcon, Coins } from 'lucide-react';
import TokenBalance from './TokenBalance';

export default function Header() {
    const { chainId, owner, status, loading, walletExists, application, createWallet, resetWallet } = useLinera();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [copied, setCopied] = useState<'chain' | 'owner' | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const shortenAddress = (addr: string) => {
        if (!addr) return '';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const copyToClipboard = async (text: string, type: 'chain' | 'owner') => {
        await navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2">
                        <img src="/logo.png" alt="Alethea" className="w-8 h-8 rounded-lg" />
                        <span className="font-semibold text-xl text-gray-900">Alethea</span>
                    </Link>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center gap-6">
                        <Link to="/" className="text-gray-600 hover:text-gray-900 transition-colors">
                            Dashboard
                        </Link>
                        <Link to="/voters" className="text-gray-600 hover:text-gray-900 transition-colors">
                            Voters
                        </Link>
                        <Link to="/queries" className="text-gray-600 hover:text-gray-900 transition-colors">
                            Queries
                        </Link>
                        <Link to="/token" className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1">
                            <Coins className="w-4 h-4" />
                            Token
                        </Link>
                        {chainId && (
                            <Link to="/profile" className="text-gray-600 hover:text-gray-900 transition-colors">
                                Profile
                            </Link>
                        )}
                        <Link to="/integration" className="text-gray-600 hover:text-gray-900 transition-colors">
                            Integration
                        </Link>
                        <Link to="/about" className="text-gray-600 hover:text-gray-900 transition-colors">
                            About
                        </Link>
                    </nav>

                    {/* Wallet & Token Balance */}
                    <div className="flex items-center gap-3">
                        {/* Token Balance (compact) */}
                        {chainId && <TokenBalance compact showRefresh={false} />}

                        {loading ? (
                            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
                                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                                <span className="text-sm text-gray-500">{status}</span>
                            </div>
                        ) : walletExists && chainId ? (
                            <div className="relative" ref={dropdownRef}>
                                {/* Dropdown Trigger */}
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                                >
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-sm font-medium text-green-700">
                                        {shortenAddress(chainId)}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-green-600 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown Menu */}
                                {dropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                                        {/* WASM Status */}
                                        <div className="px-4 py-2 border-b border-gray-100">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${application ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></span>
                                                <span className={`text-xs font-medium ${application ? 'text-green-600' : 'text-yellow-600'}`}>
                                                    {application ? 'WASM Connected' : 'WASM Connecting...'}
                                                </span>
                                            </div>
                                            {!application && (
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Connecting to blockchain in background
                                                </p>
                                            )}
                                        </div>

                                        {/* Chain ID */}
                                        <div className="px-4 py-3 border-b border-gray-100">
                                            <div className="flex items-center gap-2 text-gray-500 mb-1">
                                                <LinkIcon className="w-3 h-3" />
                                                <span className="text-xs font-medium">Chain ID</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-mono text-gray-900 break-all pr-2">
                                                    {shortenAddress(chainId)}
                                                </span>
                                                <button
                                                    onClick={() => copyToClipboard(chainId, 'chain')}
                                                    className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                                                    title="Copy Chain ID"
                                                >
                                                    {copied === 'chain' ? (
                                                        <Check className="w-4 h-4 text-green-500" />
                                                    ) : (
                                                        <Copy className="w-4 h-4 text-gray-400" />
                                                    )}
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1 font-mono break-all">
                                                {chainId}
                                            </p>
                                        </div>

                                        {/* Owner */}
                                        {owner && (
                                            <div className="px-4 py-3 border-b border-gray-100">
                                                <div className="flex items-center gap-2 text-gray-500 mb-1">
                                                    <User className="w-3 h-3" />
                                                    <span className="text-xs font-medium">Account Owner</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-mono text-gray-900 break-all pr-2">
                                                        {shortenAddress(owner)}
                                                    </span>
                                                    <button
                                                        onClick={() => copyToClipboard(owner, 'owner')}
                                                        className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                                                        title="Copy Owner"
                                                    >
                                                        {copied === 'owner' ? (
                                                            <Check className="w-4 h-4 text-green-500" />
                                                        ) : (
                                                            <Copy className="w-4 h-4 text-gray-400" />
                                                        )}
                                                    </button>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1 font-mono break-all">
                                                    {owner}
                                                </p>
                                            </div>
                                        )}

                                        {/* Disconnect Button */}
                                        <div className="px-4 py-2">
                                            <button
                                                onClick={() => {
                                                    setDropdownOpen(false);
                                                    resetWallet();
                                                }}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                <span className="text-sm font-medium">Disconnect</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={createWallet}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Wallet className="w-4 h-4" />
                                <span>Connect Wallet</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
