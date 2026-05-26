import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      colors: {
        background: "#FFFFFF",
        foreground: "#191919",
        "surface-raised": "#F7F7F5",
        "surface-hover": "#EFEEEB",
        "border-default": "#E9E9E7",
        "border-strong": "#D3D3CF",
        "text-primary": "#191919",
        "text-secondary": "#6B6B6B",
        "text-tertiary": "#999999",
        "text-inverse": "#FFFFFF",
        "brand-green": "#2F9E44",
        "brand-green-hover": "#27822E",
        "brand-green-subtle": "#EBFBEE",
        "brand-green-text": "#1E6E2E",
        "status-yellow": "#E67700",
        "status-yellow-sub": "#FFF4E6",
        "status-yellow-text": "#B85C00",
        "status-red": "#E03131",
        "status-red-sub": "#FFF0F0",
        "status-red-text": "#C21010",
        "data-accent": "#1971C2",

        // Compatibility fallback mappings
        "brand-green-dark": "#27822E",
        "brand-sky": "#1971C2",
        "surface-muted": "#F7F7F5",
        "text-disabled": "#999999",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0,0,0,0.04)",
        lg: "0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
        button: "0 1px 2px rgba(0,0,0,0.06)",
        marker: "0 2px 8px rgba(0,0,0,0.12)",
      },
    },
  },
  plugins: [],
};
export default config;
