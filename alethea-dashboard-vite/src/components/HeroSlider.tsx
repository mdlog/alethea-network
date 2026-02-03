import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Zap, Shield, Coins, Code2, Play, Pause } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Slide {
    id: number;
    title: string;
    subtitle: string;
    description: string;
    icon: React.ReactNode;
    gradient: string;
    ctaText: string;
    ctaLink: string;
    stats: { label: string; value: string }[];
}

const slides: Slide[] = [
    {
        id: 1,
        title: 'Decentralized Oracle Network',
        subtitle: 'Truth Verification Layer',
        description: 'Secure, community-driven verification of real-world events powered by stake-weighted voting on Linera.',
        icon: <Shield />,
        gradient: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #059669 100%)',
        ctaText: 'Become a Voter',
        ctaLink: '/voters',
        stats: [
            { label: 'Network', value: 'Conway' },
            { label: 'Consensus', value: 'Stake-Weighted' },
        ],
    },
    {
        id: 2,
        title: 'Stake & Earn Rewards',
        subtitle: 'Participate in Consensus',
        description: 'Register as a voter, stake ALTH tokens, and earn rewards for accurate voting. Build your reputation.',
        icon: <Coins />,
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #dc2626 100%)',
        ctaText: 'Start Staking',
        ctaLink: '/token',
        stats: [
            { label: 'Min Stake', value: '100 ALTH' },
            { label: 'Slashing', value: '5%' },
        ],
    },
    {
        id: 3,
        title: 'Build on Alethea',
        subtitle: 'DApp Integration SDK',
        description: 'Integrate your prediction markets or DeFi apps with Alethea Oracle for trustless resolution.',
        icon: <Code2 />,
        gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #4f46e5 100%)',
        ctaText: 'View Docs',
        ctaLink: '/docs',
        stats: [
            { label: 'SDK', value: 'TypeScript' },
            { label: 'Protocol', value: 'GraphQL' },
        ],
    },
];

const SLIDE_DURATION = 5000;

