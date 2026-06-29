/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0B0F19',
          glass: 'rgba(17, 24, 39, 0.7)',
        }
      }
    },
  },
  plugins: [],
}
