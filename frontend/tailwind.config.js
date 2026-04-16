/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        conuco: {
          light: '#f0fdf4',
          primary: '#22c55e',
          dark: '#14532d',
        }
      }
    },
  },
  plugins: [],
}
