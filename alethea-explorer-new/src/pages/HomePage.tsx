import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Activity,
    Box,
    Link2,
    Database,
    Layers,
    Clock,
    Hash,
    ChevronRight,
    X
} from 'lucide-react';
import { useAPI, useBlocks, useChains, useChainBlocks } from '../hooks/useDatabase';
import { CopyableHash } from '../components/CopyableHash';

const formatHash = (hash: string) => {
    if (!hash) return 'N/A';
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
};

const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp / 1000);
    return date.toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
};

const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const blockTimeMs = timestamp / 1000;
    const diffMs = now - blockTimeMs;
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 0) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    return `${Math.floor(diffHour / 24)}d ago`;
};

export const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isConnected, health } = useAPI();
    const { blocks, latestBlock, loading: blocksLoading } = useBlocks(5);
    const { chains, loading: chainsLoading } = useChains();

    const [searchQuery, setSearchQuery] = useState('');
    const [searchedChainId, setSearchedChainId] = useState<string | null>(null);
    const { blocks: chainBlocks, loading: chainBlocksLoading } = useChainBlocks(searchedChainId || '', 5);

    const totalBlocks = latestBlock?.block.header.height || 0;
    const totalChains = chains.length;

    // Read chain ID from URL query parameter
    useEffect(() => {
        const chainParam = searchParams.get('chain');
        if (chainParam) {
            setSearchedChainId(chainParam);
            setSearchQuery(chainParam);
        }
    }, [searchParams]);

    const clearSearch = () => {
        setSearchQuery('');
        setSearchedChainId(null);
        navigate('/'); // Clear URL parameter
    };

    const mainChainId = health?.chainId || '';
    const latestChainBlock = chainBlocks[0];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Hero Section - Only show when no search */}
            {!searchedChainId && (
                <div className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-alethea-primary/5 to-transparent"></div>
                    <div className="relative">
                        <div className="space-y-4">
                            <h1 className="text-4xl lg:text-5xl font-epilogue font-bold text-gradient tracking-tight-custom">
                                Alethea Explorer
                            </h1>
                            <p className="text-lg text-alethea-gray-light max-w-2xl">
                                Blockchain Explorer for Linera Network.
                                Explore blocks, chains, and network activity in real-time.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Network Status */}
            <div className="card bg-gradient-to-r from-alethea-card to-alethea-darker">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-lg border ${isConnected
                            ? 'bg-green-500/20 border-green-500/30'
                            : 'bg-yellow-500/20 border-yellow-500/30'
                            }`}>
                            <Activity className={`w-6 h-6 ${isConnected ? 'text-green-400' : 'text-yellow-400'}`} />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-white">
                                {isConnected ? 'Network Connected' : 'Connecting to Network...'}
                            </h2>
                            <p className="text-sm text-alethea-gray-light">
                                {health?.network || 'Conway Testnet'} • Chain: {health?.chainId?.slice(0, 16)}...
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400 animate-pulse'}`}></div>
                        <span className="text-sm text-alethea-gray-light">
                            {isConnected ? 'Live' : 'Connecting'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Chain Search Results */}
            {searchedChainId && (
                <div className="card">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
                                <Link2 className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-epilogue font-semibold text-white">Chain Details</h2>
                                <p className="text-sm text-alethea-gray-light">Information for searched chain</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            {searchedChainId === mainChainId && (
                                <span className="px-3 py-1 bg-alethea-primary/20 text-alethea-primary rounded-full text-xs font-medium">
                                    Main Chain
                                </span>
                            )}
                            <button
                                onClick={clearSearch}
                                className="p-2 hover:bg-alethea-darker/50 rounded-lg transition-colors group"
                                title="Clear search"
                            >
                                <X className="w-5 h-5 text-alethea-gray-medium group-hover:text-white" />
                            </button>
                        </div>
                    </div>

                    {/* Chain ID */}
                    <div className="mb-6 p-4 bg-alethea-darker/50 rounded-lg border border-alethea-border/50">
                        <div className="text-sm text-alethea-gray-light mb-2">Chain ID</div>
                        <CopyableHash value={searchedChainId} format="full" showCopyIcon={true} />
                    </div>

                    {/* Chain Info from Latest Block */}
                    {chainBlocksLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="loading-spinner h-8 w-8"></div>
                        </div>
                    ) : latestChainBlock ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                <div className="p-4 bg-alethea-darker/30 rounded-lg border border-alethea-border/50">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Box className="w-4 h-4 text-blue-400" />
                                        <span className="text-sm text-alethea-gray-light">Height</span>
                                    </div>
                                    <div className="text-lg font-semibold text-blue-400">
                                        {latestChainBlock.block.header.height}
                                    </div>
                                </div>
                                <div className="p-4 bg-alethea-darker/30 rounded-lg border border-alethea-border/50">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Hash className="w-4 h-4 text-purple-400" />
                                        <span className="text-sm text-alethea-gray-light">Epoch</span>
                                    </div>
                                    <div className="text-lg font-semibold text-purple-400">
                                        {latestChainBlock.block.header.epoch}
                                    </div>
                                </div>
                                <div className="p-4 bg-alethea-darker/30 rounded-lg border border-alethea-border/50">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Clock className="w-4 h-4 text-green-400" />
                                        <span className="text-sm text-alethea-gray-light">Timestamp</span>
                                    </div>
                                    <div className="text-sm font-semibold text-green-400">
                                        {formatTimestamp(latestChainBlock.block.header.timestamp)}
                                    </div>
                                </div>
                                <div className="p-4 bg-alethea-darker/30 rounded-lg border border-alethea-border/50">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Hash className="w-4 h-4 text-orange-400" />
                                        <span className="text-sm text-alethea-gray-light">Block Hash</span>
                                    </div>
                                    <div className="text-xs font-mono text-orange-400 truncate">
                                        {latestChainBlock.hash ?
                                            `${latestChainBlock.hash.slice(0, 12)}...${latestChainBlock.hash.slice(-8)}` :
                                            'N/A'}
                                    </div>
                                </div>
                            </div>

                            {/* Recent Blocks for Chain */}
                            <div>
                                <h4 className="text-sm font-medium text-alethea-gray-light mb-4">Recent Blocks</h4>
                                <div className="space-y-2">
                                    {chainBlocks.map((block) => (
                                        <Link
                                            key={block.hash}
                                            to={`/block/${block.hash}`}
                                            className="flex items-center justify-between p-3 bg-alethea-darker/30 rounded-lg hover:bg-alethea-darker/50 transition-colors group"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <Box className="w-4 h-4 text-alethea-gray-medium" />
                                                <span className="text-white">Block #{block.block.header.height}</span>
                                                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                                                    {block.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-4">
                                                <span className="text-alethea-gray-light text-sm">
                                                    {formatTimeAgo(block.block.header.timestamp)}
                                                </span>
                                                <ChevronRight className="w-4 h-4 text-alethea-gray-medium group-hover:text-alethea-primary transition-colors" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-8 text-alethea-gray-light">
                            <Link2 className="w-12 h-12 mx-auto text-alethea-gray-medium mb-4" />
                            <p>No blocks found for this chain</p>
                        </div>
                    )}
                </div>
            )}

            {/* Stats Overview - Only show when no search */}
            {!searchedChainId && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    <div className="card stat-card group hover:scale-[1.02] transition-transform">
                        <div className="flex items-center justify-center mb-2">
                            <Box className="w-5 h-5 text-blue-400 opacity-70 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="stat-number text-blue-400">
                            {blocksLoading ? '...' : totalBlocks.toLocaleString()}
                        </div>
                        <div className="text-alethea-gray-light mt-1 text-sm">Total Blocks</div>
                    </div>
                    <div className="card stat-card group hover:scale-[1.02] transition-transform">
                        <div className="flex items-center justify-center mb-2">
                            <Link2 className="w-5 h-5 text-purple-400 opacity-70 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="stat-number text-purple-400">
                            {chainsLoading ? '...' : totalChains}
                        </div>
                        <div className="text-alethea-gray-light mt-1 text-sm">Active Chains</div>
                    </div>
                    <div className="card stat-card group hover:scale-[1.02] transition-transform">
                        <div className="flex items-center justify-center mb-2">
                            <Layers className="w-5 h-5 text-green-400 opacity-70 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="stat-number text-green-400">
                            {blocksLoading ? '...' : blocks.length}
                        </div>
                        <div className="text-alethea-gray-light mt-1 text-sm">Recent Blocks</div>
                    </div>
                    <div className="card stat-card group hover:scale-[1.02] transition-transform">
                        <div className="flex items-center justify-center mb-2">
                            <Database className="w-5 h-5 text-yellow-400 opacity-70 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="stat-number text-yellow-400">
                            {isConnected ? 'Live' : 'Offline'}
                        </div>
                        <div className="text-alethea-gray-light mt-1 text-sm">Network Status</div>
                    </div>
                </div>
            )}

            {/* Latest Block Info - Only show when no search */}
            {!searchedChainId && latestBlock && (
                <div className="card">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                                <Box className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-epilogue font-semibold text-white">
                                    Latest Block
                                </h2>
                                <p className="text-sm text-alethea-gray-light">Most recent block on the chain</p>
                            </div>
                        </div>
                        <Link to="/blocks" className="text-sm text-alethea-primary hover:text-alethea-glow transition-colors">
                            View All Blocks →
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-4 bg-alethea-darker/50 rounded-lg border border-alethea-border/50">
                            <div className="text-sm text-alethea-gray-light mb-1">Block Height</div>
                            <div className="text-lg font-semibold text-white">
                                #{latestBlock.block.header.height.toLocaleString()}
                            </div>
                        </div>
                        <div className="p-4 bg-alethea-darker/50 rounded-lg border border-alethea-border/50">
                            <div className="text-sm text-alethea-gray-light mb-1">Block Hash</div>
                            <div className="text-lg font-mono text-blue-400">
                                {formatHash(latestBlock.hash)}
                            </div>
                        </div>
                        <div className="p-4 bg-alethea-darker/50 rounded-lg border border-alethea-border/50">
                            <div className="text-sm text-alethea-gray-light mb-1">Timestamp</div>
                            <div className="text-sm font-semibold text-white">
                                {formatTimestamp(latestBlock.block.header.timestamp)}
                            </div>
                        </div>
                        <div className="p-4 bg-alethea-darker/50 rounded-lg border border-alethea-border/50">
                            <div className="text-sm text-alethea-gray-light mb-1">Chain ID</div>
                            <div className="text-sm font-mono text-purple-400">
                                {formatHash(latestBlock.block.header.chainId)}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Links - Only show when no search */}
            {!searchedChainId && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link to="/blocks" className="card group hover:border-alethea-primary/50 transition-all">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-blue-500/20 rounded-lg border border-blue-500/30 group-hover:bg-blue-500/30 transition-colors">
                                <Box className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold group-hover:text-alethea-primary transition-colors">Blocks Explorer</h3>
                                <p className="text-sm text-alethea-gray-light">
                                    Height: {latestBlock?.block.header.height.toLocaleString() || '...'}
                                </p>
                            </div>
                        </div>
                    </Link>

                    <Link to="/chains" className="card group hover:border-alethea-primary/50 transition-all">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-purple-500/20 rounded-lg border border-purple-500/30 group-hover:bg-purple-500/30 transition-colors">
                                <Link2 className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold group-hover:text-alethea-primary transition-colors">Chains</h3>
                                <p className="text-sm text-alethea-gray-light">
                                    {totalChains} active chains
                                </p>
                            </div>
                        </div>
                    </Link>

                    <div className="card group">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-green-500/20 rounded-lg border border-green-500/30">
                                <Activity className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">Network Status</h3>
                                <p className="text-sm text-alethea-gray-light">
                                    {isConnected ? 'Connected & Synced' : 'Connecting...'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Blocks Preview - Only show when no search */}
            {!searchedChainId && blocks.length > 0 && (
                <div className="card">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                                <Layers className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-epilogue font-semibold text-white">Recent Blocks</h2>
                                <p className="text-sm text-alethea-gray-light">Latest blocks on the network</p>
                            </div>
                        </div>
                        <Link to="/blocks" className="text-sm text-alethea-primary hover:text-alethea-glow transition-colors">
                            View All →
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {blocks.slice(0, 5).map((block, index) => (
                            <Link
                                key={index}
                                to={`/block/${block.hash}`}
                                className="block p-4 bg-alethea-darker/50 rounded-lg border border-alethea-border/50 hover:border-alethea-primary/50 transition-all"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-blue-500/20 rounded border border-blue-500/30">
                                            <Hash className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <div>
                                            <span className="text-white font-semibold">Block #{block.block.header.height.toLocaleString()}</span>
                                            <p className="text-xs text-alethea-gray-light font-mono">{formatHash(block.hash)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2 text-sm text-alethea-gray-light">
                                        <Clock className="w-4 h-4" />
                                        <span>{formatTimestamp(block.block.header.timestamp)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-3 border-t border-alethea-border/30">
                                    <span className="text-sm text-alethea-gray-light">Chain: {formatHash(block.block.header.chainId)}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
