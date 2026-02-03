import React from 'react';
import { HelpCircle, Clock, Users, Award, CheckCircle, XCircle, Timer } from 'lucide-react';
import { useQueries } from '../hooks/useDatabase';
import { Query } from '../types/blockchain';

const formatAmount = (amount: string) => {
  const num = parseFloat(amount) / 1e18;
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
  return num.toFixed(2);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Active':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'Commit':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'Reveal':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'Resolved':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

const QueryCard: React.FC<{ query: Query }> = ({ query }) => {
  const isWinnerOutcome = (index: number) => {
    if (query.status !== 'Resolved' || !query.result) return false;
    // result could be "Yes", "No", or an index
    const resultLower = query.result.toLowerCase();
    const outcomeLower = query.outcomes[index]?.toLowerCase();
    return resultLower === outcomeLower || query.result === String(index);
  };

  return (
    <div className="card hover:border-alethea-primary/50 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
            <HelpCircle className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <span className="text-sm text-alethea-gray-light">Query #{query.id}</span>
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(query.status)}`}>
              {query.status}
            </span>
            {query.phase && query.phase !== query.status && (
              <span className="ml-1 text-xs text-alethea-gray-medium">({query.phase})</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-alethea-gray-light">Reward</div>
          <div className="text-alethea-primary font-semibold">{formatAmount(query.rewardAmount)} ALTH</div>
        </div>
      </div>

      {/* Title & Description */}
      {query.title && (
        <h3 className="text-white font-medium mb-2">{query.title}</h3>
      )}
      <p className="text-alethea-gray-light text-sm leading-relaxed mb-4 line-clamp-3">
        {query.description}
      </p>

      {/* Outcomes */}
      {query.outcomes && query.outcomes.length > 0 && (
        <div className="space-y-2 mb-4">
          {query.outcomes.map((outcome, index) => {
            const isWinner = isWinnerOutcome(index);

            return (
              <div key={index} className="relative">
                <div className={`flex items-center justify-between p-3 rounded-lg border ${
                  isWinner 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-alethea-darker/50 border-alethea-border/50'
                }`}>
                  <div className="flex items-center space-x-2">
                    {isWinner && <CheckCircle className="w-4 h-4 text-green-400" />}
                    <span className="text-sm text-white">{outcome}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Result for resolved queries */}
      {query.status === 'Resolved' && query.result && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-green-400 font-medium">Result: {query.result}</span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between pt-4 border-t border-alethea-border/30">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1 text-alethea-gray-light">
            <Users className="w-4 h-4" />
            <span className="text-sm">{query.voteCount || 0} votes</span>
          </div>
          <div className="flex items-center space-x-1 text-alethea-gray-light">
            <Timer className="w-4 h-4" />
            <span className="text-sm">Min: {query.minVotes}</span>
          </div>
        </div>
        {query.category && (
          <span className="text-xs text-alethea-gray-medium bg-alethea-darker px-2 py-1 rounded">
            {query.category}
          </span>
        )}
      </div>
    </div>
  );
};

export const QueriesPage: React.FC = () => {
  const { queries, loading, error } = useQueries();

  const activeQueries = queries.filter(q => q.status === 'Active' || q.status === 'Commit' || q.status === 'Reveal');
  const resolvedQueries = queries.filter(q => q.status === 'Resolved');

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
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent"></div>
        <div className="relative">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-purple-500/20 rounded-lg border border-purple-500/30">
              <HelpCircle className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h1 className="text-4xl font-epilogue font-bold text-gradient tracking-tight-custom">
                Prediction Queries
              </h1>
              <p className="text-lg text-alethea-gray-light mt-2">
                Decentralized oracle queries and prediction markets
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card stat-card">
          <div className="stat-number text-purple-400">{queries.length}</div>
          <div className="text-alethea-gray-light mt-1 text-sm">Total Queries</div>
        </div>
        <div className="card stat-card">
          <div className="stat-number text-green-400">{activeQueries.length}</div>
          <div className="text-alethea-gray-light mt-1 text-sm">Active</div>
        </div>
        <div className="card stat-card">
          <div className="stat-number text-blue-400">{resolvedQueries.length}</div>
          <div className="text-alethea-gray-light mt-1 text-sm">Resolved</div>
        </div>
        <div className="card stat-card">
          <div className="stat-number text-yellow-400">
            {formatAmount(queries.reduce((sum, q) => sum + parseFloat(q.rewardAmount || '0'), 0).toString())}
          </div>
          <div className="text-alethea-gray-light mt-1 text-sm">Total Rewards</div>
        </div>
      </div>

      {/* Active Queries */}
      {activeQueries.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-epilogue font-bold text-white flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span>Active Queries</span>
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeQueries.map(query => (
              <QueryCard key={query.id} query={query} />
            ))}
          </div>
        </div>
      )}

      {/* Resolved Queries */}
      {resolvedQueries.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-epilogue font-bold text-white">Resolved Queries</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {resolvedQueries.map(query => (
              <QueryCard key={query.id} query={query} />
            ))}
          </div>
        </div>
      )}

      {queries.length === 0 && (
        <div className="card text-center py-12">
          <HelpCircle className="w-12 h-12 mx-auto text-alethea-gray-medium mb-4" />
          <p className="text-alethea-gray-light">No queries found</p>
        </div>
      )}
    </div>
  );
};
