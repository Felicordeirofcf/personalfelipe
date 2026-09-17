import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17221d',
        lime: {
          50: '#f4fbed',
          100: '#e6f6d6',
          300: '#addb7e',
          500: '#6ab23f',
          600: '#508f2d',
          700: '#3e6e25',
        },
        mint: '#dff4e8',
        sand: '#f3f0e8',
      },
      boxShadow: {
        soft: '0 20px 60px -28px rgba(29, 61, 44, 0.35)',
      },
      fontFamily: {
        sans: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
        display: ['var(--font-sora)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
