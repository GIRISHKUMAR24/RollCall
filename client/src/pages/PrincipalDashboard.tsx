import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LogoutButton from "@/components/LogoutButton";
import { authHelpers } from "@/lib/auth";
import { API_BASE } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Search,
  GraduationCap,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  Calendar,
  BarChart,
  PieChart as PieChartIcon
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { 
  BarChart as ReChartsBar, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";

export default function PrincipalDashboard() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState("");
  const [searchRollNo, setSearchRollNo] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  // System analytics
  const [systemStats, setSystemStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    activeSessions: 0,
    attendanceTaken: 0
  });

  useEffect(() => {
    const user = authHelpers.getCurrentUser();

    if (!user) {
      navigate("/");
      return;
    }

    setUserEmail(user.email);
    fetchSystemStats();
  }, [navigate]);

  const fetchSystemStats = async () => {
    try {
      // Fetch user counts
      const statsResp = await fetch(`${API_BASE}/stats`);
      const statsData = await statsResp.json();
      
      if (statsResp.ok) {
        setSystemStats(prev => ({
          ...prev,
          totalStudents: statsData.statistics.students.count,
          totalTeachers: statsData.statistics.teachers.count,
          attendanceTaken: statsData.statistics.attendance?.count || 0
        }));
      }

      // Fetch active sessions count
      const sessionResp = await fetch(`${API_BASE}/session/active`);
      const sessionData = await sessionResp.json();
      if (sessionResp.ok && sessionData.session) {
        setSystemStats(prev => ({ ...prev, activeSessions: 1 }));
      }
    } catch (error) {
      console.error("Failed to fetch system stats:", error);
    }
  };

  const handleStudentSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchRollNo.trim()) return;

    setIsSearching(true);
    setSearchResult(null);

    try {
      const response = await fetch(`${API_BASE}/students/search?rollNumber=${encodeURIComponent(searchRollNo.trim())}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSearchResult(data.student);
      } else {
        setSearchResult(null);
      }
    } catch (error) {
      console.error("Error searching student:", error);
      setSearchResult(null);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 dark:bg-gradient-to-br dark:from-gray-900 dark:via-black dark:to-gray-800 relative overflow-hidden">

      {/* Light mode background */}
      <div className="absolute inset-0 dark:hidden overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/80 via-indigo-50/60 to-blue-50/80"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-200/30 to-indigo-200/30 rounded-full filter blur-3xl animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-blue-200/25 to-purple-200/25 rounded-full filter blur-3xl animate-pulse animation-delay-4000" style={{ animationDuration: '10s' }}></div>
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `radial-gradient(circle at 50px 50px, rgba(99, 102, 241, 0.1) 1%, transparent 1%)`,
          backgroundSize: '100px 100px'
        }}></div>
      </div>

      {/* Dark mode background */}
      <div className="absolute inset-0 hidden dark:block overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-gradient-radial from-purple-500/20 via-purple-500/5 to-transparent rounded-full filter blur-3xl animate-pulse" style={{ animationDuration: '6s' }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-gradient-radial from-blue-500/15 via-blue-500/5 to-transparent rounded-full filter blur-3xl animate-pulse animation-delay-3000" style={{ animationDuration: '8s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-radial from-indigo-400/10 via-indigo-400/3 to-transparent rounded-full filter blur-2xl animate-pulse animation-delay-6000" style={{ animationDuration: '10s' }}></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-white/80 dark:bg-black/40 backdrop-blur-xl border-b border-white/20 dark:border-gray-800/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-purple-500/25 dark:shadow-purple-500/40 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <GraduationCap className="w-6 h-6 text-white drop-shadow-lg relative z-10" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
                  Principal Dashboard
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Welcome, {userEmail}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <LogoutButton
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-gray-200/50 dark:border-gray-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700 hover:text-red-600 dark:hover:text-red-400 transition-all duration-300 shadow-md hover:shadow-lg"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Main Chart */}
          <Card className="lg:col-span-2 border-0 shadow-xl backdrop-blur-xl bg-white/90 dark:bg-black/40 relative overflow-hidden group transition-all duration-500 hover:shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-white/30 to-blue-50/50 dark:from-indigo-900/20 dark:via-gray-800/30 dark:to-blue-900/20"></div>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
                <BarChart className="w-6 h-6 text-indigo-600" />
                <span>Branch-wise Attendance Performance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ReChartsBar data={[
                  { name: "CSE", attendance: 85 },
                  { name: "ECE", attendance: 78 },
                  { name: "EEE", attendance: 72 },
                  { name: "MECH", attendance: 65 },
                  { name: "CIVIL", attendance: 60 },
                  { name: "IT", attendance: 88 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{fill: 'rgba(99, 102, 241, 0.1)'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="attendance" radius={[6, 6, 0, 0]}>
                    {[85, 78, 72, 65, 60, 88].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366F1' : '#8B5CF6'} />
                    ))}
                  </Bar>
                </ReChartsBar>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Activity Pulse */}
          <Card className="border-0 shadow-xl backdrop-blur-xl bg-white/90 dark:bg-black/40 relative overflow-hidden group transition-all duration-500 hover:shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 via-white/30 to-pink-50/50 dark:from-purple-900/20 dark:via-gray-800/30 dark:to-pink-900/20"></div>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
                <TrendingUp className="w-6 h-6 text-pink-600" />
                <span>Recent Activity Pulse</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { time: "2 mins ago", text: "New Teacher signup: Dr. Rao", icon: Users, color: "text-blue-500" },
                { time: "15 mins ago", text: "Attendance started: CSE Section 2", icon: Clock, color: "text-green-500" },
                { time: "45 mins ago", text: "Session closed: ECE Section 1", icon: CheckCircle, color: "text-purple-500" },
                { time: "1 hour ago", text: "Student registered: Roll 2024102", icon: GraduationCap, color: "text-orange-500" }
              ].map((item, idx) => (
                <div key={idx} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-black/20 transition-colors">
                  <div className={`mt-1 p-1.5 rounded-md bg-white dark:bg-gray-800 shadow-sm ${item.color}`}>
                    <item.icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.text}</p>
                    <p className="text-xs text-gray-500">{item.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* System Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-xl backdrop-blur-xl bg-white/90 dark:bg-black/40 relative overflow-hidden group transition-all duration-500 hover:shadow-2xl hover:-translate-y-0.5">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white/30 to-blue-50/50 dark:from-blue-900/20 dark:via-gray-800/30 dark:to-blue-900/20"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Total Students</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{systemStats.totalStudents}</p>
                </div>
                <Users className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl backdrop-blur-xl bg-white/90 dark:bg-black/40 relative overflow-hidden group transition-all duration-500 hover:shadow-2xl hover:-translate-y-0.5">
            <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 via-white/30 to-green-50/50 dark:from-green-900/20 dark:via-gray-800/30 dark:to-green-900/20"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Total Teachers</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{systemStats.totalTeachers}</p>
                </div>
                <GraduationCap className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl backdrop-blur-xl bg-white/90 dark:bg-black/40 relative overflow-hidden group transition-all duration-500 hover:shadow-2xl hover:-translate-y-0.5">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 via-white/30 to-orange-50/50 dark:from-orange-900/20 dark:via-gray-800/30 dark:to-orange-900/20"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Active Sessions</p>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{systemStats.activeSessions}</p>
                </div>
                <Clock className="w-10 h-10 text-orange-600 dark:text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl backdrop-blur-xl bg-white/90 dark:bg-black/40 relative overflow-hidden group transition-all duration-500 hover:shadow-2xl hover:-translate-y-0.5">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 via-white/30 to-purple-50/50 dark:from-purple-900/20 dark:via-gray-800/30 dark:to-purple-900/20"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Today's Attendance</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{systemStats.attendanceTaken}</p>
                </div>
                <BarChart3 className="w-10 h-10 text-purple-600 dark:text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Student Search Section */}
        <Card className="border-0 shadow-xl backdrop-blur-xl bg-white/90 dark:bg-black/40 relative overflow-hidden group transition-all duration-500 hover:shadow-2xl hover:-translate-y-0.5 mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-white/30 to-purple-50/50 dark:from-indigo-900/20 dark:via-gray-800/30 dark:to-purple-900/20"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-full"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-tr-full"></div>

          <CardHeader className="relative z-10">
            <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
              <Search className="w-6 h-6 text-indigo-600" />
              <span>Student Search</span>
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              Search for student records by roll number
            </CardDescription>
          </CardHeader>

          <CardContent className="relative z-10">
            <form onSubmit={handleStudentSearch} className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Enter student roll number (e.g., 2024001)"
                  value={searchRollNo}
                  onChange={(e) => setSearchRollNo(e.target.value)}
                  className="h-12 bg-white/80 dark:bg-black/30 border-gray-200/60 dark:border-gray-600/60 backdrop-blur-sm hover:border-indigo-400 dark:hover:border-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all duration-300"
                />
              </div>
              <Button
                type="submit"
                disabled={isSearching || !searchRollNo.trim()}
                className="h-12 px-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                {isSearching ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Searching...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4" />
                    <span>Search</span>
                  </div>
                )}
              </Button>
            </form>

            {/* Search Results */}
            {searchRollNo && !isSearching && (
              <div className="mt-6">
                {searchResult ? (
                  <Card className="border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-green-800 dark:text-green-200">
                        <CheckCircle className="w-5 h-5" />
                        <span>Student Found</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Personal Information */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-gray-900 dark:text-white">Personal Information</h4>
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                              <p className="font-medium text-gray-900 dark:text-white">{searchResult.name}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Roll Number</p>
                              <p className="font-medium text-gray-900 dark:text-white">{searchResult.rollNo}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Branch & Section</p>
                              <p className="font-medium text-gray-900 dark:text-white">{searchResult.class}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <p className="text-sm text-gray-600 dark:text-gray-400">{searchResult.email}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <p className="text-sm text-gray-600 dark:text-gray-400">{searchResult.phone}</p>
                            </div>
                          </div>
                        </div>

                        {/* Attendance Information */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-gray-900 dark:text-white">Attendance Overview</h4>
                          <div className="space-y-3">
                            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Overall Attendance</span>
                                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                  {searchResult.overallAttendance}%
                                </span>
                              </div>
                              <Progress value={searchResult.overallAttendance} className="h-2" />
                            </div>

                            {/* Subject-wise Attendance */}
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Subject-wise Attendance</p>
                              <div className="space-y-2">
                                {searchResult.subjectWiseAttendance.map((subject: any, index: number) => (
                                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{subject.subject}</span>
                                    <Badge
                                      className={
                                        subject.percentage >= 85
                                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                          : subject.percentage >= 75
                                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                      }
                                    >
                                      {subject.percentage}%
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recent Attendance */}
                      {searchResult.recentAttendance.length > 0 && (
                        <div className="mt-6">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Recent Attendance</h4>
                          <div className="space-y-2">
                            {searchResult.recentAttendance.map((record: any, index: number) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <Calendar className="w-4 h-4 text-gray-400" />
                                  <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{record.subject}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{record.date} • {record.time}</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge
                                    className={
                                      record.status === "Present"
                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                        : record.status === "Outside Radius"
                                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                    }
                                  >
                                    {record.status}
                                  </Badge>
                                  {record.status === "Present" ? (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  ) : record.status === "Outside Radius" ? (
                                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-600" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Clear Search */}
                      <div className="mt-6 pt-4 border-t border-green-200 dark:border-green-800">
                        <Button
                          onClick={() => {
                            setSearchRollNo("");
                            setSearchResult(null);
                          }}
                          variant="outline"
                          className="w-full border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900/20"
                        >
                          Clear Search
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-3">
                        <XCircle className="w-6 h-6 text-red-600" />
                        <div>
                          <h4 className="font-semibold text-red-800 dark:text-red-200">No Student Found</h4>
                          <p className="text-red-700 dark:text-red-300">
                            No student found with Roll No: {searchRollNo}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setSearchRollNo("");
                          setSearchResult(null);
                        }}
                        variant="outline"
                        className="mt-4 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20"
                      >
                        Clear Search
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
