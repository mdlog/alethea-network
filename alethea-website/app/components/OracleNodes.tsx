'use client';

import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

export default function OracleNodes() {
    return (
        <div className="fixed top-20 right-10 pointer-events-none opacity-30 z-0">
            <div className="relative w-64 h-64">
                {/* Center Node */}
                <motion.div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-cyan-500/20 rounded-full border-2 border-cyan-500/50 flex items-center justify-center"
                    animate={{
                        scale: [1, 1.2, 1],
                        boxShadow: [
                            '0 0 20px rgba(34, 211, 238, 0.3)',
                            '0 0 40px rgba(34, 211, 238, 0.6)',
                            '0 0 20px rgba(34, 211, 238, 0.3)',
                        ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <Shield className="w-6 h-6 text-cyan-400" />
                </motion.div>

                {/* Orbiting Nodes */}
                {[0, 120, 240].map((angle, index) => (
                    <motion.div
                        key={index}
                        className="absolute top-1/2 left-1/2 w-10 h-10"
                        style={{
                            originX: 0.5,
                            originY: 0.5,
                        }}
                        animate={{
                            rotate: 360,
                        }}
                        transition={{
                            duration: 10,
                            repeat: Infinity,
                            ease: 'linear',
                            delay: index * 0.5,
                        }}
                    >
                        <motion.div
                            className="absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-blue-500/20 rounded-full border-2 border-blue-500/50 flex items-center justify-center"
                            style={{
                                left: `${100 * Math.cos((angle * Math.PI) / 180)}px`,
                                top: `${100 * Math.sin((angle * Math.PI) / 180)}px`,
                            }}
                            animate={{
                                scale: [1, 1.1, 1],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: index * 0.3,
                            }}
                        >
                            <div className="w-2 h-2 bg-blue-400 rounded-full" />
                        </motion.div>
                    </motion.div>
                ))}

                {/* Connection Lines */}
                <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
                    {[0, 120, 240].map((angle, index) => {
                        const x = 128 + 100 * Math.cos((angle * Math.PI) / 180);
                        const y = 128 + 100 * Math.sin((angle * Math.PI) / 180);
                        return (
                            <motion.line
                                key={index}
                                x1="128"
                                y1="128"
                                x2={x}
                                y2={y}
                                stroke="rgba(34, 211, 238, 0.2)"
                                strokeWidth="1.5"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    repeatType: 'reverse',
                                    delay: index * 0.3,
                                }}
                            />
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}
