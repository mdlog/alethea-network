'use client';

import { motion } from 'framer-motion';
import { Shield, Zap, Lock, TrendingUp, Users, Code, ArrowRight, Github, BookOpen } from 'lucide-react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import MagnifyText from './components/MagnifyText';
import DynamicChainAnimation from './components/DynamicChainAnimation';

const NetworkAnimation = dynamic(() => import('./components/NetworkAnimation'), { ssr: false });
const FloatingOrbs = dynamic(() => import('./components/FloatingOrbs'), { ssr: false });
const DataFlow = dynamic(() => import('./components/DataFlow'), { ssr: false });
const OracleNodes = dynamic(() => import('./components/OracleNodes'), { ssr: false });

export default function Home() {
    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden">
            <NetworkAnimation />
            <FloatingOrbs />
            <DataFlow />

            {/* Navigation - Floating Pill Style */}
            <nav className="fixed top-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 shadow-2xl" style={{ zIndex: 50 }}>
                <div className="flex items-center gap-8">
                    <div className="flex items-center space-x-2">
                        <Image src="/logo.png" alt="Alethea Network" width={32} height={32} className="object-contain" />
                        <span className="text-sm font-bold hidden sm:block">ALETHEA</span>
                    </div>
                    <div className="hidden md:flex items-center space-x-6">
                        <a href="#features" className="text-gray-400 hover:text-cyan-400 transition text-sm font-medium">Features</a>
                        <a href="#technology" className="text-gray-400 hover:text-cyan-400 transition text-sm font-medium">Tech</a>
                        <a href="https://github.com/mdlog/alethea-network" target="_blank" className="text-gray-400 hover:text-cyan-400 transition text-sm font-medium">Docs</a>
                    </div>
                    <a href="https://vote.alethea.network" target="_blank" className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black px-5 py-2 rounded-full text-sm font-bold transition">
                        Launch App
                    </a>
                </div>
            </nav>

            {/* Scroll Progress Indicator */}
            <motion.div
                className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 origin-left"
                style={{ scaleX: 0, zIndex: 100 }}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                transition={{ duration: 0.5 }}
            />

            {/* Floating Action Button - Bottom Right */}
            <motion.a
                href="#"
                className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition group"
                style={{ zIndex: 50 }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1 }}
                whileHover={{ rotate: 360 }}
            >
                <ArrowRight className="w-6 h-6 text-black -rotate-90 group-hover:rotate-0 transition" />
            </motion.a>

            {/* Hero Section - Full Width with Background */}
            <section className="relative min-h-screen flex items-center overflow-hidden" style={{ zIndex: 10 }}>
                {/* Full Background Visual Effects */}
                <div className="absolute inset-0" style={{ zIndex: 0 }}>
                    {/* Gradient Orbs */}
                    <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-3xl" />

                    {/* Grid Pattern */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:100px_100px]" />

                    {/* Diagonal Accent Lines */}
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-n-top-right" />
                    <div className="absolute bottom-0 left-0 w-1/2 h-full bg-gradient-to-tr from-blue-500/5 via-transparent to-cyan-500/5 transform -skew-x-12 origin-bottom-left" />

                    {/* Floating Stats Cards - Background */}
                    <div className="absolute inset-0 pointer-events-none">
                        {/* Card 1 - Top Right */}
                        <motion.div
                            className="absolute top-32 right-20 w-48 h-48 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-3xl p-6 backdrop-blur-xl"
                            initial={{ opacity: 0, y: 20, rotate: -6 }}
                            animate={{ opacity: 1, y: 0, rotate: -6 }}
                            transition={{ duration: 0.8, delay: 0.5 }}
                        >
                            <div className="text-5xl font-bold text-cyan-400 mb-2">3</div>
