/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F3D3E',
          light: '#145A5B',
          dark: '#0B2C2D'
        },

        background: '#F5F7F9',
        card: '#FFFFFF',

        text: {
          primary: '#1E293B',
          secondary: '#64748B'
        },

        border: '#E5E7EB',

        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444'
      },

      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.05)'
      },

      borderRadius: {
        xl: '12px',
        '2xl': '16px'
      }
    }
  },
  plugins: []
};