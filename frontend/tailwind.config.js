/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#10182a",
        "ink-soft": "#2b3550",
        paper: "#f7f6f2",
        "paper-raised": "#ffffff",
        steel: "#667085",
        line: "#e1dfd8",
        brass: "#9c6b1f",
        "brass-bg": "rgba(156, 107, 31, 0.09)",
        alert: "#b4432e",
        good: "#2f6f5e",
      },
      fontFamily: {
        display: ['"Zilla Slab"', "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
