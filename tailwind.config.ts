import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#111217",
        accent: "#D91F2D",
        canvas: "#F2F3F5",
        graphite: "#2E3038",
        silver: "#A7A9B0",
        slate: {
          50: "#F7F7F8",
          100: "#ECEEF1",
          200: "#D9DBE0",
          300: "#C2C5CC",
          400: "#A4A6AD",
          500: "#797C85",
          600: "#5D6068",
          700: "#464952",
          800: "#292B33",
          900: "#17181E",
          950: "#090A0E"
        },
        red: {
          50: "#FFF0F1",
          100: "#FFE0E4",
          200: "#FFC4CA",
          300: "#FF909B",
          400: "#F95665",
          500: "#D91F2D",
          600: "#B91623",
          700: "#96141D",
          800: "#7C1620",
          900: "#661A21",
          950: "#3A070B"
        }
      },
      boxShadow: {
        soft: "0 12px 40px rgba(17, 18, 23, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
