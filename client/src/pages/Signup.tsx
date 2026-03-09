import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "@/lib/auth";
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
  ArrowLeft,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [role, setRole] = useState("student");
  const [branch, setBranch] = useState("");
  const [section, setSection] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  // Clear role-specific field when role changes
  useEffect(() => {
    setRollNumber("");
    setBranch("");
    setSection("");
    setPhone("");
  }, [role]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Gmail validation
    if (!email.endsWith("@gmail.com")) {
      setError("Only Gmail addresses (@gmail.com) are allowed");
      setLoading(false);
      return;
    }

    // Validation
    if (password !== confirmPassword) {
      setError("Passwords don't match!");
      setLoading(false);
      return;
    }

    // Role-specific validation
    if (role === "student" && (!rollNumber || !branch || !section || !phone)) {
      setError("Roll number, Branch, Section and Phone number are required for students");
      setLoading(false);
      return;
    }
    if (role === "teacher" && !rollNumber) {
      setError("Teacher ID is required for teachers");
      setLoading(false);
      return;
    }
    if (role === "principal" && !rollNumber) {
      setError("Admin code is required for principals");
      setLoading(false);
      return;
    }

    if (!email || !password || !firstName || !lastName) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    try {
      await authAPI.signup({
        name: `${firstName} ${lastName}`.trim(),
        email: email.trim(),
        password,
        role: role as "student" | "teacher" | "principal",
        roleSpecificId: rollNumber.trim() || undefined,
        branch: role === "student" ? branch.trim() : undefined,
        section: role === "student" ? section.trim() : undefined,
        phone: role === "student" ? phone.trim() : undefined,
      });

      setSuccess(`✅ Account created successfully! Welcome ${firstName}!`);

      // Navigate to login after successful signup
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Signup failed. Please try again.");
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
      {/* Light mode beautiful background */}
      <div className="absolute inset-0 dark:hidden overflow-hidden">
        {/* Primary floating blobs */}
        <div className="absolute top-0 -left-4 w-80 h-80 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-80 h-80 bg-gradient-to-r from-yellow-300 to-orange-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-80 h-80 bg-gradient-to-r from-pink-400 to-red-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-gradient-to-r from-blue-300 to-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-6000"></div>

        {/* Secondary ambient blobs */}
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-gradient-to-r from-emerald-300 to-teal-400 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob animation-delay-3000"></div>
        <div className="absolute bottom-1/3 right-1/3 w-56 h-56 bg-gradient-to-r from-violet-300 to-purple-400 rounded-full mix-blend-multiply filter blur-2xl opacity-60 animate-blob animation-delay-5000"></div>
        <div className="absolute top-2/3 left-1/6 w-48 h-48 bg-gradient-to-r from-rose-300 to-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob animation-delay-7000"></div>

        {/* Micro details */}
        <div className="absolute top-16 right-32 w-32 h-32 bg-gradient-to-r from-amber-200 to-yellow-300 rounded-full mix-blend-multiply filter blur-lg opacity-30 animate-blob animation-delay-8000"></div>
        <div className="absolute bottom-20 left-32 w-40 h-40 bg-gradient-to-r from-sky-200 to-blue-300 rounded-full mix-blend-multiply filter blur-lg opacity-35 animate-blob animation-delay-9000"></div>

        {/* Subtle texture overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, rgba(255,255,255,0.2) 2%, transparent 2%),
                           radial-gradient(circle at 75px 75px, rgba(255,255,255,0.1) 1%, transparent 1%)`,
            backgroundSize: "100px 100px",
          }}
        ></div>
      </div>

      {/* Dark mode neon effects */}
      <div className="absolute inset-0 hidden dark:block overflow-hidden">
        {/* Primary neon orbs with enhanced glow */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-radial from-blue-500/30 via-blue-500/10 to-transparent rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-radial from-purple-500/30 via-purple-500/10 to-transparent rounded-full filter blur-3xl animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-radial from-cyan-400/20 via-cyan-400/5 to-transparent rounded-full filter blur-2xl animate-ping"></div>

        {/* Secondary neon sources */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-gradient-radial from-emerald-400/25 via-emerald-400/8 to-transparent rounded-full filter blur-2xl animate-pulse animation-delay-3000"></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-radial from-pink-400/20 via-pink-400/6 to-transparent rounded-full filter blur-2xl animate-pulse animation-delay-5000"></div>
        <div className="absolute top-1/3 right-1/3 w-56 h-56 bg-gradient-radial from-violet-400/20 via-violet-400/7 to-transparent rounded-full filter blur-xl animate-pulse animation-delay-4000"></div>
        <div className="absolute bottom-1/3 left-1/3 w-72 h-72 bg-gradient-radial from-orange-400/15 via-orange-400/5 to-transparent rounded-full filter blur-xl animate-pulse animation-delay-6000"></div>

        {/* Rotating neon rings */}
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-cyan-400/10 animate-spin"
          style={{ animationDuration: "20s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-purple-400/15 animate-spin"
          style={{ animationDuration: "15s", animationDirection: "reverse" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border border-blue-400/20 animate-spin"
          style={{ animationDuration: "10s" }}
        ></div>

        {/* Enhanced neon grid with multiple layers */}
        <div className="absolute inset-0 opacity-8">
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `
              linear-gradient(rgba(0, 255, 255, 0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 255, 0.15) 1px, transparent 1px),
              linear-gradient(rgba(255, 0, 255, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 0, 255, 0.08) 1px, transparent 1px)
            `,
              backgroundSize: "60px 60px, 60px 60px, 120px 120px, 120px 120px",
            }}
          ></div>
        </div>

        {/* Scanning light beam effect */}
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-2 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent animate-scan"></div>
        </div>

        {/* Floating neon particles */}
        <div className="absolute top-1/6 left-1/6 w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50 animate-float"></div>
        <div className="absolute top-1/3 right-1/5 w-1.5 h-1.5 bg-purple-400 rounded-full shadow-lg shadow-purple-400/50 animate-float animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-2.5 h-2.5 bg-pink-400 rounded-full shadow-lg shadow-pink-400/50 animate-float animation-delay-4000"></div>
        <div className="absolute top-2/3 right-1/6 w-1 h-1 bg-emerald-400 rounded-full shadow-lg shadow-emerald-400/50 animate-float animation-delay-3000"></div>
        <div className="absolute bottom-1/6 right-1/3 w-2 h-2 bg-orange-400 rounded-full shadow-lg shadow-orange-400/50 animate-float animation-delay-5000"></div>

        {/* Ambient light streaks */}
        <div className="absolute top-0 left-1/4 w-0.5 h-full bg-gradient-to-b from-transparent via-blue-400/20 to-transparent animate-pulse"></div>
        <div className="absolute top-0 right-1/3 w-0.5 h-full bg-gradient-to-b from-transparent via-purple-400/15 to-transparent animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/3 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent animate-pulse animation-delay-4000"></div>
      </div>

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Back to login */}
      <div className="absolute top-4 left-4 z-10">
        <Link to="/">
          <Button
            variant="outline"
            size="sm"
            className="backdrop-blur-sm bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 border-white/20 dark:border-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>
        </Link>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex justify-center">
            <img
              src="/rollcall-logo.png"
              alt="RollCall Logo"
              className="w-20 h-20 object-contain drop-shadow-lg"
            />
          </div>
          <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
            RollCall
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Create your account to get started
          </p>
        </div>

        <Card className="border-0 shadow-xl backdrop-blur-md bg-white/70 dark:bg-black/30 dark:shadow-2xl dark:shadow-purple-500/20 dark:border dark:border-purple-500/20 dark:shadow-[0_0_50px_rgba(168,85,247,0.4)] relative before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-purple-500/10 before:via-transparent before:to-cyan-500/10 before:blur-sm before:opacity-0 dark:before:opacity-100 before:transition-opacity before:duration-500 hover:scale-[1.01] hover:shadow-2xl dark:hover:shadow-[0_0_60px_rgba(168,85,247,0.5)] transition-all duration-300">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-semibold text-center dark:text-white">
              Create Account
            </CardTitle>
            <CardDescription className="text-center dark:text-gray-300">
              Sign up for your AttendanceHub account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={role} onValueChange={setRole} className="w-full">
              {/* Debug info */}
              <div className="text-xs text-center mb-2 text-gray-500 dark:text-gray-400">
                Active tab: {role}
              </div>
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-white/60 dark:bg-black/20 backdrop-blur-sm hover:shadow-lg hover:bg-white/80 dark:hover:bg-black/30 transition-all duration-300">
                <TabsTrigger
                  value="student"
                  className="text-xs data-[state=active]:bg-blue-500/30 data-[state=active]:text-blue-800 dark:data-[state=active]:bg-blue-500/40 dark:data-[state=active]:text-blue-200 hover:bg-blue-50/80 dark:hover:bg-blue-500/20 transition-all duration-200 backdrop-blur-sm"
                >
                  Student
                </TabsTrigger>
                <TabsTrigger
                  value="teacher"
                  className="text-xs data-[state=active]:bg-green-500/30 data-[state=active]:text-green-800 dark:data-[state=active]:bg-green-500/40 dark:data-[state=active]:text-green-200 hover:bg-green-50/80 dark:hover:bg-green-500/20 transition-all duration-200 backdrop-blur-sm"
                >
                  Teacher
                </TabsTrigger>
                <TabsTrigger
                  value="principal"
                  className="text-xs data-[state=active]:bg-purple-500/30 data-[state=active]:text-purple-800 dark:data-[state=active]:bg-purple-500/40 dark:data-[state=active]:text-purple-200 hover:bg-purple-50/80 dark:hover:bg-purple-500/20 transition-all duration-200 backdrop-blur-sm"
                >
                  Principal
                </TabsTrigger>
              </TabsList>

              {["student", "teacher", "principal"].map((userRole) => {
                const Icon = roleIcons[userRole as keyof typeof roleIcons];
                return (
                  <TabsContent key={userRole} value={userRole} className="mt-0">
                    <div
                      className={`p-4 rounded-lg border-2 mb-6 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg dark:hover:shadow-xl cursor-pointer backdrop-blur-sm ${roleColors[userRole as keyof typeof roleColors]}`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5" />
                        <div>
                          <h3 className="font-semibold capitalize">
                            {userRole} Registration
                          </h3>
                          <p className="text-sm opacity-80">
                            {userRole === "student" &&
                              "Join as a student to track your attendance"}
                            {userRole === "teacher" &&
                              "Register as a teacher to manage classes"}
                            {userRole === "principal" &&
                              "Admin access for school management"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="dark:text-gray-200">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="Enter first name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="h-11 bg-white/80 dark:bg-black/30 border-gray-200/60 dark:border-gray-600/60 dark:text-white backdrop-blur-sm hover:border-blue-400 dark:hover:border-cyan-400 focus:border-blue-500 dark:focus:border-cyan-500 transition-all duration-300 hover:shadow-md hover:bg-white/90 dark:hover:bg-black/40"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="dark:text-gray-200">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Enter last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="h-11 bg-white/80 dark:bg-black/30 border-gray-200/60 dark:border-gray-600/60 dark:text-white backdrop-blur-sm hover:border-blue-400 dark:hover:border-cyan-400 focus:border-blue-500 dark:focus:border-cyan-500 transition-all duration-300 hover:shadow-md hover:bg-white/90 dark:hover:bg-black/40"
                  />
                </div>
              </div>

              {/* Role-specific fields */}
              {role === "student" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="rollNumber" className="dark:text-gray-200">
                      Roll Number
                    </Label>
                    <Input
                      id="rollNumber"
                      placeholder="Enter your roll number (e.g., 2023001)"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      required
                      className="h-11 bg-white/80 dark:bg-black/30 border-gray-200/60 dark:border-gray-600/60 dark:text-white backdrop-blur-sm hover:border-blue-400 dark:hover:border-cyan-400 focus:border-blue-500 dark:focus:border-cyan-500 transition-all duration-300 hover:shadow-md hover:bg-white/90 dark:hover:bg-black/40"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="branch" className="dark:text-gray-200">
                        Branch
                      </Label>
                      <Input
                        id="branch"
                        placeholder="e.g., CSE, ECE, IT"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        required
                        className="h-11 bg-white/80 dark:bg-black/30 border-gray-200/60 dark:border-gray-600/60 dark:text-white backdrop-blur-sm hover:border-blue-400 dark:hover:border-cyan-400 focus:border-blue-500 dark:focus:border-cyan-500 transition-all duration-300 hover:shadow-md hover:bg-white/90 dark:hover:bg-black/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="section" className="dark:text-gray-200">
                        Section
                      </Label>
                      <Input
                        id="section"
                        placeholder="e.g., 1, 2, A, B"
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                        required
                        className="h-11 bg-white/80 dark:bg-black/30 border-gray-200/60 dark:border-gray-600/60 dark:text-white backdrop-blur-sm hover:border-blue-400 dark:hover:border-cyan-400 focus:border-blue-500 dark:focus:border-cyan-500 transition-all duration-300 hover:shadow-md hover:bg-white/90 dark:hover:bg-black/40"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="dark:text-gray-200">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="h-11 bg-white/80 dark:bg-black/30 border-gray-200/60 dark:border-gray-600/60 dark:text-white backdrop-blur-sm hover:border-blue-400 dark:hover:border-cyan-400 focus:border-blue-500 dark:focus:border-cyan-500 transition-all duration-300 hover:shadow-md hover:bg-white/90 dark:hover:bg-black/40"
                    />
                  </div>
                </>
              )}

              {role === "teacher" && (
                <div className="space-y-2">
                  <Label htmlFor="teacherId" className="dark:text-gray-200">
                    Teacher ID
                  </Label>
                  <Input
                    id="teacherId"
                    placeholder="Enter your teacher ID (e.g., T001)"
                    value={rollNumber} // Reusing rollNumber state for teacher ID
                    onChange={(e) => setRollNumber(e.target.value)}
                    required
                    className="h-11 bg-white/80 dark:bg-black/30 border-gray-200/60 dark:border-gray-600/60 dark:text-white backdrop-blur-sm hover:border-green-400 dark:hover:border-green-400 focus:border-green-500 dark:focus:border-green-500 transition-all duration-300 hover:shadow-md"
                  />
                </div>
              )}

              {role === "principal" && (
                <div className="space-y-2">
                  <Label htmlFor="adminCode" className="dark:text-gray-200">
                    Admin Code
                  </Label>
                  <Input
                    id="adminCode"
                    placeholder="Enter admin access code"
                    value={rollNumber} // Reusing rollNumber state for admin code
                    onChange={(e) => setRollNumber(e.target.value)}
                    required
                    className="h-11 bg-white/80 dark:bg-black/30 border-gray-200/60 dark:border-gray-600/60 dark:text-white backdrop-blur-sm hover:border-purple-400 dark:hover:border-purple-400 focus:border-purple-500 dark:focus:border-purple-500 transition-all duration-300 hover:shadow-md"
                  />
                </div>
              )}

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
                  className="h-11 bg-white/80 dark:bg-black/30 border-gray-200/60 dark:border-gray-600/60 dark:text-white backdrop-blur-sm hover:border-blue-400 dark:hover:border-cyan-400 focus:border-blue-500 dark:focus:border-cyan-500 transition-all duration-300 hover:shadow-md hover:bg-white/90 dark:hover:bg-black/40"
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
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10 dark:bg-black/20 dark:border-gray-600 dark:text-white hover:border-blue-400 dark:hover:border-cyan-400 focus:border-blue-500 dark:focus:border-cyan-500 transition-all duration-300 hover:shadow-md hover:bg-white/90 dark:hover:bg-black/40"
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="dark:text-gray-200">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-11 pr-10 dark:bg-black/20 dark:border-gray-600 dark:text-white hover:border-blue-400 dark:hover:border-cyan-400 focus:border-blue-500 dark:focus:border-cyan-500 transition-all duration-300 hover:shadow-md hover:bg-white/90 dark:hover:bg-black/40"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 hover:scale-110 transition-all duration-200"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
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
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 dark:from-cyan-500 dark:to-blue-600 dark:hover:from-cyan-600 dark:hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium shadow-lg dark:shadow-cyan-500/25 dark:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-300 transform hover:scale-[1.01] dark:hover:shadow-[0_0_40px_rgba(6,182,212,0.7)]"
              >
                {loading
                  ? "Creating Account..."
                  : `Create ${role.charAt(0).toUpperCase() + role.slice(1)} Account`}
              </Button>

              {error && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400 text-center">
                    {error}
                  </p>
                </div>
              )}

              {success && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400 text-center">
                    {success}
                  </p>
                </div>
              )}
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
                <Link
                  to="/"
                  className="text-blue-600 dark:text-cyan-400 hover:underline font-medium"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Built with Supabase • Cursor.so • Tailwind CSS</p>
        </div>
      </div>
    </div>
  );
}
