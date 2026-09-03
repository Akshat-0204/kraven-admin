import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Open Sans"', '"Valley Sans"', '"Alien Block"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SFMono-Regular"', 'Consolas', 'monospace'],
        open: ['"Open Sans"', 'sans-serif'],
        valley: ['"Valley Sans"', 'sans-serif'],
        alien: ['"Alien Block"', 'sans-serif']
      },
      colors: {
        background: '#030303',
        foreground: '#f8f8f8',
        border: '#262626',
        muted: '#a3a3a3',
        panel: '#0f0f0f'
      },
      borderRadius: {
        DEFAULT: '6px'
      }
    }
  },
  plugins: []
};

export default config;
