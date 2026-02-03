/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'alethea': {
          'dark': '#0a0f1a',
          'darker': '#050810',
          'primary': '#6366f1',       // Indigo/Purple
          'primary-hover': '#4f46e5',
          'secondary': '#22c55e',     // Green
          'teal': '#14b8a6',
          'teal-light': '#2dd4bf',
          'glow': '#818cf8',
          'gray-light': '#94a3b8',
          'gray-medium': '#64748b',
          'border': '#1e293b',
          'card': '#0f172a',
          'card-hover': '#1e293b',
        }
      },
      fontFamily: {
        'epilogue': ['Epilogue', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
      },
      fontSize: {
        'body': ['18px', { lineHeight: '130%' }],
      },
      letterSpacing: {
        'tight-custom': '-0.02em',
      },
      backdropBlur: {
        'sm': '4px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'pulse-slow': 'pulseSlow 4s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(99, 102, 241, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.6)' },
        },
      }
    },
  },
  plugins: [],
}
