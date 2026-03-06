import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
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
  QrCode,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  User,
  BookOpen,
  AlertTriangle,
  Info,
} from "lucide-react";

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

interface DebugInfo {
  isSecureContext: boolean;
  origin: string;
  protocol: string;
  lastErrorCode?: number;
  lastErrorMessage?: string;
  userAgent?: string;
}

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

  // Location & Scan State
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [studentAccuracy, setStudentAccuracy] = useState<number | null>(null);
  const [locationErrorMsg, setLocationErrorMsg] = useState<string>("");

  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Debug State
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    isSecureContext: typeof window !== "undefined" ? window.isSecureContext : false,
    origin: typeof window !== "undefined" ? window.location.origin : "",
    protocol: typeof window !== "undefined" ? window.location.protocol : "",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
  });

  // 1. Verify Token on Mount
  useEffect(() => {
    const token = searchParams.get("token");

    if (token) {
      fetch(`${API_BASE}/email/verify-qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
        .then((response) => response.json())
        .then((result) => {
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
          console.error("QR token verification failed:", error);
          setScanError(`QR Code Error: ${error.message}`);
          setTimeout(() => navigate("/"), 3000);
        });
    } else {
      navigate("/");
    }
  }, [searchParams, navigate]);

  // 2. Request Location Handler (Manual Trigger Only)
  const handleRetryLocation = (retryCount = 0) => {
    // Update debug info first
    setDebugInfo(prev => ({
      ...prev,
      isSecureContext: window.isSecureContext,
      origin: window.location.origin,
      protocol: window.location.protocol,
      lastErrorCode: undefined,
      lastErrorMessage: undefined,
    }));

    // A. Check Secure Context
    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setLocationState("error");
      setLocationErrorMsg(
        "⚠️ You opened this page on HTTP (local network URL). " +
        "GPS is blocked by your browser on HTTP. " +
        "Please open the HTTPS link from your email instead " +
        "(it starts with https://... not http://192.168...)."
      );
      return;
    }

    // B. Check for In-App Browser or Preview Env
    if (isInAppBrowser()) {
      setLocationState("inapp");
      setLocationErrorMsg(
        "Location cannot be accessed inside this in-app browser. Please open the page in Chrome to continue."
      );
      return;
    }

    // C. Check Browser Support
    if (!navigator.geolocation) {
      setLocationState("unsupported");
      setLocationErrorMsg("This browser does not support location. Please use Chrome or Brave.");
      return;
    }

    // D. Start Checking
    setLocationState("checking");
    setLocationErrorMsg("");

    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 30000, // Increased to 30 seconds
      maximumAge: 10000 // Allow cached positions up to 10s old
    };

    console.log("📍 [StudentQRScan] Requesting Geolocation with options:", geoOptions);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Success
        console.log("✅ [StudentQRScan] Geolocation Success:", position);
        const { latitude, longitude, accuracy } = position.coords;
        console.log(`📍 Coordinates: ${latitude}, ${longitude} (Accuracy: ${accuracy}m)`);

        setCurrentLocation({ lat: latitude, lng: longitude });
        setStudentAccuracy(accuracy);
        setLocationState("allowed");
        setLocationErrorMsg("");

        // Retry if accuracy is poor (>50m) and we haven't retried too many times
        if (accuracy > 50 && retryCount < 3) {
          console.warn(`⚠️ Accuracy ${accuracy}m > 50m, retrying (${retryCount + 1}/3)...`);
          // We still keep the current result, but try to get a better one
          setTimeout(() => handleRetryLocation(retryCount + 1), 2000);
        }
      },
      (error) => {
        // Error Handling
        console.error("❌ [StudentQRScan] Geolocation Error:", error);
        setCurrentLocation(null);

        // Update debug info with error
        setDebugInfo(prev => ({
          ...prev,
          lastErrorCode: error.code,
          lastErrorMessage: error.message,
        }));

        if (error.code === error.PERMISSION_DENIED) {
          setLocationState("denied");
          setLocationErrorMsg(
            "Location permission denied. Please allow location access in your browser settings."
          );
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationState("error");
          setLocationErrorMsg("Location unavailable. Please check your GPS is on.");
        } else if (error.code === error.TIMEOUT) {
          console.warn("⚠️ Geolocation timed out. Retrying with low accuracy...");
          // Fallback: Try again with low accuracy
          if (retryCount === 0) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                // Success on fallback
                console.log("✅ [Fallback] Low Accuracy Success:", pos);
                setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setStudentAccuracy(pos.coords.accuracy);
                setLocationState("allowed");
                setLocationErrorMsg("");
              },
              (err) => {
                setLocationState("error");
                setLocationErrorMsg("Location timed out. Please check your internet/GPS.");
              },
              { enableHighAccuracy: false, timeout: 30000, maximumAge: 60000 }
            );
          } else {
            setLocationState("error");
            setLocationErrorMsg("Location request timed out.");
          }
        } else {
          setLocationState("error");
          setLocationErrorMsg(`Unable to fetch your location. Error: ${error.message}`);
        }
      },
      geoOptions
    );
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
          studentLocation: currentLocation,
          studentAccuracy,
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

  // Loading State
  if (!studentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-100 dark:bg-gradient-to-br dark:from-gray-900 dark:via-black dark:to-gray-800 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Invalid QR Link
            </h2>
            <p className="text-gray-600 mb-4">
              This QR code link is invalid or has expired.
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
                  <div className={`mt-2 p-3 rounded-lg border ${(studentAccuracy || 0) > 100
                    ? "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-700"
                    : "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700"
                    }`}>
                    <p className={`text-sm ${(studentAccuracy || 0) > 100
                      ? "text-orange-700 dark:text-orange-300"
                      : "text-green-700 dark:text-green-300"
                      }`}>
                      {(studentAccuracy || 0) > 100 ? "⚠️ Low Accuracy" : "✓ Location detected"}
                    </p>
                    <p className={`text-xs ${(studentAccuracy || 0) > 100
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-green-600 dark:text-green-400"
                      }`}>
                      {currentLocation.lat.toFixed(6)},{" "}
                      {currentLocation.lng.toFixed(6)}
                      {studentAccuracy != null && (
                        <> • acc ±{Math.round(studentAccuracy)}m</>
                      )}
                    </p>
                    <p className="text-xs mt-1 text-orange-600 dark:text-orange-400">
                      Accuracy is low (&gt;100m). You can still scan, but ensure you are close to the class.
                    </p>
                  </div>
                )}

                {/* State: Checking */}
                {locationState === "checking" && (
                  <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 flex items-center">
                      <span className="animate-spin mr-2">⏳</span> Getting your location...
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
                      onClick={() => handleRetryLocation()}
                      className="w-full"
                    >
                      📍 Get Location
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
                          onClick={() => handleRetryLocation()}
                        >
                          Retry location
                        </Button>
                        <span className="text-xs text-red-600 dark:text-red-300">
                          Tip: Check browser permissions
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Debug Info Section */}
              <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-left space-y-1 border border-gray-300 dark:border-gray-700">
                <div className="flex items-center gap-2 border-b border-gray-300 dark:border-gray-600 pb-1 mb-1">
                  <Info className="w-3 h-3" />
                  <span className="font-bold">Debug Info</span>
                </div>
                {/* Secure Context Warning Banner */}
                {!debugInfo.isSecureContext && window.location.hostname !== "localhost" && (
                  <div className="mb-2 px-2 py-1 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-red-700 dark:text-red-300 text-xs font-semibold">
                    ⚠️ Secure HTTPS connection required for location and camera access.
                  </div>
                )}
                <p>
                  <span className="text-gray-500 dark:text-gray-400">Secure Context: </span>
                  <span className={debugInfo.isSecureContext ? "text-green-600 dark:text-green-400 font-bold" : "text-red-600 dark:text-red-400 font-bold"}>
                    {debugInfo.isSecureContext ? "✓ Yes" : "✗ No"}
                  </span>
                </p>
                <p>
                  <span className="text-gray-500 dark:text-gray-400">Protocol: </span>
                  <span className={debugInfo.protocol === "https:" ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}>
                    {debugInfo.protocol || "unknown"}
                  </span>
                </p>
                <p><span className="text-gray-500 dark:text-gray-400">Origin: </span>{debugInfo.origin}</p>
                {debugInfo.lastErrorCode && <p><span className="text-gray-500 dark:text-gray-400">Last Error Code: </span>{debugInfo.lastErrorCode}</p>}
                {debugInfo.lastErrorMessage && <p><span className="text-gray-500 dark:text-gray-400">Last Error Msg: </span>{debugInfo.lastErrorMessage}</p>}
                <p className="truncate" title={debugInfo.userAgent}><span className="text-gray-500 dark:text-gray-400">UA: </span>{debugInfo.userAgent?.substring(0, 50)}...</p>
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
