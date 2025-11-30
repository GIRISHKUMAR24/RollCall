import { Request, Response } from "express";
import { getCollection } from "../database";

export async function handleGetAttendanceSummary(req: Request, res: Response): Promise<void> {
  try {
    const { branch, section } = req.query as { branch?: string; section?: string };

    if (!branch || !section) {
      res.status(400).json({ error: "Validation Error", message: "branch and section are required" });
      return;
    }

    const studentsCol = getCollection("students");
    const attendanceCol = getCollection("attendance");

    // Normalization helpers (case/format tolerant)
    const norm = (s: string) => s.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const targetBranch = norm(branch);
    const targetSection = norm(section);

    // Fetch students for this class (case-insensitive for branch)
    const candidates = await studentsCol
      .find({ branch: { $regex: `^${branch.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } }, { projection: { password: 0 } })
      .toArray();
    const students = candidates.filter((s: any) => norm(String(s.branch ?? "")) === targetBranch && norm(String(s.section ?? "")) === targetSection);

    // Sessions per subject (distinct sessionIds)
    const sessionsAgg = await attendanceCol
      .aggregate([
        { $match: { branch: { $regex: new RegExp(`^${branch}$`, "i") }, section } },
        { $group: { _id: { subject: "$subject", sessionId: "$sessionId" } } },
        { $group: { _id: "$_id.subject", sessions: { $sum: 1 } } },
      ])
      .toArray();
    const sessionsBySubject: Record<string, number> = Object.fromEntries(sessionsAgg.map((d: any) => [d._id, d.sessions]));
    const subjects = Object.keys(sessionsBySubject).sort();

    // Present counts per student per subject
    const presentAgg = await attendanceCol
      .aggregate([
        { $match: { branch: { $regex: new RegExp(`^${branch}$`, "i") }, section, status: "Present" } },
        { $group: { _id: { rollNumber: "$rollNumber", subject: "$subject" }, present: { $sum: 1 } } },
      ])
      .toArray();

    const presentMap: Record<string, Record<string, number>> = {};
    for (const row of presentAgg) {
      const roll = row._id.rollNumber;
      const subj = row._id.subject;
      if (!presentMap[roll]) presentMap[roll] = {};
      presentMap[roll][subj] = row.present;
    }

    // Build student summaries
    const studentSummaries = students.map((s: any) => {
      const bySubject: Record<string, { present: number; total: number; percentage: number | null }> = {};
      let overallPresent = 0;
      let overallTotal = 0;
      for (const subj of subjects) {
        const total = sessionsBySubject[subj] ?? 0;
        const present = presentMap[s.rollNumber]?.[subj] ?? 0;
        const pct = total > 0 ? Math.round((present / total) * 100) : null;
        bySubject[subj] = { present, total, percentage: pct };
        overallPresent += present;
        overallTotal += total;
      }
      const overallPercentage = overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : null;
      return {
        rollNumber: s.rollNumber,
        name: s.name,
        branch: s.branch,
        section: s.section,
        bySubject,
        overall: { present: overallPresent, total: overallTotal, percentage: overallPercentage },
      };
    });

    res.status(200).json({ success: true, branch, section, subjects, sessionsBySubject, students: studentSummaries });
  } catch (error: any) {
    console.error("❌ Attendance summary error:", error);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to compute attendance summary" });
  }
}
