'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Github, Shield, Zap, Users, Circle } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { BlockchainVisualization } from './components/BlockchainVisualization';

// Puzzle Text Animation Component
function PuzzleText({ text, className = '' }: { text: string; className?: string }) {
    const [assembled, setAssembled] = useState(false);
    const letters = text.split('');

    useEffect(() => {
        const timer = setTimeout(() => setAssembled(true), 50);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className={`relative ${className}`}>
            {letters.map((letter, index) => {
                const randomX = assembled ? 0 : (Math.random() - 0.5) * 200;
                const randomY = assembled ? 0 : (Math.random() - 0.5) * 200;
                const randomRotate = assembled ? 0 : (Math.random() - 0.5) * 90;
                const delay = index * 0.02;

                return (
                    <motion.span
                        key={index}
                        className="inline-block"
                        initial={{
                            x: randomX,
                            y: randomY,
                            rotate: randomRotate,
                            opacity: 0,
                            scale: 0.3,
                        }}
                        animate={{
                            x: 0,
                            y: 0,
                            rotate: 0,
                            opacity: 1,
                            scale: 1,
                        }}
                        transition={{
                            duration: 0.6,
                            delay: delay,
                            type: 'spring',
                            stiffness: 120,
                            damping: 12,
                        }}
                    >
                        {letter === ' ' ? '\u00A0' : letter}
                    </motion.span>
                );
            })}
        </div>
    );
}

// Blockchain Animation Component
function BlockchainGrid() {
    const [blocks, setBlocks] = useState<{ id: number; active: boolean; connected: boolean; y: number }[]>([]);
    const [phase, setPhase] = useState<'blinking' | 'rising'>('blinking');
    const gridSize = 12;
    const gridHeight = 8;
    const totalBlocks = gridSize * gridHeight;

    useEffect(() => {
        // Initialize blocks
        const initialBlocks = Array.from({ length: totalBlocks }, (_, i) => ({
            id: i,
            active: false,
            connected: false,
            y: 0,
        }));
        setBlocks(initialBlocks);

        let currentIndex = 0;
        let animationPhase: 'blinking' | 'rising' = 'blinking';

        const interval = setInterval(() => {
            if (animationPhase === 'blinking') {
                setBlocks(prev => {
                    const newBlocks = [...prev];

                    // Deactivate previous block
                    if (currentIndex > 0) {
                        newBlocks[currentIndex - 1] = { ...newBlocks[currentIndex - 1], active: false, connected: true, y: 0 };
                    }

                    // Activate current block
                    if (currentIndex < newBlocks.length) {
                        newBlocks[currentIndex] = { ...newBlocks[currentIndex], active: true, connected: false, y: 0 };
                        currentIndex++;
                    } else {
                        // Switch to rising phase
                        animationPhase = 'rising';
                        setPhase('rising');
                        currentIndex = 0;
                    }

                    return newBlocks;
                });
            } else {
                // Rising phase - blocks float up like bubbles
                setBlocks(prev => {
                    return prev.map(block => ({
                        ...block,
                        y: block.y - 2, // Move up
                        active: Math.random() > 0.95, // Random sparkle
                    }));
                });
            }
        }, animationPhase === 'blinking' ? 80 : 50);

        // Reset animation after rising phase
        const resetTimeout = setTimeout(() => {
            if (animationPhase === 'rising') {
                setBlocks(initialBlocks);
                setPhase('blinking');
                currentIndex = 0;
                animationPhase = 'blinking';
            }
        }, 5000);

        return () => {
            clearInterval(interval);
            clearTimeout(resetTimeout);
        };
    }, [phase]);

    if (phase === 'blinking') {
        return (
            <div className="absolute inset-0 opacity-20">
                <div className="grid grid-cols-12 gap-4 h-full p-8">
                    {blocks.map((block) => (
                        <motion.div
                            key={block.id}
                            className={`relative border transition-all duration-200 ${block.active
                                ? 'border-white bg-white shadow-lg shadow-white/50'
                                : block.connected
                                    ? 'border-gray-600 bg-gray-800'
                                    : 'border-gray-800'
                                }`}
                            animate={{
                                scale: block.active ? 1.3 : 1,
                                opacity: block.active ? 1 : block.connected ? 0.7 : 0.2,
                            }}
                            transition={{ duration: 0.15 }}
                        >
                            {/* Connection line to next block */}
                            {block.connected && block.id % gridSize !== gridSize - 1 && (
                                <motion.div
                                    className="absolute top-1/2 left-full w-4 h-0.5 bg-gray-500 -translate-y-1/2"
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: 1 }}
                                    transition={{ duration: 0.2 }}
                                />
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>
        );
    }

    // Rising phase - blocks on the right side
    return (
        <div className="absolute right-0 top-0 bottom-0 w-64 overflow-hidden opacity-30">
            {blocks.map((block) => {
                const row = Math.floor(block.id / gridSize);
                const col = block.id % gridSize;
                const initialY = row * 60 + 100;
                const x = col * 20;

                return (
                    <motion.div
                        key={block.id}
                        className={`absolute w-12 h-12 border-2 rounded ${block.active
                            ? 'border-white bg-white/20 shadow-lg shadow-white/30'
                            : 'border-gray-600 bg-gray-800/50'
                            }`}
                        style={{
                            left: `${x}px`,
                            top: `${initialY + block.y}px`,
                        }}
                        animate={{
                            scale: block.active ? 1.2 : [1, 1.05, 1],
                            rotate: block.y < -100 ? [0, 5, -5, 0] : 0,
                        }}
                        transition={{
                            scale: { duration: 0.3 },
                            rotate: { duration: 2, repeat: Infinity },
                        }}
                    >
                        {/* Chain connection */}
                        {block.id > 0 && block.id % 3 === 0 && (
                            <div className="absolute top-1/2 right-full w-8 h-0.5 bg-gray-600 -translate-y-1/2" />
                        )}

                        {/* Block number */}
                        <div className="absolute inset-0 flex items-center justify-center text-[8px] font-mono text-gray-400">
                            {block.id}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}

export default function Home() {
    return (
        <div className="min-h-screen bg-black text-white">
            {/* Navigation - Brutalist Style */}
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

            {/* Hero - Bold & Geometric */}
            <section className="pt-32 pb-20 px-6 relative overflow-hidden">
                {/* Blockchain Visualization Background */}
                <BlockchainVisualization />

                <div className="max-w-6xl mx-auto relative z-10">
                    {/* Status Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 border-2 border-green-500 px-4 py-2 mb-8 font-mono text-sm"
                    >
                        <Circle className="w-3 h-3 fill-green-500 text-green-500 animate-pulse" />
                        LIVE_ON_CONWAY_TESTNET
                    </motion.div>

                    {/* Main Heading - Simple Animation */}
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
                        transition={{ delay: 0.2, duration: 0.6 }}
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
                        transition={{ delay: 0.3, duration: 0.6 }}
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
                </div >
            </section >

            {/* Features - Grid System */}
            < section className="py-20 px-6 border-t-2 border-white" >
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
            </section >

            {/* How It Works - Timeline */}
            < section className="py-20 px-6 border-t-2 border-white" >
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
            </section >

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

            {/* How to Participate */}
            <section className="py-20 px-6 border-t-2 border-white">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-5xl font-black mb-16 font-mono">HOW_TO_PARTICIPATE</h2>

                    <div className="space-y-8">
                        {/* Requirement Box */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="border-2 border-white p-8"
                        >
                            <h3 className="text-2xl font-bold mb-4 font-mono">REQUIREMENTS</h3>
                            <div className="grid md:grid-cols-2 gap-6 text-grey-300">
                                <div>
                                    <p className="text-sm font-mono text-gray-400 mb-2">MINIMUM_STAKE</p>
                                    <p className="text-xl font-bold">100 ALTH</p>
                                </div>
                                <div>
                                    <p className="text-sm font-mono text-gray-400 mb-2">LOCK_PER_VOTE</p>
                                    <p className="text-xl font-bold">10% of Stake</p>
                                </div>
                                <div>
                                    <p className="text-sm font-mono text-gray-400 mb-2">INCORRECT_VOTE_PENALTY</p>
                                    <p className="text-xl font-bold">5% Slashing</p>
                                </div>
                                <div>
                                    <p className="text-sm font-mono text-gray-400 mb-2">CORRECT_VOTE_REWARD</p>
                                    <p className="text-xl font-bold">Share Pool</p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Voting Steps */}
                        <div className="space-y-6">
                            <ParticipationStep
                                number="01"
                                title="STAKE_TOKENS"
                                description="Deposit minimum 100 ALTH tokens to become an active voter"
                            />
                            <ParticipationStep
                                number="02"
                                title="COMMIT_VOTE"
                                description="Submit encrypted vote hash during commit phase (prevents front-running)"
                            />
                            <ParticipationStep
                                number="03"
                                title="REVEAL_VOTE"
                                description="Reveal your actual vote with salt during reveal phase"
                            />
                            <ParticipationStep
                                number="04"
                                title="EARN_REWARDS"
                                description="Receive rewards if your vote matches consensus outcome"
                            />
                        </div>

                        {/* Reputation System */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="border-2 border-white p-8"
                        >
                            <h3 className="text-2xl font-bold mb-4 font-mono">REPUTATION_SYSTEM</h3>
                            <p className="text-gray-400 mb-6 leading-relaxed">
                                Your voting accuracy determines your reputation score. Higher reputation increases your voting weight and reward multiplier.
                            </p>
                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="border border-gray-600 p-4">
                                    <p className="text-xs text-gray-500 mb-2 font-mono">ACCURACY_BASED</p>
                                    <p className="font-bold">Correct votes boost score</p>
                                </div>
                                <div className="border border-gray-600 p-4">
                                    <p className="text-xs text-gray-500 mb-2 font-mono">STREAK_BONUS</p>
                                    <p className="font-bold">Consecutive wins multiply rewards</p>
                                </div>
                                <div className="border border-gray-600 p-4">
                                    <p className="text-xs text-gray-500 mb-2 font-mono">WEIGHT_MULTIPLIER</p>
                                    <p className="font-bold">Higher rep = more voting power</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* CTA - Final */}
            < section className="py-20 px-6 border-t-2 border-white" >
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
            </section >

            {/* Footer - Minimal */}
            < footer className="py-12 px-6 border-t-2 border-white" >
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
            </footer >
        </div >
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

function ParticipationStep({ number, title, description }: { number: string; title: string; description: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex gap-8 items-start border-l-4 border-white pl-8 hover:border-gray-400 transition"
        >
            <div className="text-4xl font-black text-gray-800 font-mono flex-shrink-0">{number}</div>
            <div className="pt-2">
                <h3 className="text-xl font-bold mb-2 font-mono">{title}</h3>
                <p className="text-gray-400 leading-relaxed">{description}</p>
            </div>
        </motion.div>
    );
}
