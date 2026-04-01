import type { Config } from 'tailwindcss';

const config: Config = {
    content: ['./src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                primary: '#0284c7',
                'primary-dark': '#0369a1',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            animation: {
                'scan-line': 'scan-line 2s ease-in-out infinite',
            },
            keyframes: {
                'scan-line': {
                    '0%, 100%': { top: '8px' },
                    '50%': { top: 'calc(100% - 8px)' },
                },
            },
        },
    },
    plugins: [],
};

export default config;
