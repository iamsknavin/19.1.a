import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0f",
        surface: "#111118",
        "surface-2": "#1a1a24",
        accent: "#e8c547",
        "accent-dim": "#b8982e",
        danger: "#e53e3e",
        "danger-dim": "#9b2c2c",
        warning: "#ed8936",
        safe: "#38a169",
        "safe-dim": "#276749",
        border: "#2a2a3a",
        text: {
          primary: "#f0ede6",
          secondary: "#8a8a9a",
          muted: "#555566",
        },
      },
      fontFamily: {
        mono: ["var(--font-ibm-plex-mono)", "monospace"],
        sans: ["var(--font-ibm-plex-sans)", "sans-serif"],
      },
      fontSize: {
        "2xs": "0.65rem",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "slide-out-right": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "fade-up": "fade-up 0.4s ease-out both",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-out-right": "slide-out-right 0.3s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
