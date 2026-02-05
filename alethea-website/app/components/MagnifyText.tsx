'use client';

import { useRef, useState, useEffect } from 'react';

export default function MagnifyText({ children, className = '' }: { children: string; className?: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            setMousePos({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            });
        };

        const handleMouseEnter = () => setIsHovering(true);
        const handleMouseLeave = () => setIsHovering(false);

        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('mouseenter', handleMouseEnter);
        container.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            container.removeEventListener('mousemove', handleMouseMove);
            container.removeEventListener('mouseenter', handleMouseEnter);
            container.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    const words = children.split(' ');
    const maxDistance = 100; // radius efek dalam pixels (diperkecil dari 150)

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Lingkaran magnifying glass */}
            {isHovering && (
                <div
                    className="absolute pointer-events-none transition-all duration-300 ease-out"
                    style={{
                        left: mousePos.x,
                        top: mousePos.y,
                        transform: 'translate(-50%, -50%)',
                    }}
                >
                    {/* Outer circle - soft glow */}
                    <div
                        className="absolute rounded-full border border-cyan-400/20 bg-cyan-500/5 blur-sm"
                        style={{
                            width: maxDistance * 2,
                            height: maxDistance * 2,
                            transform: 'translate(-50%, -50%)',
                            boxShadow: '0 0 30px rgba(34, 211, 238, 0.2)',
                        }}
                    />
                    {/* Inner circle - main effect area */}
                    <div
                        className="absolute rounded-full border border-cyan-400/40 bg-cyan-500/8"
                        style={{
                            width: maxDistance * 1.4,
                            height: maxDistance * 1.4,
                            transform: 'translate(-50%, -50%)',
                            boxShadow: '0 0 20px rgba(34, 211, 238, 0.15)',
                        }}
                    />
                    {/* Center dot */}
                    <div
                        className="absolute rounded-full bg-cyan-400/60 blur-[1px]"
                        style={{
                            width: 6,
                            height: 6,
                            transform: 'translate(-50%, -50%)',
                        }}
                    />
                </div>
            )}

            {words.map((word, index) => (
                <Word
                    key={index}
                    word={word}
                    index={index}
                    mousePos={mousePos}
                    isHovering={isHovering}
                />
            ))}
        </div>
    );
}

function Word({ word, index, mousePos, isHovering }: {
    word: string;
    index: number;
    mousePos: { x: number; y: number };
    isHovering: boolean;
}) {
    const wordRef = useRef<HTMLSpanElement>(null);
    const [distance, setDistance] = useState(1000);

    useEffect(() => {
        if (!wordRef.current || !isHovering) return;

        const rect = wordRef.current.getBoundingClientRect();
        const wordCenterX = rect.left + rect.width / 2 - wordRef.current.offsetParent!.getBoundingClientRect().left;
        const wordCenterY = rect.top + rect.height / 2 - wordRef.current.offsetParent!.getBoundingClientRect().top;

        const dist = Math.sqrt(
            Math.pow(mousePos.x - wordCenterX, 2) + Math.pow(mousePos.y - wordCenterY, 2)
        );

        setDistance(dist);
    }, [mousePos, isHovering]);

    const maxDistance = 150; // radius efek dalam pixels
    const scale = isHovering && distance < maxDistance
        ? 1 + (1 - distance / maxDistance) * 0.5 // maksimal 1.5x
        : 1;

    const opacity = isHovering && distance < maxDistance
        ? 0.3 + (1 - distance / maxDistance) * 0.7 // dari 0.3 ke 1
        : 1;

    const color = isHovering && distance < maxDistance
        ? `rgb(${34 + (1 - distance / maxDistance) * 150}, ${211 - (1 - distance / maxDistance) * 50}, 238)`
        : 'inherit';

    return (
        <span
            ref={wordRef}
            className="inline-block transition-all duration-200 ease-out"
            style={{
                transform: `scale(${scale})`,
                opacity,
                color,
                margin: '0 0.15em',
            }}
        >
            {word}
        </span>
    );
}
