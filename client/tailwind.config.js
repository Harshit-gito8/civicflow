/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ops: {
          bg: '#080D17',
          sidebar: '#0C1321',
          surface: '#111B2B',
          elevated: '#162235',
          border: '#243247',
          blue: '#3B82F6',
          cyan: '#22D3EE',
          text: {
            primary: '#F1F5F9',
            secondary: '#94A3B8',
            muted: '#64748B',
          },
          critical: '#EF4444',
          high: '#F97316',
          medium: '#F59E0B',
          low: '#3B82F6',
          resolved: '#10B981',
          inprogress: '#06B6D4',
          pending: '#A78BFA',
        },
        citizen: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
          text: {
            primary: '#0F172A',
            secondary: '#64748B',
          },
          blue: '#2563EB',
          success: '#16A34A',
          border: '#E2E8F0',
        },
        // Backwards compatibility with previous classes
        canvas: {
          DEFAULT: '#080D17',
          subtle: '#0C1321',
          muted: '#111B2B',
        },
        surface: {
          DEFAULT: '#111B2B',
          card: '#162235',
          hover: '#1a273e',
          border: '#243247',
          highlight: '#2f3c63',
        },
        accent: {
          primary: '#3B82F6',
          primaryHover: '#2563EB',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#EF4444',
          violet: '#A78BFA',
          cyan: '#22D3EE',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'ops-card': '0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.24)',
        'ops-elevated': '0 4px 20px -2px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(36, 50, 71, 0.8)',
        'ops-glow': '0 0 20px -3px rgba(59, 130, 246, 0.25)',
        'citizen-card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'citizen-hover': '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
