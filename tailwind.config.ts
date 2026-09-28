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
        primary: {
          DEFAULT: "#F6C945",
          50: "#FFFBEB",
          100: "#FFF9E6",
          200: "#FEF3C7",
          300: "#FDE68A",
          400: "#F6C945",
          500: "#EAB308",
          600: "#CA8A04",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#FFF9E6",
        },
        ink: {
          DEFAULT: "#18181B",
          secondary: "#71717A",
          muted: "#A1A1AA",
        },
        border: {
          DEFAULT: "#E5E7EB",
          light: "#F4F4F5",
        },
        success: "#22C55E",
        error: "#EF4444",
        warning: "#F59E0B",
      },
      boxShadow: {
        soft: "0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        card: "0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
        elevated: "0 10px 15px -3px rgb(0 0 0 / 0.06), 0 4px 6px -4px rgb(0 0 0 / 0.04)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
