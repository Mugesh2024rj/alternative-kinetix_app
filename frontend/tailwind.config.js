/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' },
        dark: { 900: '#0f172a', 800: '#1e293b', 700: '#334155', 600: '#475569', 500: '#64748b' },
        success: '#10b981', warning: '#f59e0b', danger: '#ef4444', info: '#06b6d4'
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 1px 3px 0 rgba(0,0,0,0.4), 0 1px 2px -1px rgba(0,0,0,0.4)', glow: '0 0 20px rgba(59,130,246,0.3)' }
    }
  },
  plugins: []
};
