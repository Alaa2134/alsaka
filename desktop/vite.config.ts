import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// SystemAlaa Desktop renderer build.
// `base: './'` is critical: Electron loads index.html from file:// in
// production and absolute paths would 404. The web dev server uses the
// default. Output goes to `dist/` which is what electron/main.cjs loads.
export default defineConfig(({ mode }) => ({
  base: mode === "electron" || mode === "production" ? "./" : "/",
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "chrome120",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-charts": ["recharts"],
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
  plugins: [react()],
}));
