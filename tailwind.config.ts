import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["InterVariable", "Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "monospace"],
      },
      colors: {
        // Context.dev indigo/blue
        brand: {
          50:  "#eef1ff",
          100: "#e0e5ff",
          200: "#c6ccff",
          300: "#a3aaff",
          400: "#7c82fb",
          500: "#5b5bf0",
          600: "#4b46e5",
          700: "#3d37c9",
          800: "#332fa1",
          900: "#2c2b7f",
          950: "#1a184a",
        },
        // light indigo band background
        band: "#eef0fc",
        ink: "#0b0b12",
      },
      boxShadow: {
        xs:   "0 1px 2px rgba(10,10,18,0.04)",
        card: "0 1px 2px rgba(10,10,18,0.04), 0 1px 3px rgba(10,10,18,0.06)",
        soft: "0 4px 24px -12px rgba(20,20,50,0.12)",
        ad:   "0 20px 50px -24px rgba(30,27,75,0.55)",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.4s ease forwards",
      },
    },
  },
  plugins: [],
} satisfies Config;
