'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

// Minimal Blockchain Visualization Component
export function BlockchainVisualization() {
    const [nodes, setNodes] = useState<{ id: number; x: number; y: number; vx: number; vy: number }[]>([]);

    useEffect(() => {
        // Initialize nodes
        const initialNodes = Array.from({ length: 15 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            vx: (Math.random() - 0.5) * 0.1,
            vy: (Math.random() - 0.5) * 0.1,
        }));
        setNodes(initialNodes);

        // Animate nodes
        const interval = setInterval(() => {
            setNodes(prev => prev.map(node => {
                let newX = node.x + node.vx;
                let newY = node.y + node.vy;
                let newVx = node.vx;
                let newVy = node.vy;

                // Bounce off edges
                if (newX <= 0 || newX >= 100) newVx = -node.vx;
                if (newY <= 0 || newY >= 100) newVy = -node.vy;

                return {
                    ...node,
                    x: Math.max(0, Math.min(100, newX)),
                    y: Math.max(0, Math.min(100, newY)),
                    vx: newVx,
                    vy: newVy,
                };
            }));
        }, 50);

        return () => clearInterval(interval);
    }, []);

    // Calculate connections between nearby nodes
    const connections = nodes.flatMap((node, i) =>
        nodes.slice(i + 1).map((otherNode, j) => {
            const dx = node.x - otherNode.x;
            const dy = node.y - otherNode.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < 25 ? { from: node, to: otherNode, distance } : null;
        }).filter(Boolean)
    );

    return (
        <div className="absolute inset-0 overflow-hidden opacity-20">
            <svg className="w-full h-full" style={{ minHeight: '600px' }}>
                {/* Connections with data flow */}
                {connections.map((conn, i) => {
                    if (!conn) return null;
                    return (
                        <g key={i}>
                            <line
                                x1={`${conn.from.x}%`}
                                y1={`${conn.from.y}%`}
                                x2={`${conn.to.x}%`}
                                y2={`${conn.to.y}%`}
                                stroke="rgba(255, 255, 255, 0.15)"
                                strokeWidth="1"
                            />
                            {/* Data flow particle */}
                            <motion.circle
                                cx={`${conn.from.x}%`}
                                cy={`${conn.from.y}%`}
                                r="2"
                                fill="rgba(255, 255, 255, 0.6)"
                                animate={{
                                    cx: [`${conn.from.x}%`, `${conn.to.x}%`],
                                    cy: [`${conn.from.y}%`, `${conn.to.y}%`],
                                }}
                                transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    ease: "linear",
                                    delay: i * 0.2,
                                }}
                            />
                        </g>
                    );
                })}

                {/* Nodes with glow */}
                {nodes.map((node) => (
                    <g key={node.id}>
                        {/* Glow effect */}
                        <circle
                            cx={`${node.x}%`}
                            cy={`${node.y}%`}
                            r="8"
                            fill="rgba(255, 255, 255, 0.05)"
                        />
                        {/* Node */}
                        <motion.circle
                            cx={`${node.x}%`}
                            cy={`${node.y}%`}
                            r="3"
                            fill="rgba(255, 255, 255, 0.4)"
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.4, 0.7, 0.4],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: node.id * 0.1,
                            }}
                        />
                    </g>
                ))}
            </svg>
        </div>
    );
}
