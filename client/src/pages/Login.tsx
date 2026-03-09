import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authAPI, authStorage } from "@/lib/auth";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GraduationCap,
  UserCheck,
  Shield,
  Eye,
  EyeOff,
  UserPlus,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Gmail validation
    if (!email.endsWith("@gmail.com")) {
      setError("Only Gmail addresses (@gmail.com) are allowed");
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.login({
        email,
        password,
        role: role as "student" | "teacher" | "principal",
      });

      // Store user data and token
      authStorage.setUser(response.user);
      authStorage.setToken(response.token);

      // Navigate to dashboard
      const redirectTo = searchParams.get("redirectTo");
      if (redirectTo) {
        navigate(redirectTo);
      } else {
        navigate(`/${role}-dashboard`);
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const roleIcons = {
    student: GraduationCap,
    teacher: UserCheck,
    principal: Shield,
  };

  const roleColors = {
    student:
      "bg-blue-50/70 border-blue-200/60 text-blue-700 dark:bg-blue-900/30 dark:border-blue-500/40 dark:text-blue-300",
    teacher:
      "bg-green-50/70 border-green-200/60 text-green-700 dark:bg-green-900/30 dark:border-green-500/40 dark:text-green-300",
    principal:
      "bg-purple-50/70 border-purple-200/60 text-purple-700 dark:bg-purple-900/30 dark:border-purple-500/40 dark:text-purple-300",
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden
      bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100
      dark:bg-gradient-to-br dark:from-gray-900 dark:via-black dark:to-gray-800"
    >
      {/* Light mode clean background */}
      <div className="absolute inset-0 dark:hidden overflow-hidden">
        {/* Simple elegant gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-purple-50/80"></div>

        {/* Subtle floating elements */}
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-200/30 to-indigo-200/30 rounded-full filter blur-3xl animate-pulse"
          style={{ animationDuration: "8s" }}
        ></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-200/25 to-pink-200/25 rounded-full filter blur-3xl animate-pulse animation-delay-4000"
          style={{ animationDuration: "10s" }}
        ></div>

        {/* Minimal texture */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 50px 50px, rgba(99, 102, 241, 0.1) 1%, transparent 1%)`,
            backgroundSize: "100px 100px",
          }}
        ></div>
      </div>

      {/* Dark mode clean effects */}
      <div className="absolute inset-0 hidden dark:block overflow-hidden">
        {/* Simple ambient glows */}
        <div
          className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-gradient-radial from-blue-500/20 via-blue-500/5 to-transparent rounded-full filter blur-3xl animate-pulse"
          style={{ animationDuration: "6s" }}
        ></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-gradient-radial from-purple-500/15 via-purple-500/5 to-transparent rounded-full filter blur-3xl animate-pulse animation-delay-3000"
          style={{ animationDuration: "8s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-radial from-indigo-400/10 via-indigo-400/3 to-transparent rounded-full filter blur-2xl animate-pulse animation-delay-6000"
          style={{ animationDuration: "10s" }}
        ></div>
      </div>

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="mx-auto mb-6 flex justify-center">
            <img
              src="/rollcall-logo.png"
              alt="RollCall Logo"
              className="w-32 h-32 object-contain drop-shadow-xl hover:scale-105 transition-transform duration-300"
            />
          </div>
          <h1 className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2 tracking-tight">
            RollCall
          </h1>
          <p className="text-xl text-green-600 dark:text-green-400 font-light italic">
            Only you can mark you.
          </p>
        </div>

        <Card className="border-0 shadow-2xl backdrop-blur-xl bg-white/90 dark:bg-black/40 relative overflow-hidden group transition-all duration-500 hover:shadow-2xl hover:-translate-y-0.5 hover:ring-1 hover:ring-indigo-500/30">
          {/* Enhanced Card Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-white/30 to-purple-50/50 dark:from-indigo-900/20 dark:via-gray-800/30 dark:to-purple-900/20"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-full"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-tr-full"></div>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-semibold text-center dark:text-white">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-center dark:text-gray-300">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={role} onValueChange={setRole} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-white/60 dark:bg-black/20 dark:border dark:border-purple-500/20 backdrop-blur-sm hover:shadow-lg hover:bg-white/80 dark:hover:bg-black/30 transition-all duration-300">
                <TabsTrigger
                  value="student"
                  className="text-xs dark:data-[state=active]:bg-blue-500/20 dark:data-[state=active]:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all duration-200"
                >
                  Student
                </TabsTrigger>
                <TabsTrigger
                  value="teacher"
                  className="text-xs dark:data-[state=active]:bg-green-500/20 dark:data-[state=active]:text-green-300 hover:bg-green-50 dark:hover:bg-green-500/10 transition-all duration-200"
                >
                  Teacher
                </TabsTrigger>
                <TabsTrigger
                  value="principal"
                  className="text-xs dark:data-[state=active]:bg-purple-500/20 dark:data-[state=active]:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-all duration-200"
                >
                  Principal
                </TabsTrigger>
              </TabsList>

              {["student", "teacher", "principal"].map((userRole) => {
                const Icon = roleIcons[userRole as keyof typeof roleIcons];
                return (
                  <TabsContent key={userRole} value={userRole} className="mt-0">
                    <div
                      className={`p-4 rounded-lg border-2 mb-6 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg dark:hover:shadow-xl cursor-pointer ${roleColors[userRole as keyof typeof roleColors]} dark:shadow-lg`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5" />
                        <div>
                          <h3 className="font-semibold capitalize">
                            {userRole} Portal
                          </h3>
                          <p className="text-sm opacity-80">
                            {userRole === "student" &&
                              "Access your attendance records and scan QR codes"}
                            {userRole === "teacher" &&
                              "Generate QR codes and manage class attendance"}
                            {userRole === "principal" &&
                              "Monitor attendance analytics and reports"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="dark:text-gray-200">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 bg-white/80 dark:bg-black/30 border-gray-200/60 dark:border-gray-600/60 dark:text-white dark:placeholder:text-gray-400 backdrop-blur-sm hover:border-blue-400 dark:hover:border-cyan-400 focus:border-blue-500 dark:focus:border-cyan-500 transition-all duration-300 hover:shadow-md"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="dark:text-gray-200">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10 bg-white/80 dark:bg-black/30 border-gray-200/60 dark:border-gray-600/60 dark:text-white dark:placeholder:text-gray-400 backdrop-blur-sm hover:border-blue-400 dark:hover:border-cyan-400 focus:border-blue-500 dark:focus:border-cyan-500 transition-all duration-300 hover:shadow-md"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 hover:scale-110 transition-all duration-200"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold shadow-2xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-lg relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative z-10">
                  {loading
                    ? "Signing In..."
                    : `Sign In as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
                </span>
              </Button>
            </form>

            <div className="mt-6 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-black/40 px-2 text-gray-500 dark:text-gray-400">
                    New to AttendanceHub?
                  </span>
                </div>
              </div>

              <Link to="/signup">
                <Button
                  variant="outline"
                  className="w-full h-11 border-2 bg-white/50 dark:bg-black/20 dark:border-purple-500/30 dark:text-purple-300 hover:bg-white/70 dark:hover:bg-purple-500/10 dark:hover:border-purple-400 dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all duration-300 backdrop-blur-sm"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create New Account
                </Button>
              </Link>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400 text-center">
                  {error}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Built with Supabase • Cursor.so • Tailwind CSS</p>
        </div>
      </div>
    </div>
  );
}
