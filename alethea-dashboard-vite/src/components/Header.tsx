import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLinera } from '../contexts/LineraContext';
import { Wallet, LogOut, Loader2, ChevronDown, Copy, Check, User, Link as LinkIcon, Coins, Menu, X } from 'lucide-react';
import TokenBalance from './TokenBalance';

export default function Header() {
    const { chainId, owner, status, loading, walletExists, application, createWallet, resetWallet } = useLinera();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [copied, setCopied] = useState<'chain' | 'owner' | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const location = useLocation();

    const shortenAddress = (addr: string) => {
        if (!addr) return '';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const copyToClipboard = async (text: string, type: 'chain' | 'owner') => {
        await navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
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

    const navLinks = [
        { path: '/', label: 'Dashboard' },
        { path: '/voters', label: 'Voters' },
        { path: '/queries', label: 'Queries' },
        { path: '/token', label: 'Token', icon: <Coins className="w-4 h-4" /> },
        ...(chainId ? [{ path: '/profile', label: 'Profile' }] : []),
        { path: '/docs', label: 'Docs' },
    ];

    return (
        <header className="sticky top-0 z-50 bg-white border-b border-grey-100">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <img src="/logo.png" alt="Alethea" className="w-9 h-9 rounded-lg" />
                        <div className="flex flex-col">
                            <span className="font-bold text-lg text-black tracking-tight">Alethea</span>
                            <span className="text-[10px] text-alethea-600 font-medium tracking-wider uppercase -mt-1">Oracle Network</span>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                                    isActive(link.path)
                                        ? 'text-alethea-600 bg-alethea-50'
                                        : 'text-grey-700 hover:text-black hover:bg-grey-50'
                                }`}
                            >
                                {link.icon}
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Wallet & Token Balance */}
                    <div className="flex items-center gap-3">
                        {/* Token Balance (compact) */}
                        {chainId && <TokenBalance compact showRefresh={false} />}

                        {loading ? (
                            <div className="flex items-center gap-2 px-4 py-2 bg-grey-50 border border-grey-200 rounded-lg">
                                <Loader2 className="w-4 h-4 animate-spin text-alethea-500" />
                                <span className="text-sm text-grey-600">{status}</span>
                            </div>
                        ) : walletExists && chainId ? (
                            <div className="relative" ref={dropdownRef}>
                                {/* Dropdown Trigger */}
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center gap-2 px-4 py-2 bg-alethea-50 border border-alethea-200 rounded-lg hover:bg-alethea-100 transition-all duration-200"
                                >
                                    <span className="status-dot-active" />
                                    <span className="text-sm font-medium text-alethea-700 font-mono">
                                        {shortenAddress(chainId)}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-alethea-600 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown Menu */}
                                {dropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-card-hover border border-grey-100 py-2 animate-slide-down">
                                        {/* WASM Status */}
                                        <div className="px-4 py-2 border-b border-grey-100">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${application ? 'bg-success' : 'bg-warning animate-pulse'}`} />
                                                <span className={`text-xs font-medium ${application ? 'text-green-700' : 'text-amber-700'}`}>
                                                    {application ? 'WASM Connected' : 'WASM Connecting...'}
                                                </span>
                                            </div>
                                            {!application && (
                                                <p className="text-xs text-grey-600 mt-1">
                                                    Connecting to blockchain in background
                                                </p>
                                            )}
                                        </div>

                                        {/* Chain ID */}
                                        <div className="px-4 py-3 border-b border-grey-100">
                                            <div className="flex items-center gap-2 text-grey-600 mb-1">
                                                <LinkIcon className="w-3 h-3" />
                                                <span className="text-xs font-medium uppercase tracking-wider">Chain ID</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-mono text-black break-all pr-2">
                                                    {shortenAddress(chainId)}
                                                </span>
                                                <button
                                                    onClick={() => copyToClipboard(chainId, 'chain')}
                                                    className="p-1.5 hover:bg-grey-50 rounded-md transition-colors"
                                                    title="Copy Chain ID"
                                                >
                                                    {copied === 'chain' ? (
                                                        <Check className="w-4 h-4 text-success" />
                                                    ) : (
                                                        <Copy className="w-4 h-4 text-grey-600" />
                                                    )}
                                                </button>
                                            </div>
                                            <p className="text-xs text-grey-600 mt-1 font-mono break-all">
                                                {chainId}
                                            </p>
                                        </div>

                                        {/* Owner */}
                                        {owner && (
                                            <div className="px-4 py-3 border-b border-grey-100">
                                                <div className="flex items-center gap-2 text-grey-600 mb-1">
                                                    <User className="w-3 h-3" />
                                                    <span className="text-xs font-medium uppercase tracking-wider">Account Owner</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-mono text-black break-all pr-2">
                                                        {shortenAddress(owner)}
                                                    </span>
                                                    <button
                                                        onClick={() => copyToClipboard(owner, 'owner')}
                                                        className="p-1.5 hover:bg-grey-50 rounded-md transition-colors"
                                                        title="Copy Owner"
                                                    >
                                                        {copied === 'owner' ? (
                                                            <Check className="w-4 h-4 text-success" />
                                                        ) : (
                                                            <Copy className="w-4 h-4 text-grey-600" />
                                                        )}
                                                    </button>
                                                </div>
                                                <p className="text-xs text-grey-600 mt-1 font-mono break-all">
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
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-error hover:bg-red-50 rounded-lg transition-colors"
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
                                className="btn-primary flex items-center gap-2"
                            >
                                <Wallet className="w-4 h-4" />
                                <span>Connect Wallet</span>
                            </button>
                        )}

                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="lg:hidden p-2 hover:bg-grey-50 rounded-lg transition-colors"
                        >
                            {mobileMenuOpen ? (
                                <X className="w-5 h-5 text-grey-600" />
                            ) : (
                                <Menu className="w-5 h-5 text-grey-600" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {mobileMenuOpen && (
                    <nav className="lg:hidden py-4 border-t border-grey-100 animate-slide-down">
                        <div className="flex flex-col gap-1">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                                        isActive(link.path)
                                            ? 'text-alethea-600 bg-alethea-50 border-l-2 border-alethea-500'
                                            : 'text-grey-700 hover:text-black hover:bg-grey-50'
                                    }`}
                                >
                                    {link.icon}
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </nav>
                )}
            </div>
        </header>
    );
}
