import "dotenv/config";
import express from "express";
import cors from "cors";
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
import { handleGetStudentsByClass } from "./routes/students";
import { handleRecordAttendance, handleFinalizeAttendance } from "./routes/attendance";
import { handleGetAttendanceStatus } from "./routes/attendance-status";
import { handleGetAttendanceSummary } from "./routes/attendance-summary";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
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
  app.post("/api/attendance/record", handleRecordAttendance);
  app.post("/api/attendance/finalize", handleFinalizeAttendance);
  app.get("/api/attendance/status", handleGetAttendanceStatus);
  app.get("/api/attendance/summary", handleGetAttendanceSummary);

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