export default function HeroSlider() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [progress, setProgress] = useState(0);
    const [direction, setDirection] = useState<'next' | 'prev'>('next');

    const goToSlide = useCallback((index: number, dir: 'next' | 'prev' = 'next') => {
        if (isTransitioning || index === currentSlide) return;
        setDirection(dir);
        setIsTransitioning(true);
        setProgress(0);
        setCurrentSlide(index);
        setTimeout(() => setIsTransitioning(false), 800);
    }, [isTransitioning, currentSlide]);

    const nextSlide = useCallback(() => {
        goToSlide((currentSlide + 1) % slides.length, 'next');
    }, [currentSlide, goToSlide]);

    const prevSlide = useCallback(() => {
        goToSlide((currentSlide - 1 + slides.length) % slides.length, 'prev');
    }, [currentSlide, goToSlide]);

    useEffect(() => {
        if (isPaused) return;
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    nextSlide();
                    return 0;
                }
                return prev + (100 / (SLIDE_DURATION / 50));
            });
        }, 50);
        return () => clearInterval(interval);
    }, [isPaused, nextSlide]);

    useEffect(() => {
        setProgress(0);
    }, [currentSlide]);

    return (
        <div 
            className="relative overflow-hidden rounded-xl md:rounded-2xl"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Container - Responsive Height */}
            <div className="relative h-[360px] sm:h-[340px] md:h-[360px] lg:h-[380px]">
                
                {/* Background Slides */}
                {slides.map((slide, index) => (
                    <div
                        key={slide.id}
                        className="absolute inset-0"
                        style={{
                            background: slide.gradient,
                            opacity: index === currentSlide ? 1 : 0,
                            transform: index === currentSlide ? 'scale(1)' : 'scale(1.05)',
                            transition: 'opacity 800ms cubic-bezier(0.4, 0, 0.2, 1), transform 800ms cubic-bezier(0.4, 0, 0.2, 1)',
                            zIndex: index === currentSlide ? 1 : 0,
                        }}
                    >
                        {/* Overlay pattern */}
                        <div 
                            className="absolute inset-0"
                            style={{
                                background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.12) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(255,255,255,0.08) 0%, transparent 40%)',
                            }}
                        />
                    </div>
                ))}

                {/* Content Slides */}
                <div className="relative z-10 h-full">
                    {slides.map((slide, index) => {
                        const isActive = index === currentSlide;
                        const slideDirection = direction === 'next' ? 1 : -1;
                        
                        return (
                            <div
                                key={slide.id}
                                className="absolute inset-0 px-4 sm:px-6 md:px-10 lg:px-14 flex items-center"
                                style={{
                                    opacity: isActive ? 1 : 0,
                                    transform: isActive ? 'translateX(0)' : `translateX(${slideDirection * 30}px)`,
                                    transition: 'all 600ms cubic-bezier(0.4, 0, 0.2, 1)',
                                    pointerEvents: isActive ? 'auto' : 'none',
                                }}
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center gap-4 sm:gap-6 lg:gap-10 w-full py-8 sm:py-10">
                                    
                                    {/* Mobile: Icon at top */}
                                    <div 
                                        className="flex lg:hidden items-center gap-3"
                                        style={{
                                            opacity: isActive ? 1 : 0,
                                            transform: isActive ? 'translateY(0)' : 'translateY(-10px)',
                                            transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1) 50ms',
                                        }}
                                    >
                                        <div 
                                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white"
                                            style={{ background: 'rgba(255,255,255,0.2)' }}
                                        >
                                            <div className="w-5 h-5 sm:w-6 sm:h-6">
                                                {slide.icon}
                                            </div>
                                        </div>
                                        <div 
                                            className="flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium text-white"
                                            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
                                        >
                                            <Zap className="w-3 h-3" />
                                            <span>Conway Testnet</span>
                                        </div>
                                    </div>

                                    {/* Left Content */}
                                    <div className="flex-1 lg:max-w-[60%]">
                                        {/* Desktop Badge */}
                                        <div 
                                            className="hidden lg:inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
                                            style={{ 
                                                background: 'rgba(255,255,255,0.15)', 
                                                border: '1px solid rgba(255,255,255,0.25)',
                                                opacity: isActive ? 1 : 0,
                                                transform: isActive ? 'translateY(0)' : 'translateY(-10px)',
                                                transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1) 100ms',
                                            }}
                                        >
                                            <Zap className="w-3.5 h-3.5 text-white" />
                                            <span className="text-xs font-medium text-white">
                                                Live on Linera Conway Testnet
                                            </span>
                                        </div>

                                        {/* Subtitle */}
                                        <p 
                                            className="text-xs sm:text-sm md:text-base font-medium mb-1 sm:mb-2"
                                            style={{ 
                                                color: 'rgba(255,255,255,0.8)',
                                                opacity: isActive ? 1 : 0,
                                                transform: isActive ? 'translateY(0)' : 'translateY(15px)',
                                                transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1) 150ms',
                                            }}
                                        >
                                            {slide.subtitle}
                                        </p>

                                        {/* Title */}
                                        <h2 
                                            className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight mb-2 sm:mb-3 md:mb-4"
                                            style={{
                                                opacity: isActive ? 1 : 0,
                                                transform: isActive ? 'translateY(0)' : 'translateY(20px)',
                                                transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1) 200ms',
                                            }}
                                        >
                                            {slide.title}
                                        </h2>

                                        {/* Description */}
                                        <p 
                                            className="text-xs sm:text-sm md:text-base leading-relaxed mb-4 sm:mb-5 md:mb-6 max-w-md lg:max-w-lg"
                                            style={{ 
                                                color: 'rgba(255,255,255,0.7)',
                                                opacity: isActive ? 1 : 0,
                                                transform: isActive ? 'translateY(0)' : 'translateY(20px)',
                                                transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1) 250ms',
                                            }}
                                        >
                                            {slide.description}
                                        </p>

                                        {/* Mobile Stats */}
                                        <div 
                                            className="flex lg:hidden items-center gap-2 mb-4"
                                            style={{
                                                opacity: isActive ? 1 : 0,
                                                transform: isActive ? 'translateY(0)' : 'translateY(15px)',
                                                transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1) 280ms',
                                            }}
                                        >
                                            {slide.stats.map((stat, i) => (
                                                <div 
                                                    key={i}
                                                    className="px-2.5 py-1.5 rounded-lg"
                                                    style={{ 
                                                        background: 'rgba(255,255,255,0.15)', 
                                                        border: '1px solid rgba(255,255,255,0.2)',
                                                    }}
                                                >
                                                    <p className="text-[9px] sm:text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.6)' }}>
                                                        {stat.label}
                                                    </p>
                                                    <p className="text-xs sm:text-sm font-semibold text-white">{stat.value}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* CTA Buttons */}
                                        <div 
                                            className="flex flex-wrap items-center gap-2 sm:gap-3"
                                            style={{
                                                opacity: isActive ? 1 : 0,
                                                transform: isActive ? 'translateY(0)' : 'translateY(20px)',
                                                transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1) 300ms',
                                            }}
                                        >
                                            <Link
                                                to={slide.ctaLink}
                                                className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-white font-medium rounded-lg transition-all duration-300 hover:shadow-lg hover:scale-[1.02] text-sm sm:text-base"
                                                style={{ color: '#272429' }}
                                            >
                                                {slide.ctaText}
                                                <ChevronRight className="w-4 h-4" />
                                            </Link>
                                            <Link
                                                to="/docs"
                                                className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 font-medium rounded-lg transition-all duration-300 text-white hover:bg-white/25 text-sm sm:text-base"
                                                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
                                            >
                                                Learn More
                                            </Link>
                                        </div>
                                    </div>

                                    {/* Right Content - Desktop Icon */}
                                    <div className="hidden lg:flex flex-1 justify-center items-center">
                                        <div 
                                            className="relative"
                                            style={{
                                                opacity: isActive ? 1 : 0,
                                                transform: isActive ? 'scale(1) rotate(0deg)' : 'scale(0.8) rotate(-10deg)',
                                                transition: 'all 700ms cubic-bezier(0.4, 0, 0.2, 1) 200ms',
                                            }}
                                        >
                                            {/* Rings */}
                                            <div 
                                                className="absolute rounded-full"
                                                style={{
                                                    inset: '-24px',
                                                    border: '2px solid rgba(255,255,255,0.15)',
                                                    animation: 'heroSpin 25s linear infinite',
                                                }}
                                            />
                                            <div 
                                                className="absolute rounded-full"
                                                style={{
                                                    inset: '-12px',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    animation: 'heroSpin 20s linear infinite reverse',
                                                }}
                                            />
                                            
                                            {/* Icon */}
                                            <div className="w-32 h-32 xl:w-36 xl:h-36 flex items-center justify-center text-white/90">
                                                <div className="w-14 h-14 xl:w-16 xl:h-16">
                                                    {slide.icon}
                                                </div>
                                            </div>

                                            {/* Desktop Stats badges */}
                                            <div 
                                                className="absolute -top-4 -right-6 px-3 py-2 rounded-lg"
                                                style={{ 
                                                    background: 'rgba(255,255,255,0.15)', 
                                                    border: '1px solid rgba(255,255,255,0.2)',
                                                    backdropFilter: 'blur(8px)',
                                                    animation: 'heroFloat 3s ease-in-out infinite',
                                                    opacity: isActive ? 1 : 0,
                                                    transition: 'opacity 500ms ease 400ms',
                                                }}
                                            >
                                                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.6)' }}>
                                                    {slide.stats[0].label}
                                                </p>
                                                <p className="text-sm font-semibold text-white">{slide.stats[0].value}</p>
                                            </div>
                                            <div 
                                                className="absolute -bottom-4 -left-6 px-3 py-2 rounded-lg"
                                                style={{ 
                                                    background: 'rgba(255,255,255,0.15)', 
                                                    border: '1px solid rgba(255,255,255,0.2)',
                                                    backdropFilter: 'blur(8px)',
                                                    animation: 'heroFloat 3s ease-in-out infinite 0.5s',
                                                    opacity: isActive ? 1 : 0,
                                                    transition: 'opacity 500ms ease 500ms',
                                                }}
                                            >
                                                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.6)' }}>
                                                    {slide.stats[1].label}
                                                </p>
                                                <p className="text-sm font-semibold text-white">{slide.stats[1].value}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Navigation Arrows - Hidden on mobile, visible on tablet+ */}
                <button
                    onClick={prevSlide}
                    className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full items-center justify-center transition-all duration-300 z-20 hover:scale-110 hidden sm:flex"
                    style={{ 
                        background: 'rgba(255,255,255,0.15)', 
                        border: '1px solid rgba(255,255,255,0.25)',
                        color: 'rgba(255,255,255,0.9)',
                        backdropFilter: 'blur(8px)',
                    }}
                    aria-label="Previous slide"
                >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                    onClick={nextSlide}
                    className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full items-center justify-center transition-all duration-300 z-20 hover:scale-110 hidden sm:flex"
                    style={{ 
                        background: 'rgba(255,255,255,0.15)', 
                        border: '1px solid rgba(255,255,255,0.25)',
                        color: 'rgba(255,255,255,0.9)',
                        backdropFilter: 'blur(8px)',
                    }}
                    aria-label="Next slide"
                >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {/* Bottom Controls */}
                <div className="absolute bottom-3 sm:bottom-4 md:bottom-5 left-0 right-0 flex items-center justify-center gap-2 sm:gap-3 md:gap-4 z-20 px-4">
                    {/* Pause/Play */}
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                        style={{ 
                            background: 'rgba(255,255,255,0.15)', 
                            border: '1px solid rgba(255,255,255,0.25)',
                            color: 'rgba(255,255,255,0.8)',
                            backdropFilter: 'blur(8px)',
                        }}
                        aria-label={isPaused ? 'Play' : 'Pause'}
                    >
                        {isPaused ? <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-0.5" /> : <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                    </button>

                    {/* Progress Dots */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        {slides.map((_, index) => (
                            <button
                                key={`dot-${index}`}
                                onClick={() => goToSlide(index, index > currentSlide ? 'next' : 'prev')}
                                className="relative h-1.5 sm:h-2 rounded-full overflow-hidden transition-all duration-500"
                                style={{ 
                                    width: index === currentSlide ? '28px' : '6px',
                                    background: 'rgba(255,255,255,0.3)',
                                }}
                                aria-label={`Go to slide ${index + 1}`}
                            >
                                {index === currentSlide && (
                                    <div 
                                        className="absolute inset-0 bg-white rounded-full"
                                        style={{ 
                                            transform: `scaleX(${progress / 100})`,
                                            transformOrigin: 'left',
                                            transition: 'transform 50ms linear',
                                        }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Counter - Hidden on very small screens */}
                    <div 
                        className="hidden xs:flex text-[10px] sm:text-xs font-semibold tabular-nums px-2 sm:px-3 py-0.5 sm:py-1 rounded-full"
                        style={{ 
                            color: 'white',
                            background: 'rgba(255,255,255,0.15)',
                            border: '1px solid rgba(255,255,255,0.2)',
                        }}
                    >
                        {currentSlide + 1}/{slides.length}
                    </div>
                </div>

                {/* Mobile Swipe Indicators */}
                <div className="absolute bottom-3 left-4 right-4 flex justify-between sm:hidden z-10 pointer-events-none">
                    <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center opacity-50"
                        style={{ background: 'rgba(255,255,255,0.1)' }}
                    >
                        <ChevronLeft className="w-3 h-3 text-white/70" />
                    </div>
                    <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center opacity-50"
                        style={{ background: 'rgba(255,255,255,0.1)' }}
                    >
                        <ChevronRight className="w-3 h-3 text-white/70" />
                    </div>
                </div>
            </div>

            {/* Touch/Swipe handler for mobile */}
            <div 
                className="absolute inset-0 z-5 sm:hidden"
                onTouchStart={(e) => {
                    const touch = e.touches[0];
                    (e.currentTarget as HTMLDivElement).dataset.startX = touch.clientX.toString();
                }}
                onTouchEnd={(e) => {
                    const startX = parseFloat((e.currentTarget as HTMLDivElement).dataset.startX || '0');
                    const endX = e.changedTouches[0].clientX;
                    const diff = startX - endX;
                    
                    if (Math.abs(diff) > 50) {
                        if (diff > 0) {
                            nextSlide();
                        } else {
                            prevSlide();
                        }
                    }
                }}
            />

            {/* Keyframes */}
            <style>{`
                @keyframes heroSpin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes heroFloat {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
            `}</style>
        </div>
    );
}
