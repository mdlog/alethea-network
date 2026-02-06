'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Github, Shield, Zap, Users, Circle, Database, Network, Zap as ZapIcon } from 'lucide-react';
import Image from 'next/image';
import { BlockchainVisualization } from './components/BlockchainVisualization';

export default function Home() {
    return (
        <div className="min-h-screen bg-black text-white">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 bg-black border-b-2 border-white z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Image src="/logo.png" alt="Alethea Network" width={64} height={64} className="object-contain" />
                        <div className="font-mono">
                            <div className="text-sm font-bold tracking-wider">ALETHEA</div>
                            <div className="text-xs text-gray-500">NETWORK</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <a href="https://github.com/mdlog/alethea-network" target="_blank" className="text-sm font-mono hover:text-gray-300 transition">
                            [GITHUB]
                        </a>
                        <a href="https://vote.alethea.network" target="_blank" className="bg-white text-black px-6 py-2 font-mono text-sm font-bold hover:bg-gray-200 transition">
                            LAUNCH →
                        </a>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6 relative overflow-hidden">
                <BlockchainVisualization />
                <div className="max-w-6xl mx-auto relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 border-2 border-green-500 px-4 py-2 mb-8 font-mono text-sm"
                    >
                        <Circle className="w-3 h-3 fill-green-500 text-green-500 animate-pulse" />
                        LIVE_ON_CONWAY_TESTNET
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-8"
                    >
                        <h1 className="text-7xl md:text-8xl font-black tracking-tighter leading-none mb-4">
                            DECENTRALIZED
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-400 to-white">
                                ORACLE
                            </span>
                        </h1>
                        <div className="flex items-center gap-4 text-2xl font-mono">
                            <div className="w-12 h-1 bg-white" />
                            <span className="text-gray-400">FOR LINERA PROTOCOL</span>
                        </div>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-gray-400 mb-12 max-w-2xl font-mono leading-relaxed"
                    >
                        Consensus-based data verification for DApps. Secure voting, reputation-weighted consensus, and instant finality on Linera.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col sm:flex-row gap-4"
                    >
                        <a
                            href="https://vote.alethea.network"
                            target="_blank"
                            className="group bg-white text-black px-8 py-4 font-mono font-bold text-lg hover:bg-gray-200 transition flex items-center justify-center gap-3"
                        >
                            GET_STARTED
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </a>
                        <a
                            href="https://github.com/mdlog/alethea-network"
                            target="_blank"
                            className="border-2 border-white text-white px-8 py-4 font-mono font-bold text-lg hover:bg-white hover:text-black transition flex items-center justify-center gap-3"
                        >
                            <Github className="w-5 h-5" />
                            VIEW_SOURCE
                        </a>
                    </motion.div>
                </div>
            </section>

            {/* What is Alethea */}
            <section className="py-20 px-6 border-t-2 border-white">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-5xl font-black mb-12 font-mono">WHAT_IS_ALETHEA</h2>
                    <p className="text-xl text-gray-400 mb-12 max-w-3xl font-mono leading-relaxed">
                        Alethea Network is a decentralized oracle platform that provides consensus-based data verification for DApps on Linera blockchain. It enables secure, transparent, and efficient query resolution through reputation-weighted voting.
                    </p>
                    <div className="grid md:grid-cols-3 gap-px bg-white">
                        <FeatureBox
                            icon={<Shield className="w-8 h-8" />}
                            title="DECENTRALIZED_ORACLE"
                            description="Consensus-based data verification for DApps on Linera blockchain"
                            number="01"
                        />
                        <FeatureBox
                            icon={<Zap className="w-8 h-8" />}
                            title="PARALLEL_OPTIMIZED"
                            description="Built for Linera's microchain architecture with instant finality"
                            number="02"
                        />
                        <FeatureBox
                            icon={<Users className="w-8 h-8" />}
                            title="REPUTATION_BASED"
                            description="Accuracy-weighted voting with slashing for incorrect votes"
                            number="03"
                        />
                    </div>
                </div>
            </section>

            {/* Architecture */}
            <section className="py-20 px-6 border-t-2 border-white">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-5xl font-black mb-12 font-mono">ARCHITECTURE</h2>

                    {/* Hub and Spoke */}
                    <div className="mb-16">
                        <h3 className="text-3xl font-bold mb-6 font-mono">HUB_AND_SPOKE_MODEL</h3>
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="border-2 border-white p-8">
                                <h4 className="text-xl font-bold mb-4 font-mono flex items-center gap-2">
                                    <Database className="w-5 h-5" />
                                    HUB (Registry Chain)
                                </h4>
                                <ul className="space-y-2 text-gray-400 font-mono text-sm">
                                    <li>• Voter management</li>
                                    <li>• Reputation tracking</li>
                                    <li>• Stake management</li>
                                    <li>• Reward distribution</li>
                                </ul>
                            </div>
                            <div className="border-2 border-white p-8">
                                <h4 className="text-xl font-bold mb-4 font-mono flex items-center gap-2">
                                    <Network className="w-5 h-5" />
                                    SPOKES (Market Chains)
                                </h4>
                                <ul className="space-y-2 text-gray-400 font-mono text-sm">
                                    <li>• Query creation</li>
                                    <li>• Voting execution</li>
                                    <li>• Result resolution</li>
                                    <li>• DApp integration</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Smart Contracts */}
                    <div className="mb-16">
                        <h3 className="text-3xl font-bold mb-6 font-mono">SMART_CONTRACTS</h3>
                        <div className="space-y-4">
                            <ContractBox
                                number="01"
                                name="Oracle Registry"
                                description="Manages voter registration, reputation scores, and stake tracking"
                            />
                            <ContractBox
                                number="02"
                                name="ALTH Token"
                                description="ERC-20 compatible token for staking and reward distribution"
                            />
                            <ContractBox
                                number="03"
                                name="Market Chain"
                                description="Handles query creation, voting, and result resolution"
                            />
                        </div>
                    </div>

                    {/* Data Flow */}
                    <div>
                        <h3 className="text-3xl font-bold mb-6 font-mono">DATA_FLOW</h3>
                        <div className="space-y-4">
                            <ProcessStep number="01" title="QUERY_CREATION" description="DApp submits query with outcomes and rewards on market chain" />
                            <ProcessStep number="02" title="PROPAGATION" description="Query propagates to registry chain for voter notification" />
                            <ProcessStep number="03" title="COMMIT_PHASE" description="Voters commit encrypted votes to prevent front-running" />
                            <ProcessStep number="04" title="REVEAL_PHASE" description="Voters reveal votes with salt for verification" />
                            <ProcessStep number="05" title="RESOLUTION" description="Consensus reached, rewards distributed, result sent to DApp" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Use Cases */}
            <section className="py-20 px-6 border-t-2 border-white">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-5xl font-black mb-12 font-mono">USE_CASES</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        <UseCaseBox
                            title="PREDICTION_MARKETS"
                            description="Create decentralized prediction markets for any event with community-verified outcomes"
                        />
                        <UseCaseBox
                            title="PRICE_FEEDS"
                            description="Decentralized price oracle for DeFi protocols with reputation-weighted consensus"
                        />
                        <UseCaseBox
                            title="EVENT_RESOLUTION"
                            description="Verify real-world events and outcomes for smart contracts"
                        />
                        <UseCaseBox
                            title="CROSS_CHAIN_DATA"
                            description="Secure cross-chain data verification with instant finality"
                        />
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-20 px-6 border-t-2 border-white">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-5xl font-black mb-16 font-mono">HOW_IT_WORKS</h2>
                    <div className="space-y-12">
                        <ProcessStep
                            number="01"
                            title="CREATE_QUERY"
                            description="DApp submits query with outcomes and rewards. Network validates and processes."
                        />
                        <ProcessStep
                            number="02"
                            title="COMMIT_REVEAL"
                            description="Voters commit encrypted votes, then reveal after commit phase. Prevents front-running."
                        />
                        <ProcessStep
                            number="03"
                            title="GET_RESULT"
                            description="Consensus reached via reputation-weighted voting. Results sent automatically."
                        />
                    </div>
                </div>
            </section>

            {/* Key Features */}
            <section className="py-20 px-6 border-t-2 border-white">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-5xl font-black mb-12 font-mono">KEY_FEATURES</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        <FeatureDetail title="Secure Voting" description="Two-phase commit-reveal with SHA-256 cryptography prevents vote manipulation" />
                        <FeatureDetail title="Reputation System" description="Accuracy-based voter scoring with streak bonuses for consistent correct votes" />
                        <FeatureDetail title="Stake Requirements" description="100 ALTH minimum stake required to participate in voting" />
                        <FeatureDetail title="Slashing Mechanism" description="5% penalty for incorrect votes to incentivize honest participation" />
                        <FeatureDetail title="Instant Finality" description="Results finalized immediately after reveal phase on Linera" />
                        <FeatureDetail title="Reward Distribution" description="Automatic reward distribution to correct voters from query rewards" />
                    </div>
                </div>
            </section>

            {/* Technical Specs */}
            <section className="py-20 px-6 border-t-2 border-white">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-5xl font-black mb-12 font-mono">TECHNICAL_SPECS</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        <SpecBox label="Network" value="Linera Conway Testnet" />
                        <SpecBox label="Token" value="ALTH" />
                        <SpecBox label="Minimum Stake" value="100 ALTH" />
                        <SpecBox label="Voting Phases" value="Commit → Reveal → Resolution" />
                        <SpecBox label="Response Time" value="<1 second" />
                        <SpecBox label="Smart Contracts" value="3 (Registry, Token, Market)" />
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-6 border-t-2 border-white">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-6xl font-black mb-8 font-mono">READY_TO_BUILD?</h2>
                    <p className="text-xl text-gray-400 mb-12 font-mono">
                        Start creating prediction markets with secure oracle voting
                    </p>
                    <a
                        href="https://vote.alethea.network"
                        target="_blank"
                        className="inline-flex items-center gap-3 bg-white text-black px-12 py-5 font-mono font-bold text-lg hover:bg-gray-200 transition"
                    >
                        LAUNCH_APP
                        <ArrowRight className="w-6 h-6" />
                    </a>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 border-t-2 border-white">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 font-mono text-sm">
                        <div className="flex items-center gap-3">
                            <Image src="/logo.png" alt="Alethea Network" width={56} height={56} className="object-contain" />
                            <span className="font-bold">ALETHEA_NETWORK</span>
                        </div>
                        <div className="flex items-center gap-8">
                            <a href="https://github.com/mdlog/alethea-network" target="_blank" className="hover:text-gray-400 transition">
                                [GITHUB]
                            </a>
                            <a href="https://vote.alethea.network" target="_blank" className="hover:text-gray-400 transition">
                                [DASHBOARD]
                            </a>
                            <a href="https://github.com/mdlog/alethea-network" target="_blank" className="hover:text-gray-400 transition">
                                [DOCS]
                            </a>
                        </div>
                    </div>
                    <div className="text-center mt-8 text-xs text-gray-600">
                        © 2026 ALETHEA_NETWORK // BUILT_ON_LINERA_PROTOCOL
                    </div>
                </div>
            </footer>
        </div>
    );
}

