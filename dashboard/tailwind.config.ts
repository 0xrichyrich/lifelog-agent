import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // iOS-matching light theme
        background: '#F8FAFB',
        surface: '#FFFFFF',
        'surface-light': '#F1F5F9',
        text: '#1F2937',
        'text-muted': '#6B7280',
        // Primary mint/emerald from iOS
        accent: '#10B981',
        'accent-light': '#D1FAE5',
        'accent-dark': '#059669',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        // Card styling
        card: '#FFFFFF',
        'card-border': '#E5E7EB',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
};

export default config;
