import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, Box, Clock, Hash, Layers, XCircle, User, 
  Mail, Zap, Database, ChevronDown, ChevronUp 
} from 'lucide-react';
import { useBlock } from '../hooks/useDatabase';
import { CopyableHash } from '../components/CopyableHash';

// Linera timestamps are in microseconds, convert to milliseconds for JS Date
const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp / 1000).toLocaleString();
};

// Convert byte array to readable string
const bytesToString = (bytes: number[] | string): string => {
  if (typeof bytes === 'string') return bytes;
  try {
    return new TextDecoder().decode(new Uint8Array(bytes));
  } catch {
    return bytes.join(',');
  }
};

// Collapsible Section Component
const CollapsibleSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, icon, count, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (count === 0) return null;

  return (
    <div className="card">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center space-x-3">
          {icon}
          <h2 className="text-xl font-epilogue font-semibold text-white">{title}</h2>
          <span className="px-2 py-0.5 bg-alethea-primary/20 text-alethea-primary rounded text-sm font-medium">
            {count}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-alethea-gray-medium" />
        ) : (
          <ChevronDown className="w-5 h-5 text-alethea-gray-medium" />
        )}
      </button>
      {isOpen && <div className="mt-6">{children}</div>}
    </div>
  );
};

export const BlockDetailPage: React.FC = () => {
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
      <div className="space-y-4">
        <Link
          to="/blocks"
          className="flex items-center space-x-2 text-alethea-gray-light hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Blocks</span>
        </Link>
        <div className="card bg-red-500/10 border-red-500/30">
          <div className="text-red-300">
            <XCircle className="w-5 h-5 inline mr-2" />
            {error || 'Block not found'}
          </div>
        </div>
      </div>
    );
  }

  const header = block.block.header;
  const body = block.block.body;

  // Flatten nested arrays and count items
  const messages = body?.messages?.flat() || [];
  const events = body?.events?.flat() || [];
  const oracleResponses = body?.oracleResponses?.flat() || [];
  const operationResults = body?.operationResults?.flat() || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/blocks"
          className="flex items-center space-x-2 text-alethea-gray-light hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Blocks</span>
        </Link>
        
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${block.status === 'confirmed' ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`}></div>
          <span className="text-sm text-alethea-gray-light capitalize">{block.status}</span>
        </div>
      </div>

      {/* Block Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-alethea-primary/5 to-transparent"></div>
        <div className="relative">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-alethea-primary/20 rounded-lg border border-alethea-primary/30">
              <Box className="w-8 h-8 text-alethea-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-epilogue font-bold text-gradient tracking-tight-custom">
                Block #{header.height}
              </h1>
              <p className="text-lg text-alethea-gray-light mt-2">
                Epoch {header.epoch} • {formatTimestamp(header.timestamp)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card stat-card">
          <div className="stat-number text-blue-400">{messages.length}</div>
          <div className="text-alethea-gray-light mt-1 text-sm">Messages</div>
        </div>
        <div className="card stat-card">
          <div className="stat-number text-green-400">{events.length}</div>
          <div className="text-alethea-gray-light mt-1 text-sm">Events</div>
        </div>
        <div className="card stat-card">
          <div className="stat-number text-purple-400">{oracleResponses.length}</div>
          <div className="text-alethea-gray-light mt-1 text-sm">Oracle Responses</div>
        </div>
        <div className="card stat-card">
          <div className="stat-number text-yellow-400">{operationResults.length}</div>
          <div className="text-alethea-gray-light mt-1 text-sm">Operations</div>
        </div>
      </div>

      {/* Block Info */}
      <div className="card">
        <h2 className="text-xl font-epilogue font-semibold text-white mb-6 flex items-center space-x-2">
          <Hash className="w-5 h-5 text-alethea-primary" />
          <span>Block Information</span>
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-alethea-gray-light mb-3">
                Block Hash
              </label>
              <CopyableHash value={block.hash} format="full" />
            </div>

            <div>
              <label className="block text-sm font-medium text-alethea-gray-light mb-3">
                Chain ID
              </label>
              <CopyableHash value={header.chainId} format="full" />
            </div>

            {header.previousBlockHash && (
              <div>
                <label className="block text-sm font-medium text-alethea-gray-light mb-3">
                  Previous Block
                </label>
                <Link 
                  to={`/block/${header.previousBlockHash}`}
                  className="block hover:opacity-80 transition-opacity"
                >
                  <CopyableHash value={header.previousBlockHash} format="full" />
                </Link>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-alethea-darker/50 rounded-lg border border-alethea-border/50">
              <div className="flex items-center space-x-3">
                <Layers className="w-5 h-5 text-alethea-gray-medium" />
                <span className="text-alethea-gray-light">Height</span>
              </div>
              <span className="stat-number text-white">{header.height}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-alethea-darker/50 rounded-lg border border-alethea-border/50">
              <div className="flex items-center space-x-3">
                <Hash className="w-5 h-5 text-alethea-gray-medium" />
                <span className="text-alethea-gray-light">Epoch</span>
              </div>
              <span className="stat-number text-white">{header.epoch}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-alethea-darker/50 rounded-lg border border-alethea-border/50">
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-alethea-gray-medium" />
                <span className="text-alethea-gray-light">Timestamp</span>
              </div>
              <span className="text-white font-medium text-sm">
                {formatTimestamp(header.timestamp)}
              </span>
            </div>

            {header.authenticatedSigner && (
              <div className="flex items-center justify-between p-4 bg-alethea-darker/50 rounded-lg border border-alethea-border/50">
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-alethea-gray-medium" />
                  <span className="text-alethea-gray-light">Signer</span>
                </div>
                <span className="text-white font-mono text-xs">
                  {header.authenticatedSigner.slice(0, 16)}...
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Section */}
      <CollapsibleSection
        title="Messages"
        icon={<Mail className="w-5 h-5 text-blue-400" />}
        count={messages.length}
        defaultOpen={messages.length > 0 && messages.length <= 5}
      >
        <div className="space-y-3">
          {messages.map((msg, index) => (
            <div key={index} className="bg-alethea-darker/50 rounded-lg p-4 border border-alethea-border/50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-alethea-gray-light">Destination</span>
                  <div className="text-white font-mono text-xs mt-1 truncate">{msg.destination}</div>
                </div>
                <div>
                  <span className="text-sm text-alethea-gray-light">Kind</span>
                  <div className="text-white mt-1">
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">{msg.kind}</span>
                  </div>
                </div>
              </div>
              {msg.grant && msg.grant !== '0.' && (
                <div className="mt-3">
                  <span className="text-sm text-alethea-gray-light">Grant</span>
                  <div className="text-yellow-400 mt-1">{msg.grant}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Events Section */}
      <CollapsibleSection
        title="Events"
        icon={<Zap className="w-5 h-5 text-green-400" />}
        count={events.length}
        defaultOpen={events.length > 0 && events.length <= 5}
      >
        <div className="space-y-3">
          {events.map((event, index) => (
            <div key={index} className="bg-alethea-darker/50 rounded-lg p-4 border border-alethea-border/50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-alethea-gray-light">Index</span>
                  <div className="text-white font-medium mt-1">{event.index}</div>
                </div>
                <div>
                  <span className="text-sm text-alethea-gray-light">Stream</span>
                  <div className="text-white font-mono text-xs mt-1">
                    {bytesToString(event.streamId?.streamName || '')}
                  </div>
                </div>
              </div>
              {event.streamId?.applicationId && (
                <div className="mt-3">
                  <span className="text-sm text-alethea-gray-light">Application ID</span>
                  <div className="text-white font-mono text-xs mt-1 truncate">
                    {typeof event.streamId.applicationId === 'object' 
                      ? JSON.stringify(event.streamId.applicationId)
                      : event.streamId.applicationId}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Oracle Responses Section */}
      <CollapsibleSection
        title="Oracle Responses"
        icon={<Database className="w-5 h-5 text-purple-400" />}
        count={oracleResponses.length}
        defaultOpen={oracleResponses.length > 0 && oracleResponses.length <= 5}
      >
        <div className="space-y-3">
          {oracleResponses.map((response, index) => {
            const responseType = Object.keys(response)[0];
            const responseData = response[responseType];
            
            return (
              <div key={index} className="bg-alethea-darker/50 rounded-lg p-4 border border-alethea-border/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-alethea-gray-light">Response #{index + 1}</span>
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">
                    {responseType}
                  </span>
                </div>
                {responseData && typeof responseData === 'object' && (
                  <div className="bg-alethea-dark/50 rounded p-3">
                    <pre className="text-xs text-alethea-gray-light overflow-x-auto">
                      {JSON.stringify(responseData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* Operation Results Section */}
      <CollapsibleSection
        title="Operation Results"
        icon={<Box className="w-5 h-5 text-yellow-400" />}
        count={operationResults.length}
        defaultOpen={operationResults.length > 0 && operationResults.length <= 5}
      >
        <div className="space-y-3">
          {operationResults.map((result, index) => (
            <div key={index} className="bg-alethea-darker/50 rounded-lg p-4 border border-alethea-border/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-alethea-gray-light">Operation #{index + 1}</span>
              </div>
              <div className="bg-alethea-dark/50 rounded p-3">
                <pre className="text-xs text-alethea-gray-light overflow-x-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
};