ercase tracking-wider">Smart Contracts</div>
                </motion.div>

                {/* Card 2 - Middle Right */}
                <motion.div
                    className="absolute top-1/2 right-32 w-44 h-44 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-3xl p-6 backdrop-blur-xl"
                    initial={{ opacity: 0, y: 20, rotate: 6 }}
                    animate={{ opacity: 1, y: 0, rotate: 6 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                >
                    <div className="text-5xl font-bold text-blue-400 mb-2">100%</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider">Operational</div>
                </motion.div>

                {/* Card 3 - Bottom Left */}
                <motion.div
                    className from-purple-500 /10 to-pink-500/10 border border-purple-500/20 rounded-3xl p-6 backdrop-blur-xl"
                initial={{ opacity: 0, y: 20, rotate: 3 }}
                animate={{ opacity: 1, y: 0, rotate: 3 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                        >
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <div className="text-5xl font-bold text-purple-400">Live</div>
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">Conway Testnet</div>
            </motion.div>

            {/* Card 4 - Top Left */}
            <motion.div
                className="absolute top-40 left-32 w-40 h-40 bg-gradded-3xl p-5 backdrop-blur-xl"
                initial={{ opacity: 0, y: 20, rotate: -3 }}
                animate={{ opacity: 1, y: 0, rotate: -3 }}
                transition={{ duration: 0.8, delay: 0.8 }}
            >
                <Lock className="w-8 h-8 text-pink-400 mb-2" />
                <div className="text-xs text-gray-400 uppercase tracking-wider">Secure Voting</div>
            </motion.div>

            {/* Card 5 - Bottom Right */}
            <motion.div
                className="absolute bottom-40 right-40 w-40 h-40 bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border border-orange-500/20 rounded-3xl p-5 backdrop-blur-xl"
                initial={{ opacity: 0, y: 20, rotate: -6 }}
                animate={{ opacity: 1, y: 0, rotate: -6 }}
                transition={{ duration: 0.8, delay: 0.9 }}
            >
                <Zap className="w-8 h-8 text-orange-400 mb-2" />
                <div className="text-xs text-gray-400 uppercase tracking-wider">Cross-Chain</div>
            </motion.div>
        </div>

                    {/* Overlay for better text readability */}
    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
                </div>

        {/* Content - Centered */}
        <div className="relative w-full px-6 py-24" style={{ zIndex: 1 }
}>
                    <div className="max-w-6xl mx-auto text-center">
                        {/* Badge */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-clue-500/20 border border-cyan-500/40 rounded-full text-cyan-400 text-sm font-bold backdrop-blur-xl mb-8"
                        >
                            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                            DECENTRALIZED ORACLE NETWORK
                        </motion.div>

                        {/* Main Heading */}
                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                            className="text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold leading-[1.05] tracking-tight mb-8"
                        >
                            <span className="block text-white mb-2">Committee Oracle</span>
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 animate-gradient mb-2">
   with Reputation
                            </span>
                            <span className="block text-white">Weighted Voting</span>
                        </motion.h1>

                        {/* Description */}
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.4 }}
                            className="text-3xl text-gray-300 leading-relaxed max-w-4xl mx-auto mb-12"
                        >
                            Optimized for <span className="text-cyan-400 font-semibold">Linera's parallel execution</span> model. Build prediction markets with secure voting powered by commit-reveal cryptography.
                        </motion.p>

                        {/* CTA Buttons */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.5 }}
                            className="flex flex-col sm:flex-row gap-5 justify-center items-center mb-12"
                        >
                            <motion.a
                                href="https://vote.alethea.network"
                                target="_blank"
                                className="group bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black px-12 py-6 rounded-2xl text-xl font-bold transition-all flex items-center justify-center gap-3 shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-500/50 overflow-hidden min-w-[280px]"
                                whileHover={{ scale: 1.05, y: -3 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <span className="relative z-10">Launch App</span>
                                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform relative z-10" />
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </motion.a>
                            <motion.a
                                href="https://github.com/mdlog/alethea-network"
                                target="_blank"
                                className="group border-2 bord00/10 text-white px-12 py-6 rounded-2xl text-xl font-bold transition-all flex items-center justify-center gap-3 backdrop-blur-xl min-w-[280px]"
                                whileHover={{ scale: 1.05, y: -3 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Github className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                                <span>GitHub</span>
                            </motion.a>
                        </motion.div>

                        {/* Trust Indicators */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.6 }}
                            className="flex flex-wrap justify-center items-center gap-8 text-base text-gray-400"
                        >
                            <div ackdrop-blur-xl rounded-full border border-green-500/20">
                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                <span>Conway Testnet Live</span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-xl rounded-full border border-cyan-500/20">
                                <Shield className="w-4 h-4 text-cyan-400" />
                                <span>100% Operational</span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-xl rounded-full border border-purple-500/20">
                                <Code className="w-4 h-4 text-purple-400" />
                                <span>3 Smart Contracts</span>
                            </div>
                        </motion.div>
                    </div>
                </div>

    {/* Scroll Indicator */}
    <motion.div
className = "absolute bottom-12 left-1/2 -translate-x-1/2"
initial={{ opacity: 0, y: -10 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.8, delay: 1, repeat: Infinity, repeatType: "reverse" }}
style = {{ zIndex: 2 }}
                >
    <div className="flex flex-col items-center gap-2 text-gray-500">
        <span className="text-xs tracking-wider">Scroll to explore</span>
        <ArrowRight className="w-5 h-5 rotate-90" />
    </div>
                </motion.div>
            </section>

    {/* Section Divider */}
    <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent max-w-4xl mx-auto" />

        {/* What is Alethea Section - Diagonal Split */}
        <section className="py-24 px-6 relative overflow-hidden" style={{ zIndex: 10 }}>
            <div className="absolute inset-0 bg-black/95" style={{ zIndex: -1 }} />
{/* Diagonal divider */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 transform -skew-y-3" />

                <div className="max-w-7xl mx-auto relative">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        {/* Left - Badge and Title */}
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6 }}
                            viewport={{ once: true }}
                        >
                            <div className="inline-block px-6 py-3 bg-cyan-500/10 border-l-4 border-cyan-500 text-cyan-400 text-sm font-bold mb-8">
                                WHAT IS ALETHEA?
                            </div>
                            <MagnifyText className="text-4xl md:text-5xl font-bold text-white leading-tight mb-8">
                                Decentralized Committee Oracle with Reputation-Weighted Voting
                            </MagnifyText>
                            <div className="w-20 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 mb-8" />
                        </motion.div>

                        {/* Right - Description */}
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            viewport={{ once: true }}
                            className="space-y-6"
                        >
                            <MagnifyText className="text-lg text-gray-300 leading-relaxed">
                                Alethea Network is a decentralized oracle infrastructure that leverages a committee-based approach where validators earn reputation through accurate predictions. Votes are weighted by reputation scores, ensuring high-quality oracle data.
                            </MagnifyText>
                            <MagnifyText className="text-base text-gray-400 leading-relaxed border-l-2 border-cyan-500/30 pl-6">
                                Optimized for Linera's parallel execution model, enabling high-throughput oracle operations with microchain architecture for scalable, low-latency data feeds.
                            </MagnifyText>
                        </motion.div>
                    </div>
                </div>
            </section>

    {/* Section Divider */}
    <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent max-w-4xl mx-auto" />

        {/* Core Features - Bento Grid Layout */}
        < section id="features" className="py-24 px-6 relative overflow-hidden" style={{ zIndex: 10 }}>
                <div className="absolute inset-0 bg-gradient-to-b from-black/90 to-gray-900/90" style={{ zIndex: 0 }} />
                <DynamicChainAnimation />
                <div className="max-w-7xl mx-auto relative" style={{ zIndex: 2 }}>
                    {/* Title - Right aligned */}
                    <motion.div
                        className="mb-16 ml-auto max-w-2xl text-right"
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                    >
                        <div className="inline-block px-6 py-2 bg-cyan-500/10 border-r-4 border-cyan-500 text-cyan-400 text-sm font-bold mb-6">
                            CORE FEATURES
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">Enterprise-grade Oracle Infrastructure</h2>
                        <div className="w-24 h-1 bg-gradient-to-l from-cyan-500 to-blue-500 ml-auto" />
                    </motion.div>

                    {/* Bento Grid - Asymmetric sizes */}
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-6 auto-rows-fr">
                        {/* Large card - spans 2 columns */}
                        <BentoCard
                            icon={<TrendingUp className="w-10 h-10" />}
                            title="Prediction Markets"
                            description="Create and manage prediction markets with automated market maker pricing and dynamic liquidity pools"
                            gradient="from-cyan-500/20 to-blue-500/20"
                            border="border-cyan-500/30"
                            className="md:col-span-3 md:row-span-2"
                        />

                        {/* Medium cards */}
                        <BentoCard
                            icon={<Lock className="w-8 h-8" />}
                            title="Secure Voting"
                            description="Two-phase commit-reveal voting with SHA-256 cryptography"
                            gradient="from-blue-500/20 to-purple-500/20"
                            border="border-blue-500/30"
                            className="md:col-span-3"
                        />
                        <BentoCard
                            icon={<Users className="w-8 h-8" />}
                            title="Reputation System"
                            description="Streak bonuses and confidence-weighted voting"
                            gradient="from-purple-500/20 to-pink-500/20"
                            border="border-purple-500/30"
                            className="md:col-span-3"
                        />

                        {/* Small cards */}
                        <BentoCard
                            icon={<Zap className="w-8 h-8" />}
                            title="Cross-Chain"
                            description="Native cross-chain messaging"
                            gradient="from-pink-500/20 to-red-500/20"
                            border="border-pink-500/30"
                            className="md:col-span-2"
                        />
                        <BentoCard
                            icon={<Code className="w-8 h-8" />}
                            title="GraphQL APIs"
                            description="Developer-friendly APIs"
                            gradient="from-red-500/20 to-orange-500/20"
                            border="border-red-500/30"
                            className="md:col-span-2"
                        />
                        <BentoCard
                            icon={<Shield className="w-8 h-8" />}
                            title="Decentralized"
                            description="Three-node architecture"
                            gradient="from-orange-500/20 to-yellow-500/20"
                            border="border-orange-500/30"
                            className="md:col-span-2"
                        />
                    </div>
                </div>
            </section>

    {/* Section Divider */}
    <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent max-w-4xl mx-auto" />

        {/* Technology - Zigzag Layout */}
        < section id="technology" className="py-24 px-6 relative overflow-hidden" style={{ zIndex: 10 }}>
            <div className="absolute inset-0 bg-gray-900/90" style={{ zIndex: 0 }} />
{/* Diagonal accent */}
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-tr from-cyan-500/5 to-transparent transform skew-y-3" />
                <DynamicChainAnimation />

                <div className="max-w-7xl mx-auto relative" style={{ zIndex: 2 }}>
                    {/* Title - Left aligned */}
                    <motion.div
                        className="mb-16 max-w-2xl"
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                    >
                        <div className="inline-block px-6 py-2 bg-cyan-500/10 border-l-4 border-cyan-500 text-cyan-400 text-sm font-bold mb-6">
                            ARCHITECTURE & TECHNOLOGY
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">Three-Chain Architecture</h2>
                        <div className="w-24 h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
                    </motion.div>

                    {/* Zigzag layout */}
                    <div className="space-y-24">
                        {/* Market Chain - Left aligned */}
                        <ZigzagCard
                            title="Market Chain"
                            color="text-cyan-400"
                            gradient="from-cyan-500/10 to-blue-500/10"
                            border="border-cyan-500/20"
                            items={[
                                "Create unlimited prediction markets",
                                "AMM-based dynamic pricing",
                                "Buy/sell shares with automatic pricing",
                                "Real-time position tracking per user",
                                "Oracle-based market resolution"
                            ]}
                            align="left"
                        />

                        {/* Voter Chain - Right aligned */}
                        <ZigzagCard
                            title="Voter Chain"
                            color="text-purple-400"
                            gradient="from-purple-500/10 to-pink-500/10"
                            border="border-purple-500/20"
                            items={[
                                "Two-phase commit-reveal voting",
                                "SHA-256 cryptographic security",
                                "Reputation system with streak bonuses",
                                "Confidence-weighted voting power",
                                "Cross-chain oracle messaging"
                            ]}
                            align="right"
                        />
                    </div>

                    <div className="mt-24 bg-black border border-white/10 p-10 rounded-3xl">
                        <h3 className="text-2xl font-bold mb-8 text-center">Technology Stack</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            <TechBadge name="Linera" version="v0.15.4" />
                            <TechBadge name="Rust" version="1.86.0" />
                            <TechBadge name="WASM" version="WebAssembly" />
                            <TechBadge name="GraphQL" version="API" />
                        </div>
                    </div>
                </div>
            </section>

    {/* Section Divider */}
    <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent max-w-4xl mx-auto" />

        {/* Use Cases - Masonry/Pinterest Layout */}
        <section className="py-24 px-6 relative overflow-hidden" style={{ zIndex: 10 }}>
            <div className="absolute inset-0 bg-black/90" style={{ zIndex: 0 }} />
{/* Circular gradient accent */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-cyan-500/10 to-transparent rounded-full blur-3xl" />
                <DynamicChainAnimation />

                <div className="max-w-7xl mx-auto relative" style={{ zIndex: 2 }}>
                    {/* Title - Center with split design */}
                    <motion.div
                        className="mb-16 text-center"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                    >
                        <div className="flex items-center justify-center gap-4 mb-6">
                            <div className="h-px w-16 bg-gradient-to-r from-transparent to-cyan-500" />
                            <span className="px-6 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-bold">
                                USE CASES
                            </span>
                            <div className="h-px w-16 bg-gradient-to-l from-transparent to-cyan-500" />
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">
                            Build Powerful
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">
                                dApps
                            </span>
                        </h2>
                    </motion.div>

                    {/* Masonry Grid - Different heights */}
                    <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                        <UseCaseCard
                            title="Prediction Markets"
                            description="Create decentralized prediction markets for any event - elections, sports, crypto prices, or custom events"
                            icon="📊"
                            examples={["Political Elections", "Sports Outcomes", "Crypto Price Predictions", "Weather Forecasts"]}
                        />
                        <UseCaseCard
                            title="DeFi Protocols"
                            description="Build DeFi applications that need reliable price feeds and external data for lending, derivatives, and more"
                            icon="💰"
                            examples={["Price Oracles", "Lending Protocols", "Synthetic Assets", "Options Trading"]}
                        />
                        <UseCaseCard
                            title="Gaming & NFTs"
                            description="Power blockchain games with real-world data and verifiable random outcomes for fair gameplay"
                            icon="🎮"
                            examples={["Tournament Results", "Random Number Generation", "Achievement Verification", "Cross-game Assets"]}
                        />
                        <UseCaseCard
                            title="Insurance Protocols"
                            description="Automate insurance claims with parametric insurance based on verifiable real-world events"
                            icon="🛡️"
                            examples={["Flight Delays", "Weather Insurance", "Crop Insurance", "Smart Contract Coverage"]}
                        />
                        <UseCaseCard
                            title="Supply Chain"
                            description="Track and verify supply chain data with decentralized oracle consensus for transparency"
                            icon="📦"
                            examples={["Product Tracking", "Quality Verification", "Delivery Confirmation", "Authenticity Checks"]}
                        />
                        <UseCaseCard
                            title="DAO Governance"
                            description="Enable data-driven DAO decisions with reliable external information and voting mechanisms"
                            icon="🗳️"
                            examples={["Proposal Validation", "Treasury Management", "Community Voting", "Reputation Systems"]}
                        />
                    </div>

                    <motion.div
                        className="mt-16 text-center"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        viewport={{ once: true }}
                    >
                        <p className="text-gray-400 mb-6">And many more possibilities...</p>
                        <div className="flex flex-wrap justify-center gap-3">
                            {["Real Estate", "Identity Verification", "Carbon Credits", "Event Ticketing", "Crowdfunding", "Reputation Systems"].map((item, index) => (
                                <span key={index} className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-full text-sm text-gray-300">
                                    {item}
                                </span>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

    {/* Section Divider */}
    <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent max-w-4xl mx-auto" />

        {/* CTA - Split Screen Design */}
        <section className="py-24 px-6 relative overflow-hidden" style={{ zIndex: 10 }}>
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-purple-500/20" style={{ zIndex: -1 }} />
{/* Diagonal split */}
                <div className="absolute inset-0 bg-gradient-to-br from-black/50 to-transparent transform -skew-y-6" />

                <div className="max-w-7xl mx-auto relative">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        {/* Left - Text */}
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6 }}
                            viewport={{ once: true }}
                        >
                            <div className="inline-block px-6 py-2 bg-cyan-500/20 border-l-4 border-cyan-500 text-cyan-400 text-sm font-bold mb-6">
                                GET STARTED
                            </div>
                            <h2 className="text-5xl md:text-6xl font-bold mb-6">
                                Ready to
                                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">
                                    Build?
                                </span>
                            </h2>
                            <p className="text-xl text-gray-300 mb-8 max-w-xl">
                                Start creating prediction markets with secure oracle voting today
                            </p>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                    <span>Conway Testnet Live</span>
                                </div>
                                <div className="w-px h-4 bg-gray-700" />
                                <span>100% Operational</span>
                            </div>
                        </motion.div>

                        {/* Right - CTA Buttons */}
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            viewport={{ once: true }}
                            className="space-y-6"
                        >
                            <motion.a
                                href="http://localhost:3333"
                                target="_blank"
                                className="block bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black px-10 py-6 rounded-2xl text-xl font-bold transition group relative overflow-hidden"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="flex items-center justify-between">
                                    <span>Launch Explorer</span>
                                    <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition" />
                                </div>
                                <div className="text-sm font-normal text-black/70 mt-1">Start building on testnet</div>
                            </motion.a>

                            <motion.a
                                href="https://github.com/mdlog/alethea-network"
                                target="_blank"
                                className="block border-2 border-cyan-500/30 hover:border-cyan-500 text-white px-10 py-6 rounded-2xl text-xl font-bold transition group"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="flex items-center justify-between">
                                    <span>Documentation</span>
                                    <BookOpen className="w-6 h-6 group-hover:rotate-12 transition" />
                                </div>
                                <div className="text-sm font-normal text-gray-400 mt-1">Learn how to integrate</div>
                            </motion.a>
                        </motion.div>
                    </div>
                </div>
            </section>

    {/* Footer - Asymmetric Multi-column */}
    <footer className="py-20 px-6 relative overflow-hidden" style={{ zIndex: 10 }}>
        <div className="absolute inset-0 bg-black/95" style={{ zIndex: -1 }} />
{/* Diagonal accent */}
                <div className="absolute bottom-0 right-0 w-1/3 h-full bg-gradient-to-tl from-cyan-500/5 to-transparent transform skew-x-12" />

                <div className="max-w-7xl mx-auto relative">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-12">
                        {/* Brand - Large column */}
                        <div className="md:col-span-5">
                            <div className="flex items-center space-x-3 mb-6">
                                <Image src="/logo.png" alt="Alethea Network" width={50} height={50} className="object-contain" />
                                <div>
                                    <div className="text-2xl font-bold">ALETHEA</div>
                                    <div className="text-sm text-cyan-400">NETWORK</div>
                                </div>
                            </div>
                            <p className="text-gray-400 mb-4 max-w-sm leading-relaxed">
                                Decentralized committee oracle with reputation-weighted voting, optimized for Linera's parallel execution model.
                            </p>
                            <div className="flex items-center gap-4">
                                <a href="https://github.com/mdlog/alethea-network" target="_blank" className="w-10 h-10 rounded-xl bg-gray-800 hover:bg-cyan-500/20 border border-gray-700 hover:border-cyan-500/50 flex items-center justify-center transition group">
                                    <Github className="w-5 h-5 text-gray-400 group-hover:text-cyan-400 transition" />
                                </a>
                                <a href="#" className="w-10 h-10 rounded-xl bg-gray-800 hover:bg-cyan-500/20 border border-gray-700 hover:border-cyan-500/50 flex items-center justify-center transition group">
                                    <BookOpen className="w-5 h-5 text-gray-400 group-hover:text-cyan-400 transition" />
                                </a>
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div className="md:col-span-3">
                            <h4 className="text-sm font-bold text-cyan-400 mb-4 uppercase tracking-wider">Quick Links</h4>
                            <ul className="space-y-3">
                                <li><a href="#features" className="text-gray-400 hover:text-white transition hover:translate-x-1 inline-block">Features</a></li>
                                <li><a href="#technology" className="text-gray-400 hover:text-white transition hover:translate-x-1 inline-block">Technology</a></li>
                                <li><a href="https://github.com/mdlog/alethea-network" target="_blank" className="text-gray-400 hover:text-white transition hover:translate-x-1 inline-block">Documentation</a></li>
                                <li><a href="http://localhost:3333" target="_blank" className="text-gray-400 hover:text-white transition hover:translate-x-1 inline-block">Explorer</a></li>
                            </ul>
                        </div>

                        {/* Resources */}
                        <div className="md:col-span-4">
                            <h4 className="text-sm font-bold text-cyan-400 mb-4 uppercase tracking-wider">Resources</h4>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                    <span className="text-gray-400">Conway Testnet Live</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-cyan-400" />
                                    <span className="text-gray-400">100% Operational</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                                    <span className="text-gray-400">3 Smart Contracts</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom bar */}
                    <div className="pt-8 border-t border-white/10">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <p className="text-gray-500 text-sm">
                                Alethea (Ἀλήθεια) - Greek goddess of truth, daughter of Zeus
                            </p>
                            <p className="text-gray-600 text-xs">
                                © 2024 Alethea Network. Built on Linera Protocol.
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function StatsCard({ number, label, gradient, border, delay = 0 }: { number: string; label: string; gradient: string; border: string; delay?: number }) {
    return (
        <motion.div
            className={`bg-gradient-to-br ${gradient} border ${border} p-8 rounded-3xl relative overflow-hidden group`}
            whileHover={{ scale: 1.05 }}
        >
            <motion.div
                className="absolute inset-0 bg-cyan-500/10"
                animate={{ opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 2, repeat: Infinity, delay }}
            />
            <div className="text-5xl font-bold text-cyan-400 mb-2 relative">{number}</div>
            <div className="text-gray-400 text-sm uppercase tracking-wider relative">{label}</div>
        </motion.div>
    );
}

function BentoCard({ icon, title, description, gradient, border, className = '' }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    gradient: string;
    border: string;
    className?: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className={`bg-gradient-to-br ${gradient} border-l-4 ${border} p-8 rounded-2xl cursor-pointer relative group hover:scale-[1.02] transition-transform ${className}`}
        >
            <div className="mb-4 text-cyan-400 group-hover:scale-110 transition-transform">{icon}</div>
            <h3 className="text-xl font-bold mb-3 group-hover:text-cyan-400 transition-colors">{title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-cyan-500/5 rounded-tl-full" />
        </motion.div>
    );
}

function ZigzagCard({ title, color, gradient, border, items, align }: {
    title: string;
    color: string;
    gradient: string;
    border: string;
    items: string[];
    align: 'left' | 'right';
}) {
    return (
        <motion.div
            className={`max-w-3xl ${align === 'right' ? 'ml-auto' : ''}`}
            initial={{ opacity: 0, x: align === 'left' ? -50 : 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
        >
            <div className={`bg-gradient-to-br ${gradient} border-l-4 ${border} p-10 rounded-2xl relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
                {/* Decorative corner */}
                <div className={`absolute top-0 ${align === 'left' ? 'right-0' : 'left-0'} w-32 h-32 bg-cyan-500/5 ${align === 'left' ? 'rounded-bl-full' : 'rounded-br-full'}`} />

                <h3 className={`text-3xl font-bold mb-8 ${color} relative z-10`}>{title}</h3>
                <ul className="space-y-4 relative z-10">
                    {items.map((item, index) => (
                        <motion.li
                            key={index}
                            className="flex items-start gap-3"
                            initial={{ opacity: 0, x: align === 'left' ? -20 : 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            viewport={{ once: true }}
                        >
                            <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                            <span className="text-gray-300">{item}</span>
                        </motion.li>
                    ))}
                </ul>
            </div>
        </motion.div>
    );
}

function TechBadge({ name, version }: { name: string; version: string }) {
    return (
        <div className="text-center">
            <div className="text-2xl font-bold text-white mb-1">{name}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">{version}</div>
        </div>
    );
}

function UseCaseCard({ title, description, icon, examples }: {
    title: string;
    description: string;
    icon: string;
    examples: string[];
}) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="break-inside-avoid mb-6"
        >
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border-l-4 border-cyan-500/50 p-8 rounded-2xl cursor-pointer group hover:border-cyan-500 transition-all duration-300 relative overflow-hidden">
                {/* Decorative element */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-bl-full" />

                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{icon}</div>
                <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-cyan-400 transition-colors relative z-10">{title}</h3>
                <p className="text-gray-400 mb-6 leading-relaxed relative z-10">{description}</p>

                <div className="space-y-2 relative z-10">
                    <div className="h-px w-12 bg-gradient-to-r from-cyan-500 to-transparent mb-3" />
                    {examples.map((example, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                            <span className="text-sm text-gray-400">{example}</span>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
