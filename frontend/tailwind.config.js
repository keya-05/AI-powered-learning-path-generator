import defaultTheme from "tailwindcss/defaultTheme";

// `slate` (neutrals) and `indigo` (accent) are re-pointed at CSS variables so the
// whole app re-themes per role: lavender for students, sage for instructors.
// The scales themselves live in src/index.css.
const scale = (name) =>
  Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((step) => [
      step,
      `rgb(var(--${name}-${step}) / <alpha-value>)`,
    ])
  );

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", ...defaultTheme.fontFamily.sans],
        display: ["var(--font-display)", ...defaultTheme.fontFamily.sans],
      },
      colors: {
        slate: scale("slate"),
        indigo: scale("indigo"),
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        panel: "rgb(var(--panel) / <alpha-value>)",
        raised: "rgb(var(--raised) / <alpha-value>)",
        pop: "rgb(var(--pop) / <alpha-value>)",
        duo: {
          DEFAULT: "rgb(var(--duo) / <alpha-value>)",
          soft: "rgb(var(--duo-soft) / <alpha-value>)",
        },
        mastery: {
          low: "#f43f5e",
          mid: "#f59e0b",
          high: "#10b981",
        },
      },
      boxShadow: {
        card: "0 1px 0 0 rgb(255 255 255 / 0.5) inset, 0 10px 30px -18px rgb(var(--slate-900) / 0.35)",
        tile: "0 1px 0 0 rgb(255 255 255 / 0.6) inset, 0 6px 14px -8px rgb(var(--slate-900) / 0.45)",
        well: "inset 0 2px 4px 0 rgb(var(--slate-900) / 0.08)",
      },
      borderRadius: {
        panel: "28px",
      },
    },
  },
  plugins: [],
};
