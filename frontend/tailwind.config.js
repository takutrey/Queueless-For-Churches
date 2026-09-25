/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14161F",
        "ink-soft": "#5A5E72",
        paper: "#F4F5F7",
        "paper-raised": "#FFFFFF",
        signal: "#453DF0",
        "signal-dark": "#342DB8",
        amber: "#FFB238",
        teal: "#1FAE85",
        coral: "#E5533D",
        line: "#E4E5EA",
      },
      fontFamily: {
        sans: ["Manrope", "sans-serif"],
        mono: ["Space Mono", "monospace"],
      },
      animation: {
        flap: "flap 0.42s cubic-bezier(0.4, 0, 0.2, 1)",
        "dot-exit": "dotExit 0.26s ease forwards",
        "pulse-ring": "pulseRing 1.8s ease-out infinite",
      },
      keyframes: {
        flap: {
          "0%": { transform: "rotateX(-100deg)", opacity: "0.25" },
          "55%": { transform: "rotateX(14deg)", opacity: "1" },
          "100%": { transform: "rotateX(0deg)" },
        },
        dotExit: {
          "0%": { opacity: "1", transform: "translateX(0) scale(1)" },
          "100%": { opacity: "0", transform: "translateX(18px) scale(0.7)" },
        },
        pulseRing: {
          "0%": { transform: "scale(1)", opacity: "0.5" },
          "100%": { transform: "scale(2.1)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};
