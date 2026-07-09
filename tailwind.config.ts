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
        // Semantic tokens (driven by CSS vars — dark theme)
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        card: "hsl(var(--card))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "#ffffff",
        },
        // Brand palette
        brand: {
          blue: "#0469ff",
          purple: "#7000ff",
          washed: "#b5b2ff",
          washedBlue: "#6889ff",
          dark: "#030014",
        },
        ink: "#0b0b12",
      },
      opacity: {
        12: "0.12",
        15: "0.15",
      },
      boxShadow: {
        xs:   "0 1px 2px rgba(0,0,0,0.3)",
        card: "0 1px 2px rgba(0,0,0,0.3), 0 8px 24px -12px rgba(0,0,0,0.5)",
        soft: "0 8px 40px -16px rgba(99,102,241,0.35)",
        ad:   "0 24px 60px -24px rgba(0,0,0,0.7)",
        glow: "0 10px 40px -10px rgba(99,102,241,0.6)",
        notif: "0 0 0 1px rgba(255,255,255,0.06), 0 12px 32px -12px rgba(0,0,0,0.7)",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%":     { transform: "translateY(-12px)" },
        },
        blob: {
          "0%,100%": { transform: "translate(0,0) scale(1)" },
          "33%":     { transform: "translate(24px,-32px) scale(1.1)" },
          "66%":     { transform: "translate(-20px,18px) scale(0.94)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.6s cubic-bezier(0.21,1.02,0.73,1) both",
        marquee: "marquee 36s linear infinite",
        float: "float 6s ease-in-out infinite",
        blob: "blob 16s ease-in-out infinite",
        shimmer: "shimmer 2.2s ease-in-out infinite",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.34,1.56,0.64,1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
