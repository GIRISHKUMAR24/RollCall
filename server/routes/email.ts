import { Request, Response } from "express";
import { emailService } from "../services/emailService";
import { getCollection } from "../database";

interface SendEmailRequest {
  students: Array<{
    email: string;
    name: string;
    rollNo: string;
  }>;
  classDetails: {
    subject: string;
    branch: string;
    section: string;
    teacherLocation: { lat: number; lng: number };
  };
}

export async function handleSendAttendanceEmails(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { students, classDetails }: SendEmailRequest = req.body;

    // Validation
    if (!students || !Array.isArray(students) || students.length === 0) {
      res.status(400).json({
        error: "Validation Error",
        message: "Students array is required and must not be empty",
      });
      return;
    }

    if (
      !classDetails ||
      !classDetails.subject ||
      !classDetails.branch ||
      !classDetails.section
    ) {
      res.status(400).json({
        error: "Validation Error",
        message: "Class details (subject, branch, section) are required",
      });
      return;
    }

    // teacherLocation is required — no fallback to DB settings
    const { teacherLocation } = classDetails;

    if (
      !teacherLocation ||
      typeof teacherLocation.lat !== "number" ||
      typeof teacherLocation.lng !== "number" ||
      isNaN(teacherLocation.lat) ||
      isNaN(teacherLocation.lng) ||
      (teacherLocation.lat === 0 && teacherLocation.lng === 0)
    ) {
      res.status(400).json({
        error: "Validation Error",
        message:
          "Teacher GPS location is required and must be valid. " +
          "Please capture your location on the Teacher Dashboard before sending QR codes.",
      });
      return;
    }


    // Validate email format for all students
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const student of students) {
      if (!emailRegex.test(student.email)) {
        res.status(400).json({
          error: "Validation Error",
          message: `Invalid email format: ${student.email}`,
        });
        return;
      }
    }

    console.log(
      `📧 Starting email dispatch for ${students.length} students in ${classDetails.branch} Section ${classDetails.section} - ${classDetails.subject}`,
    );

    // Send emails through the email service
    // We pass the fetched teacherLocation to the email service if it needs it, 
    // or just use it for the session. 
    // The emailService.sendAttendanceEmails might expect teacherLocation in classDetails.
    // Let's reconstruct classDetails with teacherLocation.
    const classDetailsWithLocation = {
      ...classDetails,
      teacherLocation,
    };

    const result = await emailService.sendAttendanceEmails(
      students,
      classDetailsWithLocation,
    );

    // Check if any emails were actually sent
    if (!result.success || result.queuedEmails === 0) {
      console.error("❌ No emails were sent. Gmail credentials may be invalid.");
      res.status(500).json({
        error: "Email Service Error",
        message: "Failed to send emails. Gmail credentials may be invalid. Please verify your Gmail App Password in the .env file and ensure 2-factor authentication is enabled.",
        details: {
          totalStudents: result.totalStudents,
          emailsSent: result.queuedEmails,
        },
      });
      return;
    }

    // Persist session with authoritative classroomCenter for geofencing
    // CRITICAL: The sessionId here matches what's embedded in the QR tokens.
    // classroomCenter MUST be stored — this is what attendance.ts reads.
    const geofenceRadius = parseInt(process.env.GEOFENCE_RADIUS_METERS || "30", 10);
    const windowSeconds = parseInt(process.env.ATTENDANCE_WINDOW_SECONDS || "90", 10);
    const sessionStartTime = new Date();
    const sessionEndTime = new Date(sessionStartTime.getTime() + windowSeconds * 1000);

    const sessionsCol = getCollection("sessions");
    await sessionsCol.updateOne(
      { sessionId: result.sessionId },
      {
        $set: {
          sessionId: result.sessionId,
          branch: classDetails.branch,
          section: classDetails.section,
          subject: classDetails.subject,
          classroomCenter: {          // ← authoritative field read by attendance.ts
            lat: teacherLocation.lat,
            lng: teacherLocation.lng,
          },
          teacherLocation: teacherLocation, // backward-compat alias
          radius: geofenceRadius,
          startTime: sessionStartTime,
          endTime: sessionEndTime,
          active: false,
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );

    console.log(`✅ [Email Route] Session persisted: ${result.sessionId}`);
    console.log(`   classroomCenter: (${teacherLocation.lat}, ${teacherLocation.lng}), radius: ${geofenceRadius}m`);

    res.status(200).json({
      success: true,
      message: `Successfully sent ${result.queuedEmails} attendance QR emails`,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ Email sending error:", error.message);
    res.status(500).json({
      error: "Email Service Error",
      message: error.message || "Failed to send attendance emails. Check Gmail credentials and internet connection.",
      hint: "Ensure: 1) Gmail App Password is correct, 2) 2-factor auth is enabled, 3) .env has valid GMAIL_PASS",
    });
  }
}

export async function handleVerifyQRToken(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({
        error: "Validation Error",
        message: "QR token is required",
      });
      return;
    }

    const decoded = emailService.verifyQRToken(token);

    res.status(200).json({
      success: true,
      data: decoded,
    });
  } catch (error: any) {
    console.error("❌ QR token verification error:", error);
    res.status(401).json({
      error: "Authentication Error",
      message: error.message || "Invalid QR token",
    });
  }
}

export async function handleEmailHealthCheck(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    // Test email service configuration
    const testResult = {
      gmailConfigured: !!(process.env.GMAIL_USER && process.env.GMAIL_PASS),
      fromAddress: process.env.GMAIL_USER,
      fromName: process.env.EMAIL_FROM_NAME || "AttendanceHub System",
      qrExpirySeconds: parseInt(process.env.QR_EXPIRY_SECONDS || "60"),
      timestamp: new Date().toISOString(),
    };

    res.status(200).json({
      success: true,
      message: "Email service configuration check",
      ...testResult,
    });
  } catch (error: any) {
    console.error("❌ Email health check error:", error);
    res.status(500).json({
      error: "Configuration Error",
      message: "Email service configuration issue",
    });
  }
}
