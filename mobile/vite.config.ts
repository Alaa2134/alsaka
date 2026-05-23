import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: { port: 5176, host: true },
  build: { outDir: "dist", emptyOutDir: true },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Horus Mobile",
        short_name: "Horus",
        description: "كاشير محمول لـ Horus System",
        theme_color: "#3b82f6",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [],
      },
    }),
  ],
});
