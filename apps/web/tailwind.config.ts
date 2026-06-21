import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Cores da empresa, injetadas via CSS vars (branding).
        brand: {
          DEFAULT: 'var(--brand, #2563eb)',
          dark: 'var(--brand-dark, #1e293b)',
          foreground: 'var(--brand-foreground, #ffffff)',
        },
        // Tokens semânticos (estilo SaaS clean e claro).
        background: 'var(--background)',
        surface: {
          DEFAULT: 'var(--surface)',
          muted: 'var(--surface-muted)',
        },
        foreground: 'var(--foreground)',
        muted: 'var(--muted-foreground)',
        line: 'var(--border)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        info: 'var(--info)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.25rem',
        '3xl': '1.6rem',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.05)',
        'card-hover': '0 10px 24px -6px rgb(15 23 42 / 0.12), 0 4px 10px -4px rgb(15 23 42 / 0.06)',
        soft: '0 1px 3px rgb(15 23 42 / 0.06)',
        glow: '0 0 0 4px color-mix(in srgb, var(--brand) 16%, transparent)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'pop-in': 'pop-in 0.18s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
