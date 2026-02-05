/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    safelist: [
        // Hero slider gradient colors
        'from-teal-500', 'via-teal-600', 'to-emerald-700',
        'from-amber-500', 'via-orange-500', 'to-red-500',
        'from-violet-500', 'via-purple-600', 'to-indigo-700',
        'bg-gradient-to-br',
    ],
    theme: {
        screens: {
            'xs': '375px',
            'sm': '640px',
            'md': '768px',
            'lg': '1024px',
            'xl': '1280px',
            '2xl': '1536px',
        },
        container: {
            center: true,
            padding: {
                DEFAULT: '1rem',
                sm: '1.5rem',
                lg: '2rem',
            },
            screens: {
                sm: '640px',
                md: '768px',
                lg: '1024px',
                xl: '1280px',
            },
        },
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                // Light theme - UMA inspired grayscale
                white: '#ffffff',
                black: '#272429',  // Slight warm tint like UMA
                grey: {
                    50: '#f5f5f5',   // Card backgrounds
                    100: '#f0f0f0',  // Borders, dividers
                    200: '#e5e5e5',  // Hover states
                    300: '#d4d4d4',  // Subtle elements
                    500: '#d6d6d6',  // Secondary borders
                    600: '#888888',  // Muted text
                    700: '#6b6b6b',  // Secondary text
                    800: '#575757',  // Strong secondary text
                    900: '#3d3d3d',  // Dark text
                },
                // Alethea brand accent (teal) - single accent color
                alethea: {
                    50: '#f0fdfa',
                    100: '#ccfbf1',
                    200: '#99f6e4',
                    300: '#5eead4',
                    400: '#2dd4bf',
                    500: '#14b8a6',  // Primary accent
                    600: '#0d9488',  // Hover
                    700: '#0f766e',  // Active
                    800: '#115e59',
                    900: '#134e4a',
                },
                // Status colors - minimal
                success: '#22c55e',
                warning: '#f59e0b',
                error: '#ef4444',
            },
            boxShadow: {
                // Subtle shadows for light theme
                'card': '0 1px 3px rgba(0, 0, 0, 0.05)',
                'card-hover': '0 4px 12px rgba(0, 0, 0, 0.08)',
                'button': '0 1px 2px rgba(0, 0, 0, 0.05)',
            },
            animation: {
                'fade-in': 'fade-in 0.3s ease-out',
                'slide-up': 'slide-up 0.3s ease-out',
                'slide-down': 'slide-down 0.2s ease-out',
                'scale-in': 'scale-in 0.2s ease-out',
            },
            keyframes: {
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                'slide-up': {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'slide-down': {
                    '0%': { opacity: '0', transform: 'translateY(-10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'scale-in': {
                    '0%': { opacity: '0', transform: 'scale(0.98)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
            },
            borderRadius: {
                'xl': '0.75rem',
                '2xl': '1rem',
            },
        },
    },
    plugins: [],
}
