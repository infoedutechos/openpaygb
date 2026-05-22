import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ura: {
          page: "rgb(5 11 20 / <alpha-value>)",
          navy: "rgb(6 15 28 / <alpha-value>)",
          "navy-deep": "rgb(2 8 16 / <alpha-value>)",
          elevated: "rgb(10 22 40 / <alpha-value>)",
          panel: "rgb(15 24 41 / <alpha-value>)",
          "panel-2": "rgb(18 31 53 / <alpha-value>)",
          "panel-3": "rgb(23 38 66 / <alpha-value>)",
          border: "rgb(42 65 104 / <alpha-value>)",
          line: "rgb(36 53 82 / <alpha-value>)",
          gold: "rgb(243 186 47 / <alpha-value>)",
          "gold-deep": "rgb(217 163 30 / <alpha-value>)",
          blue: "rgb(95 168 255 / <alpha-value>)",
          "blue-deep": "rgb(31 63 143 / <alpha-value>)",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.94', transform: 'scale(1.03)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-in',
        'pulse-soft': 'pulse-soft 2.8s ease-in-out infinite',
      }
    },
  },
  plugins: [],
};
export default config;
