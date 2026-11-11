/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', '"Plus Jakarta Sans"', '"Noto Serif Ethiopic"', 'system-ui', 'sans-serif'],
        ethiopic: ['"Noto Serif Ethiopic"', '"Plus Jakarta Sans"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', '"Noto Serif Ethiopic"', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22'
        },
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706'
        },
        surface: {
          light: '#f8fafc',
          dark: '#070b12',
          cardDark: '#101724'
        }
      },
      boxShadow: {
        'glass-light': '0 10px 40px -12px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.04)',
        'glass-dark': '0 20px 50px -15px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }
    }
  },
  plugins: []
};
