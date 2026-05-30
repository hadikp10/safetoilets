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
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      colors: {
        background: "#FAFAFA",
        foreground: "#18181B",
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#18181B",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#18181B",
        },
        primary: {
          DEFAULT: "#16C47F",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#F4F4F5",
          foreground: "#52525B",
        },
        muted: {
          DEFAULT: "#F4F4F5",
          foreground: "#A1A1AA",
        },
        accent: {
          DEFAULT: "#F4F4F5",
          foreground: "#18181B",
        },
        destructive: {
          DEFAULT: "#FF6B6B",
          foreground: "#FFFFFF",
        },
        border: "#E4E4E7",
        input: "#F4F4F5",
        ring: "#16C47F",
        brand: {
          green:       '#16C47F',
          greenDark:   '#0EA566',
          greenLight:  '#D4F5E9',
          greenText:   '#0A7A4B',
          yellow:      '#FFD93D',
          yellowLight: '#FFF8D6',
          yellowText:  '#8A6500',
          coral:       '#FF6B6B',
          coralLight:  '#FFE5E5',
          coralText:   '#C0392B',
          purple:      '#A855F7',
          purpleLight: '#F3E8FF',
          purpleText:  '#6B21A8',
        },
        neutral: {
          50:  '#FAFAFA',
          100: '#F4F4F5',
          200: '#E4E4E7',
          400: '#A1A1AA',
          600: '#52525B',
          900: '#18181B',
        }
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0,0,0,0.04)",
        lg: "0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
        button: "0 4px 14px rgba(22,196,127,0.3)",
        fab: "0 4px 16px rgba(22,196,127,0.35)",
        card: "0 2px 8px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
