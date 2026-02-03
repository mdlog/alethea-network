import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Hash, Clock, Layers, Activity, Package, Settings, XCircle } from 'lucide-react';
import { useBlock } from '../hooks/useDatabase';
import { CopyableHash } from './CopyableHash';

export const BlockDetail: React.FC = () => {
  const { hash } = useParams<{ hash: string }>();
  const { block, loading, error } = useBlock(hash || '');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner h-8 w-8"></div>
      </div>
    );
  }

  if (error || !block) {
    return (
      <div className="card bg-red-500/10 border-red-500/30">
        <div className="text-red-300">
          <XCircle className="w-5 h-5 inline mr-2" />
          {error || 'Block not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center space-x-2 text-alethea-gray-light hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Blocks</span>
        </Link>
        
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-alethea-gray-light">Block Data</span>
        </div>
      </div>

      {/* Block Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-alethea-primary/5 to-transparent"></div>
        <div className="relative">
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-3 bg-alethea-primary/20 rounded-lg border border-alethea-primary/30">
              <Hash className="w-8 h-8 text-alethea-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-epilogue font-bold text-gradient tracking-tight-custom">
                Block Details
              </h1>
              <p className="text-lg text-alethea-gray-light mt-2">
                Block #{block.height}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Block Info */}
      <div className="card">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            {/* Hash */}
            <div>
              <label className="block text-sm font-medium text-alethea-gray-light mb-3">
                Block Hash
              </label>
              <CopyableHash value={block.hash} format="full" />
            </div>

            {/* Chain ID */}
            <div>
              <label className="block text-sm font-medium text-alethea-gray-light mb-3">
                Chain ID
              </label>
              <CopyableHash value={block.chain_id} format="full" />
            </div>
          </div>

          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between p-4 bg-alethea-darker/50 rounded-lg border border-alethea-border/50">
                <div className="flex items-center space-x-3">
                  <Layers className="w-5 h-5 text-alethea-gray-medium" />
                  <span className="text-alethea-gray-light">Height</span>
                </div>
                <span className="stat-number text-white">{block.height}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-alethea-darker/50 rounded-lg border border-alethea-border/50">
                <div className="flex items-center space-x-3">
                  <Activity className="w-5 h-5 text-alethea-gray-medium" />
                  <span className="text-alethea-gray-light">Operations</span>
                </div>
                <span className="stat-number text-white">{block.operationsCount}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-alethea-darker/50 rounded-lg border border-alethea-border/50">
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-alethea-gray-medium" />
                  <span className="text-alethea-gray-light">Timestamp</span>
                </div>
                <span className="text-white font-medium">{new Date(block.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Operations */}
      {block.operations && block.operations.length > 0 && (
        <div className="card">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <Settings className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-epilogue font-semibold text-white">
                Operations
              </h2>
              <p className="text-sm text-alethea-gray-light">
                {block.operations.length} operation(s) in this block
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            {block.operations.map((op: any, index: number) => (
              <div key={index} className="bg-alethea-darker/30 border border-alethea-border/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-alethea-gray-light">Operation #{index + 1}</span>
                </div>
                <pre className="text-xs text-alethea-gray-light overflow-x-auto bg-alethea-darker/50 p-3 rounded">
                  {JSON.stringify(op, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incoming Bundles */}
      {block.incomingBundles && block.incomingBundles.length > 0 && (
        <div className="card">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
              <Package className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-epilogue font-semibold text-white">
                Incoming Bundles
              </h2>
              <p className="text-sm text-alethea-gray-light">
                {block.incomingBundles.length} bundle(s) received
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            {block.incomingBundles.map((bundle: any, index: number) => (
              <div key={index} className="bg-alethea-darker/30 border border-alethea-border/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-alethea-gray-light">Bundle #{index + 1}</span>
                  {bundle.origin && (
                    <span className="text-xs text-alethea-gray-medium">
                      From: {bundle.origin.slice(0, 16)}...
                    </span>
                  )}
                </div>
                <pre className="text-xs text-alethea-gray-light overflow-x-auto bg-alethea-darker/50 p-3 rounded">
                  {JSON.stringify(bundle, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
