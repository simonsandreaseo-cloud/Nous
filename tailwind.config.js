export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Manrope', 'sans-serif'],
                mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
            },
            colors: {
                brand: {
                    white: '#FFFFFF',
                    soft: '#F4F0E4',
                    accent: '#B0E0E6',
                    power: '#1C1C1C',
                }
            },
        },
    },
    plugins: [],
}
