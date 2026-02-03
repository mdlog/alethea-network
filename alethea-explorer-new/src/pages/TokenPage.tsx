import React from 'react';
import { Coins, TrendingUp, Users, Award, XCircle } from 'lucide-react';
import { useTokenInfo, useTokenHolders, useStatistics } from '../hooks/useDatabase';
import { CopyableHash } from '../components/CopyableHash';

const formatAmount = (amount: string | undefined, decimals: number = 18) => {
  if (!amount) return '0';
  const num = parseFloat(amount) / Math.pow(10, decimals);
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(2)}B`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
  return num.toFixed(2);
};

export const TokenPage: React.FC = () => {
  const { tokenInfo, loading: tokenLoading, error: tokenError } = useTokenInfo();
  const { holders, loading: holdersLoading, error: holdersError } = useTokenHolders();
  const { statistics } = useStatistics();

  const loading = tokenLoading || holdersLoading;
  const error = tokenError || holdersError;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner h-8 w-8"></div>
      </div>
    );
  }

  if (error) {
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
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent"></div>
        <div className="relative">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
              <Coins className="w-8 h-8 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-4xl font-epilogue font-bold text-gradient tracking-tight-custom">
                {tokenInfo?.name || 'Alethea Token'} ({tokenInfo?.symbol || 'ALTH'})
              </h1>
              <p className="text-lg text-alethea-gray-light mt-2">
                Native token of the Alethea Network
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Token Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card stat-card">
          <div className="flex items-center justify-center mb-2">
            <TrendingUp className="w-5 h-5 text-yellow-400 opacity-70" />
          </div>
          <div className="stat-number text-yellow-400">
            {formatAmount(statistics?.totalStake || tokenInfo?.totalSupply, 18)}
          </div>
          <div className="text-alethea-gray-light mt-1 text-sm">Total Staked</div>
        </div>
        <div className="card stat-card">
          <div className="flex items-center justify-center mb-2">
            <Coins className="w-5 h-5 text-green-400 opacity-70" />
          </div>
          <div className="stat-number text-green-400">
            {formatAmount(statistics?.rewardPoolBalance || tokenInfo?.rewardPool, 18)}
          </div>
          <div className="text-alethea-gray-light mt-1 text-sm">Reward Pool</div>
        </div>
        <div className="card stat-card">
          <div className="flex items-center justify-center mb-2">
            <Award className="w-5 h-5 text-blue-400 opacity-70" />
          </div>
          <div className="stat-number text-blue-400">
            {formatAmount(statistics?.totalRewardsDistributed, 18)}
          </div>
          <div className="text-alethea-gray-light mt-1 text-sm">Rewards Distributed</div>
        </div>
        <div className="card stat-card">
          <div className="flex items-center justify-center mb-2">
            <Users className="w-5 h-5 text-purple-400 opacity-70" />
          </div>
          <div className="stat-number text-purple-400">
            {holders.length}
          </div>
          <div className="text-alethea-gray-light mt-1 text-sm">Token Holders</div>
        </div>
      </div>

      {/* Token Details */}
      <div className="card">
        <h2 className="text-xl font-epilogue font-semibold text-white mb-6 flex items-center space-x-2">
          <Coins className="w-5 h-5 text-yellow-400" />
          <span>Token Details</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-alethea-darker/50 rounded-lg">
              <span className="text-alethea-gray-light">Name</span>
              <span className="text-white font-medium">{tokenInfo?.name || 'Alethea Token'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-alethea-darker/50 rounded-lg">
              <span className="text-alethea-gray-light">Symbol</span>
              <span className="text-white font-medium">{tokenInfo?.symbol || 'ALTH'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-alethea-darker/50 rounded-lg">
              <span className="text-alethea-gray-light">Decimals</span>
              <span className="text-white font-medium">{tokenInfo?.decimals || 18}</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-alethea-darker/50 rounded-lg">
              <span className="text-alethea-gray-light">Total Voters</span>
              <span className="text-white font-medium">{statistics?.totalVoters || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-alethea-darker/50 rounded-lg">
              <span className="text-alethea-gray-light">Active Voters</span>
              <span className="text-white font-medium">{statistics?.activeVoters || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-alethea-darker/50 rounded-lg">
              <span className="text-alethea-gray-light">Protocol Status</span>
              <span className={`font-medium ${statistics?.protocolStatus === 'Active' ? 'text-green-400' : 'text-yellow-400'}`}>
                {statistics?.protocolStatus || 'Active'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Token Holders */}
      <div className="card">
        <h2 className="text-xl font-epilogue font-semibold text-white mb-6 flex items-center space-x-2">
          <Users className="w-5 h-5 text-green-400" />
          <span>Top Token Holders</span>
          <span className="text-sm text-alethea-gray-light font-normal">({holders.length} holders)</span>
        </h2>
        
        {holders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-alethea-border/50">
                  <th className="text-left py-3 px-4 text-sm font-medium text-alethea-gray-light">#</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-alethea-gray-light">Address</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-alethea-gray-light">Balance</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-alethea-gray-light">Share</th>
                </tr>
              </thead>
              <tbody>
                {holders
                  .sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance))
                  .slice(0, 20)
                  .map((holder, index) => {
                    const totalSupply = parseFloat(tokenInfo?.totalSupply || '1');
                    const balance = parseFloat(holder.balance);
                    const share = (balance / totalSupply) * 100;

                    return (
                      <tr key={holder.owner} className="border-b border-alethea-border/30 hover:bg-alethea-darker/30">
                        <td className="py-3 px-4">
                          <span className={`text-sm font-medium ${
                            index < 3 ? 'text-yellow-400' : 'text-alethea-gray-light'
                          }`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <CopyableHash value={holder.owner} format="short" />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-white font-medium">
                            {formatAmount(holder.balance, tokenInfo?.decimals || 18)}
                          </span>
                          <span className="text-alethea-gray-light ml-1">{tokenInfo?.symbol || 'ALTH'}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-alethea-gray-light">{share.toFixed(2)}%</span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto text-alethea-gray-medium mb-4" />
            <p className="text-alethea-gray-light">No token holders found</p>
          </div>
        )}
      </div>
    </div>
  );
};
