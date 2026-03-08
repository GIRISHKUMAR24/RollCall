import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getCollection } from "../database";

const JWT_SECRET = process.env.JWT_SECRET || "attendancehub-secret-key-2024";

/**
 * Haversine formula — returns distance between two GPS points in metres.
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371e3; // Earth radius in metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generate octagon polygon vertices around (lat,lng) at a given radius (metres).
 * Each vertex is one point of the regular 8-sided polygon.
 */
function buildOctagonVertices(
  centerLat: number,
  centerLng: number,
  radiusMetres: number,
): Array<{ lat: number; lng: number }> {
  const earthRadius = 6371e3;
  const vertices: Array<{ lat: number; lng: number }> = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i * 45 * Math.PI) / 180; // 0°, 45°, 90° …
    const dLat = (radiusMetres * Math.cos(angle)) / earthRadius;
    const dLng =
      (radiusMetres * Math.sin(angle)) /
      (earthRadius * Math.cos((centerLat * Math.PI) / 180));
    vertices.push({
      lat: centerLat + (dLat * 180) / Math.PI,
      lng: centerLng + (dLng * 180) / Math.PI,
    });
  }
  return vertices;
}

/**
 * Point-in-polygon test (Ray casting algorithm).
 * Returns true if point (px, py) is inside polygon defined by vertices.
 */
