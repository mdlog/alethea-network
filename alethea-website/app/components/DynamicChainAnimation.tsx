'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';

export default function DynamicChainAnimation() {
    // Generate random positions and movement patterns for blocks
    const blocks = useMemo(() => {
        return [...Array(12)].map((_, i) => {
            const baseX = 15 + (i % 4) * 20 + Math.random() * 10;
            const baseY = 20 + Math.floor(i / 4) * 30 + Math.random() * 10;

            // Generate multiple waypoints for complex movement
            const waypoints = [...Array(4)].map(() => ({
                x: baseX + (Math.random() - 0.5) * 20,
                y: baseY + (Math.random() - 0.5) * 20,
            }));

            return {
                id: i,
                startX: baseX,
                startY: baseY,
                waypoints,
                duration: 6 + Math.random() * 4,
                delay: Math.random() * 2,
            };
        });
    }, []);

    // Generate connections between nearby blocks
    const connections = useMemo(() => {
        const conns: Array<{ from: number; to: number }> = [];
        blocks.forEach((block, i) => {
            blocks.forEach((otherBlock, j) => {
                if (i < j) {
                    const dx = block.startX - otherBlock.startX;
                    const dy = block.startY - otherBlock.startY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    // Connect if distance is less than 30
                    if (distance < 30) {
                        conns.push({ from: i, to: j });
                    }
                }
            });
        });
        return conns;
    }, [blocks]);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-15" style={{ zIndex: 1 }}>
            {/* Dynamic connection lines */}
            <svg className="absolute inset-0 w-full h-full">
                <defs>
                    <linearGradient id="dynamicGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="rgba(34, 211, 238, 0.1)" />
                        <stop offset="50%" stopColor="rgba(34, 211, 238, 0.3)" />
                        <stop offset="100%" stopColor="rgba(34, 211, 238, 0.1)" />
                    </linearGradient>
                </defs>

                {connections.map((conn, index) => {
                    const fromBlock = blocks[conn.from];
                    const toBlock = blocks[conn.to];

                    return (
                        <motion.line
                            key={`conn-${index}`}
                            stroke="url(#dynamicGradient)"
                            strokeWidth="1"
                            initial={{ opacity: 0 }}
                            animate={{
                                x1: [
                                    `${fromBlock.startX}%`,
                                    `${fromBlock.waypoints[0].x}%`,
                                    `${fromBlock.waypoints[1].x}%`,
                                    `${fromBlock.waypoints[2].x}%`,
                                    `${fromBlock.waypoints[3].x}%`,
                                    `${fromBlock.startX}%`,
                                ],
                                y1: [
                                    `${fromBlock.startY}%`,
                                    `${fromBlock.waypoints[0].y}%`,
                                    `${fromBlock.waypoints[1].y}%`,
                                    `${fromBlock.waypoints[2].y}%`,
                                    `${fromBlock.waypoints[3].y}%`,
                                    `${fromBlock.startY}%`,
                                ],
                                x2: [
                                    `${toBlock.startX}%`,
                                    `${toBlock.waypoints[0].x}%`,
                                    `${toBlock.waypoints[1].x}%`,
                                    `${toBlock.waypoints[2].x}%`,
                                    `${toBlock.waypoints[3].x}%`,
                                    `${toBlock.startX}%`,
                                ],
                                y2: [
                                    `${toBlock.startY}%`,
                                    `${toBlock.waypoints[0].y}%`,
                                    `${toBlock.waypoints[1].y}%`,
                                    `${toBlock.waypoints[2].y}%`,
                                    `${toBlock.waypoints[3].y}%`,
                                    `${toBlock.startY}%`,
                                ],
                                opacity: [0.2, 0.4, 0.3, 0.4, 0.3, 0.2],
                            }}
                            transition={{
                                x1: {
                                    duration: fromBlock.duration,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                    delay: fromBlock.delay,
                                },
                                y1: {
                                    duration: fromBlock.duration,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                    delay: fromBlock.delay,
                                },
                                x2: {
                                    duration: toBlock.duration,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                    delay: toBlock.delay,
                                },
                                y2: {
                                    duration: toBlock.duration,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                    delay: toBlock.delay,
                                },
                                opacity: {
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                },
                            }}
                        />
                    );
                })}
            </svg>

            {/* Moving blocks */}
            {blocks.map((block) => (
                <motion.div
                    key={`block-${block.id}`}
                    className="absolute"
                    initial={{
                        left: `${block.startX}%`,
                        top: `${block.startY}%`,
                    }}
                    animate={{
                        left: [
                            `${block.startX}%`,
                            `${block.waypoints[0].x}%`,
                            `${block.waypoints[1].x}%`,
                            `${block.waypoints[2].x}%`,
                            `${block.waypoints[3].x}%`,
                            `${block.startX}%`,
                        ],
                        top: [
                            `${block.startY}%`,
                            `${block.waypoints[0].y}%`,
                            `${block.waypoints[1].y}%`,
                            `${block.waypoints[2].y}%`,
                            `${block.waypoints[3].y}%`,
                            `${block.startY}%`,
                        ],
                    }}
                    transition={{
                        duration: block.duration,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: block.delay,
                    }}
                    style={{
                        transform: 'translate(-50%, -50%)',
                    }}
                >
                    {/* Block shape */}
                    <motion.div
                        className="relative w-8 h-8 border border-cyan-400/30 bg-cyan-500/5"
                        style={{
                            clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                            boxShadow: '0 0 10px rgba(34, 211, 238, 0.2)',
                        }}
                        animate={{
                            rotate: [0, 360],
                        }}
                        transition={{
                            duration: 20,
                            repeat: Infinity,
                            ease: 'linear',
                        }}
                    >
                        {/* Inner glow */}
                        <motion.div
                            className="absolute inset-0 bg-cyan-400/10"
                            animate={{
                                opacity: [0.1, 0.3, 0.1],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: 'easeInOut',
                            }}
                        />

                        {/* Center dot */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div
                                className="w-1 h-1 bg-cyan-400/60 rounded-full"
                                animate={{
                                    scale: [1, 1.5, 1],
                                }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                }}
                            />
                        </div>
                    </motion.div>

                    {/* Pulse ring */}
                    <motion.div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border border-cyan-400/15 rounded-full"
                        animate={{
                            scale: [1, 1.8, 1],
                            opacity: [0.3, 0, 0.3],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeOut',
                        }}
                    />
                </motion.div>
            ))}

            {/* Data particles flowing along connections */}
            {connections.slice(0, 6).map((conn, index) => {
                const fromBlock = blocks[conn.from];
                const toBlock = blocks[conn.to];

                return (
                    <motion.div
                        key={`particle-${index}`}
                        className="absolute w-1 h-1 rounded-full bg-cyan-400/60"
                        initial={{
                            left: `${fromBlock.startX}%`,
                            top: `${fromBlock.startY}%`,
                            opacity: 0,
                        }}
                        animate={{
                            left: [
                                `${fromBlock.startX}%`,
                                `${fromBlock.waypoints[1].x}%`,
                                `${toBlock.waypoints[1].x}%`,
                                `${toBlock.startX}%`,
                            ],
                            top: [
                                `${fromBlock.startY}%`,
                                `${fromBlock.waypoints[1].y}%`,
                                `${toBlock.waypoints[1].y}%`,
                                `${toBlock.startY}%`,
                            ],
                            opacity: [0, 1, 1, 0],
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            delay: index * 0.5,
                            ease: 'linear',
                        }}
                        style={{
                            boxShadow: '0 0 6px rgba(34, 211, 238, 0.4)',
                        }}
                    />
                );
            })}
        </div>
    );
}
