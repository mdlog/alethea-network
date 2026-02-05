'use client';

import { motion } from 'framer-motion';

export default function FloatingOrbs() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
            {/* Large Cyan Orb */}
            <motion.div
                className="absolute w-96 h-96 rounded-full bg-cyan-500/20 blur-3xl"
                animate={{
                    x: [0, 100, 0],
                    y: [0, -100, 0],
                    scale: [1, 1.2, 1],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
                style={{ top: '10%', left: '10%' }}
            />

            {/* Medium Blue Orb */}
            <motion.div
                className="absolute w-72 h-72 rounded-full bg-blue-500/20 blur-3xl"
                animate={{
                    x: [0, -80, 0],
                    y: [0, 80, 0],
                    scale: [1, 1.3, 1],
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
                style={{ top: '50%', right: '10%' }}
            />

            {/* Small Purple Orb */}
            <motion.div
                className="absolute w-64 h-64 rounded-full bg-purple-500/20 blur-3xl"
                animate={{
                    x: [0, 60, 0],
                    y: [0, -60, 0],
                    scale: [1, 1.1, 1],
                }}
                transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
                style={{ bottom: '10%', left: '50%' }}
            />

            {/* Extra Small Pink Orb */}
            <motion.div
                className="absolute w-48 h-48 rounded-full bg-pink-500/20 blur-3xl"
                animate={{
                    x: [0, -50, 0],
                    y: [0, 50, 0],
                    scale: [1, 1.2, 1],
                }}
                transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
                style={{ top: '30%', right: '30%' }}
            />
        </div>
    );
}
