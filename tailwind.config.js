/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./views/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'moni-bg': '#0D1B2A',
        'moni-card': '#1B263B',
        'moni-accent': '#00F5D4',
        'moni-white': '#F8F9FA',
        'moni-gray': '#A0AAB5',
        'moni-danger': '#FF4D4D',
        'moni-success': '#00F5D4',
        'moni-dark': '#050A10',
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        montserrat: ['Montserrat', 'sans-serif'],
      }
    }
  },
  plugins: [],
}
