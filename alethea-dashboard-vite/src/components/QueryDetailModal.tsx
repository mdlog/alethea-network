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
            <div className="w-48 h-48 rounded-full bg-grey-100 flex items-center justify-center">
                <span className="text-grey-500 text-sm">No data</span>
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
                    <circle cx={cx} cy={cy} r={innerRadius} fill="#f9fafb" />
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
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#f9fafb" />
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
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-grey-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-alethea-50 flex items-center justify-center">
                            <PieChart className="w-5 h-5 text-alethea-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-black">Query #{queryId}</h2>
                            <p className="text-sm text-grey-700 font-medium">Vote Distribution</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-grey-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-grey-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-alethea-600" />
                        </div>
                    ) : query ? (
                        <div className="space-y-6">
                            {/* Question Section - Short title */}
                            <div className="bg-gradient-to-r from-alethea-50 to-blue-50 border border-alethea-200 rounded-xl p-5">
                                <h3 className="text-base font-bold text-grey-900 mb-1">
                                    {(() => {
                                        const fullDesc = query.description;
                                        // Extract just the question (first sentence before "This market resolves")
                                        const questionMatch = fullDesc.match(/^([^?]+\?)/);
                                        return questionMatch ? questionMatch[1] : fullDesc.split('Source:')[0].split('.')[0].trim();
                                    })()}
                                </h3>
                            </div>

                            {/* Description Section - Detailed explanation */}
                            <div className="bg-white border border-grey-200 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                                        <span className="text-blue-600 text-sm font-bold">📝</span>
                                    </div>
                                    <h3 className="text-sm font-semibold text-grey-900">Description</h3>
                                </div>
                                <div className="text-sm text-grey-800 leading-relaxed space-y-2">
                                    {(() => {
                                        const fullDesc = query.description;
                                        const beforeSource = fullDesc.split('Source:')[0];

                                        // Split into question and resolution details
                                        const parts = beforeSource.split('This market resolves');

                                        if (parts.length > 1) {
                                            return (
                                                <>
                                                    <p className="font-medium text-grey-900">{parts[0].trim()}</p>
                                                    <p className="text-grey-700">This market resolves{parts[1].trim()}</p>
                                                </>
                                            );
                                        }

                                        return <p>{beforeSource.trim()}</p>;
                                    })()}
                                </div>
                            </div>

                            {/* Data Source Section */}
                            {query.description.includes('Source:') && (
                                <div className="bg-white border border-grey-200 rounded-xl p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                                            <span className="text-green-600 text-sm font-bold">🔗</span>
                                        </div>
                                        <h3 className="text-sm font-semibold text-grey-900">Data Source</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {(() => {
                                            const sourceText = query.description.split('Source:')[1].trim();
                                            const urlMatch = sourceText.match(/(https?:\/\/[^\s)]+)/);
                                            if (urlMatch) {
                                                const url = urlMatch[0];
                                                const nameMatch = sourceText.match(/^([^(]+)/);
                                                const sourceName = nameMatch ? nameMatch[1].trim() : 'Official Source';

                                                return (
                                                    <>
                                                        <p className="text-sm text-grey-700">{sourceName}</p>
                                                        <a
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                            </svg>
                                                            View Source
                                                        </a>
                                                    </>
                                                );
                                            }
                                            return <p className="text-sm text-grey-700">{sourceText}</p>;
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* Voting Options Section */}
                            <div className="bg-white border border-grey-200 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                                        <span className="text-purple-600 text-sm font-bold">☑️</span>
                                    </div>
                                    <h3 className="text-sm font-semibold text-grey-900">Voting Options</h3>
                                </div>
                                <div className="space-y-2">
                                    {query.outcomes.map((outcome, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm text-grey-700">
                                            <div className="w-1.5 h-1.5 rounded-full bg-grey-400"></div>
                                            <span>{outcome}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Status & Phase */}
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className={`badge ${query.status === 'Resolved' ? 'badge-success' :
                                        query.status === 'Active' ? 'badge-info' : 'badge-neutral'
                                        }`}>
                                        {query.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {query.phase === 'Commit' ? (
                                        <Lock className="w-4 h-4 text-blue-600" />
                                    ) : query.phase === 'Reveal' ? (
                                        <Eye className="w-4 h-4 text-amber-600" />
                                    ) : (
                                        <Clock className="w-4 h-4 text-grey-500" />
                                    )}
                                    <span className="text-sm text-grey-600">{query.phase} Phase</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-grey-500" />
                                    <span className="text-sm text-grey-600">
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
                            <div className="bg-gradient-to-br from-grey-50 to-white rounded-xl p-6 border border-grey-200">
                                <h3 className="text-sm font-semibold text-grey-800 mb-5">Stake Distribution by Outcome</h3>

                                <div className="flex items-center gap-8">
                                    {/* Donut Chart */}
                                    <DonutChart data={pieData} />

                                    {/* Legend */}
                                    <div className="flex-1 space-y-3">
                                        {pieData.map((d, i) => {
                                            const percentage = totalStake > 0 ? (d.value / totalStake * 100) : 0;
                                            return (
                                                <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg border border-grey-200 hover:border-grey-300 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-5 h-5 rounded-md shadow-sm"
                                                            style={{ backgroundColor: d.color }}
                                                        />
                                                        <span className="text-sm font-semibold text-grey-900">{d.label}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-bold text-black">
                                                            {formatStake(d.value)} <span className="text-grey-600 font-medium">ALTH</span>
                                                        </div>
                                                        <div className="text-xs text-grey-600 font-medium">
                                                            {percentage.toFixed(1)}%
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Total */}
                                        <div className="pt-3 mt-3 border-t-2 border-grey-300 flex items-center justify-between">
                                            <span className="text-sm font-semibold text-grey-800">Locked for Query</span>
                                            <span className="text-base font-bold text-black">
                                                {formatStake(totalStake)} <span className="text-grey-700 font-semibold">ALTH</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Voters List */}
                            {query.votes && query.votes.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-grey-800 mb-3">
                                        Voters ({query.votes.length})
                                    </h3>
                                    <div className="border border-grey-200 rounded-xl overflow-hidden">
                                        <table className="table-light">
                                            <thead>
                                                <tr>
                                                    <th className="text-grey-800">Voter</th>
                                                    <th className="text-grey-800">Vote</th>
                                                    <th className="text-right text-grey-800">Stake</th>
                                                    <th className="text-right text-grey-800">All Locked</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {query.votes.map((vote, i) => {
                                                    const voterInfo = voters.find(v =>
                                                        v.address.toLowerCase().includes(vote.voter.toLowerCase().slice(0, 16)) ||
                                                        vote.voter.toLowerCase().includes(v.address.toLowerCase().slice(0, 16))
                                                    );
                                                    const stake = voterInfo ? parseStake(voterInfo.stake) : 0;
                                                    const locked = voterInfo ? parseStake(voterInfo.lockedStake) : 0;

                                                    return (
                                                        <tr key={i}>
                                                            <td>
                                                                <span className="font-mono text-xs text-grey-800 font-medium">
                                                                    {vote.voter.slice(0, 8)}...{vote.voter.slice(-6)}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span className={`badge ${vote.value === query.result
                                                                    ? 'badge-success'
                                                                    : 'badge-neutral'
                                                                    }`}>
                                                                    {vote.value}
                                                                </span>
                                                            </td>
                                                            <td className="text-right">
                                                                <span className="text-sm font-semibold text-black">
                                                                    {formatStake(stake)} <span className="text-grey-700 font-medium">ALTH</span>
                                                                </span>
                                                            </td>
                                                            <td className="text-right">
                                                                <span className="text-sm font-semibold text-amber-700">
                                                                    {formatStake(locked)} <span className="text-amber-600 font-medium">ALTH</span>
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
                                <div className="text-center py-8">
                                    <Users className="w-12 h-12 mx-auto mb-3 text-grey-300" />
                                    <p className="text-grey-600">No votes yet</p>
                                    <p className="text-sm text-grey-500">Votes will appear here after reveal phase</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-grey-500">
                            Query not found
                        </div>
                    )
                    }
                </div >
            </div >
        </div >
    );
}
