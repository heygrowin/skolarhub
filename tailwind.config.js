/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: '#17254D',
        'deep-navy': '#101A32',
        ivory: '#F2EBDD',
        'muted-gold': '#C69A4B',
        'gold-light': '#DFC184',
        'subtle-grey': '#F4F5F8',
        'success-green': '#23865A',
        navy: {
          50: '#F0F3F9',
          100: '#E1E7F3',
          200: '#C2CFE6',
          300: '#94ABCE',
          400: '#5F82B3',
          500: '#3A6098',
          600: '#28477B',
          700: '#1F3760',
          800: '#17254D', // midnight navy
          900: '#101A32', // deep navy
          950: '#0A0F1D',
        },
        gold: {
          50: '#FAF6EE',
          100: '#F4ECD8',
          200: '#E8D6B0',
          300: '#DABF86',
          400: '#C69A4B', // muted gold
          500: '#B08436',
          600: '#8E6726',
          700: '#6C4D1C',
          800: '#4D3616',
          900: '#2E200C',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        'soft': '0 2px 10px rgba(16, 26, 50, 0.05)',
        'card': '0 4px 20px rgba(16, 26, 50, 0.08)',
        'elevated': '0 10px 30px rgba(16, 26, 50, 0.12)',
        'gold-glow': '0 0 15px rgba(198, 154, 75, 0.3)',
      }
    },
  },
  plugins: [],
}

