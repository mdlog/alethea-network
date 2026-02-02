import { Shield, Target, Zap, Users, CheckCircle, AlertTriangle, Lock, Eye, Award, TrendingUp, Globe, Database } from 'lucide-react';

export default function AboutPage() {
    return (
        <div className="space-y-12">
            {/* Hero Section */}
            <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    Alethea Network
                </h1>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                    A decentralized oracle protocol that brings real-world truth on-chain through
                    community-driven verification and economic incentives.
                </p>
            </div>

            {/* Vision Section */}
            <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Target className="w-6 h-6 text-blue-600" />
                    Our Vision
                </h2>
                <p className="text-gray-700 text-lg leading-relaxed mb-6">
                    Alethea Network aims to be the trust layer for decentralized applications. We verify
                    <span className="font-semibold text-blue-700"> real-world events that have already occurred</span>,
                    providing reliable data for DeFi protocols, prediction markets, insurance claims, and cross-chain bridges.
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-white/70 rounded-xl p-4">
                        <Globe className="w-8 h-8 text-blue-600 mb-2" />
                        <h3 className="font-semibold text-gray-900">Real-World Events</h3>
                        <p className="text-sm text-gray-600">Verify facts that have already happened, not predictions</p>
                    </div>
                    <div className="bg-white/70 rounded-xl p-4">
                        <Database className="w-8 h-8 text-green-600 mb-2" />
                        <h3 className="font-semibold text-gray-900">On-Chain Truth</h3>
                        <p className="text-sm text-gray-600">Bring verified data to smart contracts reliably</p>
                    </div>
                    <div className="bg-white/70 rounded-xl p-4">
                        <Users className="w-8 h-8 text-purple-600 mb-2" />
                        <h3 className="font-semibold text-gray-900">Community Driven</h3>
                        <p className="text-sm text-gray-600">Decentralized verification by staked voters</p>
                    </div>
                </div>
            </section>

            {/* Use Cases Section */}
            <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Zap className="w-6 h-6 text-yellow-500" />
                    Use Cases
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                    <UseCaseCard
                        icon={<TrendingUp className="w-6 h-6 text-green-600" />}
                        title="DeFi & Derivatives"
                        description="Settle derivatives contracts based on verified price data. Example: 'Did BTC close above $100,000 on January 5, 2026?'"
                        examples={[
                            "Price settlement for options/futures",
                            "Liquidation triggers verification",
                            "Index price confirmation"
                        ]}
                    />
                    <UseCaseCard
                        icon={<Award className="w-6 h-6 text-blue-600" />}
                        title="Sports & Events"
                        description="Verify outcomes of real-world events for betting and prediction markets."
                        examples={[
                            "Did Team A win the championship game?",
                            "Final score verification",
                            "Tournament bracket results"
                        ]}
                    />
                    <UseCaseCard
                        icon={<Shield className="w-6 h-6 text-purple-600" />}
                        title="Insurance & Claims"
                        description="Automate insurance payouts based on verified real-world conditions."
                        examples={[
                            "Was flight XY123 delayed more than 2 hours?",
                            "Did rainfall exceed 50mm in Jakarta yesterday?",
                            "Earthquake magnitude verification"
                        ]}
                    />
                    <UseCaseCard
                        icon={<Globe className="w-6 h-6 text-orange-600" />}
                        title="Cross-Chain Bridges"
                        description="Verify state and transactions across different blockchains."
                        examples={[
                            "Transaction confirmation on source chain",
                            "Asset lock verification",
                            "Cross-chain state proofs"
                        ]}
                    />
                </div>
            </section>

            {/* Quality Assurance Section */}
            <section className="bg-white rounded-2xl border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-green-600" />
                    Quality Assurance Mechanisms
                </h2>
                <p className="text-gray-600 mb-8">
                    Alethea Network employs multiple layers of security and incentive mechanisms to ensure
                    accurate and reliable oracle responses.
                </p>

                <div className="space-y-6">
                    {/* Commit-Reveal */}
                    <QualityCard
                        icon={<Lock className="w-5 h-5 text-blue-600" />}
                        title="Commit-Reveal Voting"
                        description="Two-phase voting prevents vote copying and front-running attacks."
                        details={[
                            "Phase 1 (Commit): Voters submit hash of their vote - no one can see others' votes",
                            "Phase 2 (Reveal): Voters reveal actual vote with salt for verification",
                            "Prevents: Bandwagon effect, vote manipulation, front-running"
                        ]}
                    />

                    {/* Economic Security */}
                    <QualityCard
                        icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
                        title="Economic Security (Stake Slashing)"
                        description="Voters have skin in the game - incorrect votes result in stake loss."
                        details={[
                            "10% of available stake locked per vote as collateral",
                            "5% stake slashed if vote differs from consensus",
                            "Higher stake = more to lose = stronger incentive for accuracy",
                            "Slashed tokens go to reward pool for correct voters"
                        ]}
                    />

                    {/* Reputation System */}
                    <QualityCard
                        icon={<Award className="w-5 h-5 text-purple-600" />}
                        title="Reputation System"
                        description="Track record matters - consistent accuracy builds voting power."
                        details={[
                            "Reputation = (correct_votes / total_votes) × 100",
                            "Higher reputation = higher voting weight (up to 2x multiplier)",
                            "Tiers: Novice → Intermediate → Expert → Master",
                            "Long-term incentive for quality over quantity"
                        ]}
                    />

                    {/* Weighted Voting */}
                    <QualityCard
                        icon={<Users className="w-5 h-5 text-green-600" />}
                        title="Stake-Weighted Voting"
                        description="Voting power proportional to economic commitment."
                        details={[
                            "Vote weight = stake × reputation_multiplier",
                            "Larger stakeholders have more influence but also more at risk",
                            "Prevents Sybil attacks (creating many fake voters)",
                            "Rewards distributed proportionally to stake"
                        ]}
                    />

                    {/* Consensus Strategies */}
                    <QualityCard
                        icon={<CheckCircle className="w-5 h-5 text-teal-600" />}
                        title="Flexible Consensus Strategies"
                        description="Different query types can use appropriate consensus mechanisms."
                        details={[
                            "Majority: Simple >50% for straightforward yes/no questions",
                            "Supermajority: >66.67% for high-stakes decisions",
                            "WeightedByStake: Proportional to stake for nuanced outcomes",
                            "Minimum vote threshold ensures sufficient participation"
                        ]}
                    />
                </div>
            </section>

            {/* Example Queries Section */}
            <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Eye className="w-6 h-6 text-indigo-600" />
                    Example Oracle Queries
                </h2>
                <p className="text-gray-600 mb-6">
                    Oracle queries should verify <span className="font-semibold">events that have already occurred</span>,
                    not predict future outcomes. Here are examples of well-formed queries:
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                    <ExampleQueryCard
                        category="Price Data"
                        query="Did BTC close above $100,000 on January 5, 2026?"
                        outcomes={["Yes", "No"]}
                        good
                    />
                    <ExampleQueryCard
                        category="Sports"
                        query="Did Manchester United win against Liverpool on January 4, 2026?"
                        outcomes={["Yes", "No", "Draw"]}
                        good
                    />
                    <ExampleQueryCard
                        category="Weather"
                        query="Was the temperature in Tokyo above 10°C on January 6, 2026?"
                        outcomes={["Yes", "No"]}
                        good
                    />
                    <ExampleQueryCard
                        category="Events"
                        query="Did Company X announce quarterly earnings above $5B on January 3, 2026?"
                        outcomes={["Yes", "No"]}
                        good
                    />
                    <ExampleQueryCard
                        category="❌ Bad Example"
                        query="Will BTC reach $150,000 by end of 2026?"
                        outcomes={["Yes", "No"]}
                        good={false}
                        reason="This is a prediction, not verification of a past event"
                    />
                    <ExampleQueryCard
                        category="❌ Bad Example"
                        query="Is Ethereum better than Solana?"
                        outcomes={["Yes", "No"]}
                        good={false}
                        reason="Subjective opinion, not verifiable fact"
                    />
                </div>
            </section>

            {/* How It Works Summary */}
            <section className="bg-slate-900 text-white rounded-2xl p-8">
                <h2 className="text-2xl font-bold mb-6">How It Works</h2>
                <div className="grid md:grid-cols-4 gap-6">
                    <StepCard step={1} title="Query Created" description="DApp or user creates a query about a real-world event" />
                    <StepCard step={2} title="Commit Phase" description="Voters submit hidden vote commitments (hashed)" />
                    <StepCard step={3} title="Reveal Phase" description="Voters reveal their actual votes for verification" />
                    <StepCard step={4} title="Resolution" description="Consensus reached, rewards distributed, result sent to DApp" />
                </div>
            </section>

            {/* CTA */}
            <section className="text-center py-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Get Started?</h2>
                <p className="text-gray-600 mb-6">Join the network as a voter or integrate Alethea into your DApp.</p>
                <div className="flex justify-center gap-4">
                    <a href="/voters" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                        Become a Voter
                    </a>
                    <a href="/docs" className="px-6 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors font-medium">
                        Read Documentation
                    </a>
                </div>
            </section>
        </div>
    );
}

