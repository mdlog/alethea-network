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
function DonutChart({ data, size = 'default' }: { data: { label: string; value: number; color: string }[]; size?: 'small' | 'default' }) {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const sizeClass = size === 'small' ? 'w-20 h-20 sm:w-24 sm:h-24' : 'w-24 h-24 sm:w-32 sm:h-32';
    
    if (total === 0) {
        return (
            <div className={`${sizeClass} rounded-full bg-grey-100 flex items-center justify-center`}>
                <span className="text-grey-500 text-[10px] sm:text-xs">No data</span>
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
        <svg viewBox="0 0 100 100" className={sizeClass}>
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
        <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-opacity duration-300"
            onClick={onClose}
            style={{ margin: 0, padding: 0 }}
        >
            <div
                className="fixed right-0 w-full sm:max-w-md md:max-w-xl bg-white shadow-2xl transform transition-transform duration-300 ease-out flex flex-col"
                onClick={e => e.stopPropagation()}
                style={{
                    animation: 'slideInRight 0.3s ease-out',
                    top: 0,
                    bottom: 0,
                    height: '100vh',
                    margin: 0,
                    padding: 0
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between p-3 sm:p-4 border-b border-grey-200 bg-gradient-to-r from-alethea-50 to-blue-50 flex-shrink-0"
                    style={{ margin: 0 }}
                >
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                            <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-alethea-600" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-semibold text-black">Query #{queryId}</h2>
                            <p className="text-xs sm:text-sm text-grey-700 font-medium">Vote Distribution</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 sm:p-2 hover:bg-white/80 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-grey-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-8 sm:py-12">
                            <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-alethea-600" />
                        </div>
                    ) : query ? (
                        <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-6">
                            {/* Question Section - Short title */}
                            <div className="bg-gradient-to-r from-alethea-50 to-blue-50 border border-alethea-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
                                <h3 className="text-sm sm:text-base font-bold text-grey-900">
                                    {(() => {
                                        const fullDesc = query.description;
                                        const questionMatch = fullDesc.match(/^([^?]+\?)/);
                                        return questionMatch ? questionMatch[1] : fullDesc.split('Source:')[0].split('.')[0].trim();
                                    })()}
                                </h3>
                            </div>

                            {/* Description Section - Compact */}
                            <div className="bg-white border border-grey-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
                                <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                                    <span className="text-xs sm:text-sm font-semibold text-grey-900">📝 Description</span>
                                </div>
                                <div className="text-xs sm:text-sm text-grey-700 leading-relaxed">
                                    {(() => {
                                        const fullDesc = query.description;
                                        const beforeSource = fullDesc.split('Source:')[0];
                                        const parts = beforeSource.split('This market resolves');

                                        if (parts.length > 1) {
                                            return (
                                                <p className="text-grey-700">This market resolves{parts[1].trim()}</p>
                                            );
                                        }
                                        return <p>{beforeSource.trim()}</p>;
                                    })()}
                                </div>
                            </div>

                            {/* Data Source Section - Compact */}
                            {query.description.includes('Source:') && (
                                <div className="bg-white border border-grey-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
                                    <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                                        <span className="text-xs sm:text-sm font-semibold text-grey-900">🔗 Data Source</span>
                                    </div>
                                    <div>
                                        {(() => {
                                            const sourceText = query.description.split('Source:')[1].trim();
                                            const urlMatch = sourceText.match(/(https?:\/\/[^\s)]+)/);
                                            if (urlMatch) {
                                                const url = urlMatch[0];
                                                const nameMatch = sourceText.match(/^([^(]+)/);
                                                const sourceName = nameMatch ? nameMatch[1].trim() : 'Official Source';

                                                return (
                                                    <div className="space-y-1">
                                                        <p className="text-xs sm:text-sm text-grey-700 break-words">{sourceName}</p>
                                                        <a
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-blue-600 hover:text-blue-800 font-medium"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                            </svg>
                                                            View Source
                                                        </a>
                                                    </div>
                                                );
                                            }
                                            return <p className="text-xs sm:text-sm text-grey-700">{sourceText}</p>;
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* Voting Options - Inline */}
                            <div className="bg-white border border-grey-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
                                <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                                    <span className="text-xs sm:text-sm font-semibold text-grey-900">☑️ Options</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                    {query.outcomes.map((outcome, i) => (
                                        <span key={i} className="px-2 sm:px-3 py-0.5 sm:py-1 bg-grey-100 text-grey-700 text-[10px] sm:text-sm rounded-full">
                                            {outcome}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Status & Phase - Compact inline */}
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-1 sm:px-4">
                                <span className={`badge text-[10px] sm:text-xs ${query.status === 'Resolved' ? 'badge-success' :
                                    query.status === 'Active' ? 'badge-info' : 'badge-neutral'
                                    }`}>
                                    {query.status}
                                </span>
                                <div className="flex items-center gap-1">
                                    {query.phase === 'Commit' ? (
                                        <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600" />
                                    ) : query.phase === 'Reveal' ? (
                                        <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600" />
                                    ) : (
                                        <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-grey-500" />
                                    )}
                                    <span className="text-[10px] sm:text-xs text-grey-600">{query.phase}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-grey-500" />
                                    <span className="text-[10px] sm:text-xs text-grey-600">
                                        {query.commitCount}c / {query.voteCount}v
                                    </span>
                                </div>
                            </div>

                            {/* Result if resolved */}
                            {query.result && (
                                <div className="mx-1 sm:mx-4 p-2 sm:p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-xs sm:text-sm text-green-700">
                                        <span className="font-medium">Result:</span> {query.result}
                                    </p>
                                </div>
                            )}

                            {/* Pie Chart & Legend - Mobile Optimized */}
                            <div className="mx-1 sm:mx-4 bg-gradient-to-br from-grey-50 to-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-grey-200">
                                <h3 className="text-xs sm:text-sm font-semibold text-grey-800 mb-2 sm:mb-3">Stake Distribution</h3>

                                {/* Stack vertically on mobile, horizontal on larger screens */}
                                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                                    {/* Donut Chart - Centered on mobile */}
                                    <div className="flex-shrink-0">
                                        <DonutChart data={pieData} size="small" />
                                    </div>

                                    {/* Legend */}
                                    <div className="flex-1 w-full space-y-1.5 sm:space-y-2">
                                        {pieData.map((d, i) => {
                                            const percentage = totalStake > 0 ? (d.value / totalStake * 100) : 0;
                                            return (
                                                <div key={i} className="flex items-center justify-between p-1.5 sm:p-2 bg-white rounded-md sm:rounded-lg border border-grey-200">
                                                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                                        <div
                                                            className="w-3 h-3 sm:w-4 sm:h-4 rounded shadow-sm flex-shrink-0"
                                                            style={{ backgroundColor: d.color }}
                                                        />
                                                        <span className="text-[10px] sm:text-xs font-semibold text-grey-900 truncate">{d.label}</span>
                                                    </div>
                                                    <div className="text-right ml-2 flex-shrink-0">
                                                        <div className="text-[10px] sm:text-xs font-bold text-black whitespace-nowrap">
                                                            {formatStake(d.value)} <span className="text-grey-600 font-medium hidden sm:inline">ALTH</span>
                                                        </div>
                                                        <div className="text-[10px] sm:text-xs text-grey-600">
                                                            {percentage.toFixed(1)}%
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Total */}
                                        <div className="pt-1.5 sm:pt-2 mt-1.5 sm:mt-2 border-t border-grey-300 flex items-center justify-between">
                                            <span className="text-[10px] sm:text-xs font-semibold text-grey-800">Total Locked</span>
                                            <span className="text-xs sm:text-sm font-bold text-black">
                                                {formatStake(totalStake)} <span className="text-grey-700 font-semibold">ALTH</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Voters List - Mobile Optimized */}
                            {query.votes && query.votes.length > 0 && (
                                <div className="mx-1 sm:mx-4 mb-4">
                                    <h3 className="text-xs sm:text-sm font-semibold text-grey-800 mb-2 sm:mb-3">
                                        Voters ({query.votes.length})
                                    </h3>
                                    
                                    {/* Mobile: Card View */}
                                    <div className="sm:hidden space-y-2">
                                        {query.votes.map((vote, i) => {
                                            const voterInfo = voters.find(v =>
                                                v.address.toLowerCase().includes(vote.voter.toLowerCase().slice(0, 16)) ||
                                                vote.voter.toLowerCase().includes(v.address.toLowerCase().slice(0, 16))
                                            );
                                            const stake = voterInfo ? parseStake(voterInfo.stake) : 0;
                                            const locked = voterInfo ? parseStake(voterInfo.lockedStake) : 0;

                                            return (
                                                <div key={i} className="p-2.5 bg-white border border-grey-200 rounded-lg">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="font-mono text-[10px] text-grey-800">
                                                            {vote.voter.slice(0, 8)}...{vote.voter.slice(-6)}
                                                        </span>
                                                        <span className={`inline-block px-2 py-0.5 text-[10px] rounded-full ${vote.value === query.result
                                                            ? 'bg-green-100 text-green-700 font-medium'
                                                            : 'bg-grey-100 text-grey-700'
                                                            }`}>
                                                            {vote.value}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[10px]">
                                                        <span className="text-grey-500">Stake: <span className="font-semibold text-black">{formatStake(stake)}</span></span>
                                                        <span className="text-grey-500">Locked: <span className="font-semibold text-amber-700">{formatStake(locked)}</span></span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Desktop: Table View */}
                                    <div className="hidden sm:block border border-grey-200 rounded-xl overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-grey-50 border-b border-grey-200">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left text-xs font-semibold text-grey-700">Voter</th>
                                                        <th className="px-3 py-2 text-left text-xs font-semibold text-grey-700">Vote</th>
                                                        <th className="px-3 py-2 text-right text-xs font-semibold text-grey-700">Stake</th>
                                                        <th className="px-3 py-2 text-right text-xs font-semibold text-grey-700">Locked</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-grey-100">
                                                    {query.votes.map((vote, i) => {
                                                        const voterInfo = voters.find(v =>
                                                            v.address.toLowerCase().includes(vote.voter.toLowerCase().slice(0, 16)) ||
                                                            vote.voter.toLowerCase().includes(v.address.toLowerCase().slice(0, 16))
                                                        );
                                                        const stake = voterInfo ? parseStake(voterInfo.stake) : 0;
                                                        const locked = voterInfo ? parseStake(voterInfo.lockedStake) : 0;

                                                        return (
                                                            <tr key={i} className="hover:bg-grey-50">
                                                                <td className="px-3 py-2">
                                                                    <span className="font-mono text-xs text-grey-800">
                                                                        {vote.voter.slice(0, 6)}...{vote.voter.slice(-4)}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${vote.value === query.result
                                                                        ? 'bg-green-100 text-green-700 font-medium'
                                                                        : 'bg-grey-100 text-grey-700'
                                                                        }`}>
                                                                        {vote.value}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-2 text-right">
                                                                    <span className="text-xs font-semibold text-black">
                                                                        {formatStake(stake)}
                                                                    </span>
                                                                    <span className="text-xs text-grey-600 ml-1">ALTH</span>
                                                                </td>
                                                                <td className="px-3 py-2 text-right">
                                                                    <span className="text-xs font-semibold text-amber-700">
                                                                        {formatStake(locked)}
                                                                    </span>
                                                                    <span className="text-xs text-amber-600 ml-1">ALTH</span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* No votes message */}
                            {(!query.votes || query.votes.length === 0) && (
                                <div className="text-center py-6 sm:py-8 mx-2 sm:mx-4">
                                    <Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 text-grey-300" />
                                    <p className="text-sm text-grey-600">No votes yet</p>
                                    <p className="text-xs sm:text-sm text-grey-500">Votes will appear after reveal</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-grey-500">
                            Query not found
                        </div>
                    )
                    }
                </div>
            </div>

            <style>{`
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                    }
                    to {
                        transform: translateX(0);
                    }
                }
            `}</style>
        </div>
    );
}
