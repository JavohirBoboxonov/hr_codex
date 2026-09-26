/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class', // <-- shu yerga ko‘chadi
    content: [
      "./index.html",
      "./App.tsx",
      "./index.tsx",
      "./components/**/*.{js,ts,jsx,tsx}",
      "./views/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        fontFamily: {
          sans: ['Inter', 'sans-serif'], // <-- bu ham shu yerda
        },
      },
    },
    plugins: [],
  }
  