import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#16A34A",
          greenLight: "#DCFCE7",
          yellow: "#D97706",
          yellowLight: "#FEF9C3",
          red: "#DC2626",
          redLight: "#FEE2E2",
          sky: "#0EA5E9",
        },
        surface: {
          bg: "#FAFAF9",
          card: "#FFFFFF",
          border: "#E7E5E4",
          muted: "#F5F5F4",
        },
        text: {
          primary: "#1C1917",
          secondary: "#78716C",
          disabled: "#A8A29E",
          inverse: "#FFFFFF",
        },
        dark: {
          bg: "#1C1917",
          card: "#292524",
          border: "#3D3835",
          muted: "#44403C",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
      fontSize: {
        xs: ["12px", { lineHeight: "1.25" }],
        sm: ["14px", { lineHeight: "1.625" }],
        base: ["16px", { lineHeight: "1.5" }],
        lg: ["18px", { lineHeight: "1.375" }],
        "2xl": ["24px", { lineHeight: "1.25" }],
      },
    },
  },
  plugins: [],
};
export default config;
