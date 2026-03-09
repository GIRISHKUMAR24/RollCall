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

          // Standardize all API requests to /api or /.netlify/functions/api
          const isNetlifyPath = req.url.startsWith("/.netlify/functions/api");
          const isApiPath = req.url.startsWith("/api");

          if (isNetlifyPath || isApiPath) {
            // Rewrite Netlify path to /api for internal Express routing if needed
            if (isNetlifyPath) {
              req.url = req.url.replace("/.netlify/functions/api", "/api");
              // Ensure it doesn't end up as //api
              if (!req.url.startsWith("/api")) {
                req.url = `/api${req.url}`;
              }
            }

            console.log(`[Vite Proxy] Routing ${req.method} ${req.url} to Express`);

            try {
              // Call the express app. We handle it as a function.
              return app(req, res);
            } catch (err) {
              console.error("[Vite Proxy] Express App Error:", err);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: "Server Error", message: "Express app crashed" }));
              return;
            }
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
