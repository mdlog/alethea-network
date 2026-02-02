import React from 'react';

interface SourceDAppBadgeProps {
  query: {
    isExternal: boolean;
    querySource: string;
    sourceAppName?: string;
    sourceAppLogo?: string;
    sourceAppCategory?: string;
    sourceAppId?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

/**
 * Badge component that displays the source DApp for a query
 * Shows logo, name, and category to help voters identify where the query originated
 */
export const SourceDAppBadge: React.FC<SourceDAppBadgeProps> = ({
  query,
  size = 'md',
  showDetails = false,
}) => {
  if (!query.isExternal) {
    // Internal query - show simple badge
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-700/50 ${
        size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
      }`}>
        <span className="text-gray-400">🏠</span>
        <span className="text-gray-300">Alethea Dashboard</span>
      </div>
    );
  }

  // Get category color
  const getCategoryColor = (category?: string) => {
    if (!category) return 'bg-gray-500/20 text-gray-400';
    const cat = category.toLowerCase();
    if (cat.includes('prediction')) return 'bg-purple-500/20 text-purple-400';
    if (cat.includes('insurance')) return 'bg-blue-500/20 text-blue-400';
    if (cat.includes('gaming')) return 'bg-green-500/20 text-green-400';
    if (cat.includes('defi')) return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-gray-500/20 text-gray-400';
  };

  // Get category icon
  const getCategoryIcon = (category?: string) => {
    if (!category) return '🔗';
    const cat = category.toLowerCase();
    if (cat.includes('prediction')) return '📊';
    if (cat.includes('insurance')) return '🛡️';
    if (cat.includes('gaming')) return '🎮';
    if (cat.includes('defi')) return '💰';
    return '🔗';
  };

  const sizeClasses = {
    sm: 'text-xs h-6',
    md: 'text-sm h-8',
    lg: 'text-base h-10',
  };

  const logoSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className="flex flex-col gap-1">
      {/* Main Badge */}
      <div
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${getCategoryColor(query.sourceAppCategory)} ${sizeClasses[size]}`}
      >
        {/* Logo or Icon */}
        {query.sourceAppLogo ? (
          <img
            src={query.sourceAppLogo}
            alt={query.sourceAppName || 'DApp'}
            className={`${logoSizes[size]} rounded-full object-cover`}
            onError={(e) => {
              // Fallback to icon if image fails
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <span>{getCategoryIcon(query.sourceAppCategory)}</span>
        )}

        {/* Name */}
        <span className="font-medium">
          {query.sourceAppName || 'External DApp'}
        </span>

        {/* Category Badge (compact) */}
        {query.sourceAppCategory && size !== 'sm' && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-black/20">
            {query.sourceAppCategory.replace('Prediction', '').replace('External', '').trim() || 'DApp'}
          </span>
        )}
      </div>

      {/* Detailed Info */}
      {showDetails && (
        <div className="bg-gray-800/50 rounded-lg p-3 text-sm space-y-2">
          <div className="flex items-center gap-3">
            {query.sourceAppLogo && (
              <img
                src={query.sourceAppLogo}
                alt={query.sourceAppName || 'DApp'}
                className="w-12 h-12 rounded-lg object-cover bg-gray-700"
              />
            )}
            <div>
              <h4 className="font-bold text-white">
                {query.sourceAppName || 'External DApp'}
              </h4>
              <p className="text-gray-400 text-xs">
                {query.sourceAppCategory?.replace('External', '').trim() || 'External Application'}
              </p>
            </div>
          </div>
          
          {query.sourceAppId && (
            <div className="text-xs text-gray-500 font-mono break-all">
              App ID: {query.sourceAppId.slice(0, 20)}...
            </div>
          )}

          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-400">✓</span>
            <span className="text-gray-400">Verified DApp on Alethea Network</span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Compact version for use in tables/lists
 */
export const SourceDAppChip: React.FC<{ query: SourceDAppBadgeProps['query'] }> = ({ query }) => {
  if (!query.isExternal) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
        <span>🏠</span>
        <span>Internal</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-purple-400">
      {query.sourceAppLogo ? (
        <img
          src={query.sourceAppLogo}
          alt=""
          className="w-4 h-4 rounded-full"
        />
      ) : (
        <span>📊</span>
      )}
      <span>{query.sourceAppName || 'External'}</span>
    </span>
  );
};

export default SourceDAppBadge;
