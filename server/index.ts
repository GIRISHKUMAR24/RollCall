import dotenv from "dotenv";
dotenv.config({ override: true });
import express from "express";
import cors from "cors";
import type { CorsOptions } from "cors";
import { handleDemo } from "./routes/demo";
import { handleSignup, handleLogin, handleHealthCheck } from "./routes/auth";
import { handleDatabaseStats, handleUsersByCollection } from "./routes/stats";
import {
  handleSendAttendanceEmails,
  handleVerifyQRToken,
  handleEmailHealthCheck,
} from "./routes/email";
import { handleEmailDebug, handleTestSingleEmail } from "./routes/email-debug";
import { handleDirectEmailTest, handleEmailConfig } from "./routes/email-test";
import { initializeDatabase, connectToDatabase } from "./database";
import { handleGetStudentsByClass, handleSearchStudentByRollNo } from "./routes/students";
import { handleRecordAttendance, handleFinalizeAttendance, handleManualAttendanceOverride } from "./routes/attendance";
import { handleGetAttendanceStatus } from "./routes/attendance-status";
import { handleGetAttendanceSummary } from "./routes/attendance-summary";
import { handleStartSession, handleGetActiveSession, handleActivateSession } from "./routes/session";
import os from "os";


/**
 * Build a dynamic CORS policy that:
 *  - Always allows localhost (any port) for local development
 *  - Allows any extra origins listed in ALLOWED_ORIGINS (comma-separated)
 *  - Does NOT require hardcoded IPs or URLs
 */
function buildCorsOptions(): CorsOptions {
  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl, Postman)
      if (!origin) return callback(null, true);

      // Always allow localhost
      if (/^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      // Allow origins from environment variable
      const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : [];
      if (allowedOrigins.some(ao => origin.toLowerCase() === ao.toLowerCase().trim())) {
        return callback(null, true);
      }

      // In development, allow everything else for convenience
      if (process.env.NODE_ENV === "development") {
        return callback(null, true);
      }

      callback(new Error(`CORS policy: origin '${origin}' not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    exposedHeaders: ["set-cookie"],
  };
}

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors(buildCorsOptions()));
  // Handle pre-flight requests for all routes
  app.options("*", cors(buildCorsOptions()));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Debug logging
  app.use((req, res, next) => {
    console.log(`[API Request] ${req.method} ${req.url}`);
    next();
  });

  // Initialize database connection
  initializeDatabase().catch((error) => {
    console.error("❌ Failed to initialize database:", error);
  });

  // Health check routes
  app.get("/api/health", handleHealthCheck);
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  // Local IP diagnostic endpoint — verify which IP is used for email scanner links
  app.get("/api/local-ip", (_req, res) => {
    const networkInterfaces = os.networkInterfaces();
    const virtualKeywords = ["vmware", "vmnet", "vbox", "virtualbox", "hyper-v",
                             "loopback", "pseudo", "bluetooth", "tunnel", "tap", "docker"];
    const wifiKeywords = ["wi-fi", "wifi", "wireless", "wlan", "802.11"];
    const candidates: { name: string; ip: string; isWifi: boolean }[] = [];

    for (const devName in networkInterfaces) {
      const iface = networkInterfaces[devName];
      if (!iface) continue;
      const lowerName = devName.toLowerCase();
      if (virtualKeywords.some((kw) => lowerName.includes(kw))) continue;
      const isWifi = wifiKeywords.some((kw) => lowerName.includes(kw));
      for (const alias of iface) {
        if (alias.family === "IPv4" && !alias.internal && alias.address !== "127.0.0.1") {
          candidates.push({ name: devName, ip: alias.address, isWifi });
        }
      }
    }

    let localIp = "127.0.0.1";
    const namedWifi192 = candidates.filter((c) => c.isWifi && c.ip.startsWith("192.168."));
    const any192 = candidates.filter((c) => c.ip.startsWith("192.168."));
    if (namedWifi192.length > 0) {
      localIp = namedWifi192[namedWifi192.length - 1].ip;
    } else if (any192.length > 0) {
      localIp = any192[any192.length - 1].ip;
    } else if (candidates.length > 0) {
      localIp = candidates[candidates.length - 1].ip;
    }

    const scannerUrl = `http://${localIp}:3000`;
    console.log(`🌐 [/api/local-ip] Selected IP: ${localIp} | Scanner URL: ${scannerUrl}`);
    res.json({
      localIp,
      scannerUrl,
      emailLinksWillUse: `${scannerUrl}/scan/from-email?token=<JWT>`,
      allCandidates: candidates,
      note: "Ensure mobile and laptop are on the same WiFi network for these links to work",
      envAppBaseUrl: process.env.APP_BASE_URL || "(not set — auto-detect active)",
    });
  });


  // Authentication routes
  app.post("/api/signup", handleSignup);
  app.post("/api/login", handleLogin);

  // Email routes
  app.post("/api/email/send-attendance", handleSendAttendanceEmails);
  app.post("/api/email/verify-qr", handleVerifyQRToken);
  app.get("/api/email/health", handleEmailHealthCheck);

  // Email debug routes
  app.get("/api/email/debug", handleEmailDebug);
  app.post("/api/email/test-single", handleTestSingleEmail);

  // Direct email test routes
  app.post("/api/email/direct-test", handleDirectEmailTest);
  app.get("/api/email/config", handleEmailConfig);

  // Database statistics routes
  app.get("/api/stats", handleDatabaseStats);
  app.get("/api/users/:collection", handleUsersByCollection);

  // Students & Attendance routes
  app.get("/api/students", handleGetStudentsByClass);
  app.get("/api/students/search", handleSearchStudentByRollNo);
  app.post("/api/attendance/record", handleRecordAttendance);
  app.post("/api/attendance", handleRecordAttendance); // Alias
  app.post("/api/attendance/override", handleManualAttendanceOverride);
  app.post("/api/attendance/finalize", handleFinalizeAttendance);
  app.get("/api/attendance", handleGetAttendanceStatus); // Alias
  app.get("/api/attendance/status", handleGetAttendanceStatus);
  app.get("/api/attendance/summary", handleGetAttendanceSummary);

  // Session management routes (dynamic classroom location)
  app.post("/api/session/start", handleStartSession);
  app.post("/api/session/activate", handleActivateSession);
  app.get("/api/session/active", handleGetActiveSession);

  // Example API routes
  app.get("/api/demo", handleDemo);

  // 404 handler for API routes
  app.use("/api/*", (_req, res) => {
    res.status(404).json({
      error: "Not Found",
      message: "API endpoint not found",
    });
  });

  // Global error handler for API routes
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("💥 Global API Error:", err);
    res.status(err.status || 500).json({
      error: err.name || "Internal Server Error",
      message: err.message || "An unexpected error occurred",
    });
  });

  return app;
}
