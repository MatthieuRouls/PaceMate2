import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Discovery theme (débutants)
        'discovery-primary': '#FDE047',
        'discovery-secondary': '#86EFAC',
        'discovery-bg': '#FFFFFF',
        'discovery-text': '#1F2937',
        
        // Elite theme (experts)
        'elite-primary': '#7C3AED',
        'elite-accent': '#A78BFA',
        'elite-bg': '#111827',
        'elite-text': '#F9FAFB',
        'elite-secondary': '#1F2937',
      },
      borderRadius: {
        'discovery': '24px',
        'elite': '4px',
      },
      fontFamily: {
        'discovery': ['Poppins', 'sans-serif'],
        'elite': ['Space Grotesk', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;