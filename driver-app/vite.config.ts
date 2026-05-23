import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: { port: 5181, host: true },
  build: { outDir: "dist", emptyOutDir: true },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Horus Driver",
        short_name: "Horus Driver",
        description: "تطبيق سائق التوصيل",
        theme_color: "#0891b2",
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
