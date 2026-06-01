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
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        brand: {
          green: "#22C55E",
          greenDark: "#15803D",
          greenLight: "#DCFCE7",
          yellow: "#FBBF24",
          yellowLight: "#FEF3C7",
          red: "#DC2626",
          redLight: "#FEE2E2",
          sky: "#0EA5E9",
        },
        surface: {
          bg: "#FAFAF7",
          card: "#FFFFFF",
          border: "#E5E7EB",
          muted: "#F3F4F6",
        },
        text: {
          primary: "#111827",
          secondary: "#6B7280",
          disabled: "#9CA3AF",
          inverse: "#FFFFFF",
        },
        dark: {
          bg: "#111827",
          card: "#1F2937",
          border: "#374151",
          muted: "#4B5563",
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
