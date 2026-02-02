import { useState, useEffect } from 'react';
import { X, Loader2, Users, Lock, Eye, Clock, PieChart } from 'lucide-react';
import { useLinera } from '../contexts/LineraContext';

interface QueryVote {
    voter: string;
    value: string;
    timestamp: string;
    confidence?: number;
}

interface QueryDetail {
    id: string;
    description: string;
    outcomes: string[];
    status: string;
    phase: string;
    commitCount: number;
    voteCount: number;
    result?: string;
    votes?: QueryVote[];
}

interface VoterInfo {
    address: string;
    stake: string;
    lockedStake: string;
}

interface Props {
    queryId: string;
    onClose: () => void;
}

// Donut chart component with gaps between segments
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) {
        return (
            <div className="w-48 h-48 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-gray-400 text-sm">No data</span>
            </div>
        );
    }

    const outerRadius = 45;
    const innerRadius = 25;
    const gapAngle = 4; // Gap between segments in degrees
    const cx = 50;
    const cy = 50;

    // Filter out zero values
    const nonZeroData = data.filter(d => d.value > 0);
    const totalGap = gapAngle * nonZeroData.length;
    const availableAngle = 360 - totalGap;

    let currentAngle = -90; // Start from top

    const arcs = nonZeroData.map((d, i) => {
        const percentage = d.value / total;
        const angle = percentage * availableAngle;
        const startAngle = currentAngle + gapAngle / 2;
        const endAngle = startAngle + angle;
        currentAngle = endAngle + gapAngle / 2;

        // Convert to radians
        const startRad = startAngle * (Math.PI / 180);
        const endRad = endAngle * (Math.PI / 180);

        // Outer arc points
        const x1Outer = cx + outerRadius * Math.cos(startRad);
        const y1Outer = cy + outerRadius * Math.sin(startRad);
        const x2Outer = cx + outerRadius * Math.cos(endRad);
        const y2Outer = cy + outerRadius * Math.sin(endRad);

        // Inner arc points
        const x1Inner = cx + innerRadius * Math.cos(endRad);
        const y1Inner = cy + innerRadius * Math.sin(endRad);
        const x2Inner = cx + innerRadius * Math.cos(startRad);
        const y2Inner = cy + innerRadius * Math.sin(startRad);

        const largeArc = angle > 180 ? 1 : 0;

        // Handle full circle case (single segment)
        if (nonZeroData.length === 1) {
            return (
                <g key={i}>
                    <circle cx={cx} cy={cy} r={outerRadius} fill={d.color} />
                    <circle cx={cx} cy={cy} r={innerRadius} fill="white" />
                </g>
            );
        }

        // Create donut segment path
        const path = `
            M ${x1Outer} ${y1Outer}
            A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}
            L ${x1Inner} ${y1Inner}
            A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x2Inner} ${y2Inner}
            Z
        `;

        return (
            <path
                key={i}
                d={path}
                fill={d.color}
                className="drop-shadow-sm"
            />
        );
    });

    return (
        <svg viewBox="0 0 100 100" className="w-48 h-48">
            {/* Shadow/depth effect */}
            <defs>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.15" />
                </filter>
            </defs>
            <g filter="url(#shadow)">
                {arcs}
            </g>
            {/* Center circle with gradient */}
            <circle cx={cx} cy={cy} r={innerRadius - 2} fill="url(#centerGradient)" />
            <defs>
                <radialGradient id="centerGradient" cx="50%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="white" />
                    <stop offset="100%" stopColor="#f3f4f6" />
                </radialGradient>
            </defs>
        </svg>
    );
}

