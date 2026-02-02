import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Slide {
    id: number;
    title: string;
    subtitle: string;
    description: string;
    image: string;
    ctaText: string;
    ctaLink: string;
}

const slides: Slide[] = [
    {
        id: 1,
        title: 'Decentralized Oracle',
        subtitle: 'Truth Verification Network',
        description: 'Secure, community-driven verification of real-world events. Powered by stake-weighted voting and commit-reveal mechanism.',
        image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&h=400&fit=crop',
        ctaText: 'Get Started',
        ctaLink: '/voters',
    },
    {
        id: 2,
        title: 'Stake & Earn',
        subtitle: 'Participate in Consensus',
        description: 'Register as a voter, stake ALTH tokens, and earn rewards for accurate voting. Higher reputation means greater influence.',
        image: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=600&h=400&fit=crop',
        ctaText: 'Start Staking',
        ctaLink: '/token',
    },
    {
        id: 3,
        title: 'DApp Integration',
        subtitle: 'Build on Alethea',
        description: 'Integrate your prediction markets, insurance protocols, or DeFi apps with Alethea Oracle for trustless resolution.',
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
        ctaText: 'View Docs',
        ctaLink: '/docs',
    },
];

export default function HeroSlider() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    // Auto-slide every 6 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            nextSlide();
        }, 6000);
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

    const slide = slides[currentSlide];

    return (
        <div className="relative overflow-hidden rounded-2xl h-[420px] md:h-[380px] bg-grey-50 border border-grey-100">
            {/* Content */}
            <div className="relative h-full flex items-center px-8 md:px-12 lg:px-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center w-full">
                    {/* Left Content */}
                    <div className="z-10">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-alethea-200 bg-alethea-50 mb-5">
                            <Zap className="w-3.5 h-3.5 text-alethea-600" />
                            <span className="text-xs font-medium text-alethea-700">
                                Live on Linera Conway Testnet
                            </span>
                        </div>

                        {/* Subtitle */}
                        <p className="text-sm md:text-base font-medium mb-2 text-alethea-600">
                            {slide.subtitle}
                        </p>

                        {/* Title */}
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-4 leading-tight">
                            {slide.title}
                        </h2>

                        {/* Description */}
                        <p className="text-base text-grey-700 max-w-lg leading-relaxed mb-6">
                            {slide.description}
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-wrap gap-3">
                            <Link
                                to={slide.ctaLink}
                                className="btn-primary px-5 py-2.5"
                            >
                                {slide.ctaText}
                            </Link>
                            <Link
                                to="/docs"
                                className="btn-secondary px-5 py-2.5"
                            >
                                Learn More
                            </Link>
                        </div>
                    </div>

                    {/* Right Content - Image */}
                    <div className="hidden lg:flex justify-center items-center">
                        <div className="relative w-full max-w-md">
                            <img
                                src={slide.image}
                                alt={slide.title}
                                className="w-full h-64 object-cover rounded-xl shadow-card"
                            />
                            {/* Overlay gradient */}
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/10 to-transparent" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Arrows */}
            <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full border border-grey-200 flex items-center justify-center text-grey-600 hover:text-black hover:border-grey-300 transition-all duration-200"
                aria-label="Previous slide"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>
            <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full border border-grey-200 flex items-center justify-center text-grey-600 hover:text-black hover:border-grey-300 transition-all duration-200"
                aria-label="Next slide"
            >
                <ChevronRight className="w-5 h-5" />
            </button>

            {/* Dots Indicator */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`transition-all duration-300 rounded-full ${
                            index === currentSlide
                                ? 'w-8 h-2 bg-alethea-500'
                                : 'w-2 h-2 bg-grey-300 hover:bg-grey-400'
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-grey-200">
                <div 
                    className="h-full bg-alethea-500 transition-all duration-500"
                    style={{ 
                        width: `${((currentSlide + 1) / slides.length) * 100}%`,
                    }}
                />
            </div>
        </div>
    );
}
