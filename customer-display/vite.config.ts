import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  server: { port: 5175 },
  build: { outDir: "dist", emptyOutDir: true },
  plugins: [react()],
});
