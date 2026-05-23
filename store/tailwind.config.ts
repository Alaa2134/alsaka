import type { Config } from "tailwindcss";

// The storefront reads the tenant's brand color at runtime and writes it to
// the `--primary` CSS var, so any utility that maps onto it (bg-primary,
// text-primary, etc.) re-skins the whole site without rebuilding.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { cairo: ["Cairo", "sans-serif"] },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        border: "hsl(var(--border))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: "hsl(var(--destructive))",
        success: "hsl(142 76% 36%)",
      },
      borderRadius: { lg: "0.75rem", md: "0.5rem", sm: "0.25rem" },
      boxShadow: {
        soft: "0 2px 12px -2px rgba(0,0,0,0.06), 0 6px 24px -6px rgba(0,0,0,0.08)",
        card: "0 4px 20px -4px rgba(0,0,0,0.1)",
      },
    },
  },
} satisfies Config;
