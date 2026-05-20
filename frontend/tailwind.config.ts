import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
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
          magenta: "#e879f9",
          amber: "#fbbf24"
        },
        border: {
          subtle: "rgba(255, 255, 255, 0.08)",
          glow: "rgba(34, 211, 238, 0.35)"
        }
      },
      fontFamily: {
        display: ['"Syne"', "system-ui", "sans-serif"],
        sans: ['"DM Sans"', "system-ui", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 24px rgba(34, 211, 238, 0.25)",
        "glow-magenta": "0 0 24px rgba(232, 121, 249, 0.2)",
        panel: "0 8px 32px rgba(0, 0, 0, 0.45)"
      },
      backgroundImage: {
        "grid-dark":
          "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)"
      },
      backgroundSize: {
        grid: "24px 24px"
      }
    }
  },
  plugins: []
};

export default config;
