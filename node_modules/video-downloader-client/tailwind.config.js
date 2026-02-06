/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2563eb",
          foreground: "#f9fafb"
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f3f4f6"
        }
      }
    }
  },
  plugins: []
};