function pointInPolygon(
  px: number,
  py: number,
  polygon: Array<{ lat: number; lng: number }>,
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export async function handleRecordAttendance(
  req: Request,
  res: Response,
): Promise<void> {
  // Default radius from env or 30m
  const DEFAULT_RADIUS = parseInt(process.env.GEOFENCE_RADIUS_METERS || "30", 10);

  try {
    console.log("📥 [Attendance] Received Record Request:", JSON.stringify(req.body, null, 2));

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

    // ── Verify JWT ──────────────────────────────────────────────────────────
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
      res.status(400).json({ error: "Validation Error", message: "Invalid QR token type" });
      return;
    }

    const {
      rollNumber,
      studentName,
      branch,
      section,
      subject,
      sessionId,
      // NOTE: teacherLocation from JWT is intentionally NOT used.
      // The authoritative classroom center comes ONLY from the MongoDB session document.
    } = payload;

    // ── Check Session in DB ─────────────────────────────────────────────────
    const sessionsCol = getCollection("sessions");
    let sessionDoc: any = null;
    try {
      sessionDoc = await sessionsCol.findOne({ sessionId });
    } catch {
      // Log but continue — don't crash if session lookup fails
      console.warn("⚠️ Could not look up session document.");
    }

    // Session already finalized → reject
    if (sessionDoc?.finalizedAt) {
      res.status(400).json({
        error: "Session Expired",
        message: "Attendance window has closed. You have been marked absent.",
      });
      return;
    }

    // Session not yet activated by teacher
    if (sessionDoc && !sessionDoc.active) {
      res.status(400).json({
        error: "Session Not Active",
        message: "Waiting for teacher to start attendance.",
      });
      return;
    }

    // ── Resolve Authoritative Classroom Center ──────────────────────────────
    //
    // STRICT RULE: Location comes ONLY from the MongoDB session document.
    // There is NO JWT fallback, NO hardcoded coordinates, NO default (0,0).
    // If the session has no valid classroomCenter → reject the request.
    //
    if (!sessionDoc) {
      res.status(400).json({
        error: "Session Not Found",
        message: "Active session not found. Ask your teacher to start the session first.",
      });
      return;
    }

    const rawCenter = sessionDoc.classroomCenter;
    if (
      !rawCenter ||
      typeof rawCenter.lat !== "number" ||
      typeof rawCenter.lng !== "number" ||
      isNaN(rawCenter.lat) ||
      isNaN(rawCenter.lng) ||
      (rawCenter.lat === 0 && rawCenter.lng === 0)
    ) {
      console.error(`❌ Session ${sessionId} has no valid classroomCenter:`, rawCenter);
      res.status(400).json({
        error: "Session GPS Not Initialized",
        message: "Session location invalid. Teacher must restart the session with a valid GPS location.",
      });
      return;
    }

    const classroomCenter: { lat: number; lng: number } = rawCenter;
    const geofenceRadius: number = sessionDoc.radius ?? DEFAULT_RADIUS;
    const locationSource = "teacher_gps"; // Always — no fallbacks allowed

    // ── Validate Student Location ───────────────────────────────────────────
    if (!studentLocation || typeof studentLocation.lat !== "number" || typeof studentLocation.lng !== "number") {
      res.status(400).json({
        error: "Location Required",
        message: "Student GPS location is required to record attendance.",
      });
      return;
    }


    // ── Student Exists & Matches ────────────────────────────────────────────
    const studentsCol = getCollection("students");
    const student = await studentsCol.findOne({ rollNumber });
    if (!student) {
      res.status(404).json({ error: "Not Found", message: "Student not registered" });
      return;
    }
    const norm = (s: any) =>
      String(s ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (norm(student.branch) !== norm(branch) || norm(student.section) !== norm(section)) {
      console.warn(
        `Branch/Section mismatch: ${student.rollNumber} has ${student.branch} ${student.section}, token has ${branch} ${section}`,
      );
      res.status(403).json({ error: "Validation Error", message: "Branch/Section mismatch" });
      return;
    }

    // ── Geofence Validation ─────────────────────────────────────────────────
    let withinGeofence = false;
    let distance = 0;
    let octagonVertices: Array<{ lat: number; lng: number }> | null = null;
    let withinOctagon = false;

    // At this point classroomCenter and studentLocation are both validated and non-null
    distance = haversineDistance(
      studentLocation.lat,
      studentLocation.lng,
      classroomCenter.lat,
      classroomCenter.lng,
    );
    withinGeofence = distance <= geofenceRadius;

    octagonVertices = buildOctagonVertices(classroomCenter.lat, classroomCenter.lng, geofenceRadius);
    withinOctagon = pointInPolygon(studentLocation.lat, studentLocation.lng, octagonVertices);


    const newStatus = withinGeofence ? "Present" : "Absent";

    console.log(`📍 Geofence Check:
      Student : ${studentName} (${rollNumber})
      Center  : ${classroomCenter ? `(${classroomCenter.lat.toFixed(6)}, ${classroomCenter.lng.toFixed(6)})` : "N/A"} [source: ${locationSource}]
      Student : ${studentLocation ? `(${studentLocation.lat.toFixed(6)}, ${studentLocation.lng.toFixed(6)})` : "N/A"}
      Distance: ${distance.toFixed(2)}m  |  Radius: ${geofenceRadius}m
      Result  : ${withinGeofence ? "✅ INSIDE" : "❌ OUTSIDE"}
      Octagon : ${withinOctagon ? "INSIDE" : "OUTSIDE"}
      Status  : ${newStatus}
    `);

    // ── Attendance Record ───────────────────────────────────────────────────
    const attendanceCol = getCollection("attendance");
    const existing = await attendanceCol.findOne({ sessionId, rollNumber });

    let finalStatus = newStatus;
    let action = "insert";

    if (existing) {
      if (existing.status === "Present") {
        finalStatus = "Present";
        action = "none";
        console.log(`ℹ️ ${rollNumber} already Present — keeping.`);
      } else if (existing.status === "Absent" && newStatus === "Present") {
        finalStatus = "Present";
        action = "update";
        console.log(`🆙 Upgrading ${rollNumber} from Absent → Present.`);
      } else {
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
      distance: Math.round(distance),
      classroomCenter,           // Store classroom center for audit trail
      teacherLocation: classroomCenter, // Alias for backward compat
      geofenceRadius,
      locationSource,
    };

    if (action === "insert") {
      await attendanceCol.insertOne(recordData);
    } else if (action === "update") {
      await attendanceCol.updateOne({ sessionId, rollNumber }, { $set: recordData });
    }

    console.log(`✅ Attendance: ${rollNumber} → ${finalStatus} (action: ${action})`);

    res.status(200).json({
      success: true,
      message: "Attendance recorded",
      data: recordData,
      debug: {
        classroomCenter,
        studentLocation,
        distance: parseFloat(distance.toFixed(2)),
        radius: geofenceRadius,
        withinCircle: withinGeofence,
        withinOctagon,
        status: finalStatus,
        locationSource,
        octagonVertices, // Included so frontend debug panel can draw the polygon
      },
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

export async function handleManualAttendanceOverride(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { sessionId, rollNumber, status, teacherEmail } = req.body as {
      sessionId?: string;
      rollNumber?: string;
      status?: "Present" | "Absent";
      teacherEmail?: string;
    };

    if (!sessionId || !rollNumber || !status || !teacherEmail) {
      res.status(400).json({
        error: "Validation Error",
        message: "sessionId, rollNumber, status, and teacherEmail are required",
      });
      return;
    }

    const attendanceCol = getCollection("attendance");
    const sessionsCol = getCollection("sessions");

    const session = await sessionsCol.findOne({ sessionId });
    if (!session) {
      res.status(404).json({ error: "Not Found", message: "Session not found" });
      return;
    }

    if (session.finalizedAt) {
      res.status(400).json({
        error: "Session finalized",
        message: "Cannot modify attendance for a finalized session",
      });
      return;
    }

    const existingRecord = await attendanceCol.findOne({ sessionId, rollNumber });

    if (!existingRecord) {
      // If the student doesn't have an attendance record yet, create one
      const studentsCol = getCollection("students");
      const student = await studentsCol.findOne({ rollNumber });
      if (!student) {
        res.status(404).json({ error: "Not Found", message: "Student not found" });
        return;
      }

      const recordData = {
        sessionId,
        rollNumber,
        name: student.name,
        branch: session.branch,
        section: session.section,
        subject: session.subject,
        timestamp: new Date(),
        status,
        method: "teacher_override",
        modifiedBy: teacherEmail,
        locationValid: false,
        qrUsed: false
      };
      await attendanceCol.insertOne(recordData);
    } else {
      // Update existing record
      await attendanceCol.updateOne(
        { sessionId, rollNumber },
        {
          $set: {
            status,
            method: "teacher_override",
            modifiedBy: teacherEmail,
            timestamp: new Date()
          }
        }
      );
    }

    res.status(200).json({
      success: true,
      message: `Successfully marked ${rollNumber} as ${status}.`,
    });
  } catch (error: any) {
    console.error("❌ Attendance override error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to override attendance",
    });
  }
}
