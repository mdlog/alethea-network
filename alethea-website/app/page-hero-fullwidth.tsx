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
                    <a href="http://localhost:3333" target="_blank" className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black px-5 py-2 rounded-full text-sm font-bold transition">
                        Launch
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
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ zIndex: 10 }}>
                {/* Full Background Visual Effects */}
                <div className="absolute inset-0" style={{ zIndex: 0 }}>
                    {/* Gradient Orbs */}
                    <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-3xl" />

                    {/* Grid Pattern */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:100px_100px]" />

                    {/* Diagonal Accent Lines */}
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 transform skew-x-12 origin-top-right" />
                    <div className="absolute bottom-0 left-0 w-1/2 h-full bg-gradient-to-tr from-blue-500/5 via-transparent to-cyan-500/5 transform -skew-x-12 origin-bottom-left" />

                    {/* Floating Stats Cards - Background */}
                    <div className="absolute inset-0 pointer-events-none hidden lg:block">
                        {/* Card 1 - Top Right */}
                        <motion.div
                            className="absolute top-32 right-20 w-48 h-48 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-3xl p-6 backdrop-blur-xl"
                            initial={{ opacity: 0, y: 20, rotate: -6 }}
                            animate={{ opacity: 1, y: 0, rotate: -6 }}
                            transition={{ duration: 0.8, delay: 0.5 }}
                        >
                            <div className="text-5xl font-bold text-cyan-400 mb-2">3</div>
                            <div className="text-xs text-gray-400 uppercase tracking-wider">Smart Contracts</div>
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
                            className="absolute bottom-32 left-20 w-52 h-52 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-3xl p-6 backdrop-blur-xl"
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
                            className="absolute top-40 left-32 w-40 h-40 bg-gradient-to-br from-pink-500/10 to-red-500/10 border border-pink-500/20 rounded-3xl p-5 backdrop-blur-xl"
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
                <div className="relative w-full px-6 py-24" style={{ zIndex: 1 }}>
                    <div className="max-w-6xl mx-auto text-center">
                        {/* Badge */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 rounded-full text-cyan-400 text-sm font-bold backdrop-blur-xl mb-8"
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
                            className="text-xl md:text-2xl lg:text-3xl text-gray-300 leading-relaxed max-w-4xl mx-auto mb-12"
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
                                href="http://localhost:3333"
                                target="_blank"
                                className="group relative bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black px-12 py-6 rounded-2xl text-xl font-bold transition-all flex items-center justify-center gap-3 shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-500/50 overflow-hidden min-w-[280px]"
                                whileHover={{ scale: 1.05, y: -3 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <span className="relative z-10">Launch Explorer</span>
                                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform relative z-10" />
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </motion.a>
                            <motion.a
                                href="https://github.com/mdlog/alethea-network"
                                target="_blank"
                                className="group border-2 border-cyan-500/40 hover:border-cyan-500 hover:bg-cyan-500/10 text-white px-12 py-6 rounded-2xl text-xl font-bold transition-all flex items-center justify-center gap-3 backdrop-blur-xl min-w-[280px]"
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
                            <div className="flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-xl rounded-full border border-green-500/20">
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
                    className="absolute bottom-12 left-1/2 -translate-x-1/2"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 1, repeat: Infinity, repeatType: "reverse" }}
                    style={{ zIndex: 2 }}
                >
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                        <span className="text-xs uppercase tracking-wider">Scroll to explore</span>
                        <ArrowRight className="w-5 h-5 rotate-90" />
                    </div>
                </motion.div>
            </section>

            {/* Rest of the sections remain the same... */}
        </div>
    );
}
