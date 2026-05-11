/**
 * API configuration for AttendanceHub.
 * 
 * In development, we use a relative path (/api) which is proxied to localhost:4000
 * by the Vite dev server. This avoids CORS issues locally.
 * 
 * In production (Netlify), APIs are served as serverless functions via the /.netlify/functions/api path.
 */

export const API_BASE = import.meta.env.PROD 
  ? "/.netlify/functions/api"
  : "/api";

console.log(`📡 [API Config] Base URL: ${API_BASE} (Mode: ${import.meta.env.MODE})`);
