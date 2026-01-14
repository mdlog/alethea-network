import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Slide {
    id: number;
    title: string;
    subtitle: string;
    description: string;
    backgroundImage: string;
    overlayColor: string;
}

const slides: Slide[] = [
    {
        id: 1,
        title: 'Decentralized Oracle',
        subtitle: 'Truth Verification Network',
        description: 'Secure, community-driven verification of real-world events. Powered by stake-weighted voting and commit-reveal mechanism.',
        backgroundImage: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1920&q=80',
        overlayColor: 'from-blue-900/90 via-indigo-900/80 to-purple-900/70',
    },
    {
        id: 2,
        title: 'Stake & Earn',
        subtitle: 'Participate in Consensus',
        description: 'Register as a voter, stake tokens, and earn rewards for accurate voting. Higher reputation means greater influence.',
        backgroundImage: 'https://images.unsplash.com/photo-1642104704074-907c0698cbd9?auto=format&fit=crop&w=1920&q=80',
        overlayColor: 'from-emerald-900/90 via-teal-900/80 to-cyan-900/70',
    },
    {
        id: 3,
        title: 'DApp Integration',
        subtitle: 'Build on Alethea',
        description: 'Integrate your prediction markets, insurance protocols, or DeFi apps with Alethea Oracle for trustless resolution.',
        backgroundImage: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1920&q=80',
        overlayColor: 'from-orange-900/90 via-rose-900/80 to-pink-900/70',
    },
];

export default function HeroSlider() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    // Auto-slide every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            nextSlide();
        }, 5000);
        return () => clearInterval(interval);
    }, [currentSlide]);

    const nextSlide = () => {
        if (isAnimating) return;
        setIsAnimating(true);
        setCurrentSlide((prev) => (prev + 1) % slides.length);
        setTimeout(() => setIsAnimating(false), 500);
    };

    const prevSlide = () => {
        if (isAnimating) return;
        setIsAnimating(true);
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
        setTimeout(() => setIsAnimating(false), 500);
    };

    const goToSlide = (index: number) => {
        if (isAnimating || index === currentSlide) return;
        setIsAnimating(true);
        setCurrentSlide(index);
        setTimeout(() => setIsAnimating(false), 500);
    };

    return (
        <div className="relative overflow-hidden rounded-3xl h-[400px] md:h-[450px]">
            {/* Slides Container */}
            <div
                className="flex transition-transform duration-500 ease-in-out h-full"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
                {slides.map((slide) => (
                    <div
                        key={slide.id}
                        className="min-w-full h-full relative"
                    >
                        {/* Background Image */}
                        <div
                            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                            style={{ backgroundImage: `url(${slide.backgroundImage})` }}
                        />

                        {/* Gradient Overlay */}
                        <div className={`absolute inset-0 bg-gradient-to-r ${slide.overlayColor}`} />

                        {/* Additional dark overlay for better text readability */}
                        <div className="absolute inset-0 bg-black/30" />

                        {/* Content */}
                        <div className="relative h-full flex items-center px-8 md:px-16">
                            <div className="max-w-3xl">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6">
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                    <span className="text-sm text-white/90 font-medium">
                                        Live on Linera Testnet
                                    </span>
                                </div>

                                <p className="text-lg md:text-xl text-white/80 font-medium mb-2">
                                    {slide.subtitle}
                                </p>

                                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
                                    {slide.title}
                                </h2>

                                <p className="text-lg md:text-xl text-white/90 max-w-2xl leading-relaxed drop-shadow">
                                    {slide.description}
                                </p>

                                {/* CTA Buttons */}
                                <div className="flex flex-wrap gap-4 mt-8">
                                    <a
                                        href="/voters"
                                        className="px-6 py-3 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition-all shadow-lg"
                                    >
                                        Get Started
                                    </a>
                                    <a
                                        href="/docs"
                                        className="px-6 py-3 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl border border-white/30 hover:bg-white/20 transition-all"
                                    >
                                        Learn More
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Navigation Arrows */}
            <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/30 backdrop-blur-sm rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-black/50 transition-colors"
                aria-label="Previous slide"
            >
                <ChevronLeft className="w-6 h-6" />
            </button>
            <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/30 backdrop-blur-sm rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-black/50 transition-colors"
                aria-label="Next slide"
            >
                <ChevronRight className="w-6 h-6" />
            </button>

            {/* Dots Indicator */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`transition-all duration-300 ${index === currentSlide
                                ? 'w-8 h-3 bg-white rounded-full'
                                : 'w-3 h-3 bg-white/50 rounded-full hover:bg-white/70'
                            }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>

            {/* Slide Counter */}
            <div className="absolute top-6 right-6 px-4 py-2 bg-black/30 backdrop-blur-sm rounded-full border border-white/20">
                <span className="text-sm text-white font-medium">
                    {currentSlide + 1} / {slides.length}
                </span>
            </div>
        </div>
    );
}
