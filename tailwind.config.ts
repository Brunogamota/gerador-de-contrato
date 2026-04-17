import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ─── Reborn dark neutrals ──────────────────────────────
        ink: {
          950: '#161419',
          900: '#201d24',
          800: '#2d2933',
          700: '#3d3944',
          600: '#524e5a',
          500: '#6e6a78',
          400: '#928e9c',
          300: '#b8b4c0',
          200: '#dbd9e0',
          100: '#ededf7',
          50:  '#f7f7fb',
        },
        // ─── Reborn brand pink ─────────────────────────────────
        brand: {
          deep:    '#771339',
          DEFAULT: '#f72662',
          500:     '#f72662',
          400:     '#f94d7a',
          300:     '#ff73a2',
          200:     '#ffaac6',
          100:     '#ffd6e6',
          50:      '#fff0f5',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        serif: ['Georgia', 'Times New Roman', 'serif'],
      },
      boxShadow: {
        card:    '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-md':'0 4px 12px 0 rgb(0 0 0 / 0.08)',
        glow:    '0 0 20px 0 rgb(247 38 98 / 0.25)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #f72662 0%, #771339 100%)',
        'dark-gradient':  'linear-gradient(135deg, #201d24 0%, #161419 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
