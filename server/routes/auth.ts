import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  getCollectionByRole,
  SignupRequest,
  SignupResponse,
  ErrorResponse,
  User,
} from "../database";

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || "attendancehub-secret-key-2024";

export async function handleSignup(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const {
      name,
      email,
      password,
      role,
      roleSpecificId,
      branch,
      section,
      phone,
    }: SignupRequest & {
      roleSpecificId?: string;
      branch?: string;
      section?: string;
      phone?: string;
    } = req.body;

    // Input validation
    if (!name || !email || !password || !role) {
      res.status(400).json({
        error: "Validation Error",
        message: "All fields are required: name, email, password, role",
      } as ErrorResponse);
      return;
    }

    // Validate role
    if (!["student", "teacher", "principal"].includes(role)) {
      res.status(400).json({
        error: "Validation Error",
        message: "Role must be one of: student, teacher, principal",
      } as ErrorResponse);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        error: "Validation Error",
        message: "Please provide a valid email address",
      } as ErrorResponse);
      return;
    }

    // Validate Gmail only
    if (!email.toLowerCase().endsWith("@gmail.com")) {
      res.status(400).json({
        error: "Validation Error",
        message: "Only Gmail addresses (@gmail.com) are allowed",
      } as ErrorResponse);
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      res.status(400).json({
        error: "Validation Error",
        message: "Password must be at least 6 characters long",
      } as ErrorResponse);
      return;
    }

    // Get the appropriate collection based on role
    const collection = getCollectionByRole(role);
    const collectionName = `${role}s`; // students, teachers, principals

    // Check if email already exists in the collection
    const existingUser = await collection.findOne({
      email: email.toLowerCase(),
    });
    if (existingUser) {
      res.status(409).json({
        error: "Conflict",
        message: `Email already exists in ${collectionName} collection`,
      } as ErrorResponse);
      return;
    }

    // Hash the password
    console.log("🔐 Hashing password...");
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user object
    const newUser: User = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
      createdAt: new Date(),
    };

    // Add role-specific data
    if (role === "student") {
      if (!roleSpecificId || !branch || !section) {
        res.status(400).json({
          error: "Validation Error",
          message: "Roll number, Branch and Section are required for students",
        } as ErrorResponse);
        return;
      }
      newUser.rollNumber = roleSpecificId;
      newUser.branch = branch.trim();
      newUser.section = section.trim();
      if (!phone || !phone.trim()) {
        res.status(400).json({
          error: "Validation Error",
          message: "Phone number is required for students",
        } as ErrorResponse);
        return;
      }
      newUser.phone = phone.trim();
    } else if (role === "teacher") {
      if (roleSpecificId) newUser.teacherId = roleSpecificId;
    } else if (role === "principal") {
      if (roleSpecificId) newUser.adminCode = roleSpecificId;
    }

    // Insert user into the appropriate collection
    console.log(`📝 Inserting user into ${collectionName} collection...`);
    const result = await collection.insertOne(newUser);

    console.log(
      `✅ User successfully created in ${collectionName} collection with ID: ${result.insertedId}`,
    );

    // Return success response
    res.status(201).json({
      message: "Signup successful",
      collection: collectionName,
      userId: result.insertedId.toString(),
    } as SignupResponse);
  } catch (error: any) {
    console.error("❌ Signup error:", error);

    // Handle MongoDB duplicate key error (in case unique index wasn't checked properly)
    if (error.code === 11000) {
      res.status(409).json({
        error: "Conflict",
        message: "Email already exists in this collection",
      } as ErrorResponse);
      return;
    }

    // Handle other errors
    res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred during signup. Please try again.",
    } as ErrorResponse);
  }
}

// Login endpoint
export async function handleLogin(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, role } = req.body;

    // Input validation
    if (!email || !password || !role) {
      res.status(400).json({
        error: "Validation Error",
        message: "Email, password, and role are required",
      } as ErrorResponse);
      return;
    }

    // Validate role
    if (!["student", "teacher", "principal"].includes(role)) {
      res.status(400).json({
        error: "Validation Error",
        message: "Role must be one of: student, teacher, principal",
      } as ErrorResponse);
      return;
    }

    // Get the appropriate collection based on role
    const collection = getCollectionByRole(role);

    // Find user by email in the specified role collection
    const user = await collection.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({
        error: "Authentication Error",
        message: "Invalid email or password",
      } as ErrorResponse);
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({
        error: "Authentication Error",
        message: "Invalid email or password",
      } as ErrorResponse);
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    // Remove password from user object before sending
    const { password: _, ...userWithoutPassword } = user;

    console.log(`✅ User ${user.email} logged in successfully as ${role}`);

    res.status(200).json({
      success: true,
      user: userWithoutPassword,
      token,
    });
  } catch (error: any) {
    console.error("❌ Login error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred during login. Please try again.",
    } as ErrorResponse);
  }
}

// Health check endpoint to verify database connectivity
export async function handleHealthCheck(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    // Try to access each collection to verify they exist
    const studentCollection = getCollectionByRole("student");
    const teacherCollection = getCollectionByRole("teacher");
    const principalCollection = getCollectionByRole("principal");

    // Test database connectivity
    await Promise.all([
      studentCollection.estimatedDocumentCount(),
      teacherCollection.estimatedDocumentCount(),
      principalCollection.estimatedDocumentCount(),
    ]);

    res.status(200).json({
      message: "Database connection healthy",
      database: "attendanceDB",
      collections: ["students", "teachers", "principals"],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("�� Health check failed:", error);
    res.status(500).json({
      error: "Database Connection Error",
      message: "Unable to connect to database",
    });
  }
}
