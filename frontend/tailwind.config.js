/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#e8f0ef', 100: '#c5d9d6', 200: '#9ec0bc', 300: '#6fa49f', 400: '#4a8c87', 500: '#2a7068', 600: '#1F4D3E', 700: '#17382D', 800: '#0f2620', 900: '#081512' },
        dark: { 900: '#F3F4F6', 800: '#FFFFFF', 700: '#E5E7EB', 600: '#D1D5DB', 500: '#9CA3AF' },
        success: '#10B981', warning: '#F59E0B', danger: '#EF4444', info: '#06B6D4'
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.12)',
        glow: '0 0 20px rgba(31,77,62,0.2)'
      }
    }
  },
  plugins: []
};
