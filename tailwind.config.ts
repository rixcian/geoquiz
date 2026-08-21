import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      screens: {
        // Narrow phones drop the densest chrome rather than wrapping it.
        xs: "420px",
      },
      fontFamily: {
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-body)", "ui-sans-serif", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        // Concrete values live in globals.css so light/dark swap in one place.
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        raised: "rgb(var(--raised) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        faint: "rgb(var(--faint) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-deep": "rgb(var(--accent-deep) / <alpha-value>)",
        "accent-ink": "rgb(var(--accent-ink) / <alpha-value>)",
        brand: "rgb(var(--brand) / <alpha-value>)",
        "brand-deep": "rgb(var(--brand-deep) / <alpha-value>)",
        good: "rgb(var(--good) / <alpha-value>)",
        bad: "rgb(var(--bad) / <alpha-value>)",
        gold: "rgb(var(--gold) / <alpha-value>)",
        info: "rgb(var(--info) / <alpha-value>)",
        "info-deep": "rgb(var(--info-deep) / <alpha-value>)",
        // Per-category tint, set by the component as an inline custom property.
        tint: "hsl(var(--tint-h) var(--tint-s) var(--tint-l) / <alpha-value>)",
      },
      borderRadius: {
        "4xl": "1.75rem",
      },
      animation: {
        rise: "rise 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "pop-in": "pop-in 320ms cubic-bezier(0.2, 0.9, 0.25, 1) both",
        "score-pop": "score-pop 320ms cubic-bezier(0.3, 1.4, 0.5, 1)",
        sweep: "sweep 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
