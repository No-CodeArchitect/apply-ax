import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#eef2f8",
          100: "#d6e0ee",
          200: "#adc1dd",
          300: "#7f9cc7",
          400: "#5578ad",
          500: "#3a5c91",
          600: "#2c4770",
          700: "#233a5c",
          800: "#1b2c46",
          900: "#0f1c30",
        },
        accent: {
          DEFAULT: "#c8a24a",
          dark: "#a9852f",
        },
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Apple SD Gothic Neo",
          "Malgun Gothic",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
