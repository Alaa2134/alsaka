import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { cairo: ["Cairo", "sans-serif"] },
    },
  },
} satisfies Config;
