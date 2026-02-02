'use client';

import { motion } from 'framer-motion';

export default function GridAnimation() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20" style={{ zIndex: 1 }}>
            {/* Oracle Nodes Network */}
            <svg className="absolute inset-0 w-full h-full">
                <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(34, 211, 238, 0)" />
                        <stop offset="50%" stopColor="rgba(34, 211, 238, 0.4)" />
                        <stop offset="100%" stopColor="rgba(34, 211, 238, 0)" />
                    </linearGradient>
                </defs>

                {/* Connection lines between nodes */}
                {[...Array(6)].map((_, i) => {
                    const x1 = 10 + (i * 15);
                    const y1 = 20 + (i % 2) * 60;
                    const x2 = 30 + (i * 15);
                    const y2 = 80 - (i % 2) * 60;
                    return (
                        <motion.line
                            key={`line-${i}`}
                            x1={`${x1}%`}
                            y1={`${y1}%`}
                            x2={`${x2}%`}
                            y2={`${y2}%`}
                            stroke="url(#lineGradient)"
                            strokeWidth="1"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{
                                pathLength: [0, 1, 0],
                                opacity: [0, 0.6, 0]
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                delay: i * 0.5,
                                ease: 'easeInOut',
                            }}
                        />
                    );
                })}
            </svg>

            {/* Data Packets flowing */}
            {[...Array(12)].map((_, i) => (
                <motion.div
                    key={`packet-${i}`}
                    className="absolute w-2 h-2 rounded-full bg-cyan-400"
                    initial={{
                        x: `${Math.random() * 100}%`,
                        y: '-5%',
                        opacity: 0,
                    }}
                    animate={{
                        y: '105%',
                        opacity: [0, 1, 1, 0],
                    }}
                    transition={{
                        duration: 4 + Math.random() * 2,
                        repeat: Infinity,
                        delay: i * 0.3,
                        ease: 'linear',
                    }}
                    style={{
                        boxShadow: '0 0 8px rgba(34, 211, 238, 0.6)',
                    }}
                />
            ))}

            {/* Oracle Nodes */}
            {[...Array(8)].map((_, i) => (
                <motion.div
                    key={`node-${i}`}
                    className="absolute"
                    style={{
                        left: `${15 + (i * 12)}%`,
                        top: `${30 + (i % 3) * 20}%`,
                    }}
                >
                    {/* Node core */}
                    <motion.div
                        className="w-3 h-3 rounded-full bg-cyan-400/60 border border-cyan-300"
                        animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.6, 1, 0.6],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.25,
                            ease: 'easeInOut',
                        }}
                        style={{
                            boxShadow: '0 0 10px rgba(34, 211, 238, 0.5)',
                        }}
                    />
                    {/* Node pulse ring */}
                    <motion.div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-cyan-400/30"
                        animate={{
                            scale: [1, 2, 1],
                            opacity: [0.5, 0, 0.5],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.25,
                            ease: 'easeOut',
                        }}
                    />
                </motion.div>
            ))}

            {/* Blockchain blocks */}
            {[...Array(4)].map((_, i) => (
                <motion.div
                    key={`block-${i}`}
                    className="absolute w-12 h-12 border border-cyan-400/20 bg-cyan-500/5"
                    style={{
                        left: `${20 + i * 20}%`,
                        top: `${60 + (i % 2) * 15}%`,
                        clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                    }}
                    animate={{
                        rotate: [0, 360],
                        opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        delay: i * 0.5,
                        ease: 'linear',
                    }}
                />
            ))}
        </div>
    );
}
