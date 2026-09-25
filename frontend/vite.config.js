import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Keep the service worker up to date automatically instead of
      // requiring a manual "reload" prompt.
      registerType: "autoUpdate",
      // Injects the registration script into index.html for you —
      // no extra code needed in main.tsx.
      injectRegister: "auto",
      // Also run the SW during `vite dev` so you can test installability
      // without doing a full build every time.
      devOptions: {
        enabled: true,
      },
      // Anything in /public that isn't already referenced in your HTML
      // but should still be precached (e.g. favicon).
      includeAssets: ["favicon.ico"],
      manifest: {
        name: "QueueLess",
        short_name: "QueueLess",
        description: "QueueLess",
        // Must match/nest under `base` or the browser won't consider
        // the app installable from this path.
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#0f172a",
        background_color: "#ffffff",
        icons: [
          {
            src: "logo-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "logo.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "logo.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Precache the built assets so the app works offline / installs
        // cleanly.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
    }),
  ],
  build: {
    outDir: "./dist",
    cssCodeSplit: true,
    sourcemap: false,
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return id
              .toString()
              .split("node_modules/")[1]
              .split("/")[0]
              .toString();
          }
        },
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].[hash].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
