/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Slate/ink base with a signal-teal accent -- built for a
        // dense operational dashboard, not a marketing page.
        ink: {
          950: '#0B1220',
          900: '#101A2C',
          800: '#16223A',
          700: '#1E2D4A',
          600: '#2A3D5F',
          500: '#3E5578',
        },
        mist: {
          100: '#F5F7FA',
          200: '#E7ECF3',
          300: '#D3DCE8',
          400: '#A9B7CC',
        },
        signal: {
          DEFAULT: '#1FB6A6',
          dark: '#158C80',
          light: '#5FDCCE',
        },
        amber: {
          DEFAULT: '#E8A33D',
        },
        danger: {
          DEFAULT: '#E15B5B',
        },
      },
      fontFamily: {
        display: ['"Sora"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(11,18,32,0.06), 0 8px 24px -12px rgba(11,18,32,0.18)',
      },
    },
  },
  plugins: [],
};
