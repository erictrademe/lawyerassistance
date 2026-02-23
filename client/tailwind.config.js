/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a365d',
          50: '#e8f0fe',
          100: '#d0e1fc',
          200: '#a9c5f6',
          300: '#7da3ef',
          400: '#5b85e8',
          500: '#3d6ad6',
          600: '#2d54b0',
          700: '#23428a',
          800: '#1a365d',
          900: '#0f2240'
        },
        accent: {
          DEFAULT: '#3182ce',
          light: '#4299e1',
          dark: '#2b6cb0'
        },
        background: '#f0f4f8',
        card: '#FFFFFF',
        status: {
          gray: '#718096',
          red: '#e53e3e',
          green: '#38a169'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif']
      }
    },
  },
  plugins: [],
}
