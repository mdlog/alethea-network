import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLinera } from '../contexts/LineraContext';
import { Wallet, LogOut, Loader2, ChevronDown, Copy, Check, User, Link as LinkIcon, Coins, Menu, X } from 'lucide-react';
import TokenBalance from './TokenBalance';
import WalletConnectModal from './WalletConnectModal';

export default function Header() {
    const { chainId, owner, status, loading, walletExists, walletType, application, resetWallet } = useLinera();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showConnectModal, setShowConnectModal] = useState(false);
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

    // Get wallet type display info
    const getWalletTypeInfo = () => {
        if (walletType === 'metamask') {
            return {
                label: 'MetaMask',
                color: 'bg-orange-100 text-orange-700 border-orange-200',
                icon: (
                    <svg viewBox="0 0 40 40" className="w-3.5 h-3.5">
                        <path fill="#E17726" d="M35.9 5L22.1 15.3l2.5-6L35.9 5z"/>
                        <path fill="#E27625" d="M4.1 5l13.6 10.4-2.4-6L4.1 5zM31 27.3l-3.6 5.6 7.8 2.1 2.2-7.6-6.4-.1zM2.6 27.4l2.2 7.6 7.8-2.1-3.6-5.6-6.4.1z"/>
                        <path fill="#E27625" d="M12.1 17.5l-2.2 3.3 7.7.3-.3-8.3-5.2 4.7zM27.9 17.5l-5.3-4.8-.2 8.4 7.7-.3-2.2-3.3zM12.6 32.9l4.7-2.3-4-3.2-.7 5.5zM22.7 30.6l4.7 2.3-.7-5.5-4 3.2z"/>
                        <path fill="#F5841F" d="M35 21.1l-7.2-2.1 2.2 3.3-3.1 6.1 4.1-.1h6.1l-2.1-7.2zM12.2 19l-7.2 2.1-2.4 7.3h6.1l4.1.1-3.1-6.1 2.5-3.4zM22.4 21.1l.5-8.3 2.1-5.7H15l2.1 5.7.5 8.3.2 2.5v5.9h4.2l.1-5.9.3-2.5z"/>
                    </svg>
                ),
            };
        }
        return {
            label: 'Local',
            color: 'bg-alethea-100 text-alethea-700 border-alethea-200',
            icon: null,
        };
    };

    const walletInfo = getWalletTypeInfo();

    return (
        <>
            <header className="sticky top-0 z-50 bg-white border-b border-grey-100">
                <div className="container mx-auto px-2 sm:px-4">
                    <div className="flex items-center justify-between h-14 sm:h-16">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-1.5 sm:gap-2 md:gap-3 group flex-shrink-0">
                            <img src="/logo.png" alt="Alethea" className="w-6 h-6 sm:w-7 sm:h-7 md:w-9 md:h-9 rounded-md sm:rounded-lg" />
                            <div className="flex flex-col">
                                <span className="font-bold text-sm sm:text-base md:text-lg text-black tracking-tight">Alethea</span>
                                <span className="text-[8px] sm:text-[9px] md:text-[10px] text-alethea-600 font-medium tracking-wider uppercase -mt-0.5 hidden sm:block">Oracle Network</span>
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
                        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                            {/* Token Balance (compact) - hidden on small screens */}
                            {chainId && <div className="hidden sm:block"><TokenBalance compact showRefresh={false} /></div>}

                            {loading ? (
                                <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-grey-50 border border-grey-200 rounded-md sm:rounded-lg">
                                    <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin text-alethea-500" />
                                    <span className="text-[10px] sm:text-xs text-grey-600 hidden sm:inline">{status}</span>
                                </div>
                            ) : walletExists && chainId ? (
                                <div className="relative" ref={dropdownRef}>
                                    {/* Dropdown Trigger */}
                                    <button
                                        onClick={() => setDropdownOpen(!dropdownOpen)}
                                        className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-alethea-50 border border-alethea-200 rounded-md sm:rounded-lg hover:bg-alethea-100 transition-all duration-200"
                                    >
                                        {/* Wallet Type Indicator */}
                                        {walletType === 'metamask' ? (
                                            <svg viewBox="0 0 40 40" className="w-3.5 h-3.5 sm:w-4 sm:h-4">
                                                <path fill="#E17726" d="M35.9 5L22.1 15.3l2.5-6L35.9 5z"/>
                                                <path fill="#E27625" d="M4.1 5l13.6 10.4-2.4-6L4.1 5z"/>
                                                <path fill="#F5841F" d="M35 21.1l-7.2-2.1 2.2 3.3-3.1 6.1 4.1-.1h6.1l-2.1-7.2zM12.2 19l-7.2 2.1-2.4 7.3h6.1l4.1.1-3.1-6.1 2.5-3.4z"/>
                                            </svg>
                                        ) : (
                                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500" />
                                        )}
                                        <span className="text-[10px] sm:text-xs font-medium text-alethea-700 font-mono">
                                            {shortenAddress(chainId)}
                                        </span>
                                        <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-alethea-600 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Dropdown Menu - Full width on mobile */}
                                    {dropdownOpen && (
                                        <div className="absolute right-0 mt-2 w-[calc(100vw-1rem)] sm:w-80 max-w-[320px] bg-white rounded-xl shadow-card-hover border border-grey-100 py-2 animate-slide-down">
                                            {/* Wallet Type Badge */}
                                            <div className="px-4 py-2 border-b border-grey-100">
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full border ${walletInfo.color}`}>
                                                        {walletInfo.icon}
                                                        {walletInfo.label} Wallet
                                                    </span>
                                                    <span className={`w-2 h-2 rounded-full ${application ? 'bg-success' : 'bg-warning animate-pulse'}`} />
                                                    <span className={`text-xs ${application ? 'text-green-700' : 'text-amber-700'}`}>
                                                        {application ? 'Connected' : 'Syncing...'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Chain ID */}
                                            <div className="px-4 py-3 border-b border-grey-100">
                                                <div className="flex items-center gap-2 text-grey-600 mb-1">
                                                    <LinkIcon className="w-3 h-3" />
                                                    <span className="text-xs font-medium uppercase tracking-wider">Linera Chain ID</span>
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
                                                        <span className="text-xs font-medium uppercase tracking-wider">
                                                            {walletType === 'metamask' ? 'MetaMask Address' : 'Account Owner'}
                                                        </span>
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
                                    onClick={() => setShowConnectModal(true)}
                                    className="btn-primary flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs md:text-sm rounded-md sm:rounded-lg"
                                >
                                    <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    <span className="hidden sm:inline">Connect Wallet</span>
                                    <span className="sm:hidden">Connect</span>
                                </button>
                            )}

                            {/* Mobile Menu Toggle */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="lg:hidden p-1.5 sm:p-2 hover:bg-grey-50 rounded-md sm:rounded-lg transition-colors"
                            >
                                {mobileMenuOpen ? (
                                    <X className="w-4 h-4 sm:w-5 sm:h-5 text-grey-600" />
                                ) : (
                                    <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-grey-600" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Navigation */}
                    {mobileMenuOpen && (
                        <nav className="lg:hidden py-2 sm:py-3 border-t border-grey-100 animate-slide-down">
                            {/* Token Balance in Mobile Menu (when connected) */}
                            {chainId && (
                                <div className="px-2 pb-2 sm:hidden border-b border-grey-100 mb-2">
                                    <TokenBalance compact showRefresh={false} />
                                </div>
                            )}
                            <div className="flex flex-col gap-0.5 sm:gap-1">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.path}
                                        to={link.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`mx-1 px-3 py-2.5 sm:py-3 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                                            isActive(link.path)
                                                ? 'text-alethea-600 bg-alethea-50 border-l-2 border-alethea-500'
                                                : 'text-grey-700 hover:text-black hover:bg-grey-50'
                                        }`}
                                    >
                                        {link.icon && <span className="w-4 h-4">{link.icon}</span>}
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        </nav>
                    )}
                </div>
            </header>

            {/* Wallet Connect Modal */}
            <WalletConnectModal
                isOpen={showConnectModal}
                onClose={() => setShowConnectModal(false)}
            />
        </>
    );
}
