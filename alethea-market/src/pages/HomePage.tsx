import { Link } from 'react-router-dom';
import { TrendingUp, Shield, Zap, Users, ArrowRight, CheckCircle } from 'lucide-react';

export default function HomePage() {
    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="py-20 px-4">
                <div className="container mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
                        <span className="text-purple-400 text-sm">🔮 Powered by Alethea Oracle</span>
                    </div>

                    <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
                        Prediction Markets
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                            Resolved by Consensus
                        </span>
                    </h1>

                    <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
                        Create markets on real-world events. Bet on outcomes.
                        Get fair resolution through decentralized oracle voting.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            to="/markets"
                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-opacity"
                        >
                            Explore Markets <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link
                            to="/how-it-works"
                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-colors"
                        >
                            How It Works
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-16 px-4">
                <div className="container mx-auto">
                    <div className="grid md:grid-cols-3 gap-6">
                        <FeatureCard
                            icon={<Shield className="w-8 h-8" />}
                            title="Decentralized Resolution"
                            description="Markets are resolved by Alethea Oracle voters using commit-reveal voting, ensuring fair and manipulation-resistant outcomes."
                        />
                        <FeatureCard
                            icon={<Zap className="w-8 h-8" />}
                            title="Fast & Cheap"
                            description="Built on Linera's microchain architecture for instant transactions and minimal fees."
                        />
                        <FeatureCard
                            icon={<Users className="w-8 h-8" />}
                            title="Community Driven"
                            description="Oracle voters stake tokens and earn rewards for accurate resolutions. Bad actors get slashed."
                        />
                    </div>
                </div>
            </section>

            {/* Integration Flow */}
            <section className="py-16 px-4 bg-black/20">
                <div className="container mx-auto">
                    <h2 className="text-3xl font-bold text-white text-center mb-12">
                        Oracle Integration Flow
                    </h2>

                    <div className="max-w-4xl mx-auto">
                        <div className="grid md:grid-cols-4 gap-4">
                            <FlowStep
                                step={1}
                                title="Create Market"
                                description="Define question & outcomes"
                                color="purple"
                            />
                            <FlowStep
                                step={2}
                                title="Place Bets"
                                description="Users bet on Yes/No"
                                color="blue"
                            />
                            <FlowStep
                                step={3}
                                title="Oracle Voting"
                                description="Voters resolve outcome"
                                color="pink"
                            />
                            <FlowStep
                                step={4}
                                title="Claim Payouts"
                                description="Winners get rewards"
                                color="green"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Example Markets */}
            <section className="py-16 px-4">
                <div className="container mx-auto">
                    <h2 className="text-3xl font-bold text-white text-center mb-4">
                        Example Market Questions
                    </h2>
                    <p className="text-gray-400 text-center mb-12">
                        Oracle resolves <span className="text-purple-400">verifiable facts</span>, not predictions
                    </p>

                    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        <ExampleCard
                            category="Sports"
                            question="Did Argentina win the 2022 FIFA World Cup?"
                            answer="Yes"
                            verified
                        />
                        <ExampleCard
                            category="Crypto"
                            question="Did Bitcoin close above $100,000 on Dec 5, 2024?"
                            answer="Yes"
                            verified
                        />
                        <ExampleCard
                            category="Politics"
                            question="Did the US Federal Reserve cut rates in Dec 2024?"
                            answer="Yes"
                            verified
                        />
                        <ExampleCard
                            category="Tech"
                            question="Was SpaceX Starship Flight 6 successful?"
                            answer="Yes"
                            verified
                        />
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-4">
                <div className="container mx-auto text-center">
                    <div className="max-w-2xl mx-auto p-8 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                        <TrendingUp className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-4">
                            Ready to Start Trading?
                        </h2>
                        <p className="text-gray-400 mb-6">
                            Connect your wallet and explore prediction markets resolved by decentralized consensus.
                        </p>
                        <Link
                            to="/markets"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-opacity"
                        >
                            Go to Markets <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-colors">
            <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4">
                {icon}
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
            <p className="text-gray-400">{description}</p>
        </div>
    );
}

function FlowStep({ step, title, description, color }: { step: number; title: string; description: string; color: string }) {
    const colors: Record<string, string> = {
        purple: 'from-purple-500 to-purple-600',
        blue: 'from-blue-500 to-blue-600',
        pink: 'from-pink-500 to-pink-600',
        green: 'from-green-500 to-green-600',
    };

    return (
        <div className="text-center">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white font-bold mx-auto mb-3`}>
                {step}
            </div>
            <h3 className="text-white font-semibold mb-1">{title}</h3>
            <p className="text-sm text-gray-400">{description}</p>
        </div>
    );
}

function ExampleCard({ category, question, answer, verified }: { category: string; question: string; answer: string; verified?: boolean }) {
    return (
        <div className="p-5 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">{category}</span>
                {verified && (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle className="w-3 h-3" /> Resolved
                    </span>
                )}
            </div>
            <p className="text-white font-medium mb-2">{question}</p>
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Answer:</span>
                <span className="text-sm font-semibold text-green-400">{answer}</span>
            </div>
        </div>
    );
}
