import path from "path";
import { createServer } from "./index";
import * as express from "express";
import os from "os";
import fs from "fs";
import http from "http";
import https from "https";

const app = createServer();
const port = parseInt(process.env.PORT || "4000", 10);
const useHttps = process.env.USE_HTTPS === "true";

// In production, serve the built SPA files
const __dirname = import.meta.dirname;
let distPath = path.join(__dirname, "../spa");

// If running from source (tsx), the path might be different
if (!fs.existsSync(distPath)) {
  distPath = path.join(__dirname, "../dist/spa");
}

// Serve static files
app.use(express.static(distPath));

// Handle React Router - serve index.html for all non-API routes
app.get("*", (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }

  res.sendFile(path.join(distPath, "index.html"));
});

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

// ─── HTTPS or HTTP Server ──────────────────────────────────────────────────

if (useHttps) {
  // Look for certificates relative to this file or project root
  const certDir = path.resolve(__dirname, "../../certs");
  const altCertDir = path.resolve(__dirname, "../certs");
  const resolvedCertDir = fs.existsSync(certDir)
    ? certDir
    : fs.existsSync(altCertDir)
      ? altCertDir
      : null;

  if (!resolvedCertDir) {
    console.error("❌ USE_HTTPS=true but no 'certs' directory found.");
    console.error("   Expected at:", certDir);
    console.error(
      "   Please generate certificates. Run: npm run generate-certs"
    );
    console.error("   Or see HTTPS_SETUP.md for instructions.");
    process.exit(1);
  }

  const keyPath = path.join(resolvedCertDir, "key.pem");
  const certPath = path.join(resolvedCertDir, "cert.pem");

  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.error("❌ Certificate files missing in:", resolvedCertDir);
    console.error("   Expected: key.pem and cert.pem");
    console.error("   Please generate them. See HTTPS_SETUP.md.");
    process.exit(1);
  }

  const sslOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };

  const httpsServer = https.createServer(sslOptions, app);
  httpsServer.listen(port, "0.0.0.0", () => {
    const ip = getLocalIpAddress();
    console.log(`🔒 HTTPS Server running on port ${port}`);
    console.log(`📱 Local:   https://localhost:${port}`);
    console.log(`🌐 Network: https://${ip}:${port}`);
    console.log(`🔧 API:     https://${ip}:${port}/api`);
    console.log(`⚠️  Using self-signed cert — browser will show security warning on first visit.`);
    console.log(`   Accept the warning or add cert to trusted store for development.`);
  });

  // ─── Graceful Shutdown ─────────────────────────────────────────────────
  process.on("SIGTERM", () => {
    console.log("🛑 Received SIGTERM, shutting down gracefully");
    httpsServer.close(() => process.exit(0));
  });

  process.on("SIGINT", () => {
    console.log("🛑 Received SIGINT, shutting down gracefully");
    httpsServer.close(() => process.exit(0));
  });
} else {
  // Standard HTTP server
  const httpServer = http.createServer(app);
  httpServer.listen(port, "0.0.0.0", () => {
    const ip = getLocalIpAddress();
    console.log(`🚀 HTTP Server running on port ${port}`);
    console.log(`📱 Local:   http://localhost:${port}`);
    console.log(`🌐 Network: http://${ip}:${port}`);
    console.log(`🔧 API:     http://${ip}:${port}/api`);
    console.log(
      `ℹ️  Geolocation/Camera require HTTPS. Use a tunnel or set USE_HTTPS=true.`
    );
  });

  // ─── Graceful Shutdown ─────────────────────────────────────────────────
  process.on("SIGTERM", () => {
    console.log("🛑 Received SIGTERM, shutting down gracefully");
    httpServer.close(() => process.exit(0));
  });

  process.on("SIGINT", () => {
    console.log("🛑 Received SIGINT, shutting down gracefully");
    httpServer.close(() => process.exit(0));
  });
}
