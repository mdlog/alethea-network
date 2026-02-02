'use client';

import { motion } from 'framer-motion';

export default function DataFlow() {
    const dataPoints = Array.from({ length: 20 }, (_, i) => i);

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
            {dataPoints.map((i) => (
                <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-cyan-400 rounded-full"
                    initial={{
                        x: typeof window !== 'undefined' ? Math.random() * window.innerWidth : 0,
                        y: -10,
                        opacity: 0,
                    }}
                    animate={{
                        y: typeof window !== 'undefined' ? window.innerHeight + 10 : 1000,
                        opacity: [0, 1, 1, 0],
                    }}
                    transition={{
                        duration: Math.random() * 3 + 2,
                        repeat: Infinity,
                        delay: Math.random() * 5,
                        ease: 'linear',
                    }}
                />
            ))}
        </div>
    );
}
