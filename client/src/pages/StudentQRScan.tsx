import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/env";
import { authHelpers } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  QrCode,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  User,
  BookOpen,
  AlertTriangle,
  Info,
  Zap,
  Activity,
  Navigation,
} from "lucide-react";
import { classifyAttendance, haversineDistance } from "../../../shared/geofence-utils";
import { GPSReading } from "../../../shared/types";

// Helper to detect In-App Browsers and Preview Environments
const isInAppBrowser = (): boolean => {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  const host = window.location.hostname.toLowerCase();

  return (
    // In-App Browser Keywords
    ua.includes("wv") ||                // Android WebView (common in Gmail/Outlook Android)
    (ua.includes("version/") && ua.includes("mobile")) || // iOS In-App Browser (Safari wrapper)
    ua.includes("gsa") ||               // Google Search App
    ua.includes("gmail") ||             // Gmail
    ua.includes("outlook") ||           // Outlook
    ua.includes("instagram") ||         // Instagram
    ua.includes("fbav") ||              // Facebook App

    // Preview Environments
    host.endsWith(".bolt.new") ||
    host.includes("bolt.new") ||
    host.includes("antigravity") ||
    ua.includes("antigravity") ||
    ua.includes("bolt.new")
  );
};

type LocationState =
  | "idle"        // Initial state, waiting for user action
  | "checking"    // Geolocation is running
  | "allowed"     // Location retrieved successfully
  | "denied"      // User denied permission
  | "inapp"       // Running in in-app browser or preview env
  | "unsupported" // Browser doesn't support geolocation
  | "error";      // Other errors (timeout, unavailable)


