import { Request, Response } from "express";
import { getCollection } from "../database";

const GEOFENCE_RADIUS_METERS = parseInt(process.env.GEOFENCE_RADIUS_METERS || "30", 10);

/**
 * POST /api/session/start
 * ─────────────────────────────────────────────────────────────────────────────
 * Called by the Teacher Dashboard when the teacher clicks "Set Classroom Location".
 *
 * Body:
 *   {
 *     teacherId   : string  (email or userId)
 *     branch      : string
 *     section     : string
 *     subject     : string
 *     lat         : number  — teacher's live GPS latitude
 *     lng         : number  — teacher's live GPS longitude
 *     radius?     : number  — geofence radius in metres (default: 30)
 *   }
 *
 * Creates (or updates) a session document:
 *   {
 *     sessionId        : string           (unique per class × time)
 *     teacherId        : string
 *     branch / section / subject
 *     classroomCenter  : { lat, lng }     ← authoritative location
 *     radius           : number
 *     startTime        : Date
 *     endTime          : Date             (startTime + windowSeconds)
 *     active           : true
 *   }
 *
 * The returned sessionId is used as the key for all subsequent operations
 * (email QR tokens, attendance records, finalization).
 */
export async function handleStartSession(
    req: Request,
    res: Response,
): Promise<void> {
    try {
        const {
            teacherId,
            branch,
            section,
            subject,
            lat,
            lng,
            radius,
        } = req.body as {
            teacherId?: string;
            branch?: string;
            section?: string;
            subject?: string;
            lat?: number;
            lng?: number;
            radius?: number;
        };

        // ── Validation ─────────────────────────────────────────────────────────
        if (!teacherId || !branch || !section || !subject) {
            res.status(400).json({
                error: "Validation Error",
                message: "teacherId, branch, section, and subject are required",
            });
            return;
        }

        if (
            lat === undefined ||
            lng === undefined ||
            typeof lat !== "number" ||
            typeof lng !== "number" ||
            isNaN(lat) ||
            isNaN(lng)
        ) {
            res.status(400).json({
                error: "Validation Error",
                message:
                    "Valid lat and lng (numeric) are required. Enable location permission in your browser.",
            });
            return;
        }

        if (lat === 0 && lng === 0) {
            res.status(400).json({
                error: "Validation Error",
                message:
                    "Location appears to be (0,0) — GPS has not locked. Wait a moment and try again.",
            });
            return;
        }

        // ── Build Session Document ─────────────────────────────────────────────
        const sessionId = `${branch}-${section}-${subject}-${Date.now()}`;
        const geofenceRadius = typeof radius === "number" && radius > 0 ? radius : GEOFENCE_RADIUS_METERS;

        // Attendance window: configurable (default 90 s)
        const windowSeconds = parseInt(process.env.ATTENDANCE_WINDOW_SECONDS || "90", 10);
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + windowSeconds * 1000);

        const sessionDoc = {
            sessionId,
            teacherId,
            branch,
            section,
            subject,
            classroomCenter: { lat, lng },
            radius: geofenceRadius,
            startTime,
            endTime,
            active: true,
            createdAt: new Date(),
        };

        const sessionsCol = getCollection("sessions");
        await sessionsCol.insertOne(sessionDoc);

        console.log(`✅ [Session] Started: ${sessionId}`);
        console.log(`   Teacher: ${teacherId}, Class: ${branch} Sec ${section} — ${subject}`);
        console.log(`   Classroom Center: (${lat}, ${lng}), Radius: ${geofenceRadius}m`);

        res.status(201).json({
            success: true,
            message: "Session started. Teacher location captured.",
            sessionId,
            classroomCenter: { lat, lng },
            radius: geofenceRadius,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            windowSeconds,
        });
    } catch (error: any) {
        console.error("❌ Session start error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "Failed to start session",
        });
    }
}

/**
 * GET /api/session/active?branch=&section=&subject=
 * ─────────────────────────────────────────────────────────────────────────────
 * Returns the most recent active session for a given class.
 * Used by the email route to get the sessionId and classroom center.
 */
export async function handleGetActiveSession(
    req: Request,
    res: Response,
): Promise<void> {
    try {
        const { branch, section, subject, sessionId } = req.query as {
            branch?: string;
            section?: string;
            subject?: string;
            sessionId?: string;
        };

        const sessionsCol = getCollection("sessions");
        let session: any = null;

        if (sessionId) {
            session = await sessionsCol.findOne({ sessionId });
        } else if (branch && section && subject) {
            // Get most recent non-finalized session for this class
            session = await sessionsCol
                .find({ branch, section, subject, finalizedAt: { $exists: false } })
                .sort({ createdAt: -1 })
                .limit(1)
                .next();
        } else {
            res.status(400).json({
                error: "Validation Error",
                message: "Provide either sessionId or branch + section + subject",
            });
            return;
        }

        if (!session) {
            res.status(404).json({
                success: false,
                message: "No active session found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            session: {
                sessionId: session.sessionId,
                classroomCenter: session.classroomCenter,
                radius: session.radius ?? GEOFENCE_RADIUS_METERS,
                startTime: session.startTime,
                endTime: session.endTime,
                active: !session.finalizedAt,
                branch: session.branch,
                section: session.section,
                subject: session.subject,
            },
        });
    } catch (error: any) {
        console.error("❌ Get active session error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "Failed to fetch session",
        });
    }
}
