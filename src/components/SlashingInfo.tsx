import { AlertTriangle, Shield, Info, TrendingDown } from 'lucide-react';

interface SlashingInfoProps {
    voterAddress?: string;
    totalVotes?: number;
    correctVotes?: number;
    stake?: string;
}

// Helper to format stake (handles 10^18 issue from contract)
const formatStake = (value: string | number): number => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 0;
    // If value is very large (> 1e15), it's likely in attos, divide by 10^18
    if (num > 1e15) {
        return num / 1e18;
    }
    return num;
};

export default function SlashingInfo({
    voterAddress,
    totalVotes = 0,
    correctVotes = 0,
    stake = '0'
}: SlashingInfoProps) {
    const incorrectVotes = totalVotes - correctVotes;
    const accuracy = totalVotes > 0 ? (correctVotes / totalVotes) * 100 : 100;
    const stakeAmount = formatStake(stake);

    // Calculate potential slash amount (simplified: 10% per incorrect vote)
    const slashPercentage = Math.min(incorrectVotes * 10, 50); // Max 50% slash
    const potentialSlash = (stakeAmount * slashPercentage) / 100;

    // Risk level based on accuracy
    const getRiskLevel = () => {
        if (accuracy >= 80) return { level: 'Low', color: 'green', icon: Shield };
        if (accuracy >= 60) return { level: 'Medium', color: 'yellow', icon: Info };
        return { level: 'High', color: 'red', icon: AlertTriangle };
    };

    const risk = getRiskLevel();
    const RiskIcon = risk.icon;

    const riskColors = {
        green: {
            bg: 'bg-green-50',
            border: 'border-green-200',
            text: 'text-green-700',
            icon: 'text-green-500',
        },
        yellow: {
            bg: 'bg-yellow-50',
            border: 'border-yellow-200',
            text: 'text-yellow-700',
            icon: 'text-yellow-500',
        },
        red: {
            bg: 'bg-red-50',
            border: 'border-red-200',
            text: 'text-red-700',
            icon: 'text-red-500',
        },
    };

    const colors = riskColors[risk.color as keyof typeof riskColors];

    return (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-gray-900">Slashing Risk</h3>
                    <p className="text-sm text-gray-500">Stake protection status</p>
                </div>
            </div>

            {/* Risk Level Indicator */}
            <div className={`${colors.bg} ${colors.border} border rounded-lg p-4 mb-4`}>
                <div className="flex items-center gap-3">
                    <RiskIcon className={`w-6 h-6 ${colors.icon}`} />
                    <div>
                        <p className={`font-semibold ${colors.text}`}>
                            {risk.level} Risk
                        </p>
                        <p className={`text-sm ${colors.text} opacity-80`}>
                            {accuracy.toFixed(1)}% voting accuracy
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Total Votes</span>
                    <span className="font-semibold text-gray-900">{totalVotes}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Incorrect Votes</span>
                    <span className="font-semibold text-red-600">{incorrectVotes}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Current Stake</span>
                    <span className="font-semibold text-gray-900">{stakeAmount.toFixed(0)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                    <span className="text-gray-600">Potential Slash</span>
                    <span className="font-semibold text-red-600">
                        -{potentialSlash.toFixed(0)} ({slashPercentage}%)
                    </span>
                </div>
            </div>

            {/* Info Box */}
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-600">
                    <strong>How Slashing Works:</strong> Voting incorrectly on oracle queries
                    may result in a portion of your stake being slashed. Maintain high accuracy
                    to protect your stake and earn rewards.
                </p>
            </div>

            {/* Protection Tips */}
            {risk.level !== 'Low' && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700">
                        <strong>Tips to reduce risk:</strong>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>Research queries thoroughly before voting</li>
                            <li>Wait for more information if uncertain</li>
                            <li>Follow consensus patterns from high-reputation voters</li>
                        </ul>
                    </p>
                </div>
            )}
        </div>
    );
}
