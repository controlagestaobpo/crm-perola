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
          950: "#1c1e13",
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
        // Redesign visual (branch redesign-visual) — paleta exata do briefing.
        // Nomes próprios (não é uma escala 50-900) pra não colidir com oliva/trigo
        // e não arriscar mudar nada que já está no ar.
        perola: {
          verde: "#1E2A18",
          "verde-medio": "#7FB52A",
          lima: "#A6E23A",
          "lima-texto": "#D6F28A",
          bg: "#F5F4EE",
          borda: "#E5E3D9",
          texto: "#1B2216",
          "texto-2": "#6D7365",
          divisor: "#EDEBE3",
          erro: "#C4452C",
          "erro-bg": "#FBEAE5",
          alerta: "#B8751A",
          tag: "#F1EFE7",
          "tag-pos-bg": "#EEF3E2",
          "tag-pos-texto": "#3F5A1E",
          item: "#C4CCBA",
        },
      },
    },
  },
  plugins: [],
};
export default config;
