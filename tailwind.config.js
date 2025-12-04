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
        "light-primary": "#f9f7f0",
        "light-secondary": "#ffffff",
        "light-surface": "#fffcf5",
        "light-accent": "#c7a77b",
        "light-text": "#3a352f",
        "light-text-muted": "#8a8175",
        "dark-primary": "#1c1815",
        "dark-secondary": "#26221e",
        "dark-surface": "#26221e",
        "dark-accent": "#d4b58b",
        "dark-text": "#e0dcd5",
        "dark-text-muted": "#9a9184",
        "light-card": "#edeae1",
        "dark-card": "#302b26",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        serif: ["Lora", "serif"],
      },
      boxShadow: {
        "soft-md":
          "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
        "soft-lg":
          "0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)",
        "soft-xl":
          "0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)",
        "dark-soft-md":
          "0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.15)",
        "dark-soft-lg":
          "0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.15)",
        "dark-soft-xl":
          "0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
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
      },
      animation: {
        fadeIn: "fadeIn 0.3s ease-out forwards",
        fadeInUp: "fadeInUp 0.5s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
