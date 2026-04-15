import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0E1116",
        fog: "#E7E8EA",
        ember: "#FF6A3D",
        cobalt: "#3B82F6",
        haze: "#1B212C",
        slate: "#10141B"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"]
      },
      backgroundImage: {
        "grid-dark": "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)"
      },
      boxShadow: {
        glow: "0 0 40px rgba(255, 106, 61, 0.25)"
      }
    }
  },
  plugins: []
};

export default config;
