/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        panel: "#111827",
        panelSoft: "#182235",
        ink: "#f8fafc"
      },
      boxShadow: {
        soft: "0 20px 60px rgba(0, 0, 0, 0.28)"
      }
    }
  },
  plugins: []
};
