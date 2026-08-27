/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './lib/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 900: '#0f1f25', 800: '#1a2e35', 700: '#2a434d', 600: '#3e5a66' },
        mist: { 50: '#f8fbfc', 100: '#eef6f7', 200: '#ddeef0' },
        teal: { 600: '#0d9488', 700: '#0f766e', 800: '#115e59' },
        gold: { 500: '#c9a227', 600: '#a67f1a' },
        glass: { border: 'rgba(255,255,255,0.55)', muted: 'rgba(255,255,255,0.6)' }
      },
      boxShadow: {
        glass: '0 8px 32px -8px rgba(15,31,37,0.08), 0 4px 16px -6px rgba(15,31,37,0.06)',
        'glass-lg': '0 16px 48px -12px rgba(15,31,37,0.12), 0 8px 24px -8px rgba(15,31,37,0.08)',
      },
      backdropBlur: { xs: '2px' },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], display: ['Sora', 'system-ui', 'sans-serif'] }
    }
  },
  plugins: []
};
