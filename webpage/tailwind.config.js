/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0B0B0A',
          800: '#141412',
          700: '#1C1C19',
          600: '#252521',
          500: '#2E2E29',
        },
        sand: {
          50: '#F8F7F3',
          100: '#F0EDE4',
          200: '#E6E1D4',
          300: '#D8D1BE',
          400: '#C2B79F',
        },
        gold: {
          500: '#8B6A0F',
          600: '#73570C',
          700: '#5A4208',
        },
        slate: {
          300: '#CBD5E1',
          500: '#64748B',
          700: '#334155',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 12px 35px -15px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
};
