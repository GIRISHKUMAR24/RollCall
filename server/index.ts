import "dotenv/config";
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
import { initializeDatabase } from "./database";
import { handleGetStudentsByClass, handleSearchStudentByRollNo } from "./routes/students";
import { handleRecordAttendance, handleFinalizeAttendance, handleManualAttendanceOverride } from "./routes/attendance";
import { handleGetAttendanceStatus } from "./routes/attendance-status";
import { handleGetAttendanceSummary } from "./routes/attendance-summary";
import { handleStartSession, handleGetActiveSession } from "./routes/session";

/**
 * Build a dynamic CORS policy that:
 *  - Always allows localhost (any port) for local development
 *  - Always allows ngrok and Cloudflare tunnel domains
 *  - Allows any extra origins listed in ALLOWED_ORIGINS (comma-separated)
 *  - Does NOT require hardcoded IPs or URLs
 */
function buildCorsOptions(): CorsOptions {
  const extraOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl, Postman)
      if (!origin) return callback(null, true);

      // Always allow localhost (any port)
      if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      // Always allow 127.0.0.1 (any port)
      if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      // Allow ngrok tunnels (v2: *.ngrok.io, v3: *.ngrok-free.app / *.ngrok.app)
      if (
        /\.ngrok(-free)?\.app$/.test(origin) ||
        /\.ngrok\.io$/.test(origin) ||
        /\.ngrok\.app$/.test(origin)
      ) {
        return callback(null, true);
      }

      // Allow Cloudflare tunnels
      if (/\.trycloudflare\.com$/.test(origin) || /\.cloudflareaccess\.com$/.test(origin)) {
        return callback(null, true);
      }

      // Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x) for LAN HTTPS
      if (/^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(origin)) {
        return callback(null, true);
      }

      // Allow extra origins from environment variable
      if (extraOrigins.includes(origin)) {
        return callback(null, true);
      }

      // In development, allow everything
      if (process.env.NODE_ENV === "development") {
        return callback(null, true);
      }

      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error(`CORS policy: origin '${origin}' not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
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

  // Initialize database connection
  initializeDatabase().catch((error) => {
    console.error("❌ Failed to initialize database:", error);
    process.exit(1);
  });

  // Health check routes
  app.get("/api/health", handleHealthCheck);
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
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
  app.post("/api/attendance/override", handleManualAttendanceOverride);
  app.post("/api/attendance/finalize", handleFinalizeAttendance);
  app.get("/api/attendance/status", handleGetAttendanceStatus);
  app.get("/api/attendance/summary", handleGetAttendanceSummary);

  // Session management routes (dynamic classroom location)
  app.post("/api/session/start", handleStartSession);
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

  return app;
}
