import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        name: "RebuildMe MyMoney",
        short_name: "MyMoney",
        description: "Isiklik eelarve, võlad, Todo ja maksekalender.",
        theme_color: "#0b1016",
        background_color: "#0b1016",
        display: "standalone",
        start_url: "/",
        scope: "/",
        lang: "et",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"]
      },
      devOptions: {
        enabled: true
      }
    })
  ]
});
