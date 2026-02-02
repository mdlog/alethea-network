import React from 'react';

interface QueryMetadataProps {
  query: {
    id: number;
    title?: string;
    description: string;
    category?: string;
    context?: string;
    resolutionCriteria?: string;
    sourceUrls?: string;
    tags?: string;
    metadataUrl?: string;
    externalId?: string;
    bondAmount: string;
    priorityFee: string;
    bondRefunded: boolean;
    hasDispute: boolean;
    disputeWindowEnd?: string;
    canDispute: boolean;
  };
  onDispute?: () => void;
  onClaimBond?: () => void;
}

export const QueryMetadata: React.FC<QueryMetadataProps> = ({ 
  query, 
  onDispute,
  onClaimBond 
}) => {
  const hasBond = parseFloat(query.bondAmount) > 0;
  const tags = query.tags?.split(',').filter(t => t.trim()) || [];
  const sourceUrls = query.sourceUrls?.split(',').filter(u => u.trim()) || [];

  return (
    <div className="bg-gray-800 rounded-xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {query.title && (
            <h3 className="text-xl font-bold text-white">{query.title}</h3>
          )}
          {query.category && (
            <span className="inline-block px-3 py-1 mt-2 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400">
              {query.category}
            </span>
          )}
        </div>
        {query.externalId && (
          <span className="text-sm text-gray-400">
            External ID: {query.externalId}
          </span>
        )}
      </div>

      {/* Description */}
      <div>
        <h4 className="text-sm font-medium text-gray-400 mb-2">Question</h4>
        <p className="text-white">{query.description}</p>
      </div>

      {/* Context */}
      {query.context && (
        <div className="bg-gray-700/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Context & Background</h4>
          <p className="text-gray-300 whitespace-pre-wrap text-sm">{query.context}</p>
        </div>
      )}

      {/* Resolution Criteria */}
      {query.resolutionCriteria && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-400 mb-2">Resolution Criteria</h4>
          <p className="text-gray-300 whitespace-pre-wrap text-sm">{query.resolutionCriteria}</p>
        </div>
      )}

      {/* Source URLs */}
      {sourceUrls.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">Data Sources</h4>
          <div className="flex flex-wrap gap-2">
            {sourceUrls.map((url, i) => (
              <a 
                key={i}
                href={url.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm underline"
              >
                Source {i + 1}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">Tags</h4>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, i) => (
              <span 
                key={i}
                className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300"
              >
                #{tag.trim()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* External Metadata */}
      {query.metadataUrl && (
        <div>
          <a 
            href={query.metadataUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            View Full Metadata →
          </a>
        </div>
      )}

      {/* Bond Information (Hybrid Model) */}
      {hasBond && (
        <div className="border-t border-gray-700 pt-4 mt-4">
          <h4 className="text-sm font-medium text-gray-400 mb-3">Bond Information</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-3">
              <span className="text-xs text-gray-400 block">Bond Amount</span>
              <span className="text-lg font-bold text-green-400">{query.bondAmount} ALTH</span>
              {query.bondRefunded && (
                <span className="text-xs text-green-500 block mt-1">✓ Refunded</span>
              )}
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3">
              <span className="text-xs text-gray-400 block">Priority Fee</span>
              <span className="text-lg font-bold text-blue-400">{query.priorityFee} ALTH</span>
            </div>
          </div>

          {/* Dispute Status */}
          {query.hasDispute ? (
            <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <span className="text-red-400 font-medium">⚠️ This query has an active dispute</span>
            </div>
          ) : query.canDispute ? (
            <div className="mt-3 flex items-center justify-between bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <div>
                <span className="text-yellow-400 font-medium">Dispute Window Open</span>
                {query.disputeWindowEnd && (
                  <span className="text-xs text-gray-400 block">
                    Ends: {new Date(parseInt(query.disputeWindowEnd) / 1000).toLocaleString()}
                  </span>
                )}
              </div>
              {onDispute && (
                <button
                  onClick={onDispute}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-lg transition-colors"
                >
                  Raise Dispute
                </button>
              )}
            </div>
          ) : !query.bondRefunded && (
            <div className="mt-3 flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <span className="text-green-400 font-medium">Bond ready for refund</span>
              {onClaimBond && (
                <button
                  onClick={onClaimBond}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-black font-medium rounded-lg transition-colors"
                >
                  Claim Bond
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QueryMetadata;
