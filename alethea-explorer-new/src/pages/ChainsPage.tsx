import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Link2, Box, Clock, ChevronRight, XCircle, Activity, Hash } from 'lucide-react';
import { useChains, useChainBlocks } from '../hooks/useDatabase';
import { CopyableHash } from '../components/CopyableHash';
import { BlockInfo } from '../types/blockchain';

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

const formatTimestamp = (timestamp: number) => {
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

const ChainCard: React.FC<{
  chainId: string;
  isExpanded: boolean;
  onToggle: () => void;
  isMainChain: boolean;
}> = ({ chainId, isExpanded, onToggle, isMainChain }) => {
  const { blocks, loading } = useChainBlocks(isExpanded ? chainId : '', 5);
  const latestBlock = blocks[0];

  return (
    <div className={`card transition-all ${isMainChain ? 'border-alethea-primary/50' : ''}`}>
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-lg border ${isMainChain
            ? 'bg-alethea-primary/20 border-alethea-primary/30'
            : 'bg-alethea-darker/50 border-alethea-border/50'
            }`}>
            <Link2 className={`w-6 h-6 ${isMainChain ? 'text-alethea-primary' : 'text-alethea-gray-medium'}`} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-white font-mono text-sm">
                {chainId.slice(0, 12)}...{chainId.slice(-8)}
              </span>
              {isMainChain && (
                <span className="px-2 py-0.5 bg-alethea-primary/20 text-alethea-primary rounded text-xs font-medium">
                  Main Chain
                </span>
              )}
            </div>
            {latestBlock && (
              <div className="text-sm text-alethea-gray-light mt-1">
                Latest: Block #{latestBlock.block.header.height} • {formatTimeAgo(latestBlock.block.header.timestamp)}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <CopyableHash value={chainId} format="short" showCopyIcon={true} />
          <ChevronRight className={`w-5 h-5 text-alethea-gray-medium transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
      </div>

      {/* Expanded: Show chain info and recent blocks */}
      {isExpanded && (
        <div className="mt-6 pt-6 border-t border-alethea-border/50 space-y-6">
          {/* Chain Info from Latest Block */}
          {latestBlock && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-alethea-darker/30 rounded-lg border border-alethea-border/50">
                <div className="flex items-center space-x-2 mb-2">
                  <Box className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-alethea-gray-light">Height</span>
                </div>
                <div className="text-lg font-semibold text-blue-400">
                  {latestBlock.block.header.height}
                </div>
              </div>
              <div className="p-4 bg-alethea-darker/30 rounded-lg border border-alethea-border/50">
                <div className="flex items-center space-x-2 mb-2">
                  <Hash className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-alethea-gray-light">Epoch</span>
                </div>
                <div className="text-lg font-semibold text-purple-400">
                  {latestBlock.block.header.epoch}
                </div>
              </div>
              <div className="p-4 bg-alethea-darker/30 rounded-lg border border-alethea-border/50">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-alethea-gray-light">Timestamp</span>
                </div>
                <div className="text-sm font-semibold text-green-400">
                  {formatTimestamp(latestBlock.block.header.timestamp)}
                </div>
              </div>
              <div className="p-4 bg-alethea-darker/30 rounded-lg border border-alethea-border/50">
                <div className="flex items-center space-x-2 mb-2">
                  <Hash className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-alethea-gray-light">Block Hash</span>
                </div>
                <div className="text-xs font-mono text-orange-400 truncate">
                  {latestBlock.hash ?
                    `${latestBlock.hash.slice(0, 12)}...${latestBlock.hash.slice(-8)}` :
                    'N/A'}
                </div>
              </div>
            </div>
          )}

          {/* Recent Blocks */}
          <div>
            <h4 className="text-sm font-medium text-alethea-gray-light mb-4">Recent Blocks</h4>
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="loading-spinner h-6 w-6"></div>
              </div>
            ) : blocks.length > 0 ? (
              <div className="space-y-2">
                {blocks.map((block) => (
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
            ) : (
              <div className="text-center py-4 text-alethea-gray-light">
                No blocks found for this chain
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const ChainsPage: React.FC = () => {
  const { chains, loading, error } = useChains();
  const [expandedChain, setExpandedChain] = useState<string | null>(null);

  // Main chain ID from environment
  const mainChainId = import.meta.env.VITE_CHAIN_ID || '9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec';

  // Sort chains: main chain first, then alphabetically
  const sortedChains = [...chains].sort((a, b) => {
    if (a === mainChainId) return -1;
    if (b === mainChainId) return 1;
    return a.localeCompare(b);
  });

  if (loading && chains.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner h-8 w-8"></div>
      </div>
    );
  }

  if (error && chains.length === 0) {
    return (
      <div className="card bg-red-500/10 border-red-500/30">
        <div className="text-red-300">
          <XCircle className="w-5 h-5 inline mr-2" />
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent"></div>
        <div className="relative">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <Link2 className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-4xl font-epilogue font-bold text-gradient tracking-tight-custom">
                Chains
              </h1>
              <p className="text-lg text-alethea-gray-light mt-2">
                All chains connected to the Linera network
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card stat-card">
          <div className="stat-number text-blue-400">{chains.length}</div>
          <div className="text-alethea-gray-light mt-1 text-sm">Total Chains</div>
        </div>
        <div className="card stat-card">
          <div className="stat-number text-green-400">Active</div>
          <div className="text-alethea-gray-light mt-1 text-sm">Network Status</div>
        </div>
        <div className="card stat-card hidden md:block">
          <div className="stat-number text-alethea-primary text-lg truncate">
            {mainChainId.slice(0, 12)}...
          </div>
          <div className="text-alethea-gray-light mt-1 text-sm">Main Chain</div>
        </div>
      </div>

      {/* Chains List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-epilogue font-bold text-white flex items-center space-x-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <span>Available Chains ({chains.length})</span>
        </h2>

        <div className="space-y-3">
          {sortedChains.map((chainId) => (
            <ChainCard
              key={chainId}
              chainId={chainId}
              isExpanded={expandedChain === chainId}
              onToggle={() => setExpandedChain(expandedChain === chainId ? null : chainId)}
              isMainChain={chainId === mainChainId}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
