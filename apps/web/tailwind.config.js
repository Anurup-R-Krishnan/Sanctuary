/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Satoshi', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Crimson Pro', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
      },
      colors: {
        // Light theme colors
        light: {
          primary: '#FEFCF8', // warm off-white, not clinical pure white
          secondary: '#FAF6F0', // warm paper tone
          surface: '#F3ECE1', // deeper warm surface (was flat zinc grey)
          card: '#FEFCF8',
          accent: '#A67E50', // antique gold
          text: '#09090B', // zinc-950
          'text-muted': '#71717A', // zinc-500
          border: '#E7DCC9', // warm border, replaces cold zinc-200
          'border-muted': '#F3ECE1',
        },
        // Dark theme colors
        dark: {
          primary: '#0F0E0D', // warm near-black, not pure zinc
          secondary: '#1C1916', // warm dark surface
          surface: '#28221C', // deeper warm brown-black surface
          card: '#1C1916',
          accent: '#C8A06A', // parchment gold
          text: '#FAFAFA', // zinc-50
          'text-muted': '#A1A1AA', // zinc-400
          border: '#332B22', // warm dark border
          'border-muted': '#1C1916',
        },
        // Tonal scale built from the antique gold hue (32deg) via HSL —
        // lighter tints for subtle fills/badges, darker shades for
        // depth/hover/emphasis without resorting to flat black or grey.
        gold: {
          50: '#F7F3EE',
          100: '#EBE1D6',
          200: '#DAC8B3',
          300: '#CAB091',
          400: '#B9976F',
          500: '#A67E50', // = light.accent
          600: '#906E46',
          700: '#755938',
          800: '#59442B',
          900: '#3E2F1E',
        },
        // Muted slate-blue, the near-complement (~212deg) of the gold hue —
        // a cool counterpoint used sparingly for secondary accents, info
        // states, and to keep all-gold pages from feeling one-note.
        // Named "ink" (not "slate") to avoid overriding Tailwind's built-in scale.
        ink: {
          50: '#F3F5F7',
          100: '#E0E5EB',
          300: '#B3BECC',
          400: '#8597AD',
          500: '#5C718A',
          600: '#47586B',
          700: '#394656',
          900: '#1F262E',
        },
        // Warm rust/terracotta, analogous to gold (~2deg) — a second warm
        // accent for variety in badges/highlights without leaving the
        // warm family.
        rust: {
          300: '#D89A97',
          400: '#CA7672',
          500: '#BC524E',
          600: '#9B3F3B',
          700: '#7E3330',
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
        // Design-system spacing scale (space.1..space.8), prefixed to avoid
        // colliding with Tailwind's default 1-8 rem-based scale.
        'ds-1': '4px',
        'ds-2': '8px',
        'ds-3': '12px',
        'ds-4': '16px',
        'ds-5': '18px',
        'ds-6': '20px',
        'ds-7': '22px',
        'ds-8': '22px',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        // Design-system radius scale, prefixed to avoid overriding the default
        // rounded-xs/-sm utilities used across existing components.
        'ds-xs': '2px',
        'ds-sm': '7px',
      },
      transitionDuration: {
        // Design-system motion tokens.
        'instant': '150ms',
        'fast': '160ms',
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '3.25rem' }],
        '6xl': ['3.75rem', { lineHeight: '4rem' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'fade-out': 'fadeOut 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'bounce-gentle': 'bounceGentle 2s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2.5s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s infinite',
        'gradient-shift': 'gradientShift 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%': { transform: 'translateY(-10px) rotate(1deg)' },
          '66%': { transform: 'translateY(-5px) rotate(-1deg)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow-sm': '0 0 20px rgba(166, 126, 80, 0.15), 0 0 40px rgba(166, 126, 80, 0.08)',
        'glow-md': '0 0 32px rgba(166, 126, 80, 0.2), 0 0 64px rgba(166, 126, 80, 0.1)',
        'glow-lg': '0 0 48px rgba(166, 126, 80, 0.25), 0 0 96px rgba(166, 126, 80, 0.12)',
        'inner-glow': 'inset 0 0 20px rgba(166, 126, 80, 0.1)',
        'book-spine': 'inset -8px 0 16px -8px rgba(0, 0, 0, 0.4)',
        'book-cover': '0 8px 32px rgba(166, 126, 80, 0.15), 0 16px 64px rgba(166, 126, 80, 0.08)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.02'/%3E%3C/svg%3E\")",
      },
      scale: {
        '102': '1.02',
        '103': '1.03',
      },
      transitionTimingFunction: {
        'bounce-gentle': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'smooth-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'smooth-out': 'cubic-bezier(0, 0, 0.2, 1)',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  plugins: [
    /** @param {{ addUtilities: (utilities: any) => void }} pluginAPI */
    function ({ addUtilities }) {
      const newUtilities = {
        '.text-balance': {
          'text-wrap': 'balance',
        },
        '.text-pretty': {
          'text-wrap': 'pretty',
        },
        '.scrollbar-none': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
        },
        '.scrollbar-none::-webkit-scrollbar': {
          'display': 'none',
        },
        '.perspective': {
          'perspective': '1200px',
        },
        '.preserve-3d': {
          'transform-style': 'preserve-3d',
        },
        '.backface-hidden': {
          'backface-visibility': 'hidden',
        },
        '.writing-vertical': {
          'writing-mode': 'vertical-rl',
          'text-orientation': 'mixed',
        },
      }
      addUtilities(newUtilities)
    }
  ],
}
