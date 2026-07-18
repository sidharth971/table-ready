/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        restaurant: {
          bg: '#0F0F13',
          card: '#181820',
          accent: '#FF7D3C',
          accentHover: '#E06527',
          textMuted: '#9CA3AF'
        }
      }
    },
  },
  plugins: [],
}
