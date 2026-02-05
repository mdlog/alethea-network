'use client';

import { useEffect, useRef } from 'react';

export default function NetworkAnimation() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles: Particle[] = [];
        const particleCount = 80;
        const connectionDistance = 150;

        class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            radius: number;

            constructor() {
                if (!canvas) return;
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
                this.radius = Math.random() * 2 + 1;
            }

            update() {
                if (!canvas) return;
                this.x += this.vx;
                this.y += this.vy;

                if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
                if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
            }

            draw() {
                if (!ctx) return;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(34, 211, 238, 0.6)';
                ctx.fill();
            }
        }

        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        function animate() {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((particle, i) => {
                particle.update();
                particle.draw();

                particles.slice(i + 1).forEach((otherParticle) => {
                    const dx = particle.x - otherParticle.x;
                    const dy = particle.y - otherParticle.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < connectionDistance) {
                        ctx.beginPath();
                        ctx.moveTo(particle.x, particle.y);
                        ctx.lineTo(otherParticle.x, otherParticle.y);
                        const opacity = (1 - distance / connectionDistance) * 0.3;
                        ctx.strokeStyle = `rgba(34, 211, 238, ${opacity})`;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                });
            });

            requestAnimationFrame(animate);
        }

        animate();

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed top-0 left-0 w-full h-full pointer-events-none opacity-30"
            style={{ zIndex: 1 }}
        />
    );
}
