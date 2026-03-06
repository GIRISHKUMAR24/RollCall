import { Request, Response } from "express";
import { getCollection } from "../database";

export async function handleGetStudentsByClass(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { branch, section } = req.query as {
      branch?: string;
      section?: string;
    };

    if (!branch || !section) {
      res.status(400).json({
        error: "Validation Error",
        message: "Branch and Section are required",
      });
      return;
    }

    const studentsCollection = getCollection("students");

    const norm = (s: string) => s.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const targetBranch = norm(branch);
    const targetSection = norm(section);

    // First, fetch by branch (case-insensitive) to narrow results
    const candidates = await studentsCollection
      .find(
        { branch: { $regex: `^${branch.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
        { projection: { password: 0 } },
      )
      .toArray();

    // Then, normalize and filter by section in Node to handle values like "2", "Section 2", "sec-2", "B"
    const students = candidates.filter((s: any) => {
      const studentSection = norm(String(s.section ?? ""));
      const studentBranch = norm(String(s.branch ?? ""));
      return studentBranch === targetBranch && studentSection === targetSection;
    });

    res.status(200).json({
      success: true,
      count: students.length,
      students,
    });
  } catch (error) {
    console.error("❌ Failed to fetch students by class:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Unable to fetch students",
    });
  }
}

/**
 * Search a student by roll number and return their profile + real attendance data.
 * GET /api/students/search?rollNumber=XXX
 */
export async function handleSearchStudentByRollNo(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { rollNumber } = req.query as { rollNumber?: string };

    if (!rollNumber || !rollNumber.trim()) {
      res.status(400).json({
        error: "Validation Error",
        message: "rollNumber query parameter is required",
      });
      return;
    }

    const studentsCol = getCollection("students");
    const attendanceCol = getCollection("attendance");

    // Find student (case-insensitive roll number search)
    const student = await studentsCol.findOne(
      { rollNumber: { $regex: `^${rollNumber.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
      { projection: { password: 0 } },
    );

    if (!student) {
      res.status(404).json({
        error: "Not Found",
        message: `No student found with roll number: ${rollNumber}`,
      });
      return;
    }

    // Fetch all attendance records for this student
    const records = await attendanceCol
      .find({ rollNumber: student.rollNumber })
      .sort({ timestamp: -1 })
      .toArray();

    // Group by subject for summary
    const subjectMap: Record<string, { present: number; total: number }> = {};
    for (const rec of records) {
      const subj: string = rec.subject ?? "Unknown";
      if (!subjectMap[subj]) subjectMap[subj] = { present: 0, total: 0 };
      subjectMap[subj].total += 1;
      if (rec.status === "Present") subjectMap[subj].present += 1;
    }

    const subjectWiseAttendance = Object.entries(subjectMap).map(([subject, data]) => ({
      subject,
      present: data.present,
      total: data.total,
      percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
    }));

    // Overall attendance
    const totalPresent = records.filter((r: any) => r.status === "Present").length;
    const overallAttendance = records.length > 0
      ? Math.round((totalPresent / records.length) * 100)
      : 0;

    // Recent attendance (last 10 records)
    const recentAttendance = records.slice(0, 10).map((r: any) => ({
      subject: r.subject ?? "Unknown",
      date: r.timestamp ? new Date(r.timestamp).toLocaleDateString("en-IN") : "N/A",
      time: r.timestamp ? new Date(r.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "N/A",
      status: r.status ?? "Unknown",
    }));

    res.status(200).json({
      success: true,
      student: {
        rollNo: student.rollNumber,
        name: student.name,
        email: student.email,
        branch: student.branch,
        section: student.section,
        class: `${student.branch} - Section ${student.section}`,
        phone: student.phone ?? "Not provided",
        parentContact: student.parentContact ?? "Not provided",
        address: student.address ?? "Not provided",
        overallAttendance,
        subjectWiseAttendance,
        recentAttendance,
      },
    });
  } catch (error) {
    console.error("❌ Failed to search student by roll number:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Unable to search student",
    });
  }
}
