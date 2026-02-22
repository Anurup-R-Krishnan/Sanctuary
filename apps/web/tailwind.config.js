/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Updated Maximalist/Scrapbook Palette
        scrap: {
          cream: '#FDFBF7',  // Pale, buttery cream
          navy: '#2C3A4F',   // Deep slate navy
          sage: '#8B9A8B',   // Muted sage green
          blue: '#5B708A',   // Faded dusty blue
          kraft: '#E5D9C5',  // Faded kraft paper
          ink: '#1A2333',    // Darker ink for emphasis (optional)
        },
        // Keeping semantic tokens for compatibility but remapping them
        light: {
          primary: '#FDFBF7', // scrap-cream
          surface: '#FFFFFF', // pure white (for cards/torn paper)
          accent: '#5B708A',  // scrap-blue
          text: '#2C3A4F',    // scrap-navy
          'text-muted': '#5B708A', // scrap-blue
        },
        dark: {
          // Minimal Dark Mode Support (inverts logic slightly but keeps vibe)
          primary: '#1A2333', // dark-ink
          surface: '#2C3A4F', // scrap-navy
          accent: '#8B9A8B',  // scrap-sage
          text: '#FDFBF7',    // scrap-cream
          'text-muted': '#E5D9C5', // scrap-kraft
        }
      },
      fontFamily: {
        // Updated Fonts
        'scrap-head': ['Fredoka', 'Sniglet', 'cursive'],
        'scrap-body': ['"Courier Prime"', '"Special Elite"', 'monospace'],
        'scrap-accent': ['"Playfair Display"', 'serif'],
        // Remapping existing font tokens
        sans: ['"Courier Prime"', 'monospace'], // Default to typewriter look
        serif: ['"Playfair Display"', 'serif'],
        mono: ['"Courier Prime"', 'monospace'],
        pixel: ['"Press Start 2P"', 'cursive'], // Keep for legacy pixel elements if any
        hand: ['"Indie Flower"', 'cursive'],    // Keep for legacy hand-drawn elements
      },
      backgroundImage: {
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        'scrap-card': '4px 6px 12px rgba(44, 58, 79, 0.15)', // Harsh shadow
        'scrap-deep': '8px 10px 0px rgba(44, 58, 79, 0.1)', // Hard deep shadow
        'scrap-lift': '4px 8px 16px rgba(44, 58, 79, 0.25)', // Lifted state
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'wiggle': 'wiggle 2s ease-in-out infinite',
        'lift': 'lift 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        lift: {
          '0%': { transform: 'translateY(0)', boxShadow: '4px 6px 12px rgba(44, 58, 79, 0.15)' },
          '100%': { transform: 'translateY(-4px) rotate(-1deg)', boxShadow: '6px 12px 20px rgba(44, 58, 79, 0.25)' },
        }
      },
    },
  },
  plugins: [],
}
