import type { Config } from 'tailwindcss'

const config: Config = {
  // Включаємо всі файли в застосунку та shared UI пакет
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Кольорова палітра LUMARA
      colors: {
        lumara: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f3d0fe',
          300: '#e9a8fd',
          400: '#d870fa',
          500: '#c040f0',
          600: '#a21fce',
          700: '#881aaa',
          800: '#71188a',
          900: '#5d1870',
          950: '#3d0a4e',
        },
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
      },
      // Типографіка
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        display: ['var(--font-playfair)', 'serif'],
      },
      // Анімації для містичного UI
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        glow: 'glow 2s ease-in-out infinite alternate',
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
        glow: {
          '0%': { boxShadow: '0 0 5px #c040f0' },
          '100%': { boxShadow: '0 0 20px #c040f0, 0 0 40px #c040f0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
