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
