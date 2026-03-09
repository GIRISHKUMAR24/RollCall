import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE } from "@/lib/env";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  CheckCircle,
  XCircle,
  Loader2,
  Settings,
  Send,
  AlertCircle,
} from "lucide-react";

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  timestamp: string;
}

export default function EmailTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [testEmail, setTestEmail] = useState("girishkumar24122006@gmail.com");
  const [results, setResults] = useState<TestResult[]>([]);

  const addResult = (result: Omit<TestResult, "timestamp">) => {
    setResults((prev) => [
      {
        ...result,
        timestamp: new Date().toLocaleString(),
      },
      ...prev,
    ]);
  };

  const testEmailConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/email/config`);
      const data = await response.json();

      addResult({
        success: response.ok,
        message: "Email Configuration Check",
        data,
        error: response.ok ? undefined : data.message,
      });
    } catch (error: any) {
      addResult({
        success: false,
        message: "Configuration Check Failed",
        error: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testDirectEmail = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/email/direct-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail }),
      });

      const data = await response.json();

      addResult({
        success: response.ok,
        message: response.ok
          ? "Test Email Sent Successfully!"
          : "Email Test Failed",
        data,
        error: response.ok ? undefined : data.message,
      });
    } catch (error: any) {
      addResult({
        success: false,
        message: "Direct Email Test Failed",
        error: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testAttendanceEmail = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/email/send-attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          students: [
            {
              email: testEmail,
              name: "Test Student",
              rollNo: "TEST001",
            },
          ],
          classDetails: {
            subject: "Test Subject",
            branch: "Test Branch",
            section: "1",
            teacherLocation: { lat: 17.4065, lng: 78.4772 },
          },
        }),
      });

      const data = await response.json();

      addResult({
        success: response.ok,
        message: response.ok
          ? "Attendance Email Sent!"
          : "Attendance Email Failed",
        data,
        error: response.ok ? undefined : data.message,
      });
    } catch (error: any) {
      addResult({
        success: false,
        message: "Attendance Email Test Failed",
        error: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-0 shadow-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="w-6 h-6 text-blue-600" />
              <span>Email System Diagnostics</span>
            </CardTitle>
            <CardDescription>
              Debug and test the Gmail SMTP email delivery system
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Test Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-gray-600" />
                <span>Email Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="testEmail">Test Email Address</Label>
                <Input
                  id="testEmail"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Enter email to test"
                  className="mt-1"
                />
              </div>

              <Button
                onClick={testEmailConfig}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Settings className="w-4 h-4 mr-2" />
                )}
                Check Email Configuration
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Send className="w-5 h-5 text-green-600" />
                <span>Email Tests</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={testDirectEmail}
                disabled={isLoading || !testEmail}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Send Direct Test Email
              </Button>

              <Button
                onClick={testAttendanceEmail}
                disabled={isLoading || !testEmail}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Send Attendance QR Email
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <span>Test Results</span>
              {results.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {results.length} test{results.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No tests run yet. Try the buttons above!</p>
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
                        <span className="font-medium">{result.message}</span>
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
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                          View Details
                        </summary>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded mt-2 overflow-x-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                  Testing Instructions
                </h4>
                <ol className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  <li>
                    1. First check email configuration to verify Gmail
                    credentials
                  </li>
                  <li>
                    2. Send a direct test email to verify basic Gmail SMTP works
                  </li>
                  <li>
                    3. Test the attendance QR email to verify complete system
                  </li>
                  <li>
                    4. Check the target email inbox (including spam folder)
                  </li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
