import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F172A",
        slate: "#1E293B",
        mist: "#E2E8F0",
        critical: "#DC2626",
        high: "#EA580C",
        medium: "#CA8A04",
        low: "#2563EB",
        success: "#059669",
      },
    },
  },
  plugins: [],
} satisfies Config;

