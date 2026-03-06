import { User } from "../../shared/types";
import { API_BASE } from "./env";

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

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  role: "student" | "teacher" | "principal";
  roleSpecificId?: string; // rollNumber, teacherId, or adminCode
  branch?: string;
  section?: string;
  phone?: string; // for students
}

export interface AuthError {
  error: string;
  message: string;
}

// Authentication API functions
export const authAPI = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error: AuthError = await response.json();
      throw new Error(error.message || "Login failed");
    }

    return response.json();
  },

  async signup(
    userData: SignupRequest,
  ): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE}/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error: AuthError = await response.json();
      throw new Error(error.message || "Signup failed");
    }

    return response.json();
  },

  async healthCheck(): Promise<any> {
    const response = await fetch(`${API_BASE}/health`);
    return response.json();
  },
};

// Local storage utilities
export const authStorage = {
  setUser(user: User): void {
    localStorage.setItem("user", JSON.stringify(user));
  },

  getUser(): User | null {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },

  setToken(token: string): void {
    localStorage.setItem("authToken", token);
  },

  getToken(): string | null {
    return localStorage.getItem("authToken");
  },

  clear(): void {
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    // Clear all legacy storage items that might exist
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    localStorage.removeItem("roleId");
  },

  isAuthenticated(): boolean {
    return !!(this.getUser() && this.getToken());
  },
};

// Authentication context helpers
export const authHelpers = {
  isLoggedIn(): boolean {
    return authStorage.isAuthenticated();
  },

  getCurrentUser(): User | null {
    return authStorage.getUser();
  },

  getUserRole(): string | null {
    const user = authStorage.getUser();
    return user?.role || null;
  },

  getToken(): string | null {
    return authStorage.getToken();
  },

  logout(): void {
    authStorage.clear();
  },
};
