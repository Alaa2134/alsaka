import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: { port: 5180, host: true },
  build: { outDir: "dist", emptyOutDir: true },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Horus Customer",
        short_name: "Horus",
        description: "نقاط، طلبات، دفع QR للمتاجر اللي اشتركتلك فيهم",
        theme_color: "#7c3aed",
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
