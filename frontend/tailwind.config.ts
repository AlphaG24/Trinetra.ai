import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                trinetra: {
                    /* Backgrounds */
                    bg:          '#080010',
                    'bg-primary':'#0C0118',
                    'bg-secondary':'#130224',
                    'bg-tertiary':'#1A0530',
                    surface:     '#10021E',

                    /* Violet spectrum */
                    accent:      '#8B5CF6',
                    glow:        '#7C3AED',

                    /* Text */
                    text:        '#F5F3FF',
                    muted:       '#A8A0C0',
                    subtle:      '#6B6088',
                },
                violet: {
                    300: '#C4B5FD',
                    400: '#A78BFA',
                    500: '#8B5CF6',
                    600: '#7C3AED',
                    700: '#6D28D9',
                },
                gold: {
                    300: '#FDE68A',
                    400: '#FBBF24',
                    500: '#F59E0B',
                    600: '#D97706',
                },
                cyan: {
                    400: '#22D3EE',
                    500: '#06B6D4',
                },
                border: {
                    subtle: '#1E0A35',
                    medium: '#2D1255',
                    active: '#8B5CF6',
                },
            },
            fontFamily: {
                sans:    ['var(--font-merriweather)', 'Merriweather', 'serif'],
                display: ['var(--font-playfair)', 'Playfair Display', 'serif'],
                heading: ['var(--font-playfair)', 'Playfair Display', 'serif'],
                montserrat: ['var(--font-montserrat)', 'Montserrat', 'sans-serif'],
                mono:    ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'monospace'],
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
        },
    },
    plugins: [],
};
export default config;
