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
        trust: {
          900: '#112947',
          800: '#16365D',
          700: '#1F4B80',
          500: '#2C6CB7',
          300: '#7DA4D6',
        },
        mint: {
          600: '#0E8D87',
          500: '#14B8A6',
          100: '#CCFBF1',
        },
        cloud: {
          50: '#F8FBFF',
          100: '#F1F6FC',
          200: '#E2ECF7',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'],
      },
      boxShadow: {
        card: '0 20px 44px -30px rgba(15, 35, 65, 0.4)',
        soft: '0 14px 34px -24px rgba(20, 47, 86, 0.32)',
      },
    },
  },
  plugins: [],
};