export default function StudentQRScan() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Student Data State
  const [studentData, setStudentData] = useState<{
    token: string;
    rollNo: string;
    studentName: string;
    subject: string;
    branch: string;
    section: string;
    sessionId?: string;
    teacherLocation: { lat: number; lng: number } | null;
  } | null>(null);
  // True while we are waiting for the token verify API response
  const [tokenLoading, setTokenLoading] = useState(true);

  // Location & Scan State
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [studentAccuracy, setStudentAccuracy] = useState<number | null>(null);
  const [locationErrorMsg, setLocationErrorMsg] = useState<string>("");

  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Advanced Stabilization State
  const [isStabilizing, setIsStabilizing] = useState(false);
  const [readings, setReadings] = useState<GPSReading[]>([]);
  const [stabilizationProgress, setStabilizationProgress] = useState(0);
  const [stabilityScore, setStabilityScore] = useState(0);
  const [confidence, setConfidence] = useState<"High" | "Medium" | "Low">("Low");

  const [sessionActive, setSessionActive] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [sessionEndTime, setSessionEndTime] = useState<Date | null>(null);

  // Poll for session active status
  useEffect(() => {
    if (!studentData?.sessionId) return;

    const pollSession = async () => {
      try {
        const res = await fetch(`${API_BASE}/session/active?sessionId=${studentData.sessionId}`);
        const data = await res.json();
        if (data.success && data.session) {
          const active: boolean = data.session.active === true;
          const expired: boolean = data.session.expired === true;

          console.log(`[Session Poll] active=${active}, expired=${expired}, endTime=${data.session.endTime}`);

          setSessionActive(active);
          setSessionExpired(expired);

          if (data.session.endTime) {
            setSessionEndTime(new Date(data.session.endTime));
          }
        } else {
          setSessionActive(false);
        }
      } catch (err) {
        // silently ignore polling errors
      }
    };

    // Poll immediately, then every 2 seconds
    pollSession();
    const interval = setInterval(pollSession, 2000);
    return () => clearInterval(interval);
  }, [studentData?.sessionId]);

  // 1. Verify Token on Mount
  useEffect(() => {
    const token = searchParams.get("token");
    const sessionId = searchParams.get("sessionId");

    if (!authHelpers.isLoggedIn()) {
      let redirectUrl = `/student-qr-scan`;
      if (token) {
        redirectUrl += `?token=${token}`;
      }
      if (sessionId) {
        redirectUrl += token ? `&sessionId=${sessionId}` : `?sessionId=${sessionId}`;
      }
      navigate(`/?redirectTo=${encodeURIComponent(redirectUrl)}${sessionId ? `&sessionId=${sessionId}` : ""}`);
      return;
    }

    if (token) {
      // Use a 15-second timeout so mobile doesn't spin forever if backend is unreachable
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      setTokenLoading(true);
      fetch(`${API_BASE}/email/verify-qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        signal: controller.signal,
      })
        .then((response) => response.json())
        .then((result) => {
          clearTimeout(timeoutId);
          if (result.success) {
            setStudentData({
              token,
              rollNo: result.data.rollNumber,
              studentName: result.data.studentName,
              subject: result.data.subject,
              branch: result.data.branch,
              section: result.data.section,
              sessionId: result.data.sessionId,
              teacherLocation: result.data.teacherLocation,
            });
          } else {
            throw new Error(result.message || "Invalid QR token");
          }
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          console.error("QR token verification failed:", error);
          const isTimeout = error.name === "AbortError";
          setScanError(
            isTimeout
              ? "⚠️ Could not reach the server (timed out). Make sure your mobile and laptop are on the same WiFi network, then reopen this link."
              : `QR Code Error: ${error.message}`
          );
          setTimeout(() => navigate("/"), 5000);
        })
        .finally(() => {
          setTokenLoading(false);
        });
    } else {
      setTokenLoading(false);
      navigate("/");
    }
  }, [searchParams, navigate]);

  // 2. Start Location Stabilization (Production Grade)
  const handleStartLocationStabilization = () => {
    if (!navigator.geolocation) {
      setLocationState("unsupported");
      setLocationErrorMsg("This browser does not support location.");
      return;
    }

    if (isInAppBrowser()) {
      setLocationState("inapp");
      setLocationErrorMsg("Location cannot be accessed inside this in-app browser.");
      return;
    }

    setLocationState("checking");
    setIsStabilizing(true);
    setReadings([]);
    setStabilizationProgress(0);
    setLocationErrorMsg("");

    const REQUIRED_READINGS = 8;
    const TIMEOUT_MS = 25000; // 25 seconds max for stabilization
    let watchId: number | null = null;
    let collectedReadings: GPSReading[] = [];

    const cleanup = () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      setIsStabilizing(false);
    };

    const processReadings = (finalReadings: GPSReading[]) => {
      if (finalReadings.length === 0) {
        setLocationState("error");
        setLocationErrorMsg("No stable GPS readings obtained.");
        return;
      }

      // 1. Sort by accuracy (best first)
      const sorted = [...finalReadings].sort((a, b) => a.accuracy - b.accuracy);
      
      // 2. Filter outliers: Ignore the most inaccurate 25% if we have enough readings
      const countToKeep = Math.max(1, Math.ceil(sorted.length * 0.75));
      const filtered = sorted.slice(0, countToKeep);

      // 3. Calculate Average
      const avgLat = filtered.reduce((sum, r) => sum + r.lat, 0) / filtered.length;
      const avgLng = filtered.reduce((sum, r) => sum + r.lng, 0) / filtered.length;
      const avgAcc = filtered.reduce((sum, r) => sum + r.accuracy, 0) / filtered.length;

      // 4. Calculate Stability (Standard Deviation of distance from average)
      const deviations = filtered.map(r => haversineDistance(r.lat, r.lng, avgLat, avgLng));
      const avgDev = deviations.reduce((sum, d) => sum + d, 0) / filtered.length;
      
      // Stability Score: 1.0 (perfect) to 0.0 (unstable)
      // If average deviation is < 5m, it's very stable. > 30m is unstable.
      const score = Math.max(0, Math.min(1, 1 - (avgDev / 30)));
      setStabilityScore(score);

      // 5. Update State
      setCurrentLocation({ lat: avgLat, lng: avgLng });
      setStudentAccuracy(avgAcc);
      setLocationState("allowed");

      // Calculate confidence for UI
      const result = classifyAttendance(10, avgAcc, score); // Distance 10 is dummy here
      setConfidence(result.confidence);

      console.log(`✅ [GPS Stabilized] Readings: ${finalReadings.length}, Avg Acc: ${avgAcc.toFixed(1)}m, Stability: ${(score * 100).toFixed(0)}%`);
    };

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newReading: GPSReading = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now()
        };
        
        collectedReadings.push(newReading);
        setReadings([...collectedReadings]);
        const progress = Math.min(100, Math.round((collectedReadings.length / REQUIRED_READINGS) * 100));
        setStabilizationProgress(progress);

        if (collectedReadings.length >= REQUIRED_READINGS) {
          cleanup();
          processReadings(collectedReadings);
        }
      },
      (error) => {
        console.error("GPS Watch Error:", error);
        if (collectedReadings.length > 0) {
          // If we have some readings but hit an error, process what we have
          cleanup();
          processReadings(collectedReadings);
        } else {
          cleanup();
          setLocationState("error");
          setLocationErrorMsg(`GPS Error: ${error.message}`);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    // Timeout fallback
    setTimeout(() => {
      if (collectedReadings.length > 0 && collectedReadings.length < REQUIRED_READINGS) {
        console.warn("Stabilization timeout: Processing partial readings");
        cleanup();
        processReadings(collectedReadings);
      } else if (collectedReadings.length === 0) {
        cleanup();
        setLocationState("error");
        setLocationErrorMsg("Location timeout. Please try again.");
      }
    }, TIMEOUT_MS);
  };

  // 3. Submit Attendance
  const submitAttendance = async () => {
    // NOTE: Teacher location is no longer required from the QR token.
    // The backend fetches classroomCenter from the MongoDB session document.
    // The student only needs to provide their own GPS coordinates.

    setScanning(true);
    setScanError(null);

    try {
      const resp = await fetch(`${API_BASE}/attendance/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: studentData?.token || "",
          sessionId: studentData?.sessionId,
          branch: studentData?.branch,
          section: studentData?.section,
          subject: studentData?.subject,
          studentLocation: currentLocation,
          studentAccuracy,
          stabilityScore,
          confidence,
          readingCount: readings.length,
        }),
      });
      const data = await resp.json();

      if (!resp.ok || !data.success) {
        throw new Error(data?.message || "Failed to record attendance");
      }

      setScanResult({
        success: true,
        scanTime: new Date(data.data.timestamp).toLocaleTimeString(),
        distance: data.data.distance,
        withinGeofence: data.data.locationValid,
        status: data.data.status,
        studentLocation: currentLocation,
        timestamp: data.data.timestamp,
        debug: data.debug,
      });
    } catch (err: any) {
      const msg: string = String(err?.message || err) || "Scan failed";

      if (msg.includes("Location accuracy too low")) {
        setScanError("⚠️ Location accuracy is too low. Please wait a moment and try again.");
        handleRetryLocation(); // Try to get better location
      } else {
        setScanError(
          /expired|Invalid/i.test(msg)
            ? "QR expired or invalid. Ask your teacher to resend and scan again within time."
            : msg
        );
      }
    } finally {
      setScanning(false);
    }
  };

  // 4. Handle Scan Click
  const handleScanQR = async () => {
    // Double check location state
    if (locationState !== "allowed" || !currentLocation) {
      setLocationErrorMsg("Location is required before scanning. Please allow location and retry.");
      return;
    }

    // Warn about accuracy but allow proceeding
    if (studentAccuracy && studentAccuracy > 100) {
      console.warn("Low accuracy detected:", studentAccuracy);
    }

    await submitAttendance();
  };

  // Loading State: Show spinner while token is being verified
  if (tokenLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 dark:from-gray-900 dark:via-black dark:to-gray-800 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-green-600 mx-auto mb-5" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Verifying QR Code…
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Connecting to server. Make sure you are on the same WiFi as your laptop.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error / Invalid state: shown only AFTER loading completes
  if (!studentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-100 dark:bg-gradient-to-br dark:from-gray-900 dark:via-black dark:to-gray-800 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {scanError ? "Connection Error" : "Invalid QR Link"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {scanError || "This QR code link is invalid or has expired."}
            </p>
            <Button onClick={() => navigate("/")} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canScan = locationState === "allowed" && !!currentLocation;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 dark:bg-gradient-to-br dark:from-gray-900 dark:via-black dark:to-gray-800">
      {/* Header */}
      <header className="bg-white border-b shadow-sm dark:bg-gray-900 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  QR Attendance
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Scan your unique QR code
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Student Info Card */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5 text-blue-600" />
                <span>Student Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Name
                  </label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {studentData.studentName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Roll Number
                  </label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {studentData.rollNo}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Branch
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {studentData.branch}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Section
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    Section {studentData.section}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Subject
                </label>
                <div className="flex items-center space-x-2 mt-1">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                  <p className="text-gray-900 dark:text-gray-100 font-medium">
                    {studentData.subject}
                  </p>
                </div>
              </div>

              {/* Location Status Section */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Location Status
                  </span>
                </div>

                {/* State: Allowed (Success) */}
                {locationState === "allowed" && currentLocation && (
                    <div className={`mt-2 p-3 rounded-lg border ${confidence === "Low"
                        ? "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-700"
                        : confidence === "Medium"
                          ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700"
                          : "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700"
                      }`}>
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-sm font-bold ${confidence === "Low"
                            ? "text-orange-700 dark:text-orange-300"
                            : confidence === "Medium"
                              ? "text-blue-700 dark:text-blue-300"
                              : "text-green-700 dark:text-green-300"
                          }`}>
                          {confidence === "Low" ? "⚠️ Low Confidence" : confidence === "Medium" ? "🛡️ Medium Confidence" : "✅ High Confidence"}
                        </p>
                        <Badge variant="outline" className="text-[10px] h-4">
                          {Math.round(stabilityScore * 100)}% Stable
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)} • acc ±{Math.round(studentAccuracy || 0)}m
                      </p>
                      <p className="text-[10px] mt-1 text-gray-500 dark:text-gray-400 italic">
                        Stabilized over {readings.length} readings
                      </p>
                    </div>
                )}

                {/* State: Checking / Stabilizing */}
                {locationState === "checking" && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center">
                        <Activity className="w-4 h-4 mr-2 animate-pulse" />
                        Stabilizing GPS...
                      </p>
                      <span className="text-xs font-mono text-blue-600">{stabilizationProgress}%</span>
                    </div>
                    <Progress value={stabilizationProgress} className="h-1.5 mb-2 bg-blue-100 dark:bg-blue-900/50" />
                    <p className="text-[10px] text-blue-600 dark:text-blue-400">
                      Collecting multiple readings for maximum precision ({readings.length}/8)
                    </p>
                  </div>
                )}

                {/* State: Idle (Initial) */}
                {locationState === "idle" && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                      Location is required to verify you are in class.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStartLocationStabilization()}
                      className="w-full bg-blue-500 text-white hover:bg-blue-600 border-none shadow-md"
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      Enable Smart GPS
                    </Button>
                  </div>
                )}

                {/* State: Errors (Denied, InApp, Error, Unsupported) */}
                {(locationState === "denied" || locationState === "inapp" || locationState === "error" || locationState === "unsupported") && (
                  <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700 space-y-2">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      ⚠ {locationErrorMsg}
                    </p>
                    {/* Only show Retry button if NOT in InApp state */}
                    {locationState !== "inapp" && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartLocationStabilization()}
                        >
                          Retry stabilization
                        </Button>
                        <span className="text-xs text-red-600 dark:text-red-300">
                          Tip: Check browser permissions
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>


            </CardContent>
          </Card>

          {/* QR Scan Card */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <QrCode className="w-5 h-5 text-green-600" />
                <span>Scan QR Code</span>
              </CardTitle>
              <CardDescription>
                Click the button below to scan your unique QR code for
                attendance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!scanResult && !scanning && (
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl flex items-center justify-center border-2 border-green-200 dark:border-green-700">
                    <QrCode className="w-16 h-16 text-green-600" />
                  </div>

                  {/* ── State 1: Expired ───────────────────────────────── */}
                  {sessionExpired && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 font-medium">
                      <XCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
                      QR Code Expired
                      <p className="text-xs mt-2 text-red-600 dark:text-red-400 font-normal">
                        The attendance window has closed. Contact your teacher.
                      </p>
                    </div>
                  )}

                  {/* ── State 2: Waiting for teacher ─────────────────── */}
                  {!sessionExpired && !sessionActive && (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg text-yellow-700 dark:text-yellow-300 font-medium">
                      <span className="animate-pulse mr-2">⏳</span>
                      Waiting for teacher to start attendance...
                      <p className="text-xs mt-2 text-yellow-600 dark:text-yellow-400 font-normal">
                        The scanner will activate automatically. Please stay on this page.
                      </p>
                    </div>
                  )}

                  {/* ── State 3: Active — allow scanning ─────────────── */}
                  {!sessionExpired && sessionActive && (
                    <>
                      {sessionEndTime && (
                        <p className="text-sm text-green-700 dark:text-green-400 mb-3 font-medium">
                          ⏱ Attendance window closes at{" "}
                          {sessionEndTime.toLocaleTimeString()}
                        </p>
                      )}
                      <Button
                        onClick={handleScanQR}
                        disabled={!canScan || scanning}
                        className={`w-full size-lg ${canScan
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-gray-400 cursor-not-allowed hover:bg-gray-400 opacity-70"
                          }`}
                        size="lg"
                      >
                        <QrCode className="w-5 h-5 mr-2" />
                        Scan QR Code for Attendance
                      </Button>

                      {!canScan && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                          {locationState === "inapp"
                            ? "Open in Chrome/Safari to enable scanning."
                            : "Allow location and tap 'Get Location' to enable scanning."}
                        </p>
                      )}

                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                        Make sure you're inside the {scanResult?.debug?.radius ?? 30}m geofence zone
                      </p>
                    </>
                  )}
                </div>
              )}

              {scanError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded text-sm text-red-700 dark:text-red-300">
                  {scanError}
                </div>
              )}

              {scanning && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <p className="text-green-600 dark:text-green-400 font-medium">
                    Scanning QR Code...
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Verifying your location and attendance
                  </p>
                </div>
              )}

              {scanResult && (
                <div className="space-y-4">
                  <div
                    className={`p-4 rounded-lg border-2 ${scanResult.withinGeofence
                      ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700"
                      : "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-700"
                      }`}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      {scanResult.withinGeofence ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <XCircle className="w-6 h-6 text-orange-600" />
                      )}
                      <span
                        className={`font-bold text-lg ${scanResult.withinGeofence
                          ? "text-green-700 dark:text-green-300"
                          : "text-orange-700 dark:text-orange-300"
                          }`}
                      >
                        {scanResult.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>Scanned at: {scanResult.scanTime}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4" />
                        <span>
                          Distance from classroom: {scanResult.distance}m
                        </span>
                      </div>
                    </div>

                    {/* Debug Info Box */}
                    {scanResult.debug && (
                      <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-left space-y-1 border border-gray-300 dark:border-gray-700">
                        <p className="font-bold border-b border-gray-300 dark:border-gray-600 pb-1 mb-1">
                          🛠️ Geofence Debug
                        </p>
                        <p>
                          <span className="font-semibold">Teacher (Session):</span>{" "}
                          {scanResult.debug.classroomCenter
                            ? `${scanResult.debug.classroomCenter.lat.toFixed(6)}, ${scanResult.debug.classroomCenter.lng.toFixed(6)}`
                            : scanResult.debug.classLocation
                              ? `${scanResult.debug.classLocation.lat?.toFixed(6)}, ${scanResult.debug.classLocation.lng?.toFixed(6)}`
                              : "N/A"}
                        </p>
                        <p>
                          <span className="font-semibold">Student:</span>{" "}
                          {scanResult.debug.studentLocation
                            ? `${scanResult.debug.studentLocation.lat.toFixed(6)}, ${scanResult.debug.studentLocation.lng.toFixed(6)}`
                            : "N/A"}
                        </p>
                        <p>
                          <span className="font-semibold">GPS Accuracy:</span>{" "}
                          ±{Math.round(studentAccuracy || 0)}m
                        </p>
                        <p>
                          <span className="font-semibold">Distance:</span>{" "}
                          {typeof scanResult.debug.distance === "number"
                            ? `${scanResult.debug.distance.toFixed(2)} m`
                            : `${scanResult.distance} m`}
                        </p>
                        <p>
                          <span className="font-semibold">Radius:</span>{" "}
                          {scanResult.debug.radius ?? 30}m
                        </p>
                        <p>
                          <span className="font-semibold">Circle Check:</span>{" "}
                          <span className={scanResult.debug.withinCircle ?? scanResult.withinGeofence ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                            {(scanResult.debug.withinCircle ?? scanResult.withinGeofence) ? "✅ Inside" : "❌ Outside"}
                          </span>
                        </p>
                        {scanResult.debug.withinOctagon !== undefined && (
                          <p>
                            <span className="font-semibold">Octagon Check:</span>{" "}
                            <span className={scanResult.debug.withinOctagon ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                              {scanResult.debug.withinOctagon ? "✅ Inside" : "❌ Outside"}
                            </span>
                          </p>
                        )}
                        <p>
                          <span className="font-semibold">Location Source:</span>{" "}
                          <span className="text-green-600 dark:text-green-400 font-semibold">
                            {scanResult.debug.locationSource === "teacher_gps" || scanResult.debug.locationSource === "session_db"
                              ? "📍 Teacher GPS (Session DB)"
                              : scanResult.debug.locationSource
                                ? `⚠️ ${scanResult.debug.locationSource}`
                                : "📍 Teacher GPS"}
                          </span>
                        </p>
                        <p>
                          <span className="font-semibold">Status Decision:</span>{" "}
                          <span
                            className={
                              scanResult.debug.status === "Present"
                                ? "text-green-600 font-bold"
                                : "text-red-600 font-bold"
                            }
                          >
                            {scanResult.debug.status}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    <Badge
                      className={
                        scanResult.withinGeofence
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                      }
                    >
                      Attendance Recorded
                    </Badge>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      You can close this page now
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
