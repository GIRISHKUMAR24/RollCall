import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import LogoutButton from "@/components/LogoutButton";
import { authHelpers } from "@/lib/auth";
import { API_BASE } from "@/lib/env";
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
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  QrCode,
  Play,
  Clock,
  Users,
  BookOpen,
  BarChart3,
  MapPin,
  Timer,
  CheckCircle,
  XCircle,
  Search,
  Loader2,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ATTENDANCE_WINDOW_SECONDS = 60;



export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [qrGenerated, setQrGenerated] = useState(false);
  const [attendanceStarted, setAttendanceStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ATTENDANCE_WINDOW_SECONDS);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [teacherLocation, setTeacherLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [geofenceRadius] = useState(15); // 15 meters

  const handleStartAttendance = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setTeacherLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to retrieve your location. Please allow location access.");
      },
      { enableHighAccuracy: true }
    );
  };
  const [qrsSent, setQrsSent] = useState(false);
  const [sendingQRs, setSendingQRs] = useState(false);
  const [emailSentCount, setEmailSentCount] = useState(0);
  const [emailPreview, setEmailPreview] = useState<any[]>([]);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [attendanceMap, setAttendanceMap] = useState<
    Record<
      string,
      {
        status: string;
        scanTime: string;
        geofenceStatus: "inside" | "outside" | "not_scanned";
      }
    >
  >({});
  const sendingRef = useRef(false);
  const finalizingRef = useRef(false);
  const [overrideLoading, setOverrideLoading] = useState<string | null>(null);

  // Attendance summary dialog state
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<null | {
    subjects: string[];
    sessionsBySubject: Record<string, number>;
    students: Array<{
      rollNumber: string;
      name: string;
      overall: { present: number; total: number; percentage: number | null };
      bySubject: Record<
        string,
        { present: number; total: number; percentage: number | null }
      >;
    }>;
  }>(null);

  const openSummary = async () => {
    if (!selectedBranch || !selectedSection) return;
    setSummaryOpen(true);
    setSummaryLoading(true);
    try {
      const resp = await fetch(
        `${API_BASE}/attendance/summary?branch=${encodeURIComponent(selectedBranch)}&section=${encodeURIComponent(selectedSection)}`,
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.message || "Failed to load summary");
      setSummaryData({
        subjects: data.subjects || [],
        sessionsBySubject: data.sessionsBySubject || {},
        students: data.students || [],
      });
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Branch and section data
  const branches = [
    "CSE",
    "CS AI & ML",
    "CSD",
    "ECE",
    "EEE",
    "MECH",
    "CIVIL",
    "IT",
  ];

  const getSectionsForBranch = (branch: string) => {
    if (["CSE", "ECE", "MECH"].includes(branch)) {
      return ["1", "2", "3", "4"];
    }
    return ["1", "2"];
  };

  const getSubjectsForBranch = (branch: string) => {
    const commonSubjects = [
      "Mathematics",
      "Physics",
      "Chemistry",
      "English",
      "Programming",
    ];
    const branchSpecific: { [key: string]: string[] } = {
      CSE: [
        "Data Structures",
        "Algorithms",
        "Database Systems",
        "Computer Networks",
      ],
      "CS AI & ML": [
        "Machine Learning",
        "Artificial Intelligence",
        "Deep Learning",
        "Neural Networks",
      ],
      CSD: [
        "Software Engineering",
        "System Design",
        "Cloud Computing",
        "DevOps",
      ],
      ECE: [
        "Digital Electronics",
        "Signal Processing",
        "Communication Systems",
        "VLSI Design",
      ],
      EEE: [
        "Power Systems",
        "Control Systems",
        "Electrical Machines",
        "Power Electronics",
      ],
      MECH: ["Thermodynamics", "Fluid Mechanics", "Manufacturing", "CAD/CAM"],
      CIVIL: [
        "Structural Engineering",
        "Concrete Technology",
        "Surveying",
        "Transportation",
      ],
      IT: [
        "Web Development",
        "Mobile Computing",
        "Information Security",
        "Data Analytics",
      ],
    };

    return [...commonSubjects, ...(branchSpecific[branch] || [])];
  };

  // Fetch students for selected branch & section
  const getStudentsForClass = async (branch: string, section: string) => {
    const resp = await fetch(
      `${API_BASE}/students?branch=${encodeURIComponent(branch)}&section=${encodeURIComponent(section)}`,
    );
    if (!resp.ok)
      return [] as Array<{
        rollNumber: string;
        name: string;
        email: string;
        branch: string;
        section: string;
      }>;
    const data = await resp.json();
    return (data.students || []) as Array<{
      rollNumber: string;
      name: string;
      email: string;
      branch: string;
      section: string;
    }>;
  };

  const availableSections = selectedBranch
    ? getSectionsForBranch(selectedBranch)
    : [];
  const availableSubjects = selectedBranch
    ? getSubjectsForBranch(selectedBranch)
    : [];

  // Calculate distance between two coordinates in meters using Haversine formula
  const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Check if student is within geofence
  // Client-side geofence check removed

  // Reset section when branch changes
  useEffect(() => {
    setSelectedSection("");
    setSelectedSubject("");
  }, [selectedBranch]);

  // Reset subject when section changes
  useEffect(() => {
    setSelectedSubject("");
  }, [selectedSection]);

  // Student attendance data - only Girish Kumar
  const [studentList, setStudentList] = useState<
    Array<{ rollNumber: string; name: string; email: string }>
  >([]);

  useEffect(() => {
    async function loadStudents() {
      if (selectedBranch && selectedSection) {
        const students = await getStudentsForClass(
          selectedBranch,
          selectedSection,
        );
        setStudentList(
          students.map((s: any) => ({
            rollNumber: s.rollNumber,
            name: s.name,
            email: s.email,
          })),
        );
      } else {
        setStudentList([]);
      }
    }
    loadStudents();
  }, [selectedBranch, selectedSection]);

  const mockStudents = studentList.map((s) => {
    const a = attendanceMap[s.rollNumber];
    return {
      rollNo: s.rollNumber,
      name: s.name,
      status: a?.status || "Not Scanned",
      scanTime: a?.scanTime || "-",
      location: null,
      geofenceStatus: a?.geofenceStatus || "not_scanned",
    };
  });

  // Initialize user email
  useEffect(() => {
    const user = authHelpers.getCurrentUser();

    if (!user) {
      navigate("/");
      return;
    }

    setUserEmail(user.email);
  }, [navigate]);

  const finalizeAttendance = useCallback(async () => {
    if (!currentSessionId) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/attendance/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: currentSessionId,
          branch: selectedBranch,
          section: selectedSection,
          subject: selectedSubject,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to finalize attendance");
      }

      if (Array.isArray(data.records)) {
        setAttendanceMap((prev) => {
          const updated = { ...prev };
          for (const record of data.records) {
            const timestamp = record.timestamp
              ? new Date(record.timestamp).toLocaleTimeString()
              : "-";
            updated[record.rollNumber] = {
              status: record.status || "Absent",
              scanTime: timestamp,
              geofenceStatus: record.locationValid ? "inside" : "outside",
            };
          }
          return updated;
        });
      }

      if (typeof data.markedAbsent === "number" && data.markedAbsent > 0) {
        alert(
          `Attendance window closed. ${data.markedAbsent} students were marked absent automatically.`,
        );
      }
    } catch (error: any) {
      console.error("Finalize attendance error:", error);
      alert(
        `Attendance window closed, but auto-marking absentees failed: ${error?.message || "Unknown error"
        }`,
      );
    }
  }, [
    currentSessionId,
    selectedBranch,
    selectedSection,
    selectedSubject,
    setAttendanceMap,
  ]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (attendanceStarted && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setAttendanceStarted(false);
            setQrGenerated(false);
            if (currentSessionId && !finalizingRef.current) {
              finalizingRef.current = true;
              finalizeAttendance()
                .catch(() => {
                  // Error handling already occurs inside finalizeAttendance
                })
                .finally(() => {
                  finalizingRef.current = false;
                });
            }
            return ATTENDANCE_WINDOW_SECONDS;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [attendanceStarted, timeLeft, finalizeAttendance, currentSessionId]);

  // Live attendance polling during active session
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    async function fetchStatus() {
      if (!currentSessionId) return;
      const resp = await fetch(
        `${API_BASE}/attendance/status?sessionId=${encodeURIComponent(currentSessionId)}`,
      );
      if (!resp.ok) return;
      const data = await resp.json();
      const map: Record<
        string,
        {
          status: string;
          scanTime: string;
          geofenceStatus: "inside" | "outside" | "not_scanned";
        }
      > = {};
      for (const item of data.records || []) {
        map[item.rollNumber] = {
          status: item.status,
          scanTime: new Date(item.timestamp).toLocaleTimeString(),
          geofenceStatus: item.locationValid ? "inside" : "outside",
        };
      }
      setAttendanceMap(map);
    }
    if (attendanceStarted && currentSessionId) {
      fetchStatus();
      interval = setInterval(fetchStatus, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [attendanceStarted, currentSessionId]);

  // Filter students based on search
  const filteredStudents = mockStudents.filter(
    (student) =>
      student.rollNo.toLowerCase().includes(studentSearch.toLowerCase()) ||
      student.name.toLowerCase().includes(studentSearch.toLowerCase()),
  );

  // Filter subjects based on search
  const filteredSubjects = availableSubjects.filter((subject) =>
    subject.toLowerCase().includes(subjectSearch.toLowerCase()),
  );

  const handleSendQRs = async () => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSendingQRs(true);
    if (selectedBranch && selectedSection && selectedSubject) {
      // Location check removed - using server-side permanent location

      setSendingQRs(true);
      setEmailSentCount(0);
      const students = await getStudentsForClass(
        selectedBranch,
        selectedSection,
      );

      try {
        // Send real emails through the API
        const response = await fetch(`${API_BASE}/email/send-attendance`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            students: students.map((student: any) => ({
              email: student.email,
              name: student.name,
              rollNo: student.rollNumber,
            })),
            classDetails: {
              subject: selectedSubject,
              branch: selectedBranch,
              section: selectedSection,
              teacherLocation: teacherLocation,
            },
          }),
        });

        let result: any = {};
        try {
          result = await response.json();
        } catch (parseError) {
          throw new Error("Invalid response from server. Please try again.");
        }

        if (!response.ok) {
          throw new Error(result?.message || result?.error || "Failed to send emails");
        }

        if (result && result.success !== false) {
          // Success - real emails sent
          setEmailSentCount(result.queuedEmails);
          setEmailPreview([
            {
              summary: `📧 ${result.queuedEmails} QR emails successfully sent to students`,
              sessionId: result.sessionId,
              details: `Each student received a unique QR code that expires in 60 seconds. Students must be inside the 100m classroom geo-fence to mark attendance.`,
              timestamp: result.timestamp,
              students: students.map((s) => `${s.name} (${s.email})`),
            },
          ]);

          setSendingQRs(false);
          setQrsSent(true);
          setShowQRDialog(true);

          // Start the attendance timer automatically after sending QRs
          setAttendanceStarted(false);
          setTimeLeft(60);
          setCurrentSessionId(result.sessionId);

          alert(`✅ SUCCESS: ${result.queuedEmails} QR emails sent!

📧 Real emails sent to: 
${students.map((s) => `• ${s.name} (${s.email})`).join("\n")}

Students will receive:
🎯 Unique QR codes in their Gmail
📱 Direct app links for easy access  
⏰ 60-second expiring tokens
📍 100m hexagonal geofencing

Check the student emails - they should receive emails shortly!`);
        } else {
          throw new Error(result.message || "Failed to send emails");
        }
      } catch (error: any) {
        console.error("Email sending error:", error);
        let errorMessage = error.message || "Unknown error occurred";
        let detailedHelp = "";

        // Parse server error response if available
        if (error.message.includes("Gmail")) {
          detailedHelp = `

⚠️ GMAIL CONFIGURATION ISSUE:
1. Go to: https://myaccount.google.com/apppasswords
2. Generate a new App Password
3. Update .env with: GMAIL_PASS=your_new_password (remove spaces)
4. Ensure 2-factor authentication is enabled on Gmail
5. Restart the server`;
        } else if (error.message.includes("Failed to send") || error.message.includes("Email")) {
          detailedHelp = `

⚠️ EMAIL SERVICE ERROR:
Possible causes:
- Gmail credentials are invalid or expired
- No internet connection
- Student email addresses are invalid
- Gmail account security settings

Solutions:
1. Verify GMAIL_USER is correct
2. Generate new App Password at myaccount.google.com/apppasswords
3. Check student emails are valid
4. Ensure Gmail account has 2-factor authentication enabled`;
        }

        alert(`❌ EMAIL ERROR: ${errorMessage}${detailedHelp}`);
      } finally {
        sendingRef.current = false;
        setSendingQRs(false);
      }
    }
  };

  const handleActivateTimer = async () => {
    if (!currentSessionId) return;
    try {
      const response = await fetch(`${API_BASE}/session/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: currentSessionId }),
      });
      if (!response.ok) {
        throw new Error("Failed to activate session");
      }
      setAttendanceStarted(true);
      setTimeLeft(60);
    } catch (error) {
      console.error("Failed to activate timer:", error);
      alert("Error starting timer. Please try again.");
    }
  };

  // handleStartAttendance removed - using server-side permanent location

  const handleManualOverride = async (rollNumber: string, currentStatus: string) => {
    if (!currentSessionId) {
      alert("No active session! Cannot override attendance without an active session.");
      return;
    }

    const newStatus = currentStatus === "Present" ? "Absent" : "Present";
    setOverrideLoading(rollNumber);

    try {
      const resp = await fetch(`${API_BASE}/attendance/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: currentSessionId,
          rollNumber,
          status: newStatus,
          teacherEmail: userEmail,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.message || "Failed to update attendance");
      }

      setAttendanceMap((prev) => ({
        ...prev,
        [rollNumber]: {
          status: newStatus,
          scanTime: new Date().toLocaleTimeString(),
          geofenceStatus: "not_scanned"
        }
      }));

      alert(`✅ Successfully marked ${rollNumber} as ${newStatus}.`);
    } catch (e: any) {
      alert(`❌ Error updating attendance: ${e.message}`);
    } finally {
      setOverrideLoading(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:bg-gradient-to-br dark:from-gray-900 dark:via-black dark:to-gray-800 relative overflow-hidden">
      {/* Light mode background */}
      <div className="absolute inset-0 dark:hidden overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-purple-50/80"></div>
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-200/30 to-indigo-200/30 rounded-full filter blur-3xl animate-pulse"
          style={{ animationDuration: "8s" }}
        ></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-200/25 to-pink-200/25 rounded-full filter blur-3xl animate-pulse animation-delay-4000"
          style={{ animationDuration: "10s" }}
        ></div>
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 50px 50px, rgba(99, 102, 241, 0.1) 1%, transparent 1%)`,
            backgroundSize: "100px 100px",
          }}
        ></div>
      </div>

      {/* Dark mode background */}
      <div className="absolute inset-0 hidden dark:block overflow-hidden">
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

      {/* Header */}
      <header className="relative z-10 bg-white/80 dark:bg-black/40 backdrop-blur-xl border-b border-white/20 dark:border-gray-800/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-xl shadow-green-500/25 dark:shadow-green-500/40 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <BookOpen className="w-6 h-6 text-white drop-shadow-lg relative z-10" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Teacher Dashboard
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Welcome, {userEmail}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <LogoutButton className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-gray-200/50 dark:border-gray-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700 hover:text-red-600 dark:hover:text-red-400 transition-all duration-300 shadow-md hover:shadow-lg" />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Class Selection */}
        <Card className="border-0 shadow-xl backdrop-blur-xl bg-white/90 dark:bg-black/40 relative overflow-hidden group transition-all duration-500 hover:shadow-2xl hover:-translate-y-0.5 mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 via-white/30 to-emerald-50/50 dark:from-green-900/20 dark:via-gray-800/30 dark:to-emerald-900/20"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-green-500/10 to-transparent rounded-bl-full"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-500/10 to-transparent rounded-tr-full"></div>

          <CardHeader className="relative z-10">
            <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
              <BookOpen className="w-6 h-6 text-green-600" />
              <span>Class Selection</span>
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              Select the branch, section, and subject for attendance
            </CardDescription>
          </CardHeader>

          <CardContent className="relative z-10 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Branch Selection */}
              <div className="space-y-2">
                <Label
                  htmlFor="branch"
                  className="text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  Branch
                </Label>
                <Select
                  value={selectedBranch}
                  onValueChange={setSelectedBranch}
                >
                  <SelectTrigger className="h-12 bg-white/80 dark:bg-black/30 border-gray-200/60 dark:border-gray-600/60 backdrop-blur-sm hover:border-green-400 dark:hover:border-green-400 focus:border-green-500 dark:focus:border-green-500 transition-all duration-300">
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 dark:bg-black/90 backdrop-blur-xl">
                    {branches.map((branch) => (
                      <SelectItem
                        key={branch}
                        value={branch}
                        className="hover:bg-green-50 dark:hover:bg-green-900/20"
                      >
                        {branch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Section Selection */}
              <div className="space-y-2">
                <Label
                  htmlFor="section"
                  className="text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  Section
                </Label>
                <Select
                  value={selectedSection}
                  onValueChange={setSelectedSection}
                  disabled={!selectedBranch}
                >
                  <SelectTrigger className="h-12 bg-white/80 dark:bg-black/30 border-gray-200/60 dark:border-gray-600/60 backdrop-blur-sm hover:border-green-400 dark:hover:border-green-400 focus:border-green-500 dark:focus:border-green-500 transition-all duration-300 disabled:opacity-50">
                    <SelectValue placeholder="Select Section" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 dark:bg-black/90 backdrop-blur-xl">
                    {availableSections.map((section) => (
                      <SelectItem
                        key={section}
                        value={section}
                        className="hover:bg-green-50 dark:hover:bg-green-900/20"
                      >
                        Section {section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subject Selection */}
              <div className="space-y-2">
                <Label
                  htmlFor="subject"
                  className="text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  Subject
                </Label>
                <div className="relative">
                  <Select
                    value={selectedSubject}
                    onValueChange={setSelectedSubject}
                    disabled={!selectedBranch}
                  >
                    <SelectTrigger className="h-12 bg-white/80 dark:bg-black/30 border-gray-200/60 dark:border-gray-600/60 backdrop-blur-sm hover:border-green-400 dark:hover:border-green-400 focus:border-green-500 dark:focus:border-green-500 transition-all duration-300 disabled:opacity-50">
                      <SelectValue placeholder="Select Subject" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 dark:bg-black/90 backdrop-blur-xl max-h-64">
                      <div className="p-2">
                        <Input
                          placeholder="Search subjects..."
                          value={subjectSearch}
                          onChange={(e) => setSubjectSearch(e.target.value)}
                          className="mb-2 h-8"
                        />
                      </div>
                      {filteredSubjects.map((subject) => (
                        <SelectItem
                          key={subject}
                          value={subject}
                          className="hover:bg-green-50 dark:hover:bg-green-900/20"
                        >
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Location and QR Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
              <Button
                onClick={handleStartAttendance}
                disabled={
                  !selectedBranch || !selectedSection || !selectedSubject
                }
                className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                <MapPin className="w-5 h-5 mr-2" />
                {teacherLocation ? "Update Classroom Location" : "Set Classroom Location"}
              </Button>

              <Button
                onClick={handleSendQRs}
                disabled={
                  !selectedBranch ||
                  !selectedSection ||
                  !selectedSubject ||
                  !teacherLocation ||
                  sendingQRs
                }
                className="flex-1 h-12 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <QrCode className="w-5 h-5 mr-3 relative z-10" />
                <span className="relative z-10">Send QR to Students</span>
              </Button>

              <Button
                onClick={openSummary}
                disabled={!selectedBranch || !selectedSection}
                variant="outline"
                className="flex-1 h-12 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <BarChart3 className="w-5 h-5 mr-2" />
                View Overall Attendance
              </Button>

              <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>QR Codes Sent Successfully</DialogTitle>
                    <DialogDescription>
                      Unique QR codes have been sent to students in{" "}
                      {selectedBranch} Section {selectedSection} for{" "}
                      {selectedSubject}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col items-center space-y-4">
                    {/* Timer Status */}
                    {attendanceStarted && (
                      <div className="w-full p-3 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Timer className="w-5 h-5 text-blue-600 animate-pulse" />
                            <span className="font-semibold text-blue-700 dark:text-blue-300">
                              Attendance Window Active
                            </span>
                          </div>
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {formatTime(timeLeft)}
                          </div>
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Students can scan now • QR codes are active
                        </p>
                      </div>
                    )}

                    {!attendanceStarted && qrsSent && currentSessionId && (
                      <div className="w-full p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 text-center">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-3">
                          Emails sent successfully. Start the attendance timer when students are ready.
                        </p>
                        <Button
                          onClick={handleActivateTimer}
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Timer className="w-4 h-4 mr-2" />
                          Start Timer
                        </Button>
                      </div>
                    )}

                    {/* QR System Info */}
                    <div
                      className={`w-56 h-56 bg-white border-2 ${attendanceStarted ? "border-green-400 shadow-lg shadow-green-200" : "border-gray-200"} rounded-lg flex items-center justify-center transition-all duration-300`}
                    >
                      <div className="text-center text-gray-500 p-4">
                        <QrCode
                          className={`w-20 h-20 mx-auto mb-2 ${attendanceStarted ? "text-green-600" : "text-gray-400"} transition-colors duration-300`}
                        />
                        <p className="text-sm font-medium">
                          {attendanceStarted
                            ? "Students Scanning!"
                            : "Email QR System"}
                        </p>
                        <p className="text-xs mb-2">
                          {selectedBranch} Sec {selectedSection}
                        </p>
                        <p className="text-xs">{selectedSubject}</p>
                        {qrsSent && (
                          <div className="mt-2 p-2 bg-green-50 rounded text-green-700">
                            <p className="text-xs font-medium">
                              ✓ QRs Sent to {emailSentCount} Students
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Location Info */}
                    {teacherLocation && (
                      <div className="w-full p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                        <div className="text-center">
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            Teacher Location: {teacherLocation.lat.toFixed(6)},{" "}
                            {teacherLocation.lng.toFixed(6)}
                          </p>
                          <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                            Students must scan inside the 15m hexagonal zone
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <Button
                      onClick={() => setShowQRDialog(false)}
                      variant="outline"
                      className="w-full hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Close
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {teacherLocation && (
              <div className="mt-2">
                <div className="w-full p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Classroom Location Set
                    </span>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      Latitude: {teacherLocation.lat.toFixed(6)} • Longitude:{" "}
                      {teacherLocation.lng.toFixed(6)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Persistent Timer Block */}
        {attendanceStarted && (
          <Card className="mb-8 border-2 border-green-500/20 shadow-lg bg-green-50/50 dark:bg-green-900/10 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full animate-pulse">
                    <Timer className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      Attendance Window Active
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Students can scan their QR codes now
                    </p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Time Remaining
                  </div>
                  <div className="text-4xl font-mono font-bold text-green-600 dark:text-green-400 tabular-nums">
                    {formatTime(timeLeft)}
                  </div>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Are you sure you want to close attendance early?")) {
                      setTimeLeft(0);
                    }
                  }}
                  className="shrink-0"
                >
                  Stop Attendance
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!attendanceStarted && timeLeft > 0 && currentSessionId && (
          <Card className="mb-8 border-l-4 border-blue-500 shadow-md bg-white dark:bg-gray-800">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Ready to Start Attendance
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Emails sent successfully. Start the attendance timer when students are ready.
                </p>
              </div>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                onClick={handleActivateTimer}
              >
                <Timer className="w-4 h-4 mr-2" />
                Start Timer
              </Button>
            </CardContent>
          </Card>
        )}

        {!attendanceStarted && timeLeft === 0 && currentSessionId && (
          <Card className="mb-8 border-l-4 border-red-500 shadow-md bg-white dark:bg-gray-800">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Attendance Window Closed
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Session has ended. Absentees have been marked.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentSessionId(null);
                  setTimeLeft(ATTENDANCE_WINDOW_SECONDS);
                  setQrsSent(false);
                }}
              >
                Start New Session
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Student List */}
        <Card className="border-0 shadow-xl backdrop-blur-xl bg-white/90 dark:bg-black/40 relative overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-6 h-6 text-blue-600" />
              <span>Student Attendance</span>
            </CardTitle>
            <CardDescription>
              Real-time attendance tracking for your class
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search students by roll number or name..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pl-10 bg-white/80 dark:bg-black/30 border-gray-200/60 dark:border-gray-600/60"
                />
              </div>

              {/* Student List */}
              <div className="space-y-3">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => {
                    const isPresent = student.status === "Present";
                    const isAbsent = student.status === "Absent";

                    return (
                      <div
                        key={student.rollNo}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {student.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {student.name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Roll No: {student.rollNo}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                              {student.scanTime}
                            </p>
                            <Badge
                              className={
                                isPresent
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                  : isAbsent
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                    : "bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300"
                              }
                            >
                              {student.status}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            {isPresent ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : isAbsent ? (
                              <XCircle className="w-5 h-5 text-red-600" />
                            ) : (
                              <Clock className="w-5 h-5 text-gray-400" />
                            )}

                            {currentSessionId && (
                              <Button
                                size="sm"
                                variant={isPresent ? "outline" : "default"}
                                className={`h-8 ${isPresent
                                  ? "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                                  : "bg-green-600 hover:bg-green-700 text-white"
                                  }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleManualOverride(student.rollNo, student.status);
                                }}
                                disabled={overrideLoading === student.rollNo}
                              >
                                {overrideLoading === student.rollNo && (
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                )}
                                {isPresent ? "Mark Absent" : "Mark Present"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No students found for the search criteria</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Dialog */}
        <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>
                Overall Attendance — {selectedBranch} Section {selectedSection}
              </DialogTitle>
              <DialogDescription>
                Subject-wise and overall percentages for all students in this
                section
              </DialogDescription>
            </DialogHeader>

            {summaryLoading ? (
              <div className="py-10 text-center text-sm text-gray-500">
                Loading summary…
              </div>
            ) : summaryData ? (
              <div className="space-y-4">
                <div className="text-xs text-gray-600">
                  Sessions held:{" "}
                  {summaryData.subjects
                    .map(
                      (s) => `${s}: ${summaryData.sessionsBySubject[s] ?? 0}`,
                    )
                    .join(" • ")}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Roll No</TableHead>
                      {summaryData.subjects.map((subj) => (
                        <TableHead key={subj}>{subj}</TableHead>
                      ))}
                      <TableHead>Overall</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaryData.students.map((stu) => (
                      <TableRow key={stu.rollNumber}>
                        <TableCell className="font-medium">
                          {stu.name}
                        </TableCell>
                        <TableCell>{stu.rollNumber}</TableCell>
                        {summaryData.subjects.map((subj) => {
                          const cell = stu.bySubject[subj] || {
                            present: 0,
                            total: summaryData.sessionsBySubject[subj] || 0,
                            percentage: null,
                          };
                          return (
                            <TableCell key={subj}>
                              {cell.total > 0
                                ? `${cell.present}/${cell.total} (${cell.percentage ?? 0}%)`
                                : "—"}
                            </TableCell>
                          );
                        })}
                        <TableCell>
                          {stu.overall.total > 0
                            ? `${stu.overall.present}/${stu.overall.total} (${stu.overall.percentage ?? 0}%)`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-gray-500">
                No data
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
