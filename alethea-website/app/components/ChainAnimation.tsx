'use client';

import { motion } from 'framer-motion';

export default function ChainAnimation() {
    // Create multiple chains
    const chains = [
        { startX: 10, startY: 20, blocks: 6, delay: 0 },
        { startX: 10, startY: 50, blocks: 7, delay: 1 },
        { startX: 10, startY: 80, blocks: 6, delay: 2 },
    ];

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-25" style={{ zIndex: 1 }}>
            <svg className="absolute inset-0 w-full h-full">
                <defs>
                    <linearGradient id="chainGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(34, 211, 238, 0.2)" />
                        <stop offset="50%" stopColor="rgba(34, 211, 238, 0.6)" />
                        <stop offset="100%" stopColor="rgba(34, 211, 238, 0.2)" />
                    </linearGradient>
                </defs>

                {chains.map((chain, chainIndex) => (
                    <g key={`chain-${chainIndex}`}>
                        {/* Chain links (connections) */}
                        {[...Array(chain.blocks - 1)].map((_, i) => {
                            const x1 = chain.startX + (i * 15) + 5;
                            const x2 = chain.startX + ((i + 1) * 15);
                            return (
                                <motion.line
                                    key={`link-${chainIndex}-${i}`}
                                    x1={`${x1}%`}
                                    y1={`${chain.startY}%`}
                                    x2={`${x2}%`}
                                    y2={`${chain.startY}%`}
                                    stroke="url(#chainGradient)"
                                    strokeWidth="2"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{
                                        pathLength: [0, 1],
                                        opacity: [0, 1],
                                    }}
                                    transition={{
                                        duration: 0.5,
                                        delay: chain.delay + (i * 0.3),
                                        ease: 'easeInOut',
                                    }}
                                />
                            );
                        })}
                    </g>
                ))}
            </svg>

            {/* Blockchain blocks */}
            {chains.map((chain, chainIndex) =>
                [...Array(chain.blocks)].map((_, blockIndex) => (
                    <motion.div
                        key={`block-${chainIndex}-${blockIndex}`}
                        className="absolute"
                        style={{
                            left: `${chain.startX + (blockIndex * 15)}%`,
                            top: `${chain.startY}%`,
                            transform: 'translate(-50%, -50%)',
                        }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                            scale: [0, 1.2, 1],
                            opacity: [0, 1, 1],
                        }}
                        transition={{
                            duration: 0.5,
                            delay: chain.delay + (blockIndex * 0.3),
                            ease: 'easeOut',
                        }}
                    >
                        {/* Block container */}
                        <motion.div
                            className="relative"
                            animate={{
                                y: [0, -5, 0],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: blockIndex * 0.2,
                                ease: 'easeInOut',
                            }}
                        >
                            {/* Block shape */}
                            <div
                                className="w-10 h-10 border-2 border-cyan-400/60 bg-cyan-500/10 relative"
                                style={{
                                    clipPath: 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)',
                                    boxShadow: '0 0 15px rgba(34, 211, 238, 0.3)',
                                }}
                            >
                                {/* Block inner glow */}
                                <motion.div
                                    className="absolute inset-0 bg-cyan-400/20"
                                    animate={{
                                        opacity: [0.2, 0.6, 0.2],
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        delay: blockIndex * 0.15,
                                        ease: 'easeInOut',
                                    }}
                                />

                                {/* Block number/hash indicator */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-1 h-1 bg-cyan-400 rounded-full" />
                                </div>
                            </div>

                            {/* Pulse ring */}
                            <motion.div
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border border-cyan-400/30 rounded-full"
                                animate={{
                                    scale: [1, 1.5, 1],
                                    opacity: [0.5, 0, 0.5],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    delay: blockIndex * 0.2,
                                    ease: 'easeOut',
                                }}
                            />
                        </motion.div>
                    </motion.div>
                ))
            )}

            {/* Data flow particles along chains */}
            {chains.map((chain, chainIndex) =>
                [...Array(3)].map((_, particleIndex) => (
                    <motion.div
                        key={`particle-${chainIndex}-${particleIndex}`}
                        className="absolute w-1.5 h-1.5 rounded-full bg-cyan-400"
                        initial={{
                            left: `${chain.startX}%`,
                            top: `${chain.startY}%`,
                            opacity: 0,
                        }}
                        animate={{
                            left: `${chain.startX + ((chain.blocks - 1) * 15)}%`,
                            opacity: [0, 1, 1, 0],
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            delay: chain.delay + 1 + (particleIndex * 1),
                            ease: 'linear',
                        }}
                        style={{
                            boxShadow: '0 0 8px rgba(34, 211, 238, 0.8)',
                        }}
                    />
                ))
            )}

            {/* Cross-chain connections */}
            <svg className="absolute inset-0 w-full h-full">
                {[...Array(2)].map((_, i) => (
                    <motion.line
                        key={`cross-${i}`}
                        x1={`${40 + (i * 20)}%`}
                        y1="20%"
                        x2={`${40 + (i * 20)}%`}
                        y2="80%"
                        stroke="rgba(34, 211, 238, 0.3)"
                        strokeWidth="1"
                        strokeDasharray="5,5"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{
                            pathLength: [0, 1, 0],
                            opacity: [0, 0.6, 0],
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            delay: 2 + (i * 0.5),
                            ease: 'easeInOut',
                        }}
                    />
                ))}
            </svg>
        </div>
    );
}
