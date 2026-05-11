import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Smartphone, AlertTriangle } from "lucide-react";

// Helper to detect In-App Browsers (conservative — avoid false-positives on Android Chrome)
const isInAppBrowser = (): boolean => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return false;

    const ua = navigator.userAgent.toLowerCase();
    const host = window.location.hostname.toLowerCase();

    return (
        // Android WebView: must have both 'wv' flag AND 'android'
        (ua.includes("android") && ua.includes("; wv)")) ||
        // Google Search App
        ua.includes("gsa/") ||
        // Gmail in-app (explicit keyword)
        ua.includes("gmail") ||
        // Outlook in-app
        ua.includes("outlook") ||
        // Facebook in-app
        ua.includes("fbav") ||
        // Instagram in-app
        ua.includes("instagram") ||
        // Preview environments
        host.endsWith(".bolt.new") ||
        host.includes("antigravity")
    );
};

export default function EmailScanLanding() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [inApp, setInApp] = useState(false);
    // 'redirecting' | 'timeout' | 'no-token'
    const [status, setStatus] = useState<"redirecting" | "timeout" | "no-token">("redirecting");

    useEffect(() => {
        const token = searchParams.get("token");
        const sessionId = searchParams.get("sessionId");

        // No token — go home immediately
        if (!token) {
            setStatus("no-token");
            setTimeout(() => navigate("/"), 3000);
            return;
        }

        // Check for in-app browser FIRST
        if (isInAppBrowser()) {
            setInApp(true);
            setStatus("redirecting"); // won't be shown — inApp UI takes over
            return;
        }

        // Normal browser: redirect to scanner
        let url = `/student-qr-scan?token=${token}`;
        if (sessionId) url += `&sessionId=${sessionId}`;
        navigate(url, { replace: true });

        // Safety net: if navigate() somehow doesn't fire within 5 s, show error
        const timer = setTimeout(() => {
            setStatus("timeout");
        }, 5000);

        return () => clearTimeout(timer);
    }, [navigate, searchParams]);

    if (!inApp) {
        if (status === "no-token") {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <Card className="w-full max-w-md shadow-xl border-0">
                        <CardContent className="p-8 text-center">
                            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Link</h2>
                            <p className="text-gray-600 mb-4">
                                This attendance link is missing required data. Please open the link exactly as sent in your email.
                            </p>
                            <p className="text-sm text-gray-400">Redirecting to login in 3 seconds…</p>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        if (status === "timeout") {
            const token = searchParams.get("token");
            const sessionId = searchParams.get("sessionId");
            let url = `/student-qr-scan?token=${token}`;
            if (sessionId) url += `&sessionId=${sessionId}`;
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <Card className="w-full max-w-md shadow-xl border-0">
                        <CardContent className="p-8 text-center">
                            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Could Not Connect</h2>
                            <p className="text-gray-600 mb-2">
                                The page could not reach the server. Make sure your mobile and the server laptop are on the <strong>same WiFi network</strong>.
                            </p>
                            <p className="text-xs text-gray-400 mb-6">
                                If the server IP changed, ask your teacher to resend the QR email.
                            </p>
                            <Button
                                className="w-full mb-2"
                                onClick={() => window.location.assign(url)}
                            >
                                Retry Now
                            </Button>
                            <Button variant="outline" className="w-full" onClick={() => window.location.assign("/")}>
                                Go to Login
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        // status === 'redirecting' — show brief spinner while React Router navigates
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Opening attendance scanner…</p>
                    <p className="text-xs text-gray-400 mt-2">Make sure you are on the same WiFi as your school's server.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-xl border-0">
                <CardHeader className="text-center pb-2">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Smartphone className="w-8 h-8 text-blue-600" />
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-900">
                        Open in System Browser
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-center">
                    <p className="text-gray-600">
                        You are viewing this in an in-app browser (Gmail, Outlook, etc.) where location access is restricted.
                    </p>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left text-sm text-yellow-800">
                        <p className="font-semibold mb-2">To mark attendance:</p>
                        <ol className="list-decimal list-inside space-y-1">
                            <li>Tap the <span className="font-bold">menu icon</span> (⋮ or ⋯) in the top corner</li>
                            <li>Select <span className="font-bold">"Open in Chrome"</span> or <span className="font-bold">"Open in Browser"</span></li>
                            <li>Allow location access when prompted</li>
                        </ol>
                    </div>

                    <div className="pt-2">
                        <Button
                            variant="outline"
                            className="w-full gap-2"
                            onClick={() => {
                                // Fallback: try to open in new window, though often blocked by in-app browsers
                                const token = searchParams.get("token");
                                const sessionId = searchParams.get("sessionId");
                                if (token) {
                                    let url = `/student-qr-scan?token=${token}`;
                                    if (sessionId) url += `&sessionId=${sessionId}`;
                                    window.open(`${window.location.origin}${url}`, '_system');
                                }
                            }}
                        >
                            <ExternalLink className="w-4 h-4" />
                            Try Opening in Browser
                        </Button>
                        <p className="text-xs text-gray-400 mt-2">
                            (If the button doesn't work, use the menu option above)
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
