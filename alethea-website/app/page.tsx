'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Github, BookOpen, Shield, Zap, Users } from 'lucide-react';
import Image from 'next/image';

export default function Home() {
    return (
        <div className="min-h-screen bg-white text-black">
            {/* Navigation - Minimal & Clean */}
            <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-b border-gray-200 z-50">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Image src="/logo.png" alt="Alethea" width={32} height={32} className="rounded-lg" />
                        <span className="font-bold text-lg">Alethea</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <a href="https://github.com/mdlog/alethea-network" target="_blank" className="text-gray-600 hover:text-black transition text-sm font-medium">
                            GitHub
                        </a>
                        <a href="https://vote.alethea.network" target="_blank" className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition flex items-center gap-2">
                            Launch App
                            <ArrowRight className="w-4 h-4" />
                        </a>
                    </div>
                </div>
            </nav>

            {/* Hero - Bold & Simple */}
            <section className="pt-32 pb-20 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm font-medium text-gray-700 mb-8"
                    >
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Live on Conway Testnet
                    </motion.div>

                    {/* Main Heading */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-6xl md:text-7xl font-bold tracking-tight mb-6 leading-tight"
                    >
                        Decentralized Oracle
                        <br />
                        <span className="text-gray-400">for Linera</span>
                    </motion.h1>

                    {/* Description */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed"
                    >
                        Committee-based oracle with reputation-weighted voting.
                        Secure, transparent, and optimized for parallel execution.
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                    >
                        <a
                            href="https://vote.alethea.network"
                            target="_blank"
                            className="bg-black text-white px-8 py-4 rounded-xl text-base font-semibold hover:bg-gray-800 transition flex items-center gap-2 shadow-lg shadow-black/10"
                        >
                            Get Started
                            <ArrowRight className="w-5 h-5" />
                        </a>
                        <a
                            href="https://github.com/mdlog/alethea-network"
                            target="_blank"
                            className="border-2 border-gray-200 text-black px-8 py-4 rounded-xl text-base font-semibold hover:border-gray-300 transition flex items-center gap-2"
                        >
                            <Github className="w-5 h-5" />
                            View on GitHub
                        </a>
                    </motion.div>
                </div>
            </section>

            {/* Features - Grid Layout */}
            <section className="py-20 px-6 bg-gray-50">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">Built for reliability</h2>
                        <p className="text-lg text-gray-600">Everything you need for decentralized data verification</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<Shield className="w-6 h-6" />}
                            title="Secure Voting"
                            description="Two-phase commit-reveal mechanism with SHA-256 cryptography prevents vote manipulation"
                        />
                        <FeatureCard
                            icon={<Zap className="w-6 h-6" />}
                            title="Fast & Scalable"
                            description="Optimized for Linera's parallel execution model with microchain architecture"
                        />
                        <FeatureCard
                            icon={<Users className="w-6 h-6" />}
                            title="Reputation System"
                            description="Accuracy-based scoring with streak bonuses and confidence-weighted voting"
                        />
                    </div>
                </div>
            </section>

            {/* How it Works - Simple Steps */}
            <section className="py-20 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">How it works</h2>
                        <p className="text-lg text-gray-600">Three simple steps to decentralized consensus</p>
                    </div>

                    <div className="space-y-12">
                        <Step
                            number="01"
                            title="Create Query"
                            description="Submit your query with possible outcomes and reward amount. The oracle network will validate and process it."
                        />
                        <Step
                            number="02"
                            title="Commit & Reveal"
                            description="Voters commit their encrypted votes, then reveal them after the commit phase ends. This prevents front-running."
                        />
                        <Step
                            number="03"
                            title="Get Result"
                            description="Consensus is reached through reputation-weighted voting. Results are sent back to your application automatically."
                        />
                    </div>
                </div>
            </section>

            {/* Stats - Clean Numbers */}
            <section className="py-20 px-6 bg-black text-white">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-12 text-center">
                        <div>
                            <div className="text-5xl font-bold mb-2">100%</div>
                            <div className="text-gray-400">Operational</div>
                        </div>
                        <div>
                            <div className="text-5xl font-bold mb-2">3</div>
                            <div className="text-gray-400">Smart Contracts</div>
                        </div>
                        <div>
                            <div className="text-5xl font-bold mb-2">&lt;1s</div>
                            <div className="text-gray-400">Query Response</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA - Final Push */}
            <section className="py-20 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-5xl font-bold mb-6">Ready to build?</h2>
                    <p className="text-xl text-gray-600 mb-10">
                        Start creating prediction markets with secure oracle voting today
                    </p>
                    <a
                        href="https://vote.alethea.network"
                        target="_blank"
                        className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 rounded-xl text-base font-semibold hover:bg-gray-800 transition shadow-lg shadow-black/10"
                    >
                        Launch App
                        <ArrowRight className="w-5 h-5" />
                    </a>
                </div>
            </section>

            {/* Footer - Minimal */}
            <footer className="py-12 px-6 border-t border-gray-200">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Image src="/logo.png" alt="Alethea" width={24} height={24} className="rounded" />
                            <span className="font-semibold">Alethea Network</span>
                        </div>
                        <div className="flex items-center gap-8">
                            <a href="https://github.com/mdlog/alethea-network" target="_blank" className="text-gray-600 hover:text-black transition text-sm">
                                GitHub
                            </a>
                            <a href="https://vote.alethea.network" target="_blank" className="text-gray-600 hover:text-black transition text-sm">
                                Dashboard
                            </a>
                            <a href="https://github.com/mdlog/alethea-network" target="_blank" className="text-gray-600 hover:text-black transition text-sm">
                                Documentation
                            </a>
                        </div>
                    </div>
                    <div className="text-center mt-8 text-sm text-gray-500">
                        © 2024 Alethea Network. Built on Linera Protocol.
                    </div>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-gray-300 transition"
        >
            <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center mb-4">
                {icon}
            </div>
            <h3 className="text-xl font-semibold mb-3">{title}</h3>
            <p className="text-gray-600 leading-relaxed">{description}</p>
        </motion.div>
    );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="flex gap-8 items-start"
        >
            <div className="text-6xl font-bold text-gray-200 flex-shrink-0">{number}</div>
            <div className="pt-2">
                <h3 className="text-2xl font-semibold mb-3">{title}</h3>
                <p className="text-gray-600 leading-relaxed">{description}</p>
            </div>
        </motion.div>
    );
}
