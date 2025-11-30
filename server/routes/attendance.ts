import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getCollection, getSettings } from "../database";

const JWT_SECRET = process.env.JWT_SECRET || "attendancehub-secret-key-2024";

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function handleRecordAttendance(
  req: Request,
  res: Response,
): Promise<void> {
  // CONFIG: Geofence is enabled for Present/Absent decision
  const GEOFENCE_ENABLED = true;
  const GEOFENCE_RADIUS_METERS = 30;

  try {
    const { token, studentLocation, studentAccuracy } = req.body as {
      token?: string;
      studentLocation?: { lat: number; lng: number };
      studentAccuracy?: number | null;
    };

    if (!token) {
      res.status(400).json({
        error: "Validation Error",
        message: "token is required",
      });
      return;
    }

    // Accuracy Check - Removed to allow "Continue Anyway" flow
    // if (studentAccuracy && studentAccuracy > 50) { ... }

    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err: any) {
      res.status(401).json({
        error: "Authentication Error",
        message: "Invalid or expired QR token",
      });
      return;
    }

    if (payload.type !== "attendance_qr") {
      res
        .status(400)
        .json({ error: "Validation Error", message: "Invalid QR token type" });
      return;
    }

    const {
      rollNumber,
      studentName,
      branch,
      section,
      subject,
      sessionId,
      teacherLocation, // Get from token
    } = payload;

    // Fallback if not in token (should be there though)
    if (!teacherLocation) {
      console.warn("⚠️ Teacher location missing in token.");
    }

    // Check if session is expired
    try {
      const sessionsCol = getCollection("sessions");
      const sessionDoc = await sessionsCol.findOne({ sessionId });

      if (sessionDoc?.finalizedAt) {
        res.status(400).json({
          error: "Session Expired",
          message: "Attendance window has closed. You have been marked absent.",
        });
        return;
      }
    } catch {
      // ignore lookup error
    }

    // Ensure student exists and is registered in the same branch/section
    const studentsCol = getCollection("students");
    const student = await studentsCol.findOne({ rollNumber: rollNumber });
    if (!student) {
      res
        .status(404)
        .json({ error: "Not Found", message: "Student not registered" });
      return;
    }
    const norm = (s: any) =>
      String(s ?? "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
    if (
      norm(student.branch) !== norm(branch) ||
      norm(student.section) !== norm(section)
    ) {
      console.warn(
        `Branch/Section mismatch: student ${student.rollNumber} has ${student.branch} ${student.section}, token has ${branch} ${section}`,
      );
      res.status(403).json({
        error: "Validation Error",
        message: "Branch/Section mismatch",
      });
      return;
    }

    // Geofence validation
    let withinGeofence = false;
    let distance = 0;

    if (studentLocation && teacherLocation && (teacherLocation.lat !== 0 || teacherLocation.lng !== 0)) {
      distance = haversineDistance(
        studentLocation.lat,
        studentLocation.lng,
        teacherLocation.lat,
        teacherLocation.lng,
      );

      withinGeofence = distance <= GEOFENCE_RADIUS_METERS;
    } else {
      // If no location provided, treat as outside geofence (Absent)
      withinGeofence = false;
      console.log(`⚠️ Location missing for ${rollNumber}, marking as Absent.`);
    }

    // Determine status based on geofence
    const newStatus = withinGeofence ? "Present" : "Absent";

    // Log for debugging
    console.log(`📍 Geofence Check (Status: ${GEOFENCE_ENABLED ? "ACTIVE" : "IGNORED"}):
      Student: ${studentName} (${rollNumber})
      Distance: ${distance.toFixed(2)}m
      Threshold: ${GEOFENCE_RADIUS_METERS}m
      Result: ${withinGeofence ? "INSIDE" : "OUTSIDE"}
      New Status: ${newStatus}
    `);

    const attendanceCol = getCollection("attendance");
    const existing = await attendanceCol.findOne({ sessionId, rollNumber });

    let finalStatus = newStatus;
    let action = "insert";

    if (existing) {
      // Precedence: Present > Absent
      if (existing.status === "Present") {
        // Already Present, keep it Present regardless of current scan
        finalStatus = "Present";
        action = "none"; // Or update metadata if needed, but status stays Present
        console.log(`ℹ️ Student ${rollNumber} is already Present. Keeping status Present.`);
      } else if (existing.status === "Absent" && newStatus === "Present") {
        // Was Absent, now Present -> Upgrade
        finalStatus = "Present";
        action = "update";
        console.log(`🆙 Upgrading student ${rollNumber} from Absent to Present.`);
      } else {
        // Was Absent, still Absent -> Update metadata
        // Or other cases -> Update
        finalStatus = newStatus;
        action = "update";
      }
    }

    const recordData = {
      sessionId,
      rollNumber,
      name: studentName,
      branch,
      section,
      subject,
      timestamp: new Date(),
      location: studentLocation ? { lat: studentLocation.lat, lng: studentLocation.lng } : null,
      locationValid: withinGeofence,
      status: finalStatus,
      distance: Math.round(distance), // Store distance for debugging
      teacherLocation: teacherLocation // Store teacher location for debugging
    };

    if (action === "insert") {
      await attendanceCol.insertOne(recordData);
    } else if (action === "update") {
      await attendanceCol.updateOne(
        { sessionId, rollNumber },
        { $set: recordData }
      );
    }

    console.log(`✅ Attendance recorded: ${rollNumber} -> ${finalStatus} (Action: ${action})`);

    res.status(200).json({
      success: true,
      message: "Attendance recorded",
      data: recordData,
      debug: {
        classLocation: teacherLocation,
        studentLocation: studentLocation,
        distance: distance,
        status: finalStatus,
        threshold: GEOFENCE_RADIUS_METERS
      }
    });
  } catch (error: any) {
    console.error("❌ Attendance record error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to record attendance",
    });
  }
}

