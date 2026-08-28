import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f5ff",
          100: "#e6ebff",
          500: "#3d5afe",
          600: "#2f46e0",
          700: "#2536b0",
          900: "#141c4d",
        },
      },
    },
  },
  plugins: [],
};
export default config;
