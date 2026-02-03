import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Box, Clock, Hash, Layers, XCircle, ChevronRight, Activity } from 'lucide-react';
import { useBlocks } from '../hooks/useDatabase';
import { BlockInfo } from '../types/blockchain';
import { CopyableHash } from '../components/CopyableHash';

// Linera timestamps are in microseconds, convert to milliseconds for JS Date
const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp / 1000).toLocaleString();
};

const formatTimeAgo = (timestamp: number) => {
  const now = Date.now();
  const blockTimeMs = timestamp / 1000; // Convert microseconds to milliseconds
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

const BlockCard: React.FC<{ block: BlockInfo }> = ({ block }) => {
  const timeAgo = formatTimeAgo(block.block.header.timestamp);
  const epochNum = block.block.header.epoch;

  return (
    <Link
      to={`/block/${block.hash}`}
      className="block p-4 bg-alethea-card border border-alethea-border rounded-lg hover:border-alethea-primary/50 transition-all group"
    >
      <div className="flex items-center justify-between">
        {/* Left: Icon + Block info */}
        <div className="flex items-center gap-4">
          <div className="p-3 bg-alethea-primary/20 rounded-lg border border-alethea-primary/30">
            <Box className="w-6 h-6 text-alethea-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold">Block #{block.block.header.height}</span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                {block.status}
              </span>
            </div>
            <div className="text-sm text-alethea-gray-light mt-1 font-mono">
              {block.hash.substring(0, 16)}...{block.hash.substring(block.hash.length - 8)}
            </div>
          </div>
        </div>

        {/* Right: Stats */}
        <div className="flex items-center gap-6">
          <div className="hidden md:block">
            <span className="text-alethea-gray-light text-xs">Epoch </span>
            <span className="text-white font-medium">{epochNum}</span>
          </div>
          <div>
            <span className="text-white font-medium">{timeAgo}</span>
          </div>
          <ChevronRight className="w-5 h-5 text-alethea-gray-medium group-hover:text-alethea-primary transition-colors" />
        </div>
      </div>
    </Link>
  );
};

export const BlocksPage: React.FC = () => {
  const { blocks, latestBlock, loading, error } = useBlocks(30);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time for "Last block" display
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const latestBlockTime = useMemo(() => {
    if (!latestBlock) return null;
    // Linera timestamp is in microseconds, convert to milliseconds
    const blockTimeMs = latestBlock.block.header.timestamp / 1000;
    const diffMs = currentTime.getTime() - blockTimeMs;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 0) return 'just now';
    if (diffSec < 60) return `${diffSec} seconds ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} minutes ago`;
    const diffHour = Math.floor(diffMin / 60);
    return `${diffHour} hours ago`;
  }, [currentTime, latestBlock]);

  if (loading && blocks.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner h-8 w-8"></div>
      </div>
    );
  }

  if (error && blocks.length === 0) {
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
        <div className="absolute inset-0 bg-gradient-to-r from-alethea-primary/5 to-transparent"></div>
        <div className="relative">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-alethea-primary/20 rounded-lg border border-alethea-primary/30">
              <Layers className="w-8 h-8 text-alethea-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-epilogue font-bold text-gradient tracking-tight-custom">
                Chain Blocks
              </h1>
              <p className="text-lg text-alethea-gray-light mt-2">
                Latest blocks from the Alethea Network chain
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card stat-card">
          <div className="flex items-center justify-center mb-2">
            <Box className="w-5 h-5 text-alethea-primary opacity-70" />
          </div>
          <div className="stat-number text-alethea-primary">
            {latestBlock?.block.header.height || 0}
          </div>
          <div className="text-alethea-gray-light mt-1 text-sm">Latest Height</div>
        </div>
        <div className="card stat-card">
          <div className="flex items-center justify-center mb-2">
            <Activity className="w-5 h-5 text-green-400 opacity-70" />
          </div>
          <div className="stat-number text-green-400">{blocks.length}</div>
          <div className="text-alethea-gray-light mt-1 text-sm">Blocks Shown</div>
        </div>
        <div className="card stat-card">
          <div className="flex items-center justify-center mb-2">
            <Hash className="w-5 h-5 text-blue-400 opacity-70" />
          </div>
          <div className="stat-number text-blue-400">
            Epoch {latestBlock?.block.header.epoch || '-'}
          </div>
          <div className="text-alethea-gray-light mt-1 text-sm">Current Epoch</div>
        </div>
        <div className="card stat-card">
          <div className="flex items-center justify-center mb-2">
            <Clock className="w-5 h-5 text-yellow-400 opacity-70" />
          </div>
          <div className="stat-number text-yellow-400 text-lg">
            {loading ? '...' : latestBlockTime || 'N/A'}
          </div>
          <div className="text-alethea-gray-light mt-1 text-sm">Last Block</div>
        </div>
      </div>

      {/* Chain ID */}
      {latestBlock && (
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Hash className="w-5 h-5 text-alethea-gray-medium" />
              <span className="text-alethea-gray-light">Chain ID</span>
            </div>
            <CopyableHash value={latestBlock.block.header.chainId} format="short" />
          </div>
        </div>
      )}

      {/* Blocks List */}
      <div className="space-y-3">
        <h2 className="text-2xl font-epilogue font-bold text-white flex items-center space-x-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <span>Recent Blocks</span>
        </h2>

        <div className="space-y-3">
          {blocks.map((block) => (
            <BlockCard key={block.hash} block={block} />
          ))}
        </div>

        {blocks.length === 0 && !loading && (
          <div className="card text-center py-12">
            <Box className="w-12 h-12 mx-auto text-alethea-gray-medium mb-4" />
            <p className="text-alethea-gray-light">No blocks found</p>
          </div>
        )}
      </div>
    </div>
  );
};