export default function QueryDetailModal({ queryId, onClose }: Props) {
    const { executeAppChainQuery } = useLinera();
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState<QueryDetail | null>(null);
    const [voters, setVoters] = useState<VoterInfo[]>([]);
    const [stakeByOutcome, setStakeByOutcome] = useState<Record<string, number>>({});

    useEffect(() => {
        loadQueryDetail();
    }, [queryId]);

    const loadQueryDetail = async () => {
        setLoading(true);
        try {
            // Fetch query with votes
            const queryData = await executeAppChainQuery(`
                query {
                    queryWithVotes(id: ${queryId}) {
                        id
                        description
                        outcomes
                        status
                        phase
                        commitCount
                        voteCount
                        result
                        votes {
                            voter
                            value
                            timestamp
                            confidence
                        }
                    }
                }
            `);

            const q = queryData?.queryWithVotes;
            setQuery(q);

            // Fetch all voters to get stake info
            const votersData = await executeAppChainQuery(`
                query {
                    voters {
                        address
                        stake
                        lockedStake
                    }
                }
            `);

            const allVoters = votersData?.voters || [];
            setVoters(allVoters);

            // Calculate stake by outcome
            // Each vote locks 10% of voter's available stake at time of commit
            // Since we don't have per-query lock data, we estimate using total_stake / 10
            if (q?.votes && q.votes.length > 0) {
                const stakeMap: Record<string, number> = {};

                for (const vote of q.votes) {
                    // Find voter's stake
                    const voterInfo = allVoters.find((v: VoterInfo) =>
                        v.address.toLowerCase().includes(vote.voter.toLowerCase().slice(0, 16)) ||
                        vote.voter.toLowerCase().includes(v.address.toLowerCase().slice(0, 16))
                    );

                    const totalStake = voterInfo ? parseStake(voterInfo.stake) : 0;

                    // Estimate: each vote locks ~10% of total stake
                    // This is the stake committed to THIS query
                    const stakeForQuery = totalStake / 10;

                    if (!stakeMap[vote.value]) {
                        stakeMap[vote.value] = 0;
                    }
                    stakeMap[vote.value] += stakeForQuery;
                }

                setStakeByOutcome(stakeMap);
            }
        } catch (err) {
            console.error('Failed to load query detail:', err);
        } finally {
            setLoading(false);
        }
    };

    // Parse stake string to number
    const parseStake = (stake: string): number => {
        const clean = stake.endsWith('.') ? stake.slice(0, -1) : stake;
        let num = parseFloat(clean);
        if (isNaN(num)) return 0;
        // If very large, convert from attos
        if (num > 1e15) num = num / 1e18;
        return num;
    };

    // Format stake for display
    const formatStake = (stake: number): string => {
        if (stake >= 1000000) return `${(stake / 1000000).toFixed(1)}M`;
        if (stake >= 1000) return `${(stake / 1000).toFixed(1)}K`;
        return stake.toFixed(2);
    };

    // Colors for outcomes
    const outcomeColors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

    // Prepare pie chart data
    const pieData = query?.outcomes.map((outcome, i) => ({
        label: outcome,
        value: stakeByOutcome[outcome] || 0,
        color: outcomeColors[i % outcomeColors.length],
    })) || [];

    const totalStake = Object.values(stakeByOutcome).reduce((sum, v) => sum + v, 0);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <PieChart className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Query #{queryId}</h2>
                            <p className="text-sm text-gray-500">Vote Distribution</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        </div>
                    ) : query ? (
                        <div className="space-y-6">
                            {/* Description */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                                <p className="text-gray-900">{query.description}</p>
                            </div>

                            {/* Status & Phase */}
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${query.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                                        query.status === 'Active' ? 'bg-blue-100 text-blue-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                        {query.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {query.phase === 'Commit' ? (
                                        <Lock className="w-4 h-4 text-blue-600" />
                                    ) : query.phase === 'Reveal' ? (
                                        <Eye className="w-4 h-4 text-yellow-600" />
                                    ) : (
                                        <Clock className="w-4 h-4 text-gray-600" />
                                    )}
                                    <span className="text-sm text-gray-600">{query.phase} Phase</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">
                                        {query.commitCount} commits, {query.voteCount} votes
                                    </span>
                                </div>
                            </div>

                            {/* Result if resolved */}
                            {query.result && (
                                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                                    <p className="text-sm text-green-700">
                                        <span className="font-medium">Result:</span> {query.result}
                                    </p>
                                </div>
                            )}

                            {/* Pie Chart & Legend */}
                            <div className="bg-gray-50 rounded-xl p-6">
                                <h3 className="text-sm font-medium text-gray-500 mb-4">Stake Distribution by Outcome</h3>

                                <div className="flex items-center gap-8">
                                    {/* Donut Chart */}
                                    <DonutChart data={pieData} />

                                    {/* Legend */}
                                    <div className="flex-1 space-y-3">
                                        {pieData.map((d, i) => {
                                            const percentage = totalStake > 0 ? (d.value / totalStake * 100) : 0;
                                            return (
                                                <div key={i} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-4 h-4 rounded"
                                                            style={{ backgroundColor: d.color }}
                                                        />
                                                        <span className="text-sm font-medium text-gray-700">{d.label}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-sm font-bold text-gray-900">
                                                            {formatStake(d.value)} ALTH
                                                        </span>
                                                        <span className="text-xs text-gray-500 ml-2">
                                                            ({percentage.toFixed(1)}%)
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Total */}
                                        <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-500">Locked for Query</span>
                                            <span className="text-sm font-bold text-gray-900">
                                                {formatStake(totalStake)} ALTH
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Voters List */}
                            {query.votes && query.votes.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 mb-3">
                                        Voters ({query.votes.length})
                                    </h3>
                                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                                        <table className="w-full">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Voter</th>
                                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Vote</th>
                                                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Stake</th>
                                                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">All Locked</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {query.votes.map((vote, i) => {
                                                    const voterInfo = voters.find(v =>
                                                        v.address.toLowerCase().includes(vote.voter.toLowerCase().slice(0, 16)) ||
                                                        vote.voter.toLowerCase().includes(v.address.toLowerCase().slice(0, 16))
                                                    );
                                                    const stake = voterInfo ? parseStake(voterInfo.stake) : 0;
                                                    const locked = voterInfo ? parseStake(voterInfo.lockedStake) : 0;

                                                    return (
                                                        <tr key={i} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3">
                                                                <span className="font-mono text-xs text-gray-600">
                                                                    {vote.voter.slice(0, 8)}...{vote.voter.slice(-6)}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className={`px-2 py-1 rounded text-xs font-medium ${vote.value === query.result
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-gray-100 text-gray-700'
                                                                    }`}>
                                                                    {vote.value}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <span className="text-sm text-gray-900">
                                                                    {formatStake(stake)} ALTH
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <span className="text-sm text-orange-600">
                                                                    {formatStake(locked)} ALTH
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* No votes message */}
                            {(!query.votes || query.votes.length === 0) && (
                                <div className="text-center py-8 text-gray-500">
                                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    <p>No votes yet</p>
                                    <p className="text-sm">Votes will appear here after reveal phase</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            Query not found
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
