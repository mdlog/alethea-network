import { ArrowRight, CheckCircle, Shield, Users, Zap, AlertTriangle, ExternalLink } from 'lucide-react';

export default function HowItWorksPage() {
    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-bold text-white mb-4">How It Works</h1>
                    <p className="text-xl text-gray-400">
                        Understanding the Prediction Market + Oracle Integration
                    </p>
                </div>

                {/* Architecture Overview */}
                <section className="mb-16">
                    <h2 className="text-2xl font-bold text-white mb-6">Architecture Overview</h2>
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-lg font-semibold text-purple-400 mb-3">Prediction Market (This App)</h3>
                                <ul className="space-y-2 text-gray-300">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                                        Create markets with Yes/No outcomes
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                                        Accept bets from users
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                                        Request resolution from Oracle
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                                        Distribute payouts to winners
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-pink-400 mb-3">Alethea Oracle (Resolution Layer)</h3>
                                <ul className="space-y-2 text-gray-300">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                                        Receive resolution requests
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                                        Voters commit-reveal votes
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                                        Determine consensus outcome
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                                        Send callback to market
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Flow Diagram */}
                <section className="mb-16">
                    <h2 className="text-2xl font-bold text-white mb-6">Resolution Flow</h2>
                    <div className="space-y-4">
                        <FlowStep
                            step={1}
                            title="Market Created"
                            description="User creates a market with a question about a verifiable fact (e.g., 'Did BTC close above $100k on Dec 5?')"
                            actor="Market App"
                            color="purple"
                        />
                        <FlowArrow />
                        <FlowStep
                            step={2}
                            title="Betting Period"
                            description="Users place bets on Yes or No outcomes. Funds are pooled in the market contract."
                            actor="Users"
                            color="blue"
                        />
                        <FlowArrow />
                        <FlowStep
                            step={3}
                            title="Market Expires"
                            description="When the market end time is reached, the market requests resolution from Alethea Oracle."
                            actor="Market App"
                            color="purple"
                        />
                        <FlowArrow />
                        <FlowStep
                            step={4}
                            title="Query Created"
                            description="Oracle creates a query with the market question. Voters are notified to participate."
                            actor="Oracle"
                            color="pink"
                        />
                        <FlowArrow />
                        <FlowStep
                            step={5}
                            title="Commit Phase"
                            description="Voters submit encrypted vote commitments (hash of vote + salt). No one can see others' votes."
                            actor="Voters"
                            color="yellow"
                        />
                        <FlowArrow />
                        <FlowStep
                            step={6}
                            title="Reveal Phase"
                            description="Voters reveal their votes by submitting the original vote and salt. Contract verifies hash matches."
                            actor="Voters"
                            color="yellow"
                        />
                        <FlowArrow />
                        <FlowStep
                            step={7}
                            title="Resolution"
                            description="Oracle determines winning outcome based on stake-weighted voting. Correct voters earn rewards, incorrect voters get slashed."
                            actor="Oracle"
                            color="pink"
                        />
                        <FlowArrow />
                        <FlowStep
                            step={8}
                            title="Callback"
                            description="Oracle sends resolution callback to market contract with the winning outcome."
                            actor="Oracle → Market"
                            color="green"
                        />
                        <FlowArrow />
                        <FlowStep
                            step={9}
                            title="Payouts"
                            description="Market distributes pooled funds to users who bet on the winning outcome."
                            actor="Market App"
                            color="green"
                        />
                    </div>
                </section>

                {/* Why This Matters */}
                <section className="mb-16">
                    <h2 className="text-2xl font-bold text-white mb-6">Why Decentralized Resolution?</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <InfoCard
                            icon={<Shield className="w-6 h-6" />}
                            title="No Single Point of Failure"
                            description="Multiple independent voters determine the outcome, not a single centralized entity."
                        />
                        <InfoCard
                            icon={<Users className="w-6 h-6" />}
                            title="Economic Incentives"
                            description="Voters stake tokens and earn rewards for accurate votes. Bad actors lose their stake."
                        />
                        <InfoCard
                            icon={<Zap className="w-6 h-6" />}
                            title="Commit-Reveal Prevents Collusion"
                            description="Votes are hidden during commit phase, preventing voters from copying others."
                        />
                        <InfoCard
                            icon={<AlertTriangle className="w-6 h-6" />}
                            title="Slashing Deters Manipulation"
                            description="Voters who vote against consensus lose 5% of their stake, making attacks expensive."
                        />
                    </div>
                </section>

                {/* Technical Details */}
                <section className="mb-16">
                    <h2 className="text-2xl font-bold text-white mb-6">Technical Details</h2>
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2">Cross-Application Call</h3>
                                <p className="text-gray-400 mb-3">
                                    When a market expires, it makes a cross-application call to the Oracle Registry:
                                </p>
                                <pre className="p-4 rounded-lg bg-black/50 text-sm text-gray-300 overflow-x-auto">
                                    {`Operation::CreateQueryWithCallback {
    description: "Market #1: Did BTC close above $100k?",
    outcomes: ["Yes", "No"],
    strategy: Majority,
    callback_chain: market_chain_id,
    callback_app: market_app_id,
    callback_data: market_id.to_bytes(),
}`}
                                </pre>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2">Resolution Callback</h3>
                                <p className="text-gray-400 mb-3">
                                    After voting completes, Oracle sends a callback message to the market:
                                </p>
                                <pre className="p-4 rounded-lg bg-black/50 text-sm text-gray-300 overflow-x-auto">
                                    {`Message::QueryResolutionCallback {
    query_id: 1,
    resolved_outcome: "Yes",
    resolved_at: timestamp,
    callback_data: market_id_bytes,
}`}
                                </pre>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Links */}
                <section>
                    <h2 className="text-2xl font-bold text-white mb-6">Learn More</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <a
                            href="http://localhost:4002"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-colors group"
                        >
                            <div>
                                <h3 className="text-white font-semibold group-hover:text-purple-400 transition-colors">Oracle Dashboard</h3>
                                <p className="text-sm text-gray-400">View voters, queries, and vote on resolutions</p>
                            </div>
                            <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
                        </a>
                        <a
                            href="https://github.com/alethea-network"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-colors group"
                        >
                            <div>
                                <h3 className="text-white font-semibold group-hover:text-purple-400 transition-colors">GitHub Repository</h3>
                                <p className="text-sm text-gray-400">View source code and documentation</p>
                            </div>
                            <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
                        </a>
                    </div>
                </section>
            </div>
        </div>
    );
}

function FlowStep({ step, title, description, actor, color }: { step: number; title: string; description: string; actor: string; color: string }) {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
        purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
        blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
        pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400' },
        yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
        green: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' },
    };

    return (
        <div className={`p-4 rounded-xl ${colors[color].bg} border ${colors[color].border}`}>
            <div className="flex items-start gap-4">
                <div className={`w-8 h-8 rounded-full bg-white/10 flex items-center justify-center ${colors[color].text} font-bold flex-shrink-0`}>
                    {step}
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold">{title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${colors[color].bg} ${colors[color].text}`}>
                            {actor}
                        </span>
                    </div>
                    <p className="text-gray-400 text-sm">{description}</p>
                </div>
            </div>
        </div>
    );
}

function FlowArrow() {
    return (
        <div className="flex justify-center">
            <ArrowRight className="w-5 h-5 text-gray-600 rotate-90" />
        </div>
    );
}

function InfoCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="p-5 rounded-xl bg-white/5 border border-white/10">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 mb-3">
                {icon}
            </div>
            <h3 className="text-white font-semibold mb-2">{title}</h3>
            <p className="text-gray-400 text-sm">{description}</p>
        </div>
    );
}