export async function handleFinalizeAttendance(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { sessionId, branch: branchBody, section: sectionBody, subject: subjectBody } =
      (req.body as {
        sessionId?: string;
        branch?: string;
        section?: string;
        subject?: string;
      }) ?? {};

    console.log(`🏁 Finalizing attendance for SessionID: ${sessionId}`);

    if (!sessionId) {
      res.status(400).json({
        error: "Validation Error",
        message: "sessionId is required",
      });
      return;
    }

    const sessionsCol = getCollection("sessions");
    const attendanceCol = getCollection("attendance");
    const studentsCol = getCollection("students");

    console.log(`🔍 Using DB: ${attendanceCol.dbName}`);

    let session;
    try {
      session = await sessionsCol.findOne({ sessionId });
    } catch (dbError) {
      console.error("❌ Error finding session:", dbError);
      throw new Error("Database error while finding session");
    }

    const branch = session?.branch ?? branchBody;
    const section = session?.section ?? sectionBody;
    const subject = session?.subject ?? subjectBody;

    if (!branch || !section || !subject) {
      res.status(400).json({
        error: "Validation Error",
        message: "Branch, section, and subject are required to finalize attendance",
      });
      return;
    }

    const normalize = (value: unknown) =>
      String(value ?? "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

    const branchPattern = branch
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    let candidates: any[] = [];
    try {
      candidates = await studentsCol
        .find(
          {
            branch: { $regex: `^${branchPattern}$`, $options: "i" },
          },
          { projection: { password: 0 } },
        )
        .toArray();
    } catch (dbError) {
      console.error("❌ Error finding students:", dbError);
      throw new Error("Database error while finding students");
    }

    const targetBranch = normalize(branch);
    const targetSection = normalize(section);

    const classStudents = candidates.filter((student: any) => {
      return (
        normalize(student.branch) === targetBranch &&
        normalize(student.section) === targetSection
      );
    });

    console.log(`👥 Total students in class (${branch} ${section}): ${classStudents.length}`);

    let existingRecords: any[] = [];
    try {
      existingRecords = await attendanceCol
        .find({ sessionId }, { projection: { rollNumber: 1 } })
        .toArray();
    } catch (dbError) {
      console.error("❌ Error finding existing attendance:", dbError);
      throw new Error("Database error while checking existing attendance");
    }

    // Double check: Get ALL attendance records for this session to be absolutely sure
    // We want to ensure we NEVER overwrite a "Present" record with "Absent"
    const allSessionRecords = await attendanceCol
      .find({ sessionId })
      .toArray();

    const presentRollNumbers = new Set(
      allSessionRecords
        .filter((r: any) => r.status === "Present")
        .map((r: any) => r.rollNumber)
    );

    const recordedRollNumbers = new Set(
      allSessionRecords.map((r: any) => r.rollNumber)
    );

    console.log(`📋 Found ${allSessionRecords.length} total records for session ${sessionId}`);
    console.log(`   Present Roll Numbers: ${Array.from(presentRollNumbers).join(", ")}`);

    const now = new Date();
    const recordsToInsert = classStudents
      .filter((student: any) => {
        // CRITICAL: If they are already marked Present, SKIP them.
        if (presentRollNumbers.has(student.rollNumber)) {
          return false;
        }
        // If they have ANY record (even Absent), SKIP them (unless we want to update Absent -> Absent, which is pointless)
        // But the user says "My friend is marked Absent". If they are already Absent, we don't need to insert again.
        if (recordedRollNumbers.has(student.rollNumber)) {
          return false;
        }
        return true;
      })
      .map((student: any) => ({
        sessionId,
        rollNumber: student.rollNumber,
        studentId: student._id, // Include MongoDB _id as requested
        name: student.name,
        branch: student.branch,
        section: student.section,
        subject,
        timestamp: now,
        location: null,
        locationValid: false,
        status: "Absent",
        markedBy: "system",
        markingReason: "Attendance window expired",
      }));

    console.log(`📉 Marking ${recordsToInsert.length} students as Absent (truly missing records)`);

    if (recordsToInsert.length > 0) {
      try {
        // Use ordered: false to prevent one failure from stopping the rest
        await attendanceCol.insertMany(recordsToInsert, { ordered: false });
        console.log(`✅ Successfully inserted ${recordsToInsert.length} absent records`);
      } catch (dbError) {
        console.error("❌ Error inserting absent records:", dbError);
        // We continue even if this fails, to ensure session is closed
      }
    }

    try {
      if (session) {
        // Session exists, update it using its _id for safety
        await sessionsCol.updateOne(
          { _id: session._id },
          {
            $set: {
              finalizedAt: new Date(),
              branch,
              section,
              subject,
              // We don't need to touch teacherLocation as it's already in the session
            },
          },
        );
      } else {
        // Session doesn't exist (unlikely), create it
        await sessionsCol.insertOne({
          sessionId,
          branch,
          section,
          subject,
          finalizedAt: new Date(),
          createdAt: new Date(),
          teacherLocation: null, // We don't have it if session wasn't found
        });
      }
      console.log(`🔒 Session ${sessionId} finalized successfully`);
    } catch (dbError: any) {
      console.error("❌ Error updating session:", dbError);
      throw new Error(
        `Database error while updating session: ${dbError.message}`,
      );
    }

    res.status(200).json({
      success: true,
      message:
        recordsToInsert.length > 0
          ? `Attendance finalized. ${recordsToInsert.length} students marked absent.`
          : "Attendance finalized. No additional students to mark absent.",
      markedAbsent: recordsToInsert.length,
      records: recordsToInsert,
      alreadyFinalized: Boolean(session?.finalizedAt),
    });
  } catch (error: any) {
    console.error("❌ Attendance finalize error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to finalize attendance",
    });
  }
}
