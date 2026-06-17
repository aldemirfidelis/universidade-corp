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
          dark: 'var(--brand-dark, #0f172a)',
        },
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