function FeatureBox({ icon, title, description, number }: { icon: React.ReactNode; title: string; description: string; number: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-black p-8 hover:bg-gray-900 transition group"
        >
            <div className="flex items-start justify-between mb-6">
                <div className="text-white group-hover:scale-110 transition-transform">
                    {icon}
                </div>
                <div className="text-4xl font-black text-gray-800 font-mono">{number}</div>
            </div>
            <h3 className="text-xl font-bold mb-3 font-mono">{title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
        </motion.div>
    );
}

function ContractBox({ number, name, description }: { number: string; name: string; description: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="border-2 border-white p-6 hover:bg-gray-900 transition"
        >
            <div className="flex items-start gap-4">
                <div className="text-3xl font-black text-gray-800 font-mono flex-shrink-0">{number}</div>
                <div>
                    <h4 className="text-lg font-bold mb-2 font-mono">{name}</h4>
                    <p className="text-gray-400 text-sm">{description}</p>
                </div>
            </div>
        </motion.div>
    );
}

function ProcessStep({ number, title, description }: { number: string; title: string; description: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex gap-8 items-start border-l-4 border-white pl-8 hover:border-gray-400 transition"
        >
            <div className="text-6xl font-black text-gray-800 font-mono flex-shrink-0">{number}</div>
            <div className="pt-2">
                <h3 className="text-2xl font-bold mb-3 font-mono">{title}</h3>
                <p className="text-gray-400 leading-relaxed">{description}</p>
            </div>
        </motion.div>
    );
}

function UseCaseBox({ title, description }: { title: string; description: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="border-2 border-white p-8 hover:bg-gray-900 transition"
        >
            <h3 className="text-xl font-bold mb-3 font-mono">{title}</h3>
            <p className="text-gray-400 leading-relaxed">{description}</p>
        </motion.div>
    );
}

function FeatureDetail({ title, description }: { title: string; description: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="border-2 border-white p-6"
        >
            <h4 className="text-lg font-bold mb-2 font-mono">{title}</h4>
            <p className="text-gray-400 text-sm">{description}</p>
        </motion.div>
    );
}

function SpecBox({ label, value }: { label: string; value: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="border-2 border-white p-6"
        >
            <p className="text-gray-500 text-sm font-mono mb-2">{label}</p>
            <p className="text-xl font-bold font-mono">{value}</p>
        </motion.div>
    );
}
