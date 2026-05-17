import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: { port: 5177, host: true },
  build: { outDir: "dist", emptyOutDir: true },
  plugins: [react()],
});