function UseCaseCard({ icon, title, description, examples }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    examples: string[];
}) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
                {icon}
                <h3 className="font-semibold text-gray-900">{title}</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">{description}</p>
            <ul className="space-y-1">
                {examples.map((example, i) => (
                    <li key={i} className="text-sm text-gray-500 flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {example}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function QualityCard({ icon, title, description, details }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    details: string[];
}) {
    return (
        <div className="border border-gray-100 rounded-xl p-5 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gray-100 rounded-lg">{icon}</div>
                <div>
                    <h3 className="font-semibold text-gray-900">{title}</h3>
                    <p className="text-sm text-gray-500">{description}</p>
                </div>
            </div>
            <ul className="mt-3 space-y-1 pl-12">
                {details.map((detail, i) => (
                    <li key={i} className="text-sm text-gray-600 list-disc">{detail}</li>
                ))}
            </ul>
        </div>
    );
}

function ExampleQueryCard({ category, query, outcomes, good, reason }: {
    category: string;
    query: string;
    outcomes: string[];
    good: boolean;
    reason?: string;
}) {
    return (
        <div className={`rounded-xl p-4 border ${good ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <span className={`text-xs font-medium ${good ? 'text-green-600' : 'text-red-600'}`}>{category}</span>
            <p className={`font-medium mt-1 ${good ? 'text-gray-900' : 'text-gray-500 line-through'}`}>{query}</p>
            <div className="flex gap-2 mt-2">
                {outcomes.map((o, i) => (
                    <span key={i} className={`text-xs px-2 py-1 rounded ${good ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {o}
                    </span>
                ))}
            </div>
            {reason && <p className="text-xs text-red-600 mt-2 italic">{reason}</p>}
        </div>
    );
}

function StepCard({ step, title, description }: { step: number; title: string; description: string }) {
    return (
        <div className="text-center">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">{step}</span>
            </div>
            <h3 className="font-semibold mb-1">{title}</h3>
            <p className="text-sm text-gray-400">{description}</p>
        </div>
    );
}
