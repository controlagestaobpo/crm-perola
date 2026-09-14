import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // "Campo & Precisão" — verde-oliva (identidade principal, agro)
        oliva: {
          50: "#f4f5ed",
          100: "#e7e9d6",
          200: "#d0d4b0",
          300: "#b3ba85",
          400: "#949c60",
          500: "#767f45",
          600: "#5c6435",
          700: "#474d2b",
          800: "#3a3f26",
          900: "#313522",
        },
        // trigo/palha — acento secundário (calor, colheita)
        trigo: {
          50: "#fdf8ef",
          100: "#f9edd6",
          200: "#f1d9ab",
          300: "#e6bf78",
          400: "#dba652",
          500: "#cc8a35",
          600: "#b06f2a",
          700: "#8c5624",
          800: "#714623",
          900: "#5e3a20",
        },
      },
    },
  },
  plugins: [],
};
export default config;
