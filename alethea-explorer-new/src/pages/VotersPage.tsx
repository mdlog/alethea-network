import React from 'react';
import { Users, Award, CheckCircle, Vote, TrendingUp, XCircle } from 'lucide-react';
import { useVoters } from '../hooks/useDatabase';
import { CopyableHash } from '../components/CopyableHash';

const formatAmount = (amount: string | undefined) => {
  if (!amount) return '0';
  const num = parseFloat(amount) / 1e18;
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
  return num.toFixed(2);
};

export const VotersPage: React.FC = () => {
  const { voters, loading, error } = useVoters();

  // Calculate total stats
  const totalVotes = voters.reduce((sum, v) => sum + (v.totalVotes || 0), 0);
  const totalCorrectVotes = voters.reduce((sum, v) => sum + (v.correctVotes || 0), 0);
  const totalStake = voters.reduce((sum, v) => sum + parseFloat(v.stake || '0'), 0);

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
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent"></div>
        <div className="relative">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-green-500/20 rounded-lg border border-green-500/30">
              <Users className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h1 className="text-4xl font-epilogue font-bold text-gradient tracking-tight-custom">
                Voters Leaderboard
              </h1>
              <p className="text-lg text-alethea-gray-light mt-2">
                Top oracle voters and their rewards
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card stat-card">
          <div className="flex items-center justify-center mb-2">
            <Users className="w-5 h-5 text-green-400 opacity-70" />
          </div>
          <div className="stat-number text-green-400">{voters.length}</div>
          <div className="text-alethea-gray-light mt-1 text-sm">Total Voters</div>
        </div>
        <div className="card stat-card">
          <div className="flex items-center justify-center mb-2">
            <Vote className="w-5 h-5 text-blue-400 opacity-70" />
          </div>
          <div className="stat-number text-blue-400">{totalVotes}</div>
          <div className="text-alethea-gray-light mt-1 text-sm">Total Votes</div>
        </div>
        <div className="card stat-card">
          <div className="flex items-center justify-center mb-2">
            <CheckCircle className="w-5 h-5 text-purple-400 opacity-70" />
          </div>
          <div className="stat-number text-purple-400">{totalCorrectVotes}</div>
          <div className="text-alethea-gray-light mt-1 text-sm">Correct Votes</div>
        </div>
        <div className="card stat-card">
          <div className="flex items-center justify-center mb-2">
            <Award className="w-5 h-5 text-yellow-400 opacity-70" />
          </div>
          <div className="stat-number text-yellow-400">{formatAmount(totalStake.toString())}</div>
          <div className="text-alethea-gray-light mt-1 text-sm">Total Staked</div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="card">
        <h2 className="text-xl font-epilogue font-semibold text-white mb-6 flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          <span>Leaderboard</span>
        </h2>
        
        {voters.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-alethea-border/50">
                  <th className="text-left py-3 px-4 text-sm font-medium text-alethea-gray-light">Rank</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-alethea-gray-light">Voter</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-alethea-gray-light">Votes</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-alethea-gray-light">Correct</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-alethea-gray-light">Accuracy</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-alethea-gray-light">Stake</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-alethea-gray-light">Pending Rewards</th>
                </tr>
              </thead>
              <tbody>
                {voters
                  .sort((a, b) => parseFloat(b.stake || '0') - parseFloat(a.stake || '0'))
                  .map((voter, index) => {
                    const accuracy = voter.accuracyPercentage !== undefined 
                      ? voter.accuracyPercentage.toFixed(1)
                      : voter.totalVotes > 0 
                        ? ((voter.correctVotes / voter.totalVotes) * 100).toFixed(1) 
                        : '0.0';

                    return (
                      <tr key={voter.address} className="border-b border-alethea-border/30 hover:bg-alethea-darker/30">
                        <td className="py-4 px-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                            index === 1 ? 'bg-gray-400/20 text-gray-300 border border-gray-400/30' :
                            index === 2 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                            'bg-alethea-darker text-alethea-gray-light'
                          }`}>
                            {index + 1}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            {voter.name && <span className="text-white text-sm font-medium">{voter.name}</span>}
                            <CopyableHash value={voter.address} format="short" />
                            {voter.reputationTier && (
                              <span className="text-xs text-alethea-gray-medium">{voter.reputationTier}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-white font-medium">{voter.totalVotes}</span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-green-400 font-medium">{voter.correctVotes}</span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            parseFloat(accuracy) >= 70 ? 'bg-green-500/20 text-green-400' :
                            parseFloat(accuracy) >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {accuracy}%
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-yellow-400 font-medium">
                            {formatAmount(voter.stake)}
                          </span>
                          <span className="text-alethea-gray-light ml-1">ALTH</span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-alethea-gray-light">
                            {formatAmount(voter.pendingRewards)}
                          </span>
                          <span className="text-alethea-gray-medium ml-1">ALTH</span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-alethea-gray-medium mb-4" />
            <p className="text-alethea-gray-light">No voters found</p>
            <p className="text-sm text-alethea-gray-medium mt-2">
              Voters will appear here once they participate in prediction queries
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
