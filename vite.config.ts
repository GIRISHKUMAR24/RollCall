import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server";

// https://vitejs.dev/config/
export default defineConfig({
  root: "client",
  publicDir: "../public",
  envDir: "..",
  server: {
    port: 5173,
    host: true,
    hmr: {
      overlay: false, // Prevent the red error overlay as requested
    },
    proxy: {
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
    {
      name: "express-api",
      apply: "serve",
      configureServer(server) {
        const app = createServer();
        server.middlewares.use((req, res, next) => {
          if (!req.url) return next();

          // If the request starts with the Netlify function path, rewrite it to /api
          if (req.url.startsWith("/.netlify/functions/api")) {
            // Strip the prefix and ensure it starts with /api
            req.url = req.url.replace("/.netlify/functions/api", "/api");
            if (!req.url.startsWith("/api")) {
              req.url = `/api${req.url}`;
            }
            return app(req, res);
          }

          // If it's a direct /api request, handle it too
          if (req.url.startsWith("/api")) {
            return app(req, res);
          }
          next();
        });
      },
    },
  ],
  build: {
    outDir: "../dist/spa",
    emptyOutDir: true,
  },
});
