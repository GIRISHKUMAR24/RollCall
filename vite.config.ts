import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// NOTE: basicSsl removed — self-signed HTTPS certs are silently rejected by
// Android Chrome / Gmail browser, causing fetch() to hang forever on mobile.
// Plain HTTP on the local network is sufficient and works on all devices.

// https://vitejs.dev/config/
export default defineConfig({
  root: "client",
  publicDir: "../public",
  envDir: "..",
  server: {
    port: 3000,
    host: true,
    hmr: {
      overlay: false, // Prevent the red error overlay as requested
    },
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
    fs: {
      allow: [
        path.resolve(__dirname, "client"),
        path.resolve(__dirname, "shared"),
        path.resolve(__dirname, "public"),
        path.resolve(__dirname, "server"),
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  plugins: [
    react(),
    // basicSsl() intentionally removed — use HTTP for local network access
  ],
  build: {
    outDir: "../dist/spa",
    emptyOutDir: true,
  },
});
