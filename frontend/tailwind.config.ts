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
        display: ['"Syne"', "system-ui", "sans-serif"],
        sans: ['"DM Sans"', "system-ui", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 24px rgba(34, 211, 238, 0.25)",
        panel: "0 8px 32px rgba(0, 0, 0, 0.45)"
      }
    }
  },
  plugins: []
};

export default config;
