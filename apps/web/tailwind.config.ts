import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: { DEFAULT: '#EBE9E3', deep: '#E2DFD7' },
        surface: { DEFAULT: '#FFFFFF', soft: '#F6F5F1' },
        olive: { 900: '#2F4A3A', 700: '#4A6B57', 500: '#6F8F7B', 300: '#A9BFB0', 100: '#E4EDE7' },
        sand: { 200: '#F1E7D3' },
        ink: { 900: '#1C1F21', 700: '#3A3F42', 500: '#7A7F82', 300: '#B4B7B8' },
        success: { bg: '#E3EEE6', fg: '#4A7A5A' },
        danger: { bg: '#F9E1E1', fg: '#C0504D' },
        warning: { bg: '#F7EBCB', fg: '#9A7420' },
        // Compatibility aliases for existing components
        background: '#EBE9E3',
        foreground: '#1C1F21',
        border: 'rgba(120, 110, 90, 0.16)',
        muted: '#7A7F82',
        panel: '#FFFFFF'
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['Poppins', 'system-ui', 'sans-serif'],
        sans: ['Poppins', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        xs: '8px',
        sm: '12px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        pill: '999px'
      },
      boxShadow: {
        clay: 'var(--clay-raised)',
        'clay-sm': 'var(--clay-raised-sm)',
        'clay-hover': 'var(--clay-hover)',
        'clay-pressed': 'var(--clay-pressed)',
        'clay-inset': 'var(--clay-inset)',
        'clay-green': 'var(--clay-green)'
      }
    }
  },
  plugins: []
};

export default config;
