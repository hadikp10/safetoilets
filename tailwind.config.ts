import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "brand-green": "#16A34A",
        "brand-green-dark": "#15803D",
        "brand-sky": "#0EA5E9",
        "surface-muted": "#F5F5F4",
        "text-secondary": "#78716C",
        "text-disabled": "#A8A29E",
        "text-primary": "#1C1917",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        sheet: "0 -4px 24px rgba(0,0,0,0.08), 0 -1px 4px rgba(0,0,0,0.04)",
        button: "0 1px 2px rgba(0,0,0,0.08)",
        marker: "0 2px 8px rgba(0,0,0,0.20)",
        float: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
