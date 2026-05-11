/**
 * API configuration for AttendanceHub.
 * 
 * In development, we use a relative path (/api) which is proxied to localhost:4000
 * by the Vite dev server. This avoids CORS issues locally.
 * 
 * In production, we use the absolute URL of the Render backend.
 * Update the VITE_API_URL in your Netlify environment variables or replace it here.
 */

const PRODUCTION_API_URL = "https://rollcall-api.onrender.com/api"; // Replace with your actual Render URL

export const API_BASE = import.meta.env.PROD 
  ? (import.meta.env.VITE_API_URL || PRODUCTION_API_URL)
  : "/api";

console.log(`📡 [API Config] Base URL: ${API_BASE} (Mode: ${import.meta.env.MODE})`);
