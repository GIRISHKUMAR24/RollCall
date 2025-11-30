export interface User {
  _id?: string;
  name: string;
  email: string;
  role: "student" | "teacher" | "principal";
  createdAt: Date;
  rollNumber?: string; // For students
  branch?: string; // For students
  section?: string; // For students
  teacherId?: string; // For teachers
  adminCode?: string; // For principals
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  role: "student" | "teacher" | "principal";
  roleSpecificId?: string; // rollNumber, teacherId, or adminCode
  branch?: string; // for students
  section?: string; // for students
}

export interface SignupResponse {
  message: string;
  collection: string;
  userId: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  role: "student" | "teacher" | "principal";
}

export interface LoginResponse {
  success: boolean;
  user: User;
  token: string;
}
