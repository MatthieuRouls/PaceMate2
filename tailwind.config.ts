import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    // App router
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    // Legacy paths
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Dark High-Performance theme ──────────────────────────
        'pm-bg':          '#050A08',
        'pm-surface-1':   '#0B120F',
        'pm-surface-2':   '#141C18',
        'pm-accent':      '#22C55E',
        'pm-rose':        '#F43F5E',
        'pm-text':        '#F8FAFC',
        'pm-muted':       '#94A3B8',

        // ── Legacy Discovery theme ───────────────────────────────
        'discovery-primary':   '#FDE047',
        'discovery-secondary': '#86EFAC',
        'discovery-bg':        '#FFFFFF',
        'discovery-text':      '#1F2937',

        // ── Legacy Elite theme ───────────────────────────────────
        'elite-primary':   '#7C3AED',
        'elite-accent':    '#A78BFA',
        'elite-bg':        '#111827',
        'elite-text':      '#F9FAFB',
        'elite-secondary': '#1F2937',
      },
      borderRadius: {
        'discovery': '24px',
        'elite':     '4px',
        'pm':        '12px',
      },
      fontFamily: {
        'discovery': ['Poppins', 'sans-serif'],
        'elite':     ['Space Grotesk', 'sans-serif'],
        'sans':      ['Space Grotesk', 'Inter', 'sans-serif'],
        'mono':      ['JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        'pm': '16px',
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.25)',
        'glow-rose':  '0 0 20px rgba(244, 63, 94, 0.25)',
        'card':       '0 1px 24px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'skeleton': 'skeleton-shimmer 1.6s ease-in-out infinite',
      },
      keyframes: {
        'skeleton-shimmer': {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
