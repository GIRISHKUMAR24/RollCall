import { useState, useEffect } from "react";
import { AlertTriangle, ShieldAlert, ExternalLink, Info, X, ChevronDown } from "lucide-react";

/**
 * SecureContextBanner
 * ───────────────────
 * Shows a warning banner when the page is served over HTTP (non-secure context)
 * and the hostname is not localhost / 127.0.0.1.
 *
 * This is required because modern browsers block:
 *   • navigator.geolocation
 *   • MediaDevices.getUserMedia (camera/microphone)
 * on non-HTTPS origins (except localhost).
 *
 * The component also exposes a collapsible Debug Info panel showing:
 *   • Secure Context status (window.isSecureContext)
 *   • Current origin
 *   • Protocol (http: / https:)
 *
 * Usage:
 *   import SecureContextBanner from "@/components/SecureContextBanner";
 *   <SecureContextBanner />  — shows only when insecure
 *   <SecureContextBanner alwaysShowDebug />  — shows debug panel even when secure
 */

interface SecureContextInfo {
    isSecureContext: boolean;
    isLocalhost: boolean;
    origin: string;
    protocol: string;
}

function detectSecureContext(): SecureContextInfo {
    if (typeof window === "undefined") {
        return { isSecureContext: true, isLocalhost: true, origin: "", protocol: "https:" };
    }
    const hostname = window.location.hostname.toLowerCase();
    const isLocalhost =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "::1" ||
        hostname.endsWith(".localhost");

    return {
        isSecureContext: window.isSecureContext,
        isLocalhost,
        origin: window.location.origin,
        protocol: window.location.protocol,
    };
}

interface SecureContextBannerProps {
    /** If true, always show the debug info panel (even on HTTPS). Default: false */
    alwaysShowDebug?: boolean;
    /** Additional CSS class for the container */
    className?: string;
}

export default function SecureContextBanner({
    alwaysShowDebug = false,
    className = "",
}: SecureContextBannerProps) {
    const [info, setInfo] = useState<SecureContextInfo>(() => detectSecureContext());
    const [dismissed, setDismissed] = useState(false);
    const [debugOpen, setDebugOpen] = useState(false);

    // Re-check on mount (handles SSR hydration)
    useEffect(() => {
        setInfo(detectSecureContext());
    }, []);

    const isInsecure = !info.isSecureContext && !info.isLocalhost;
    const shouldShow = isInsecure || alwaysShowDebug;

    if (!shouldShow || dismissed) return null;

    return (
        <div className={`w-full ${className}`} role="alert" aria-live="assertive">
            {/* ── Warning Banner (only on insecure context) ── */}
            {isInsecure && (
                <div className="relative flex items-start gap-3 bg-red-50 border border-red-300 text-red-800 dark:bg-red-950/40 dark:border-red-700 dark:text-red-300 rounded-lg p-4 shadow-sm">
                    <ShieldAlert className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-500" />
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm leading-snug">
                            Secure HTTPS connection required for location and camera access.
                        </p>
                        <p className="text-xs mt-1 leading-relaxed text-red-700 dark:text-red-400">
                            Please open this page via an{" "}
                            <span className="font-bold">HTTPS URL</span> (e.g. an ngrok or Cloudflare
                            tunnel). Location and camera will not work over plain HTTP on mobile devices.
                        </p>

                        {/* Quick help links */}
                        <div className="flex flex-wrap gap-3 mt-3">
                            <a
                                href="https://ngrok.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400 underline underline-offset-2 hover:text-red-900 dark:hover:text-red-200"
                            >
                                <ExternalLink className="w-3 h-3" /> ngrok
                            </a>
                            <a
                                href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400 underline underline-offset-2 hover:text-red-900 dark:hover:text-red-200"
                            >
                                <ExternalLink className="w-3 h-3" /> Cloudflare Tunnel
                            </a>
                        </div>
                    </div>

                    {/* Dismiss button */}
                    <button
                        onClick={() => setDismissed(true)}
                        aria-label="Dismiss warning"
                        className="flex-shrink-0 text-red-400 hover:text-red-600 dark:hover:text-red-200 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ── Debug Info Panel ── */}
            <div className={`mt-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-mono overflow-hidden ${isInsecure ? "" : "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30"}`}>
                <button
                    onClick={() => setDebugOpen((v) => !v)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    aria-expanded={debugOpen}
                    id="secure-context-debug-toggle"
                >
                    <Info className="w-3 h-3 flex-shrink-0" />
                    <span className="font-semibold">Security Debug Info</span>
                    <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${debugOpen ? "rotate-180" : ""}`} />
                </button>

                {debugOpen && (
                    <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2 space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400 w-32 flex-shrink-0">Secure Context:</span>
                            <span
                                className={
                                    info.isSecureContext
                                        ? "text-green-600 dark:text-green-400 font-bold"
                                        : "text-red-600 dark:text-red-400 font-bold"
                                }
                            >
                                {info.isSecureContext ? "✓ Yes" : "✗ No"}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400 w-32 flex-shrink-0">Protocol:</span>
                            <span
                                className={
                                    info.protocol === "https:"
                                        ? "text-green-600 dark:text-green-400"
                                        : "text-orange-600 dark:text-orange-400"
                                }
                            >
                                {info.protocol || "unknown"}
                            </span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="text-gray-500 dark:text-gray-400 w-32 flex-shrink-0">Origin:</span>
                            <span className="text-gray-700 dark:text-gray-300 break-all">{info.origin}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400 w-32 flex-shrink-0">Localhost:</span>
                            <span className={info.isLocalhost ? "text-green-600 dark:text-green-400" : "text-gray-600 dark:text-gray-400"}>
                                {info.isLocalhost ? "Yes" : "No"}
                            </span>
                        </div>
                        {!info.isSecureContext && !info.isLocalhost && (
                            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-orange-600 dark:text-orange-400 font-semibold">
                                    ⚠ Geolocation &amp; Camera are blocked in this context.
                                </p>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">
                                    Use a tunnel: <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">npm run share</code>
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
