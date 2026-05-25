import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dbs: {
          red: {
            50: "#fef2f2",
            100: "#fee2e2",
            200: "#fecaca",
            300: "#fca5a5",
            400: "#f87171",
            500: "#ed1c24",
            600: "#d91920",
            700: "#b91c1c",
            800: "#991b1b",
            900: "#7f1d1d",
            DEFAULT: "#ed1c24",
          },
          "dark-blue": {
            50: "#eff1f5",
            100: "#d0d5e1",
            200: "#a1abC3",
            300: "#7281a5",
            400: "#435787",
            500: "#003d6a",
            600: "#003158",
            700: "#002546",
            800: "#001a34",
            900: "#000e22",
            DEFAULT: "#003d6a",
          },
        },
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
        "26": "6.5rem",
        "30": "7.5rem",
        "34": "8.5rem",
        "38": "9.5rem",
        "42": "10.5rem",
        "46": "11.5rem",
        "50": "12.5rem",
        "54": "13.5rem",
        "58": "14.5rem",
        "62": "15.5rem",
        "66": "16.5rem",
        "70": "17.5rem",
        "74": "18.5rem",
        "78": "19.5rem",
        "82": "20.5rem",
        "86": "21.5rem",
        "90": "22.5rem",
        "94": "23.5rem",
        "98": "24.5rem",
        "100": "25rem",
        "120": "30rem",
        "140": "35rem",
        "160": "40rem",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        card: "0 2px 8px 0 rgba(0, 0, 0, 0.08)",
        "card-hover": "0 4px 16px 0 rgba(0, 0, 0, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;