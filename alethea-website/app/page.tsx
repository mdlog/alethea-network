'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Github, Shield, Zap, Users, Circle } from 'lucide-react';
import Image from 'next/image';

export default function Home() {
    return (
        <div className="min-h-screen bg-black text-white">
            {/* Navigation - Brutalist Style */}
            <nav className="fixed top-0 left-0 right-0 bg-black border-b-2 border-white z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Image src="/logo.png" alt="Alethea Network" width={48} height={48} className="object-contain" />
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

            {/* Hero - Bold & Geometric */}
            <section className="pt-32 pb-20 px-6 relative overflow-hidden">
                {/* Grid Background */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                        backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
                        backgroundSize: '50px 50px'
                    }} />
                </div>

                <div className="max-w-6xl mx-auto relative">
                    {/* Status Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 border-2 border-green-500 px-4 py-2 mb-8 font-mono text-sm"
                    >
                        <Circle className="w-3 h-3 fill-green-500 text-green-500 animate-pulse" />
                        LIVE_ON_CONWAY_TESTNET
                    </motion.div>

                    {/* Main Heading - Brutalist Typography */}
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

                    {/* Description */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-gray-400 mb-12 max-w-2xl font-mono leading-relaxed"
                    >
                        Committee-based consensus with reputation-weighted voting.
                        <br />
                        Secure. Transparent. Parallel-optimized.
                    </motion.p>

                    {/* CTA */}
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

            {/* Features - Grid System */}
            <section className="py-20 px-6 border-t-2 border-white">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-px bg-white">
                        <FeatureBox
                            icon={<Shield className="w-8 h-8" />}
                            title="SECURE_VOTING"
                            description="Two-phase commit-reveal with SHA-256 cryptography"
                            number="01"
                        />
                        <FeatureBox
                            icon={<Zap className="w-8 h-8" />}
                            title="PARALLEL_EXEC"
                            description="Optimized for Linera's microchain architecture"
                            number="02"
                        />
                        <FeatureBox
                            icon={<Users className="w-8 h-8" />}
                            title="REPUTATION_SYS"
                            description="Accuracy-based scoring with streak bonuses"
                            number="03"
                        />
                    </div>
                </div>
            </section>

            {/* How It Works - Timeline */}
            <section className="py-20 px-6 border-t-2 border-white">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-5xl font-black mb-16 font-mono">HOW_IT_WORKS</h2>

                    <div className="space-y-12">
                        <ProcessStep
                            number="01"
                            title="CREATE_QUERY"
                            description="Submit query with outcomes and rewards. Network validates and processes."
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

            {/* Stats - Bold Numbers */}
            <section className="py-20 px-6 border-t-2 border-white">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-12">
                        <StatBox number="100%" label="OPERATIONAL" />
                        <StatBox number="03" label="SMART_CONTRACTS" />
                        <StatBox number="<1s" label="QUERY_RESPONSE" />
                    </div>
                </div>
            </section>

            {/* CTA - Final */}
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

            {/* Footer - Minimal */}
            <footer className="py-12 px-6 border-t-2 border-white">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 font-mono text-sm">
                        <div className="flex items-center gap-3">
                            <Image src="/logo.png" alt="Alethea Network" width={40} height={40} className="object-contain" />
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

function StatBox({ number, label }: { number: string; label: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-center"
        >
            <div className="text-7xl font-black mb-4 font-mono">{number}</div>
            <div className="text-gray-500 font-mono text-sm tracking-wider">{label}</div>
        </motion.div>
    );
}
