import path from "path";
import { createServer } from "./index";
import * as express from "express";
import fs from "fs";
import http from "http";

const app = createServer();
const port = parseInt(process.env.PORT || "4000", 10);

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

import { emailService } from "./services/emailService";

// Standard HTTP server
const httpServer = http.createServer(app);
httpServer.listen(port, "0.0.0.0", () => {
  const baseUrl = emailService.getBaseUrl();
  console.log(`🚀 Attendance Management System Backend`);
  console.log(`🏠 Internal: http://localhost:${port}`);
  console.log(`🔧 API Base: http://localhost:${port}/api`);
  console.log(`📶 WiFi IP : ${baseUrl}`);
  console.log(`🔗 Scanner : ${baseUrl}/scanner`);
  console.log(`📧 Email Links : ${baseUrl}/scan/from-email?token=<TOKEN>`);
});

// ─── Graceful Shutdown ─────────────────────────────────────────────────
process.on("SIGTERM", () => {
  console.log("🛑 Shutting down server...");
  httpServer.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  console.log("🛑 Shutting down server...");
  httpServer.close(() => process.exit(0));
});

