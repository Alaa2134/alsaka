import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { cairo: ["Cairo", "sans-serif"] },
      colors: {
        primary: "hsl(221 83% 53%)",
        accent: "hsl(262 83% 58%)",
        success: "hsl(142 76% 36%)",
        warning: "hsl(38 92% 50%)",
        destructive: "hsl(0 84% 60%)",
      },
      boxShadow: {
        card: "0 2px 12px -2px rgba(0,0,0,0.06), 0 6px 24px -6px rgba(0,0,0,0.08)",
      },
    },
  },
} satisfies Config;
