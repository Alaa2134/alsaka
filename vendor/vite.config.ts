import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: {
    port: 5178,
    host: true,
    // Proxy /api to the local Cloudflare Worker so we don't deal with
    // CORS during development. wrangler dev defaults to 8787.
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
  build: { outDir: "dist", emptyOutDir: true },
  plugins: [react()],
});
