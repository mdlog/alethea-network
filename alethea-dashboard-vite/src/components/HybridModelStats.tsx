import React from 'react';

interface HybridModelStatsProps {
  stats: {
    inflationPool: string;
    totalInflationDistributed: string;
    bondPool: string;
    totalBondsRefunded: string;
    totalBondsSlashed: string;
  } | null;
  isLoading?: boolean;
}

export const HybridModelStats: React.FC<HybridModelStatsProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const formatAmount = (amount: string) => {
    const value = parseFloat(amount) / 1e18; // Convert from attos
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const statItems = [
    {
      label: 'Inflation Pool',
      value: formatAmount(stats.inflationPool),
      unit: 'ALTH',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      icon: '💰',
    },
    {
      label: 'Inflation Distributed',
      value: formatAmount(stats.totalInflationDistributed),
      unit: 'ALTH',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      icon: '📊',
    },
    {
      label: 'Bond Pool (Locked)',
      value: formatAmount(stats.bondPool),
      unit: 'ALTH',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      icon: '🔒',
    },
    {
      label: 'Bonds Refunded',
      value: formatAmount(stats.totalBondsRefunded),
      unit: 'ALTH',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      icon: '↩️',
    },
    {
      label: 'Bonds Slashed',
      value: formatAmount(stats.totalBondsSlashed),
      unit: 'ALTH',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      icon: '⚡',
    },
  ];

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-bold text-white mb-4">Hybrid Model Statistics</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statItems.map((item) => (
          <div
            key={item.label}
            className={`${item.bgColor} rounded-lg p-4 text-center`}
          >
            <div className="text-2xl mb-1">{item.icon}</div>
            <div className={`text-xl font-bold ${item.color}`}>
              {item.value}
            </div>
            <div className="text-xs text-gray-400">{item.unit}</div>
            <div className="text-xs text-gray-500 mt-1">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="mt-4 bg-gray-700/30 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-400 mb-2">About Hybrid Model</h4>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• <span className="text-green-400">Inflation Pool</span>: Rewards minted for voters</li>
          <li>• <span className="text-yellow-400">Bond Pool</span>: Bonds locked from active queries</li>
          <li>• <span className="text-purple-400">Bonds Refunded</span>: Returned to market creators (no disputes)</li>
          <li>• <span className="text-red-400">Bonds Slashed</span>: Taken from dispute losers</li>
        </ul>
      </div>
    </div>
  );
};

export default HybridModelStats;
