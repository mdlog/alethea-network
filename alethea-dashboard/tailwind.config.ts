import type { Config } from 'tailwindcss'

const config: Config = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                alethea: {
                    blue: {
                        50: '#eff6ff',
                        100: '#dbeafe',
                        500: '#3b82f6',
                        600: '#2563eb',
                        700: '#1d4ed8',
                    },
                    amber: {
                        50: '#fffbeb',
                        100: '#fef3c7',
                        500: '#f59e0b',
                        600: '#d97706',
                        700: '#b45309',
                    },
                    purple: {
                        50: '#faf5ff',
                        100: '#f3e8ff',
                        500: '#a855f7',
                        600: '#9333ea',
                        700: '#7e22ce',
                    },
                },
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'bounce-slow': 'bounce 2s infinite',
            },
        },
    },
    plugins: [],
}
export default config
