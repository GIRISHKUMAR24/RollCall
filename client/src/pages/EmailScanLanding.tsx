import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Smartphone } from "lucide-react";

// Helper to detect In-App Browsers
const isInAppBrowser = (): boolean => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return false;

    const ua = navigator.userAgent.toLowerCase();
    const host = window.location.hostname.toLowerCase();

    return (
        ua.includes("wv") ||                 // Android WebView
        (ua.includes("version/") && ua.includes("mobile")) || // iOS In-App
        ua.includes("gsa") ||                // Google app
        ua.includes("gmail") ||              // Gmail in-app
        ua.includes("outlook") ||            // Outlook in-app
        ua.includes("fbav") ||               // Facebook in-app
        ua.includes("instagram") ||          // Instagram in-app
        host.endsWith(".bolt.new") ||
        host.includes("antigravity")
    );
};

export default function EmailScanLanding() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [inApp, setInApp] = useState(false);

    useEffect(() => {
        // Check environment on mount
        if (isInAppBrowser()) {
            setInApp(true);
        } else {
            // If normal browser, redirect immediately to the actual scan page
            const token = searchParams.get("token");
            const sessionId = searchParams.get("sessionId");
            if (token) {
                let url = `/student-qr-scan?token=${token}`;
                if (sessionId) url += `&sessionId=${sessionId}`;
                navigate(url, { replace: true });
            } else {
                navigate("/");
            }
        }
    }, [navigate, searchParams]);

    if (!inApp) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Redirecting to attendance scanner...</p>
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
