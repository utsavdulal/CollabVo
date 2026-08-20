/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        dark: {
          bg: '#0c0e17',
          surface: '#161926',
          card: '#1a1d2d',
          cardHover: '#212538',
          border: '#262a3e',
          borderLight: '#323752',
          muted: '#8e95af',
          subtext: '#686f8a'
        },
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#6d28d9',
          700: '#5b21b6',
          DEFAULT: '#6366f1',
          accent: '#6366f1',
          hover: '#4f46e5'
        }
      }
    }
  },
  plugins: []
};
