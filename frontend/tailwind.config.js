/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          50: '#F4F7F3',
          100: '#E8EFE5',
          200: '#C7D3C0',
          300: '#A4B89A',
          400: '#8FA28A',
          500: '#6D8268',
          600: '#54664F',
          700: '#3D4A39',
          800: '#2D372E',
          900: '#1E251E',
        },
        cream: {
          50: '#FAF9F5',
          100: '#F7F4ED',
          200: '#EFEBE0',
          300: '#E2DED4',
        },
        gold: {
          50: '#FBF7EE',
          100: '#F4E9D0',
          200: '#E7D2A3',
          300: '#DBBA77',
          400: '#C8A96B',
          500: '#B59453',
          600: '#94753A',
          700: '#6E5528',
        }
      },
    },
  },
  plugins: [],
}
