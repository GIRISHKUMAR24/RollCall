export const API_BASE =
  import.meta.env.VITE_APP_BASE_URL && import.meta.env.VITE_APP_BASE_URL.length > 0
    ? import.meta.env.VITE_APP_BASE_URL
    : "/.netlify/functions/api";
