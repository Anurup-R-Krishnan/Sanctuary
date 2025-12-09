/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./index.html",
    "./{components,hooks,context}/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "light-primary": "#faf8f3",
        "light-secondary": "#ffffff",
        "light-surface": "#fffdf8",
        "light-accent": "#b8956c",
        "light-text": "#2d2a26",
        "light-text-muted": "#7a7368",
        "dark-primary": "#141210",
        "dark-secondary": "#1e1b18",
        "dark-surface": "#242120",
        "dark-accent": "#d4b58b",
        "dark-text": "#f0ece5",
        "dark-text-muted": "#a09a90",
        "light-card": "#f0ede4",
        "dark-card": "#2a2724",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        serif: ["Lora", "serif"],
      },
      boxShadow: {
        "soft-sm": "0 2px 8px -2px rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)",
        "soft-md": "0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)",
        "soft-lg": "0 8px 24px -4px rgba(0, 0, 0, 0.08), 0 4px 8px -4px rgba(0, 0, 0, 0.04)",
        "soft-xl": "0 16px 40px -8px rgba(0, 0, 0, 0.1), 0 8px 16px -8px rgba(0, 0, 0, 0.06)",
        "soft-2xl": "0 24px 56px -12px rgba(0, 0, 0, 0.12), 0 12px 24px -12px rgba(0, 0, 0, 0.08)",
        "dark-soft-sm": "0 2px 8px -2px rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.2)",
        "dark-soft-md": "0 4px 12px -2px rgba(0, 0, 0, 0.35), 0 2px 4px -2px rgba(0, 0, 0, 0.25)",
        "dark-soft-lg": "0 8px 24px -4px rgba(0, 0, 0, 0.4), 0 4px 8px -4px rgba(0, 0, 0, 0.3)",
        "dark-soft-xl": "0 16px 40px -8px rgba(0, 0, 0, 0.5), 0 8px 16px -8px rgba(0, 0, 0, 0.35)",
        "dark-soft-2xl": "0 24px 56px -12px rgba(0, 0, 0, 0.6), 0 12px 24px -12px rgba(0, 0, 0, 0.4)",
        "inner-soft": "inset 0 2px 4px 0 rgba(0, 0, 0, 0.04)",
        "dark-inner-soft": "inset 0 2px 4px 0 rgba(0, 0, 0, 0.2)",
        "glow": "0 0 20px rgba(184, 149, 108, 0.15), 0 0 40px rgba(184, 149, 108, 0.08)",
        "dark-glow": "0 0 20px rgba(212, 181, 139, 0.12), 0 0 40px rgba(212, 181, 139, 0.06)",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
        bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInDown: {
          "0%": { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.4s ease-out forwards",
        fadeInUp: "fadeInUp 0.5s ease-out forwards",
        fadeInDown: "fadeInDown 0.5s ease-out forwards",
        scaleIn: "scaleIn 0.3s ease-out forwards",
        slideInRight: "slideInRight 0.4s ease-out forwards",
        slideInLeft: "slideInLeft 0.4s ease-out forwards",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 2s infinite",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "noise": "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

export default config;
