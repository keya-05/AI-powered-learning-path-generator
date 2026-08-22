/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        mastery: {
          low: "#ef4444",
          mid: "#f59e0b",
          high: "#22c55e",
        },
      },
    },
  },
  plugins: [],
};
