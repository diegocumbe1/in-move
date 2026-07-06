import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * IN MOVE — Tailwind theme.
 * Todos los colores apuntan a variables CSS de `globals.css` (fuente única).
 * `<alpha-value>` permite usar opacidad Tailwind: `bg-brand/20`, `text-level-good/70`.
 */
const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1280px' },
    },
    extend: {
      colors: {
        background: 'hsl(var(--background) / <alpha-value>)',
        surface: 'hsl(var(--surface) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',

        // Marca In Move (acento único)
        brand: {
          DEFAULT: 'hsl(var(--brand) / <alpha-value>)',
          strong: 'hsl(var(--brand-strong) / <alpha-value>)',
          soft: 'hsl(var(--brand-soft) / <alpha-value>)',
          foreground: 'hsl(var(--brand-foreground) / <alpha-value>)',
        },

        // Semáforo del centro (estado del indicador)
        level: {
          danger: 'hsl(var(--level-danger) / <alpha-value>)',
          warning: 'hsl(var(--level-warning) / <alpha-value>)',
          good: 'hsl(var(--level-good) / <alpha-value>)',
          elite: 'hsl(var(--level-elite) / <alpha-value>)',
        },

        // Roles shadcn/ui
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
        chart: {
          5: 'hsl(var(--chart-5) / <alpha-value>)',
          6: 'hsl(var(--chart-6) / <alpha-value>)',
        },
      },

      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius)',
        glass: 'var(--radius-glass)',
      },

      boxShadow: {
        sm: 'var(--shadow-sm)',
        card: 'var(--shadow-card)',
        float: 'var(--shadow-float)',
        glass: 'var(--shadow-float)', // alias
        brand: 'var(--shadow-brand)',
      },

      backdropBlur: {
        glass: 'var(--blur-glass)',
        strong: 'var(--blur-strong)',
      },

      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },

      transitionTimingFunction: {
        premium: 'var(--ease-premium)',
      },
      transitionDuration: {
        fast: '120ms',
        base: '200ms',
        slow: '320ms',
      },

      spacing: {
        touch: '3rem', // objetivo táctil mínimo
        header: '4.5rem',
        'bottom-nav': '4.75rem',
      },
      maxWidth: {
        content: '80rem',
      },

      keyframes: {
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 hsl(var(--brand) / 0.35)' },
          '70%': { boxShadow: '0 0 0 12px hsl(var(--brand) / 0)' },
          '100%': { boxShadow: '0 0 0 0 hsl(var(--brand) / 0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up var(--motion-slow) var(--ease-premium) both',
        'pulse-ring': 'pulse-ring 2s var(--ease-premium) infinite',
      },
    },
  },
  plugins: [animate],
};

export default config;
