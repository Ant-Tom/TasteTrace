import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{vue,ts}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0c0c12",
          raised: "#14141f",
          overlay: "rgba(12, 12, 18, 0.72)"
        },
        accent: {
          cyan: "#22d3ee",
          amber: "#fbbf24"
        },
        border: {
          subtle: "rgba(255, 255, 255, 0.08)"
        }
      },
      fontFamily: {
        // Both faces cover Cyrillic, so the whole Russian UI renders in the brand fonts.
        display: ['"Unbounded"', "system-ui", "sans-serif"],
        sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 24px rgba(34, 211, 238, 0.25)",
        panel: "0 8px 32px rgba(0, 0, 0, 0.45)"
      },
      // Короткие (до 300 мс) анимации только на opacity и transform — их считает видеокарта.
      // В разметке всегда с префиксом motion-safe:, чтобы уважать «Уменьшить движение» в системе.
      keyframes: {
        "card-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "panel-in": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "dialog-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" }
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        pop: {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.3)" },
          "100%": { transform: "scale(1)" }
        }
      },
      animation: {
        "card-in": "card-in 280ms ease-out backwards",
        "panel-in": "panel-in 260ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards",
        "dialog-in": "dialog-in 200ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards",
        "slide-down": "slide-down 220ms ease-out backwards",
        "fade-in": "fade-in 180ms ease-out backwards",
        pop: "pop 320ms ease-out"
      }
    }
  },
  plugins: []
};

export default config;
