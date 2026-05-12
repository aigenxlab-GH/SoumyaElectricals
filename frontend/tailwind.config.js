/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#1a1f2e',
          darker: '#13172199',
          mid: '#252d3d',
          light: '#f0f4f8',
          accent: '#f59e0b',
          'accent-dark': '#d97706',
        },
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)',
        'card-lg': '0 10px 25px -5px rgba(0,0,0,0.1), 0 4px 10px -5px rgba(0,0,0,0.04)',
        'btn': '0 4px 6px -1px rgba(37,99,235,0.35), 0 2px 4px -1px rgba(37,99,235,0.2)',
        'btn-hover': '0 6px 10px -1px rgba(37,99,235,0.45), 0 3px 6px -1px rgba(37,99,235,0.25)',
        'inset-border': 'inset 0 0 0 1px rgba(255,255,255,0.08)',
      },
    },
  },
  plugins: [],
}
