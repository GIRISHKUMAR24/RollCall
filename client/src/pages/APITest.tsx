import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Users,
  CheckCircle,
  XCircle,
  Loader2,
  Server,
  User,
  Mail,
  Lock,
  UserCheck,
  LogIn,
  UserPlus,
} from "lucide-react";
import { authAPI, authHelpers } from "@/lib/auth";
import { API_BASE } from "@/lib/env";

interface APIResponse {
  success: boolean;
  data: any;
  error?: string;
  timestamp?: string;
}

export default function APITest() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<APIResponse[]>([]);

  // Form states for signup
  const [signupData, setSignupData] = useState({
    name: "Girish Kumar",
    email: "girishkumar24122006@gmail.com",
    password: "password123",
    role: "student",
    roleSpecificId: "2024001",
  });

  // Form states for login
  const [loginData, setLoginData] = useState({
    email: "girishkumar24122006@gmail.com",
    password: "password123",
    role: "student",
  });

  const [dbStats, setDbStats] = useState<any>(null);

  const addResult = (result: APIResponse) => {
    setResults((prev) => [
      { ...result, timestamp: new Date().toLocaleTimeString() },
      ...prev,
    ]);
  };

  const testHealthCheck = async () => {
    setIsLoading(true);
    try {
      const data = await authAPI.healthCheck();
      addResult({
        success: true,
        data,
      });
    } catch (error: any) {
      addResult({
        success: false,
        data: null,
        error: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testSignup = async () => {
    setIsLoading(true);
    try {
      const data = await authAPI.signup({
        name: signupData.name,
        email: signupData.email,
        password: signupData.password,
        role: signupData.role as "student" | "teacher" | "principal",
        roleSpecificId: signupData.roleSpecificId,
      });
      addResult({
        success: true,
        data,
      });
    } catch (error: any) {
      addResult({
        success: false,
        data: null,
        error: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testLogin = async () => {
    setIsLoading(true);
    try {
      const data = await authAPI.login({
        email: loginData.email,
        password: loginData.password,
        role: loginData.role as "student" | "teacher" | "principal",
      });
      addResult({
        success: true,
        data: { ...data, token: "***hidden***" }, // Hide token in display
      });
    } catch (error: any) {
      addResult({
        success: false,
        data: null,
        error: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkCurrentAuth = () => {
    const user = authHelpers.getCurrentUser();
    const token = authHelpers.getToken();
    const isLoggedIn = authHelpers.isLoggedIn();

    addResult({
      success: true,
      data: {
        isLoggedIn,
        user,
        hasToken: !!token,
      },
    });
  };

  const clearAuth = () => {
    authHelpers.logout();
    addResult({
      success: true,
      data: { message: "Authentication cleared" },
    });
  };

  const testEmailDebug = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/email/debug`);
      const data = await response.json();
      addResult({
        success: response.ok,
        data,
        error: response.ok ? undefined : data.message,
      });
    } catch (error: any) {
      addResult({
        success: false,
        data: null,
        error: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testSingleEmail = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/email/test-single`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail: "girishkumar24122006@gmail.com" }),
      });
      const data = await response.json();
      addResult({
        success: response.ok,
        data,
        error: response.ok ? undefined : data.message,
      });
    } catch (error: any) {
      addResult({
        success: false,
        data: null,
        error: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="border-0 shadow-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="w-6 h-6 text-blue-600" />
              <span>Authentication API Test Dashboard</span>
            </CardTitle>
            <CardDescription>
              Test the attendance management system authentication endpoints
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Health Check */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Server className="w-5 h-5 text-green-600" />
                <span>Health Check</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={testHealthCheck}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Test API Health
              </Button>
              <Button
                onClick={testEmailDebug}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Test Email Config
              </Button>
              <Button
                onClick={testEmailDebug}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Debug Email Setup
              </Button>
              <Button
                onClick={testSingleEmail}
                disabled={isLoading}
                variant="default"
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Send Test Email
              </Button>
            </CardContent>
          </Card>

          {/* Current Auth Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-purple-600" />
                <span>Auth Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={checkCurrentAuth}
                variant="outline"
                className="w-full"
              >
                <User className="w-4 h-4 mr-2" />
                Check Current Auth
              </Button>
              <Button
                onClick={clearAuth}
                variant="destructive"
                className="w-full"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Clear Auth
              </Button>
            </CardContent>
          </Card>

          {/* Signup Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <span>Test Signup</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="signup-name">Name</Label>
                  <Input
                    id="signup-name"
                    value={signupData.name}
                    onChange={(e) =>
                      setSignupData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Full Name"
                  />
                </div>
                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={signupData.email}
                    onChange={(e) =>
                      setSignupData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signupData.password}
                    onChange={(e) =>
                      setSignupData((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    placeholder="Password"
                  />
                </div>
                <div>
                  <Label htmlFor="signup-role">Role</Label>
                  <Select
                    value={signupData.role}
                    onValueChange={(value) =>
                      setSignupData((prev) => ({ ...prev, role: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="principal">Principal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="signup-id">Role ID</Label>
                <Input
                  id="signup-id"
                  value={signupData.roleSpecificId}
                  onChange={(e) =>
                    setSignupData((prev) => ({
                      ...prev,
                      roleSpecificId: e.target.value,
                    }))
                  }
                  placeholder="Roll Number / Teacher ID / Admin Code"
                />
              </div>
              <Button
                onClick={testSignup}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                Test Signup
              </Button>
            </CardContent>
          </Card>

          {/* Login Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <LogIn className="w-5 h-5 text-green-600" />
                <span>Test Login</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  value={loginData.email}
                  onChange={(e) =>
                    setLoginData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  placeholder="Password"
                />
              </div>
              <div>
                <Label htmlFor="login-role">Role</Label>
                <Select
                  value={loginData.role}
                  onValueChange={(value) =>
                    setLoginData((prev) => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="principal">Principal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={testLogin}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <LogIn className="w-4 h-4 mr-2" />
                )}
                Test Login
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>API Test Results</span>
              {results.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {results.length} result{results.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No API tests run yet. Try the buttons above!</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-l-4 ${
                      result.success
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                        : "border-red-500 bg-red-50 dark:bg-red-900/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {result.success ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span className="font-medium">
                          {result.success ? "Success" : "Error"}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {result.timestamp}
                      </span>
                    </div>
                    {result.error && (
                      <p className="text-red-700 dark:text-red-300 mb-2 font-medium">
                        {result.error}
                      </p>
                    )}
                    {result.data && (
                      <pre className="text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
